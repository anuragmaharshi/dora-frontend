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
  AbstractControl,
  FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { IncidentsService } from '../services/incidents.service';
import { CriticalService } from '../../admin/models/admin.view-model';
import { AssetRow } from '../models/incident.view-model';

/**
 * IncidentCreateComponent — AC-1, AC-2, AC-4, AC-5
 *
 * Reactive form for creating a new DORA incident.
 * - title: required, maxLength 200 (validated server-side too)
 * - description: required
 * - impactEstimate: optional textarea
 * - affectedServices: multiselect from GET /api/v1/admin/critical-services (AC-4)
 * - affectedAssets: add-as-you-go rows of { name, type } (AC-5)
 *
 * detection_datetime is NOT present in this form — it is server-stamped
 * and immutable (FR-002, AC-2). The form has no field for it.
 *
 * On success navigates to /incidents/:id (the UUID from the response).
 *
 * OnPush: all state is driven by signals.
 */
@Component({
  selector: 'app-incident-create',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule],
  templateUrl: './incident-create.component.html',
  styleUrl: './incident-create.component.scss',
})
export class IncidentCreateComponent implements OnInit {
  private readonly service = inject(IncidentsService);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  // UI state signals
  readonly servicesLoadState = signal<'loading' | 'loaded' | 'error'>('loading');
  readonly availableServices = signal<CriticalService[]>([]);
  readonly servicesError = signal<string>('');
  readonly submitState = signal<'idle' | 'submitting' | 'error'>('idle');
  readonly submitError = signal<string>('');

  // Track which service IDs are selected in the multiselect
  readonly selectedServiceIds = signal<Set<string>>(new Set());

  form: FormGroup = this.fb.group({
    title: ['', [Validators.required, Validators.maxLength(200)]],
    description: ['', Validators.required],
    impactEstimate: [''],
    // assets is a FormArray of FormGroups, each with { name, type }
    assets: this.fb.array<FormGroup>([]),
  });

  ngOnInit(): void {
    this.loadServices();
  }

  private loadServices(): void {
    this.servicesLoadState.set('loading');
    this.service
      .listCriticalServices()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (list) => {
          // Only active services are eligible for selection (AC-4).
          this.availableServices.set(list.filter((s) => s.active));
          this.servicesLoadState.set('loaded');
        },
        error: (err: Error) => {
          this.servicesError.set(err.message);
          this.servicesLoadState.set('error');
        },
      });
  }

  /** Toggle a service ID in/out of the selected set (multiselect behaviour). */
  toggleService(id: string): void {
    const current = new Set(this.selectedServiceIds());
    if (current.has(id)) {
      current.delete(id);
    } else {
      current.add(id);
    }
    this.selectedServiceIds.set(current);
  }

  isServiceSelected(id: string): boolean {
    return this.selectedServiceIds().has(id);
  }

  // ---------------------------------------------------------------------------
  // Asset rows (AC-5)
  // ---------------------------------------------------------------------------

  get assetsArray(): FormArray {
    return this.form.get('assets') as FormArray;
  }

  addAssetRow(): void {
    const group = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(200)]],
      type: ['', [Validators.required, Validators.maxLength(100)]],
    });
    this.assetsArray.push(group);
  }

  removeAssetRow(index: number): void {
    this.assetsArray.removeAt(index);
  }

  assetRowAt(index: number): FormGroup {
    return this.assetsArray.at(index) as FormGroup;
  }

  // ---------------------------------------------------------------------------
  // Submit
  // ---------------------------------------------------------------------------

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitState.set('submitting');
    const raw = this.form.getRawValue();

    const payload = {
      title: raw['title'] as string,
      description: raw['description'] as string,
      impactEstimate: (raw['impactEstimate'] as string) || null,
      serviceIds: [...this.selectedServiceIds()],
      assets: (raw['assets'] as AssetRow[]).map((a) => ({
        name: a.name,
        type: a.type,
      })),
    };

    this.service
      .createIncident(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (incident) => {
          // Navigate to the detail page using the UUID id (AC-1).
          this.router.navigate(['/incidents', incident.id]);
        },
        error: (err: Error) => {
          this.submitError.set(err.message);
          this.submitState.set('error');
        },
      });
  }

  // ---------------------------------------------------------------------------
  // Form control helpers
  // ---------------------------------------------------------------------------

  get f(): Record<string, AbstractControl> {
    return this.form.controls;
  }

  assetControl(index: number, name: string): AbstractControl {
    return this.assetRowAt(index).controls[name];
  }
}
