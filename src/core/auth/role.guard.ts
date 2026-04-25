import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

/**
 * Factory that creates a role-checking route guard.
 *
 * Usage in route config:
 *   canActivate: [roleGuard(['COMPLIANCE_OFFICER', 'INCIDENT_MANAGER'])]
 *
 * - Unauthenticated users → /login
 * - Authenticated users missing every listed role → /403
 * - Authenticated users with at least one listed role → allowed through
 */
export function roleGuard(allowedRoles: string[]): CanActivateFn {
  return () => {
    const authService = inject(AuthService);
    const router = inject(Router);

    if (!authService.isAuthenticated()) {
      router.navigate(['/login']);
      return false;
    }

    const hasRequiredRole = allowedRoles.some((role) =>
      authService.hasRole(role),
    );

    if (!hasRequiredRole) {
      router.navigate(['/403']);
      return false;
    }

    return true;
  };
}
