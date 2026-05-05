import { Routes } from '@angular/router';
import { authGuard } from '../core/auth/auth.guard';
import { LoginComponent } from '../core/auth/login.component';
import { LogoutComponent } from '../core/auth/logout.component';
import { ForbiddenComponent } from './features/forbidden/forbidden.component';
import { HealthComponent } from './features/health/health.component';

export const routes: Routes = [
  // Public routes — no guard required
  { path: 'login', component: LoginComponent },
  { path: '403', component: ForbiddenComponent },

  // Authenticated routes — protected by authGuard (AC-6)
  { path: 'logout', component: LogoutComponent, canActivate: [authGuard] },
  { path: '', component: HealthComponent, canActivate: [authGuard] },

  // Admin feature — lazy-loaded; individual routes carry roleGuard(['PLATFORM_ADMIN'])
  // AC-5: PLATFORM_ADMIN navigating to /incidents, /reports, /audit, /dashboard
  // is rejected by those routes' guards (which do not include PLATFORM_ADMIN).
  // AC-7: bank roles hitting /admin/** are rejected by roleGuard on each child route.
  {
    path: 'admin',
    loadChildren: () =>
      import('./features/admin/admin.routes').then((m) => m.adminRoutes),
  },

  // Fallback — redirect unknown paths to root (which itself redirects to /login if unauthed)
  { path: '**', redirectTo: '' },
];
