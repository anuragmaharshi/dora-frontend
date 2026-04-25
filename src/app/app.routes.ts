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

  // Fallback — redirect unknown paths to root (which itself redirects to /login if unauthed)
  { path: '**', redirectTo: '' },
];
