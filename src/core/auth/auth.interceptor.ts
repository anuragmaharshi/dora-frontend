import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from './auth.service';

/**
 * Attaches the JWT Bearer token to every outgoing HTTP request.
 *
 * Login requests are intentionally skipped — they carry credentials in the
 * request body and must not include a stale token in the Authorization header.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // Skip the login endpoint — it doesn't require an Authorization header
  // and attaching one could interfere with the Spring Security filter chain.
  if (req.url.includes('/auth/login')) {
    return next(req);
  }

  const authService = inject(AuthService);
  const token = authService.token();

  if (!token) {
    return next(req);
  }

  const authedReq = req.clone({
    setHeaders: { Authorization: `Bearer ${token}` },
  });

  return next(authedReq);
};
