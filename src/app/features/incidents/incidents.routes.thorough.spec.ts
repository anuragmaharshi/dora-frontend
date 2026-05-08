// @thorough — LLD-05 AC-8
// Supplements smoke specs with: each allowed role individually tested,
// BOARD_VIEWER blocked, COMPLIANCE_OFFICER and CISO allowed,
// unauthenticated access to /incidents/:id redirects to /login,
// authenticated access to /incidents/:id is permitted.
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { AuthService } from '../../../core/auth/auth.service';
import { incidentRoutes } from './incidents.routes';

// ────────────────────────────────────────────────────────────────────────────
// Fixtures
// ────────────────────────────────────────────────────────────────────────────

function buildAuthSpy(): jasmine.SpyObj<AuthService> {
  return jasmine.createSpyObj<AuthService>('AuthService', [
    'isAuthenticated',
    'hasRole',
    'login',
    'logout',
    'token',
  ]);
}

function configureTestBed(authService: jasmine.SpyObj<AuthService>): void {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([
        { path: 'incidents', children: incidentRoutes },
        { path: 'login', children: [] },
        { path: '403', children: [] },
      ]),
      provideHttpClient(),
      { provide: AuthService, useValue: authService },
    ],
  });
}

// ────────────────────────────────────────────────────────────────────────────
// Suite
// ────────────────────────────────────────────────────────────────────────────

describe('incidentRoutes — thorough', () => {
  let router: Router;
  let authService: jasmine.SpyObj<AuthService>;

  // ──────────────────────────────────────────────────────────────────────────
  // AC-8 — /incidents/new: each allowed role individually
  // ──────────────────────────────────────────────────────────────────────────

  describe('AC-8 — /incidents/new: each allowed role passes the guard', () => {
    const allowedRoles = ['OPS_ANALYST', 'INCIDENT_MANAGER', 'COMPLIANCE_OFFICER', 'CISO'];

    allowedRoles.forEach((role) => {
      it(`AC-8: ${role} is allowed through to /incidents/new`, async () => {
        authService = buildAuthSpy();
        authService.isAuthenticated.and.returnValue(true);
        authService.hasRole.and.callFake((r: string) => r === role);
        configureTestBed(authService);

        router = TestBed.inject(Router);
        await router.navigate(['/incidents/new']);

        expect(router.url).not.toBe('/403');
        expect(router.url).not.toBe('/login');
      });
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // AC-8 — /incidents/new: roles that must be blocked
  // ──────────────────────────────────────────────────────────────────────────

  describe('AC-8 — /incidents/new: blocked roles redirected to /403', () => {
    const blockedRoles = ['PLATFORM_ADMIN', 'BOARD_VIEWER'];

    blockedRoles.forEach((role) => {
      it(`AC-8: ${role} is redirected to /403 when navigating to /incidents/new`, async () => {
        authService = buildAuthSpy();
        authService.isAuthenticated.and.returnValue(true);
        // Only this role — none of the allowed roles
        authService.hasRole.and.callFake((r: string) => r === role);
        configureTestBed(authService);

        router = TestBed.inject(Router);
        await router.navigate(['/incidents/new']);

        expect(router.url).toBe('/403');
      });
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // AC-8 — /incidents/new: unauthenticated
  // ──────────────────────────────────────────────────────────────────────────

  describe('AC-8 — /incidents/new: unauthenticated user', () => {
    it('unauthenticated user is redirected to /login when navigating to /incidents/new', async () => {
      authService = buildAuthSpy();
      authService.isAuthenticated.and.returnValue(false);
      configureTestBed(authService);

      router = TestBed.inject(Router);
      await router.navigate(['/incidents/new']);

      expect(router.url).toBe('/login');
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // AC-6 — /incidents/:id: authGuard behaviour
  // ──────────────────────────────────────────────────────────────────────────

  describe('AC-6 — /incidents/:id guard (authGuard)', () => {
    it('authenticated user can navigate to /incidents/:id without redirect', async () => {
      authService = buildAuthSpy();
      authService.isAuthenticated.and.returnValue(true);
      authService.hasRole.and.returnValue(false);
      configureTestBed(authService);

      router = TestBed.inject(Router);
      await router.navigate(['/incidents/uuid-inc-001']);

      // authGuard passes for any authenticated user
      expect(router.url).not.toBe('/login');
      expect(router.url).not.toBe('/403');
    });

    it('unauthenticated user is redirected to /login when navigating to /incidents/:id', async () => {
      authService = buildAuthSpy();
      authService.isAuthenticated.and.returnValue(false);
      configureTestBed(authService);

      router = TestBed.inject(Router);
      await router.navigate(['/incidents/uuid-inc-001']);

      // authGuard redirects to /login with returnUrl query param
      expect(router.url).toMatch(/^\/login/);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // AC-8 — BOARD_VIEWER can access /incidents/:id (authGuard, not roleGuard)
  // ──────────────────────────────────────────────────────────────────────────

  describe('AC-8 — BOARD_VIEWER allowed on /incidents/:id via authGuard (OPEN-Q LLD-14)', () => {
    it('authenticated BOARD_VIEWER can navigate to /incidents/:id', async () => {
      // BOARD_VIEWER is NOT on the roleGuard allowlist for /incidents/new
      // but CAN view /incidents/:id because authGuard is used there (not roleGuard).
      authService = buildAuthSpy();
      authService.isAuthenticated.and.returnValue(true);
      authService.hasRole.and.callFake((r: string) => r === 'BOARD_VIEWER');
      configureTestBed(authService);

      router = TestBed.inject(Router);
      await router.navigate(['/incidents/some-uuid']);

      expect(router.url).not.toBe('/login');
      expect(router.url).not.toBe('/403');
    });
  });
});
