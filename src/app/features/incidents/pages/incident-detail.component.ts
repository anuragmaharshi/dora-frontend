import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { DatePipe, DecimalPipe, TitleCasePipe } from '@angular/common';
import { IncidentsService } from '../services/incidents.service';
import { IncidentResponse } from '../models/incident.view-model';
import { AttachmentUploaderComponent } from './attachment-uploader.component';

/**
 * IncidentDetailComponent — AC-2, AC-6, AC-7
 *
 * Read-only summary pane with three tabs:
 *   - Overview: title, description, impact estimate, status, detection datetime,
 *               created-by, linked critical services
 *   - Attachments: list of READY attachments + inline uploader (AC-3)
 *   - Assets: linked ICT assets (AC-5)
 *
 * AC-2: detection_datetime is displayed as read-only — there is no edit control.
 *       The field is locked server-side (FR-002, D-LLD05-1).
 *
 * AC-7: Non-major incidents have no special classification badge UI.
 *       The status field reflects server-side status (DETECTED by default).
 *       No "major incident" flag concept exists in LLD-05 UI.
 *
 * AC-6: loads full incident including attachments, services, and assets.
 *
 * OnPush: state driven by signals.
 */
@Component({
  selector: 'app-incident-detail',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, DecimalPipe, TitleCasePipe, AttachmentUploaderComponent],
  templateUrl: './incident-detail.component.html',
  styleUrl: './incident-detail.component.scss',
})
export class IncidentDetailComponent implements OnInit {
  private readonly incidentsService = inject(IncidentsService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  readonly loadState = signal<'loading' | 'loaded' | 'error'>('loading');
  readonly incident = signal<IncidentResponse | null>(null);
  readonly errorMessage = signal<string>('');

  /** Active tab identifier. */
  readonly activeTab = signal<'overview' | 'attachments' | 'assets'>('overview');

  /** The UUID route param — used by the attachment uploader child. */
  incidentId = '';

  ngOnInit(): void {
    this.incidentId = this.route.snapshot.paramMap.get('id') ?? '';
    this.loadIncident();
  }

  private loadIncident(): void {
    if (!this.incidentId) {
      this.errorMessage.set('Missing incident ID in route.');
      this.loadState.set('error');
      return;
    }

    this.loadState.set('loading');
    this.incidentsService
      .getIncident(this.incidentId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (incident) => {
          this.incident.set(incident);
          this.loadState.set('loaded');
        },
        error: (err: Error) => {
          this.errorMessage.set(err.message);
          this.loadState.set('error');
        },
      });
  }

  setTab(tab: 'overview' | 'attachments' | 'assets'): void {
    this.activeTab.set(tab);
  }

  /** Called by AttachmentUploaderComponent after a successful upload to refresh. */
  onAttachmentUploaded(): void {
    this.loadIncident();
  }
}
