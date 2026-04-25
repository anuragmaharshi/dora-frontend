/**
 * @thorough
 * roleGuard thorough specs — LLD-02 §3 (Frontend)
 *
 * Covers:
 *  - AC-3: Authenticated user with matching role → true
 *  - AC-3: Authenticated user missing required role → redirect /403, false
 *  - AC-3: Authenticated user with multiple roles → allowed if any matches
 *  - AC-6: Unauthenticated user → redirect /login (NOT /403)
 *  - AC-3: Empty allowedRoles array → false for any authenticated user
 *  - AC-3: All 7 role codes exercised at least once
 */
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { Component } from '@angular/core';

import { roleGuard } from './role.guard';
import { AuthService } from './auth.service';

// ---------------------------------------------------------------------------
// All 7 role codes from LLD-02 §11
// ---------------------------------------------------------------------------
const ALL_ROLES = [
  'PLATFORM_ADMIN',
  'OPS_ANALYST',
  'INCIDENT_MANAGER',
  'COMPLIANCE_OFFICER',
  'CISO',
  'BOARD_VIEWER',
  'SYSTEM',
] as const;
type RoleCode = (typeof ALL_ROLES)[number];

// ---------------------------------------------------------------------------
// Dummy components
// ---------------------------------------------------------------------------

@Component({ standalone: true, template: '<p>admin</p>' })
class MockAdminComponent {}

@Component({ standalone: true, template: '<p>login</p>' })
class MockLoginComponent {}

@Component({ standalone: true, template: '<p>403</p>' })
class Mock403Component {}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildAuthServiceSpy(
  authenticated: boolean,
  userRoles: RoleCode[] = [],
): jasmine.SpyObj<AuthService> {
  const spy = jasmine.createSpyObj<AuthService>('AuthService', [
    'isAuthenticated',
    'hasRole',
    'token',
    'logout',
  ]);
  spy.isAuthenticated.and.returnValue(authenticated);
  spy.hasRole.and.callFake((role: string) => userRoles.includes(role as RoleCode));
  spy.token.and.returnValue(authenticated ? 'mock-token' : null);
  return spy;
}


// ---------------------------------------------------------------------------
// AC-3 — role match allows access
// ---------------------------------------------------------------------------

describe('AC-3 — roleGuard: authenticated user with matching role is allowed', () => {
  /**
   * Each role test gets its own isolated TestBed configuration by calling
   * TestBed.configureTestingModule() inside the it() body (after afterEach resets state).
   * This avoids "cannot override after instantiation" errors.
   */

  afterEach(() => sessionStorage.clear());

  it('OPS_ANALYST role: allows access to route guarded by [OPS_ANALYST]', () => {
    sessionStorage.clear();
    const spy = buildAuthServiceSpy(true, ['OPS_ANALYST']);
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideRouter([
          { path: 'login', component: MockLoginComponent },
          { path: '403', component: Mock403Component },
        ]),
        { provide: AuthService, useValue: spy },
      ],
    });
    const result = TestBed.runInInjectionContext(() =>
      roleGuard(['OPS_ANALYST'])({} as never, {} as never),
    );
    expect(result).toBeTrue();
  });

  it('PLATFORM_ADMIN role: allows access to route guarded by [PLATFORM_ADMIN]', () => {
    sessionStorage.clear();
    const spy = buildAuthServiceSpy(true, ['PLATFORM_ADMIN']);
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideRouter([
          { path: 'login', component: MockLoginComponent },
          { path: '403', component: Mock403Component },
        ]),
        { provide: AuthService, useValue: spy },
      ],
    });
    const result = TestBed.runInInjectionContext(() =>
      roleGuard(['PLATFORM_ADMIN'])({} as never, {} as never),
    );
    expect(result).toBeTrue();
  });

  it('INCIDENT_MANAGER role: allows access to route guarded by [INCIDENT_MANAGER]', () => {
    sessionStorage.clear();
    const spy = buildAuthServiceSpy(true, ['INCIDENT_MANAGER']);
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideRouter([
          { path: 'login', component: MockLoginComponent },
          { path: '403', component: Mock403Component },
        ]),
        { provide: AuthService, useValue: spy },
      ],
    });
    const result = TestBed.runInInjectionContext(() =>
      roleGuard(['INCIDENT_MANAGER'])({} as never, {} as never),
    );
    expect(result).toBeTrue();
  });

  it('COMPLIANCE_OFFICER role: allows access', () => {
    sessionStorage.clear();
    const spy = buildAuthServiceSpy(true, ['COMPLIANCE_OFFICER']);
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideRouter([
          { path: 'login', component: MockLoginComponent },
          { path: '403', component: Mock403Component },
        ]),
        { provide: AuthService, useValue: spy },
      ],
    });
    const result = TestBed.runInInjectionContext(() =>
      roleGuard(['COMPLIANCE_OFFICER'])({} as never, {} as never),
    );
    expect(result).toBeTrue();
  });

  it('CISO role: allows access', () => {
    sessionStorage.clear();
    const spy = buildAuthServiceSpy(true, ['CISO']);
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideRouter([
          { path: 'login', component: MockLoginComponent },
          { path: '403', component: Mock403Component },
        ]),
        { provide: AuthService, useValue: spy },
      ],
    });
    const result = TestBed.runInInjectionContext(() =>
      roleGuard(['CISO'])({} as never, {} as never),
    );
    expect(result).toBeTrue();
  });

  it('BOARD_VIEWER role: allows access', () => {
    sessionStorage.clear();
    const spy = buildAuthServiceSpy(true, ['BOARD_VIEWER']);
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideRouter([
          { path: 'login', component: MockLoginComponent },
          { path: '403', component: Mock403Component },
        ]),
        { provide: AuthService, useValue: spy },
      ],
    });
    const result = TestBed.runInInjectionContext(() =>
      roleGuard(['BOARD_VIEWER'])({} as never, {} as never),
    );
    expect(result).toBeTrue();
  });

  it('SYSTEM role: allows access', () => {
    sessionStorage.clear();
    const spy = buildAuthServiceSpy(true, ['SYSTEM']);
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideRouter([
          { path: 'login', component: MockLoginComponent },
          { path: '403', component: Mock403Component },
        ]),
        { provide: AuthService, useValue: spy },
      ],
    });
    const result = TestBed.runInInjectionContext(() =>
      roleGuard(['SYSTEM'])({} as never, {} as never),
    );
    expect(result).toBeTrue();
  });
});

// ---------------------------------------------------------------------------
// AC-3 — wrong role → redirect to /403
// ---------------------------------------------------------------------------

describe('AC-3 — roleGuard: authenticated user with wrong role redirected to /403', () => {
  let router: Router;
  let authService: jasmine.SpyObj<AuthService>;

  beforeEach(() => {
    sessionStorage.clear();
    authService = buildAuthServiceSpy(true, ['OPS_ANALYST']);

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideRouter([
          { path: 'login', component: MockLoginComponent },
          { path: '403', component: Mock403Component },
          {
            path: 'admin',
            component: MockAdminComponent,
            canActivate: [roleGuard(['PLATFORM_ADMIN'])],
          },
        ]),
        { provide: AuthService, useValue: authService },
      ],
    });

    router = TestBed.inject(Router);
  });

  afterEach(() => sessionStorage.clear());

  it('OPS_ANALYST accessing PLATFORM_ADMIN route → navigates to /403', async () => {
    await router.navigate(['/admin']);
    expect(router.url).toBe('/403');
  });

  it('OPS_ANALYST accessing PLATFORM_ADMIN route → does NOT navigate to /login', async () => {
    await router.navigate(['/admin']);
    expect(router.url).not.toContain('/login');
  });

  it('roleGuard returns false for OPS_ANALYST on PLATFORM_ADMIN-guarded route', () => {
    const result = TestBed.runInInjectionContext(() =>
      roleGuard(['PLATFORM_ADMIN'])({} as never, {} as never),
    );
    expect(result).toBeFalse();
  });
});

// ---------------------------------------------------------------------------
// AC-3 — multiple roles: any match grants access
// ---------------------------------------------------------------------------

describe('AC-3 — roleGuard: user with multiple roles — allowed if any role matches', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  afterEach(() => sessionStorage.clear());

  it('user with [OPS_ANALYST, COMPLIANCE_OFFICER] allowed on route guarded by [COMPLIANCE_OFFICER]', () => {
    const spy = buildAuthServiceSpy(true, ['OPS_ANALYST', 'COMPLIANCE_OFFICER']);
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideRouter([
          { path: 'login', component: MockLoginComponent },
          { path: '403', component: Mock403Component },
        ]),
        { provide: AuthService, useValue: spy },
      ],
    });

    const result = TestBed.runInInjectionContext(() =>
      roleGuard(['COMPLIANCE_OFFICER'])({} as never, {} as never),
    );
    expect(result).toBeTrue();
  });

  it('user with [INCIDENT_MANAGER, CISO] allowed on route guarded by [CISO, BOARD_VIEWER]', () => {
    const spy = buildAuthServiceSpy(true, ['INCIDENT_MANAGER', 'CISO']);
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideRouter([
          { path: 'login', component: MockLoginComponent },
          { path: '403', component: Mock403Component },
        ]),
        { provide: AuthService, useValue: spy },
      ],
    });

    const result = TestBed.runInInjectionContext(() =>
      roleGuard(['CISO', 'BOARD_VIEWER'])({} as never, {} as never),
    );
    expect(result).toBeTrue();
  });

  it('user with [OPS_ANALYST, INCIDENT_MANAGER] denied on route guarded by [PLATFORM_ADMIN, COMPLIANCE_OFFICER]', () => {
    const spy = buildAuthServiceSpy(true, ['OPS_ANALYST', 'INCIDENT_MANAGER']);
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideRouter([
          { path: 'login', component: MockLoginComponent },
          { path: '403', component: Mock403Component },
        ]),
        { provide: AuthService, useValue: spy },
      ],
    });

    const navigateSpy = spyOn(TestBed.inject(Router), 'navigate').and.returnValue(
      Promise.resolve(true),
    );
    const result = TestBed.runInInjectionContext(() =>
      roleGuard(['PLATFORM_ADMIN', 'COMPLIANCE_OFFICER'])({} as never, {} as never),
    );
    expect(result).toBeFalse();
    expect(navigateSpy).toHaveBeenCalledWith(['/403']);
  });
});

// ---------------------------------------------------------------------------
// AC-6 — unauthenticated user → /login (not /403)
// ---------------------------------------------------------------------------

describe('AC-6 — roleGuard: unauthenticated user redirected to /login not /403', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  afterEach(() => sessionStorage.clear());

  it('unauthenticated user accessing role-guarded route → navigates to /login', () => {
    const spy = buildAuthServiceSpy(false, []);
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideRouter([
          { path: 'login', component: MockLoginComponent },
          { path: '403', component: Mock403Component },
        ]),
        { provide: AuthService, useValue: spy },
      ],
    });

    const navigateSpy = spyOn(TestBed.inject(Router), 'navigate').and.returnValue(
      Promise.resolve(true),
    );
    const result = TestBed.runInInjectionContext(() =>
      roleGuard(['OPS_ANALYST'])({} as never, {} as never),
    );
    expect(result).toBeFalse();
    expect(navigateSpy).toHaveBeenCalledWith(['/login']);
    expect(navigateSpy).not.toHaveBeenCalledWith(['/403']);
  });

  it('unauthenticated user returns false', () => {
    const spy = buildAuthServiceSpy(false, []);
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideRouter([
          { path: 'login', component: MockLoginComponent },
          { path: '403', component: Mock403Component },
        ]),
        { provide: AuthService, useValue: spy },
      ],
    });

    spyOn(TestBed.inject(Router), 'navigate').and.returnValue(Promise.resolve(true));
    const result = TestBed.runInInjectionContext(() =>
      roleGuard(['PLATFORM_ADMIN'])({} as never, {} as never),
    );
    expect(result).toBeFalse();
  });
});

// ---------------------------------------------------------------------------
// AC-3 — empty allowedRoles array → deny all authenticated users
// ---------------------------------------------------------------------------

describe('AC-3 — roleGuard: empty allowedRoles array denies all authenticated users', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  afterEach(() => sessionStorage.clear());

  it('returns false for authenticated OPS_ANALYST when allowedRoles is []', () => {
    const spy = buildAuthServiceSpy(true, ['OPS_ANALYST']);
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideRouter([
          { path: 'login', component: MockLoginComponent },
          { path: '403', component: Mock403Component },
        ]),
        { provide: AuthService, useValue: spy },
      ],
    });

    spyOn(TestBed.inject(Router), 'navigate').and.returnValue(Promise.resolve(true));
    const result = TestBed.runInInjectionContext(() =>
      roleGuard([])({} as never, {} as never),
    );
    expect(result).toBeFalse();
  });

  it('redirects to /403 for authenticated user when allowedRoles is []', () => {
    const spy = buildAuthServiceSpy(true, ['PLATFORM_ADMIN']);
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideRouter([
          { path: 'login', component: MockLoginComponent },
          { path: '403', component: Mock403Component },
        ]),
        { provide: AuthService, useValue: spy },
      ],
    });

    const navigateSpy = spyOn(TestBed.inject(Router), 'navigate').and.returnValue(
      Promise.resolve(true),
    );
    TestBed.runInInjectionContext(() => roleGuard([])({} as never, {} as never));
    expect(navigateSpy).toHaveBeenCalledWith(['/403']);
  });
});

// ---------------------------------------------------------------------------
// Full router integration — all 7 role codes in one suite
// ---------------------------------------------------------------------------

describe('AC-3 — roleGuard: all 7 role codes exercised via router integration', () => {
  interface RoleScenario {
    userRoles: RoleCode[];
    guardRoles: RoleCode[];
    shouldAllow: boolean;
    path: string;
  }

  const scenarios: RoleScenario[] = [
    { userRoles: ['PLATFORM_ADMIN'], guardRoles: ['PLATFORM_ADMIN'], shouldAllow: true, path: '/pa' },
    { userRoles: ['OPS_ANALYST'], guardRoles: ['OPS_ANALYST'], shouldAllow: true, path: '/oa' },
    { userRoles: ['INCIDENT_MANAGER'], guardRoles: ['INCIDENT_MANAGER'], shouldAllow: true, path: '/im' },
    { userRoles: ['COMPLIANCE_OFFICER'], guardRoles: ['COMPLIANCE_OFFICER'], shouldAllow: true, path: '/co' },
    { userRoles: ['CISO'], guardRoles: ['CISO'], shouldAllow: true, path: '/ciso' },
    { userRoles: ['BOARD_VIEWER'], guardRoles: ['BOARD_VIEWER'], shouldAllow: true, path: '/bv' },
    { userRoles: ['SYSTEM'], guardRoles: ['SYSTEM'], shouldAllow: true, path: '/sys' },
    // Cross-role deny cases to confirm boundary
    { userRoles: ['OPS_ANALYST'], guardRoles: ['PLATFORM_ADMIN'], shouldAllow: false, path: '/pa-deny' },
    { userRoles: ['BOARD_VIEWER'], guardRoles: ['COMPLIANCE_OFFICER'], shouldAllow: false, path: '/co-deny' },
  ];

  for (const scenario of scenarios) {
    it(`${scenario.userRoles.join(',')} accessing ${scenario.guardRoles.join(',')} route → ${scenario.shouldAllow ? 'allowed' : 'denied'}`, () => {
      sessionStorage.clear();
      const spy = buildAuthServiceSpy(true, scenario.userRoles);
      TestBed.configureTestingModule({
        providers: [
          provideHttpClient(),
          provideRouter([
            { path: 'login', component: MockLoginComponent },
            { path: '403', component: Mock403Component },
          ]),
          { provide: AuthService, useValue: spy },
        ],
      });

      spyOn(TestBed.inject(Router), 'navigate').and.returnValue(Promise.resolve(true));
      const result = TestBed.runInInjectionContext(() =>
        roleGuard(scenario.guardRoles)({} as never, {} as never),
      );
      expect(result).withContext(`${scenario.userRoles} on ${scenario.guardRoles}`).toBe(scenario.shouldAllow);
      sessionStorage.clear();
    });
  }
});
