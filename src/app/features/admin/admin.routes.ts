import { Routes } from '@angular/router';
import { roleGuard } from '../../../core/auth/role.guard';

/**
 * Admin feature routes — all guarded by roleGuard(['PLATFORM_ADMIN']).
 *
 * AC-5: PLATFORM_ADMIN attempting to navigate to /incidents, /reports,
 * /audit, or /dashboard is rejected at the route level by the guards on
 * those routes (which do NOT include PLATFORM_ADMIN in their allowed roles).
 * The redirect target is /403 (ForbiddenComponent already registered in
 * app.routes.ts).
 *
 * AC-7: bank-side roles attempting /admin/** are rejected here — they do not
 * have PLATFORM_ADMIN, so roleGuard sends them to /403.
 */
export const adminRoutes: Routes = [
  {
    path: 'tenant',
    canActivate: [roleGuard(['PLATFORM_ADMIN'])],
    loadComponent: () =>
      import('./pages/tenant-config.component').then((m) => m.TenantConfigComponent),
  },
  {
    path: 'critical-services',
    canActivate: [roleGuard(['PLATFORM_ADMIN'])],
    loadComponent: () =>
      import('./pages/critical-services.component').then((m) => m.CriticalServicesComponent),
  },
  {
    path: 'client-base',
    canActivate: [roleGuard(['PLATFORM_ADMIN'])],
    loadComponent: () =>
      import('./pages/client-base.component').then((m) => m.ClientBaseComponent),
  },
  {
    path: 'nca-email',
    canActivate: [roleGuard(['PLATFORM_ADMIN'])],
    loadComponent: () =>
      import('./pages/nca-email.component').then((m) => m.NcaEmailComponent),
  },
];
