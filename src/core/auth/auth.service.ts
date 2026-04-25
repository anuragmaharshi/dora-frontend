import { Injectable, signal, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap, map, catchError, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService as GeneratedAuthService } from '../../generated/api/api/auth.service';
import { LoginRequest, UserProfile } from '../../generated/api';

/** Shape of the JWT claims we extract client-side. */
export interface CurrentUser {
  email: string;
  roles: string[];
  tenantId: string;
  mfaEnabled: boolean;
}

/** sessionStorage key — never localStorage (D-LLD02-2). */
const SESSION_KEY = 'dora_token';

function parseJwtClaims(token: string): CurrentUser | null {
  try {
    const payloadB64 = token.split('.')[1];
    if (!payloadB64) return null;
    // JWT Base64url → Base64 standard → UTF-8 JSON
    const json = atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/'));
    const claims = JSON.parse(json);
    return {
      email: claims['username'] ?? claims['sub'] ?? '',
      roles: Array.isArray(claims['roles']) ? claims['roles'] : [],
      tenantId: claims['tenant_id'] ?? '',
      mfaEnabled: !!claims['mfa_enabled'],
    };
  } catch {
    return null;
  }
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly router = inject(Router);
  private readonly generatedAuth = inject(GeneratedAuthService);

  /** Reactive signal — components can read this directly without subscribing. */
  readonly currentUser = signal<CurrentUser | null>(null);

  constructor() {
    // Rehydrate from sessionStorage on bootstrap so a page refresh
    // within the same tab preserves the session.
    const stored = sessionStorage.getItem(SESSION_KEY);
    if (stored) {
      const user = parseJwtClaims(stored);
      if (user) {
        this.currentUser.set(user);
      } else {
        sessionStorage.removeItem(SESSION_KEY);
      }
    }
  }

  /**
   * Authenticate the user via POST /api/v1/auth/login.
   * On success, stores the JWT in sessionStorage and updates currentUser.
   * Callers receive an error observable on 401 with a normalised message.
   */
  login(email: string, password: string): Observable<void> {
    const body: LoginRequest = { email, password };
    return this.generatedAuth.login(body).pipe(
      tap((response) => {
        sessionStorage.setItem(SESSION_KEY, response.token);
        const user = parseJwtClaims(response.token);
        // Fallback: use the UserProfile returned in the response body when
        // the JWT claims don't carry all the required fields (e.g. staging
        // deployments with older token shapes).
        this.currentUser.set(
          user ?? this.userProfileToCurrentUser(response.user),
        );
      }),
      map(() => void 0),
      catchError((err: HttpErrorResponse) => {
        // Normalise to a single string message so the component only
        // needs to handle one error type.
        const message =
          err.status === 401
            ? 'Invalid credentials'
            : 'An unexpected error occurred. Please try again.';
        return throwError(() => new Error(message));
      }),
    );
  }

  /**
   * Clear the session and navigate to /login.
   * Does not call the server logout endpoint — token is simply discarded
   * (stateless JWT). A future LLD can add server-side token revocation.
   */
  logout(): void {
    sessionStorage.removeItem(SESSION_KEY);
    this.currentUser.set(null);
    this.router.navigate(['/login']);
  }

  /** Returns the raw JWT string or null if not authenticated. */
  token(): string | null {
    return sessionStorage.getItem(SESSION_KEY);
  }

  /** True when currentUser is non-null. */
  isAuthenticated(): boolean {
    return this.currentUser() !== null;
  }

  /** True when the current user holds the given role code. */
  hasRole(role: string): boolean {
    return this.currentUser()?.roles.includes(role) ?? false;
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private userProfileToCurrentUser(profile: UserProfile): CurrentUser {
    return {
      email: profile.email,
      roles: profile.roles,
      tenantId: profile.tenantId,
      mfaEnabled: profile.mfaEnabled,
    };
  }
}
