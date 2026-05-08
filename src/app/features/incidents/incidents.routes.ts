import { Routes } from '@angular/router';
import { roleGuard } from '../../../core/auth/role.guard';
import { authGuard } from '../../../core/auth/auth.guard';

/**
 * Incidents feature routes — LLD-05.
 *
 * /incidents/new  → IncidentCreateComponent
 *   Guard: roleGuard(['OPS_ANALYST','INCIDENT_MANAGER','COMPLIANCE_OFFICER','CISO'])
 *   Rationale: only these four bank roles may create incidents.
 *   BOARD_VIEWER excluded per D-LLD05-BLOCKER-1 (Option C — deferred to LLD-14).
 *   PLATFORM_ADMIN excluded — it is a SaaS admin role, not a bank role.
 *
 * /incidents/:id  → IncidentDetailComponent
 *   Guard: authGuard — any authenticated user may view (BOARD_VIEWER will be
 *   added in LLD-14 per BLOCKER-1 resolution).  Using authGuard rather than
 *   roleGuard here covers all four bank roles + CISO without an explicit list.
 */
export const incidentRoutes: Routes = [
  {
    path: 'new',
    canActivate: [roleGuard(['OPS_ANALYST', 'INCIDENT_MANAGER', 'COMPLIANCE_OFFICER', 'CISO'])],
    loadComponent: () =>
      import('./pages/incident-create.component').then((m) => m.IncidentCreateComponent),
  },
  {
    path: ':id',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/incident-detail.component').then((m) => m.IncidentDetailComponent),
  },
];
