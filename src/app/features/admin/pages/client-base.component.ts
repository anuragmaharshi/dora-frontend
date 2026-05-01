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
import { DecimalPipe, SlicePipe } from '@angular/common';
import { AdminService } from '../services/admin.service';
import { ClientBaseEntry } from '../models/admin.view-model';

/**
 * ClientBaseComponent — AC-3
 *
 * Allows PLATFORM_ADMIN to set the bank's total client base count and
 * review its effective-date history (append-only per D-LLD04-1).
 *
 * OnPush: entries signal drives all re-renders.
 */
@Component({
  selector: 'app-client-base',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, DecimalPipe, SlicePipe],
  templateUrl: './client-base.component.html',
  styleUrl: './client-base.component.scss',
})
export class ClientBaseComponent implements OnInit {
  private readonly adminService = inject(AdminService);
  private readonly fb = inject(FormBuilder);

  readonly loadState = signal<'loading' | 'loaded' | 'error'>('loading');
  readonly saveState = signal<'idle' | 'saving' | 'saved' | 'error'>('idle');
  readonly entries = signal<ClientBaseEntry[]>([]);
  readonly errorMessage = signal<string>('');
  readonly saveError = signal<string>('');

  form: FormGroup = this.fb.group({
    clientCount: [null, [Validators.required, Validators.min(0)]],
    effectiveFrom: ['', [Validators.required]],
  });

  ngOnInit(): void {
    this.loadHistory();
  }

  private loadHistory(): void {
    this.loadState.set('loading');
    this.adminService.getClientBaseHistory().subscribe({
      next: (history) => {
        // API returns entries sorted by effectiveFrom desc per LLD spec.
        this.entries.set(history.entries);
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
    this.adminService
      .setClientBase({
        clientCount: raw['clientCount'],
        effectiveFrom: raw['effectiveFrom'],
      })
      .subscribe({
        next: () => {
          this.saveState.set('saved');
          this.saveError.set('');
          this.form.reset();
          this.loadHistory();
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
