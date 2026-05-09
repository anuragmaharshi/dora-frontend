// @smoke — LLD-05 AC-8 (PLATFORM_ADMIN blocked from /incidents/new and /incidents list)
// Bug #18 fix: /incidents list route now also blocks PLATFORM_ADMIN
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { AuthService } from '../../../core/auth/auth.service';
import { incidentRoutes } from './incidents.routes';

/**
 * Route-level guard smoke test for AC-8.
 *
 * PLATFORM_ADMIN must NOT be able to activate /incidents/new.
 * OPS_ANALYST must be able to activate /incidents/new.
 *
 * We test the roleGuard factory directly via the route config rather than
 * navigating through RouterTestingHarness, to avoid loading heavy component
 * templates. The guard is the unit under test here.
 */
describe('AC-8 — incidentRoutes guard @smoke', () => {
  let router: Router;
  let authService: jasmine.SpyObj<AuthService>;

  function buildAuthSpy(): jasmine.SpyObj<AuthService> {
    return jasmine.createSpyObj<AuthService>('AuthService', [
      'isAuthenticated',
      'hasRole',
      'login',
      'logout',
      'token',
    ], {
      // signals are not in createSpyObj property list — we'll set them via object
      currentUser: null as unknown as typeof authService.currentUser,
    });
  }

  beforeEach(() => {
    authService = buildAuthSpy();
    authService.isAuthenticated.and.returnValue(true);

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

    router = TestBed.inject(Router);
  });

  it('AC-8: PLATFORM_ADMIN is redirected to /403 when navigating to /incidents/new', async () => {
    // PLATFORM_ADMIN does NOT have any of the allowed roles.
    authService.hasRole.and.callFake((role: string) =>
      role === 'PLATFORM_ADMIN',
    );

    await router.navigate(['/incidents/new']);
    // Guard redirects to /403 — the URL should reflect the redirect.
    expect(router.url).toBe('/403');
  });

  it('AC-8: OPS_ANALYST is allowed through to /incidents/new', async () => {
    authService.hasRole.and.callFake((role: string) =>
      ['OPS_ANALYST', 'INCIDENT_MANAGER', 'COMPLIANCE_OFFICER', 'CISO'].includes(role),
    );

    await router.navigate(['/incidents/new']);
    // Guard passes — URL is /incidents/new (component may not load without
    // template/imports, but navigation was not redirected to /403 or /login).
    expect(router.url).not.toBe('/403');
    expect(router.url).not.toBe('/login');
  });

  it('AC-8: unauthenticated user is redirected to /login', async () => {
    authService.isAuthenticated.and.returnValue(false);

    await router.navigate(['/incidents/new']);
    expect(router.url).toBe('/login');
  });

  // ── Bug #18 — PLATFORM_ADMIN blocked from /incidents list (base route) ─────

  it('Bug #18 AC-8: PLATFORM_ADMIN is redirected to /403 on the /incidents list route', async () => {
    // PLATFORM_ADMIN does NOT have any of the allowed bank roles.
    authService.hasRole.and.callFake((role: string) =>
      role === 'PLATFORM_ADMIN',
    );

    await router.navigate(['/incidents']);
    // roleGuard redirects to /403 — base /incidents route is now guarded.
    expect(router.url).toBe('/403');
  });

  it('Bug #18 AC-8: INCIDENT_MANAGER can access the /incidents list route', async () => {
    authService.hasRole.and.callFake((role: string) =>
      ['OPS_ANALYST', 'INCIDENT_MANAGER', 'COMPLIANCE_OFFICER', 'CISO'].includes(role),
    );

    await router.navigate(['/incidents']);
    // Guard passes — not redirected to /403 or /login.
    expect(router.url).not.toBe('/403');
    expect(router.url).not.toBe('/login');
  });

  it('Bug #18 AC-8: unauthenticated user is redirected to /login on the /incidents list route', async () => {
    authService.isAuthenticated.and.returnValue(false);

    await router.navigate(['/incidents']);
    expect(router.url).toBe('/login');
  });
});
