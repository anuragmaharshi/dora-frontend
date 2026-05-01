import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { AdminService } from '../services/admin.service';
import { TenantConfigUpdate } from '../models/admin.view-model';

/**
 * TenantConfigComponent — AC-1
 *
 * Displays and allows editing of the bank's tenant configuration:
 * legal name, LEI, NCA name, NCA email, jurisdiction, compliance contact.
 *
 * OnPush: all mutations go through signals so change detection fires
 * on signal updates only — no implicit zone pollution.
 */
@Component({
  selector: 'app-tenant-config',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule],
  templateUrl: './tenant-config.component.html',
  styleUrl: './tenant-config.component.scss',
})
export class TenantConfigComponent implements OnInit {
  private readonly adminService = inject(AdminService);
  private readonly fb = inject(FormBuilder);

  readonly loadState = signal<'loading' | 'loaded' | 'error'>('loading');
  readonly saveState = signal<'idle' | 'saving' | 'saved' | 'error'>('idle');
  readonly errorMessage = signal<string>('');
  readonly saveError = signal<string>('');

  // LEI must be exactly 20 uppercase alphanumeric characters per ISO 17442.
  readonly LEI_PATTERN = /^[A-Z0-9]{20}$/;

  form: FormGroup = this.fb.group({
    legalName: ['', [Validators.required]],
    lei: ['', [Validators.pattern(this.LEI_PATTERN)]],
    ncaName: [''],
    ncaEmail: ['', [Validators.email]],
    jurisdictionIso: ['', [Validators.maxLength(2)]],
    primaryComplianceContactId: [''],
  });

  ngOnInit(): void {
    this.adminService.getTenant().subscribe({
      next: (config) => {
        this.form.patchValue({
          legalName: config.legalName,
          lei: config.lei ?? '',
          ncaName: config.ncaName ?? '',
          ncaEmail: config.ncaEmail ?? '',
          jurisdictionIso: config.jurisdictionIso ?? '',
          primaryComplianceContactId: config.primaryComplianceContactId ?? '',
        });
        this.loadState.set('loaded');
      },
      error: (err: Error) => {
        this.errorMessage.set(err.message);
        this.loadState.set('error');
      },
    });
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saveState.set('saving');
    const raw = this.form.getRawValue();
    const update: TenantConfigUpdate = {
      legalName: raw['legalName'],
      lei: raw['lei'] || null,
      ncaName: raw['ncaName'] || null,
      ncaEmail: raw['ncaEmail'] || null,
      jurisdictionIso: raw['jurisdictionIso'] || null,
      primaryComplianceContactId: raw['primaryComplianceContactId'] || null,
    };

    this.adminService.updateTenant(update).subscribe({
      next: () => {
        this.saveState.set('saved');
        this.saveError.set('');
      },
      error: (err: Error) => {
        this.saveError.set(err.message);
        this.saveState.set('error');
      },
    });
  }

  /** Convenience accessor used in the template for validation messages. */
  get f() {
    return this.form.controls;
  }
}
