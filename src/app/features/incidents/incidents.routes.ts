import { Routes } from '@angular/router';
import { roleGuard } from '../../../core/auth/role.guard';
import { authGuard } from '../../../core/auth/auth.guard';

/**
 * Bank roles allowed to access incident routes.
 * Extracted as a constant to avoid duplication across routes and to make the
 * "PLATFORM_ADMIN is NOT in this list" intent explicit.
 *
 * BOARD_VIEWER excluded per D-LLD05-BLOCKER-1 (Option C — deferred to LLD-14).
 * PLATFORM_ADMIN excluded — it is a SaaS admin role, not a bank role (Bug #18).
 */
const BANK_INCIDENT_ROLES = [
  'OPS_ANALYST',
  'INCIDENT_MANAGER',
  'COMPLIANCE_OFFICER',
  'CISO',
] as const;

/**
 * Incidents feature routes — LLD-05.
 *
 * /incidents       → IncidentListComponent (stub; full search deferred to LLD-14)
 *   Guard: roleGuard(BANK_INCIDENT_ROLES)
 *   Bug #18 fix: base /incidents route now guarded so PLATFORM_ADMIN → /403.
 *
 * /incidents/new  → IncidentCreateComponent
 *   Guard: roleGuard(BANK_INCIDENT_ROLES)
 *   Bug #17 fix: create form now has severity <select> field.
 *
 * /incidents/:id  → IncidentDetailComponent
 *   Guard: authGuard — any authenticated user may view (BOARD_VIEWER will be
 *   added in LLD-14 per BLOCKER-1 resolution).  Using authGuard rather than
 *   roleGuard here covers all four bank roles + CISO without an explicit list.
 *
 * Note: 'new' must appear before ':id' so the router does not treat the literal
 * string "new" as an incident UUID parameter.
 */
export const incidentRoutes: Routes = [
  {
    // Bug #18 fix: '' (list) route now has roleGuard — PLATFORM_ADMIN is blocked
    // and redirected to /403. Previously this route was absent, so PLATFORM_ADMIN
    // would land on the Angular router's '**' fallback instead of getting /403.
    path: '',
    canActivate: [roleGuard([...BANK_INCIDENT_ROLES])],
    loadComponent: () =>
      import('./pages/incident-list.component').then((m) => m.IncidentListComponent),
  },
  {
    path: 'new',
    canActivate: [roleGuard([...BANK_INCIDENT_ROLES])],
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
