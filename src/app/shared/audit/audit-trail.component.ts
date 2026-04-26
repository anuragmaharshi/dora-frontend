import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { DatePipe } from '@angular/common';

import { AuditEntry, Page } from './audit.model';
import { AuditTrailService } from './audit.service';

type LoadState = 'loading' | 'loaded' | 'error';

/**
 * Shared widget that renders the append-only audit trail for a single entity.
 *
 * Usage:
 *   <app-audit-trail entityType="INCIDENT" entityId="<uuid>" />
 *
 * The component is NOT routed — it is embedded by feature pages (LLD-14, LLD-15).
 * It re-fetches automatically whenever entityType or entityId change.
 */
@Component({
  selector: 'app-audit-trail',
  standalone: true,
  // OnPush: all state is held in signals; Angular only re-checks when a signal
  // notifies or @Input() reference changes.
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe],
  templateUrl: './audit-trail.component.html',
  styleUrl: './audit-trail.component.scss',
})
export class AuditTrailComponent {
  // Required inputs — validated at compile time via Angular's `input.required()`.
  readonly entityType = input.required<string>();
  readonly entityId = input.required<string>();

  // Exposed state signals — template-bound (no `| async` needed; OnPush + signals).
  readonly loadState = signal<LoadState>('loading');
  readonly rows = signal<AuditEntry[]>([]);
  readonly errorMessage = signal<string>('');
  readonly page = signal<Page<AuditEntry> | null>(null);

  private readonly auditService = inject(AuditTrailService);

  constructor() {
    // effect() re-runs whenever entityType or entityId signals change.
    // This replaces the ngOnChanges + BehaviorSubject pattern for input-driven
    // data fetching in the signals idiom.
    effect(() => {
      const entityType = this.entityType();
      const entityId = this.entityId();
      this.loadPage(entityType, entityId, 0);
    });
  }

  loadPage(entityType: string, entityId: string, pageIndex: number): void {
    this.loadState.set('loading');
    this.rows.set([]);
    this.errorMessage.set('');

    this.auditService.list(entityType, entityId, pageIndex).subscribe({
      next: (p) => {
        this.page.set(p);
        this.rows.set(p.content);
        this.loadState.set('loaded');
      },
      error: (msg: string) => {
        this.errorMessage.set(msg);
        this.loadState.set('error');
      },
    });
  }

  /** Navigate to previous page. */
  prevPage(): void {
    const p = this.page();
    if (p && p.number > 0) {
      this.loadPage(this.entityType(), this.entityId(), p.number - 1);
    }
  }

  /** Navigate to next page. */
  nextPage(): void {
    const p = this.page();
    if (p && p.number < p.totalPages - 1) {
      this.loadPage(this.entityType(), this.entityId(), p.number + 1);
    }
  }

  /** Stringify an unknown state blob for display inside <pre>. */
  formatJson(value: unknown): string {
    if (value == null) return 'null';
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }
}
