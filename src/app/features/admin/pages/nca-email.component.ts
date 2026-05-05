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
import { NcaEmailConfigUpdate } from '../models/admin.view-model';

/**
 * NcaEmailComponent — AC-4
 *
 * Allows PLATFORM_ADMIN to configure the SMTP sender address, NCA
 * recipient address, and subject-line template used when exporting
 * DORA reports by email.
 *
 * Subject template uses a plain Mustache subset ({{placeholder}}) per
 * Q-2 recommendation.  The allowed placeholder list is documented in
 * the hint text.
 * <!-- OPEN-Q: confirm the exact list of allowed {{placeholder}} tokens
 *      once Q-2 is resolved by BA agent. -->
 *
 * OnPush: all state in signals.
 */
@Component({
  selector: 'app-nca-email',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule],
  templateUrl: './nca-email.component.html',
  styleUrl: './nca-email.component.scss',
})
export class NcaEmailComponent implements OnInit {
  private readonly adminService = inject(AdminService);
  private readonly fb = inject(FormBuilder);

  readonly loadState = signal<'loading' | 'loaded' | 'error'>('loading');
  readonly saveState = signal<'idle' | 'saving' | 'saved' | 'error'>('idle');
  readonly errorMessage = signal<string>('');
  readonly saveError = signal<string>('');

  // Placeholder text for the subject template field — stored as a property to
  // avoid Angular template interpolation errors when the string contains {{ }}.
  readonly subjectTemplatePlaceholder = '[DORA][{{incidentId}}] Initial Notification';

  form: FormGroup = this.fb.group({
    sender: ['', [Validators.required, Validators.email]],
    recipient: ['', [Validators.required, Validators.email]],
    subjectTemplate: ['', [Validators.required, Validators.maxLength(500)]],
  });

  ngOnInit(): void {
    this.adminService.getNcaEmailConfig().subscribe({
      next: (config) => {
        this.form.patchValue({
          sender: config.sender,
          recipient: config.recipient,
          subjectTemplate: config.subjectTemplate,
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
    const update: NcaEmailConfigUpdate = {
      sender: raw['sender'],
      recipient: raw['recipient'],
      subjectTemplate: raw['subjectTemplate'],
    };

    this.adminService.updateNcaEmailConfig(update).subscribe({
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

  get f() {
    return this.form.controls;
  }
}
