import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { SlicePipe } from '@angular/common';
import { AdminService } from '../services/admin.service';
import { CriticalService } from '../models/admin.view-model';

/**
 * CriticalServicesComponent — AC-2
 *
 * Lists all active critical services; allows adding new entries and
 * archiving existing ones.  Services are archived (soft-delete), never
 * hard-deleted, per D-LLD04-2.
 *
 * OnPush: the services signal drives all re-renders.
 */
@Component({
  selector: 'app-critical-services',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, SlicePipe],
  templateUrl: './critical-services.component.html',
  styleUrl: './critical-services.component.scss',
})
export class CriticalServicesComponent implements OnInit {
  private readonly adminService = inject(AdminService);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  readonly loadState = signal<'loading' | 'loaded' | 'error'>('loading');
  readonly services = signal<CriticalService[]>([]);
  readonly errorMessage = signal<string>('');
  readonly addError = signal<string>('');
  readonly addState = signal<'idle' | 'saving' | 'error'>('idle');

  // Map of serviceId → 'idle' | 'archiving' | 'error'
  readonly archiveState = signal<Record<string, string>>({});

  addForm: FormGroup = this.fb.group({
    name: ['', [Validators.required]],
    description: [''],
  });

  ngOnInit(): void {
    this.loadServices();
  }

  private loadServices(): void {
    this.loadState.set('loading');
    this.adminService.listCriticalServices().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (list) => {
        // Show only active services by default (AC-2 spec).
        this.services.set(list.filter((s) => s.active));
        this.loadState.set('loaded');
      },
      error: (err: Error) => {
        this.errorMessage.set(err.message);
        this.loadState.set('error');
      },
    });
  }

  onAdd(): void {
    if (this.addForm.invalid) {
      this.addForm.markAllAsTouched();
      return;
    }
    this.addState.set('saving');
    const raw = this.addForm.getRawValue();
    this.adminService
      .createCriticalService({
        name: raw['name'],
        description: raw['description'] || null,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.addState.set('idle');
          this.addError.set('');
          this.addForm.reset();
          this.loadServices();
        },
        error: (err: Error) => {
          this.addError.set(err.message);
          this.addState.set('error');
        },
      });
  }

  onArchive(service: CriticalService): void {
    this.archiveState.update((state) => ({ ...state, [service.id]: 'archiving' }));
    this.adminService.archiveCriticalService(service.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.archiveState.update((state) => ({ ...state, [service.id]: 'idle' }));
        this.loadServices();
      },
      error: (err: Error) => {
        this.archiveState.update((state) => ({ ...state, [service.id]: 'error' }));
        this.errorMessage.set(err.message);
      },
    });
  }

  isArchiving(id: string): boolean {
    return this.archiveState()[id] === 'archiving';
  }

  get f() {
    return this.addForm.controls;
  }
}
