import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { IncidentsService } from '../services/incidents.service';
import { IncidentSummary } from '../models/incident.view-model';

/**
 * IncidentListComponent — stub list page at /incidents (AC-6).
 *
 * This is a minimal implementation added as part of Bug #18 fix:
 * the /incidents base route needs a route entry with roleGuard so that
 * PLATFORM_ADMIN is blocked and redirected to /403.
 *
 * Full search/filter functionality is deferred to LLD-14 (IncidentLogComponent).
 *
 * Route: /incidents ('' path in incidentRoutes children)
 * Guard: roleGuard(['OPS_ANALYST','INCIDENT_MANAGER','COMPLIANCE_OFFICER','CISO'])
 *   — PLATFORM_ADMIN excluded (Bug #18); BOARD_VIEWER deferred (BLOCKER-1, LLD-14).
 *
 * OnPush: all state driven by signals.
 */
@Component({
  selector: 'app-incident-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <main class="incident-list-page" aria-labelledby="incident-list-heading">
      <div class="list-header">
        <h1 id="incident-list-heading">Incidents</h1>
        <a
          routerLink="/incidents/new"
          class="btn-primary"
          aria-label="Report a new incident"
        >Report Incident</a>
      </div>

      @if (loadState() === 'loading') {
        <p role="status" aria-live="polite">Loading incidents…</p>
      }

      @if (loadState() === 'error') {
        <p class="error-message" role="alert">{{ errorMessage() }}</p>
      }

      @if (loadState() === 'loaded') {
        @if (incidents().length === 0) {
          <p class="empty-state">No incidents reported yet.</p>
        } @else {
          <ul class="incident-list" aria-label="Incident list">
            @for (incident of incidents(); track incident.id) {
              <li class="incident-row">
                <a
                  [routerLink]="['/incidents', incident.id]"
                  [attr.aria-label]="'View incident ' + incident.incidentId + ': ' + incident.title"
                >
                  <span class="incident-id">{{ incident.incidentId }}</span>
                  <span class="incident-title">{{ incident.title }}</span>
                  <span class="incident-status">{{ incident.status }}</span>
                </a>
              </li>
            }
          </ul>
        }
      }
    </main>
  `,
  styles: [`
    .incident-list-page { padding: 1.5rem; }
    .list-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
    .incident-list { list-style: none; padding: 0; margin: 0; }
    .incident-row { border-bottom: 1px solid #e0e0e0; padding: 0.75rem 0; }
    .incident-row a { display: flex; gap: 1rem; text-decoration: none; color: inherit; }
    .incident-id { font-weight: 600; min-width: 140px; }
    .incident-status { margin-left: auto; color: #555; }
    .empty-state { color: #666; font-style: italic; }
    .error-message { color: #c62828; }
  `],
})
export class IncidentListComponent implements OnInit {
  private readonly service = inject(IncidentsService);
  private readonly destroyRef = inject(DestroyRef);

  readonly loadState = signal<'loading' | 'loaded' | 'error'>('loading');
  readonly incidents = signal<IncidentSummary[]>([]);
  readonly errorMessage = signal<string>('');

  ngOnInit(): void {
    this.service
      .listIncidents(0, 20)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (page) => {
          this.incidents.set(page.content);
          this.loadState.set('loaded');
        },
        error: (err: Error) => {
          this.errorMessage.set(err.message);
          this.loadState.set('error');
        },
      });
  }
}
