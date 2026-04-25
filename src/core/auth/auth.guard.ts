import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

/**
 * Route guard — redirects unauthenticated users to /login.
 *
 * AC-6: When a user navigates to a guarded route without a stored token,
 * they are redirected to /login with returnUrl set so the app can navigate
 * back after successful authentication.
 */
export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    return true;
  }

  // Preserve the attempted URL so LoginComponent can redirect back after auth.
  router.navigate(['/login'], {
    queryParams: { returnUrl: state.url },
  });
  return false;
};
