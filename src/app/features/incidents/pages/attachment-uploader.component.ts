import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  EventEmitter,
  Input,
  Output,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { switchMap } from 'rxjs';
import { IncidentsService } from '../services/incidents.service';
import { UploadSlot } from '../models/incident.view-model';

/**
 * AttachmentUploaderComponent — AC-3
 *
 * Implements the 3-step attachment flow for an incident:
 *   Step 1: POST /api/v1/incidents/{id}/attachments → presigned URL + attachmentId
 *   Step 2: PUT file directly to the presigned MinIO URL
 *   Step 3: POST /api/v1/incidents/{id}/attachments/{attachmentId}/complete
 *
 * UI supports:
 *   - Drag-and-drop over the drop zone
 *   - File picker via hidden <input type="file">
 *
 * Multiple files can be queued; each is processed sequentially per slot.
 *
 * Emits `uploaded` after each successful completion so the parent can
 * refresh the incident detail to show the new attachment.
 *
 * OnPush: all state is driven by signals + event emitter.
 */
@Component({
  selector: 'app-attachment-uploader',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  templateUrl: './attachment-uploader.component.html',
  styleUrl: './attachment-uploader.component.scss',
})
export class AttachmentUploaderComponent {
  @Input({ required: true }) incidentId!: string;

  /** Emitted once per completed upload so the parent can refresh. */
  @Output() uploaded = new EventEmitter<void>();

  private readonly service = inject(IncidentsService);
  private readonly destroyRef = inject(DestroyRef);

  readonly slots = signal<UploadSlot[]>([]);
  readonly isDragging = signal(false);
  readonly globalError = signal<string>('');

  // ---------------------------------------------------------------------------
  // Drag-and-drop handlers
  // ---------------------------------------------------------------------------

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);
    const files = event.dataTransfer?.files;
    if (files) {
      this.enqueueFiles(files);
    }
  }

  // ---------------------------------------------------------------------------
  // File picker handler
  // ---------------------------------------------------------------------------

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      this.enqueueFiles(input.files);
      // Reset the input so the same file can be selected again if needed.
      input.value = '';
    }
  }

  // ---------------------------------------------------------------------------
  // Upload flow
  // ---------------------------------------------------------------------------

  private enqueueFiles(files: FileList): void {
    const newSlots: UploadSlot[] = Array.from(files).map((file) => ({
      file,
      state: 'pending',
      progress: 0,
      errorMessage: null,
      attachmentId: null,
    }));

    this.slots.update((prev) => [...prev, ...newSlots]);

    // Start upload for each newly added slot.
    newSlots.forEach((slot) => this.uploadSlot(slot));
  }

  private uploadSlot(slot: UploadSlot): void {
    // Mark as uploading in the signal list.
    this.updateSlot(slot, { state: 'uploading', progress: 10 });

    // Step 1: request presigned URL.
    this.service
      .requestPresignedUrl(this.incidentId, {
        filename: slot.file.name,
        contentType: slot.file.type || 'application/octet-stream',
        sizeBytes: slot.file.size,
      })
      .pipe(
        // Step 2: PUT file to presigned URL.
        switchMap((presigned) => {
          this.updateSlot(slot, { attachmentId: presigned.attachmentId, progress: 50 });
          return this.service.uploadToPresignedUrl(presigned.uploadUrl, slot.file).pipe(
            // Step 3: complete the upload.
            switchMap(() => {
              this.updateSlot(slot, { progress: 80 });
              return this.service.completeUpload(this.incidentId, presigned.attachmentId);
            }),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.updateSlot(slot, { state: 'done', progress: 100 });
          this.uploaded.emit();
        },
        error: (err: Error) => {
          this.updateSlot(slot, { state: 'error', errorMessage: err.message });
        },
      });
  }

  private updateSlot(target: UploadSlot, patch: Partial<UploadSlot>): void {
    this.slots.update((prev) =>
      prev.map((s) => (s === target ? { ...s, ...patch } : s)),
    );
  }

  removeSlot(slot: UploadSlot): void {
    this.slots.update((prev) => prev.filter((s) => s !== slot));
  }
}
