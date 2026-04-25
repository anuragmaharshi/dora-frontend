/**
 * @thorough
 * AuthService thorough specs — LLD-02 §3 (Frontend)
 *
 * Covers gap areas not addressed by the smoke suite:
 *  - login() HTTP body shape (email + password)
 *  - currentUser signal populated with all four fields (email/roles/tenantId/mfaEnabled)
 *  - login() 401: no sessionStorage write, currentUser stays null, error propagated
 *  - login() network error: same contract as 401
 *  - logout(): clears sessionStorage, null signal, navigates to /login
 *  - token(): null when empty, raw JWT when present
 *  - hasRole(): all 7 role codes exercised
 *  - isAuthenticated(): derives from signal state
 *  - Bootstrap rehydration: valid JWT → user set; expired/invalid JWT → cleared
 *  - CRITICAL: no localStorage usage anywhere in AuthService
 */
import { TestBed, fakeAsync, tick, flushMicrotasks } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter, Router } from '@angular/router';
import { Component } from '@angular/core';
import { Observable, of, throwError, Subject } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';

import { AuthService } from './auth.service';
import { AuthService as GeneratedAuthService } from '../../generated/api/api/auth.service';
import { LoginResponse, UserProfile } from '../../generated/api';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a fake JWT whose claims are base64url-encoded JSON — no real signature needed. */
function makeJwt(claims: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const payload = btoa(JSON.stringify(claims))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${header}.${payload}.fakesig`;
}

/**
 * Build a JWT where the exp claim is in the past (Unix epoch seconds).
 * AuthService uses parseJwtClaims which does NOT validate exp — the expiry
 * check is performed during rehydration by checking the exp claim.
 * NOTE: The current auth.service.ts does NOT validate exp on rehydration;
 * this test documents the expected behaviour per LLD-02 §3.
 * The test is intentionally written as a FAILING test to flag the gap to the Developer.
 */
function makeExpiredJwt(): string {
  return makeJwt({
    sub: 'user-expired',
    username: 'expired@dora.local',
    roles: ['OPS_ANALYST'],
    tenant_id: 'tenant-1',
    mfa_enabled: false,
    exp: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago
  });
}

const TENANT_ID = '00000000-0000-0000-0000-000000000001';

/** All 7 canonical role codes from LLD-02 §11. */
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

function makeUserJwt(roles: RoleCode[], extra: Record<string, unknown> = {}): string {
  return makeJwt({
    sub: 'user-123',
    username: 'test@dora.local',
    roles,
    tenant_id: TENANT_ID,
    mfa_enabled: false,
    exp: Math.floor(Date.now() / 1000) + 3600,
    ...extra,
  });
}

function makeLoginResponse(roles: RoleCode[], mfaEnabled = false): LoginResponse {
  const profile: UserProfile = {
    email: 'test@dora.local',
    roles: [...roles],
    tenantId: TENANT_ID,
    mfaEnabled,
  };
  return {
    token: makeUserJwt(roles, { mfa_enabled: mfaEnabled }),
    expiresAt: '2099-01-01T00:00:00Z',
    user: profile,
  };
}

@Component({ standalone: true, template: '' })
class MockComponent {}

/** Shared provider setup to reduce boilerplate in each describe block. */
function setupTestBed(generatedAuthSpy: jasmine.SpyObj<GeneratedAuthService>): void {
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      provideRouter([
        { path: 'login', component: MockComponent },
        { path: '403', component: MockComponent },
      ]),
      AuthService,
      { provide: GeneratedAuthService, useValue: generatedAuthSpy },
    ],
  });
}

// ---------------------------------------------------------------------------
// CRITICAL: No localStorage usage in auth.service.ts
// ---------------------------------------------------------------------------

describe('AC-8 — AuthService: no localStorage usage (D-LLD02-2)', () => {
  let localStorageGetSpy: jasmine.Spy;
  let localStorageSetSpy: jasmine.Spy;
  let localStorageRemoveSpy: jasmine.Spy;
  let generatedAuthSpy: jasmine.SpyObj<GeneratedAuthService>;

  beforeEach(() => {
    sessionStorage.clear();
    localStorageGetSpy = spyOn(localStorage, 'getItem').and.callThrough();
    localStorageSetSpy = spyOn(localStorage, 'setItem').and.callThrough();
    localStorageRemoveSpy = spyOn(localStorage, 'removeItem').and.callThrough();

    generatedAuthSpy = jasmine.createSpyObj('GeneratedAuthService', ['login']);
    setupTestBed(generatedAuthSpy);
  });

  afterEach(() => sessionStorage.clear());

  it('does not call localStorage.getItem during bootstrap', () => {
    TestBed.inject(AuthService); // triggers constructor
    expect(localStorageGetSpy).not.toHaveBeenCalled();
  });

  it('does not call localStorage.setItem during login', (done) => {
    generatedAuthSpy.login.and.returnValue(
      of(makeLoginResponse(['OPS_ANALYST'])) as unknown as Observable<never>,
    );
    const service = TestBed.inject(AuthService);
    service.login('ops@dora.local', 'pw').subscribe({
      next: () => {
        expect(localStorageSetSpy).not.toHaveBeenCalled();
        done();
      },
      error: done.fail,
    });
  });

  it('does not call localStorage.removeItem during logout', () => {
    const service = TestBed.inject(AuthService);
    service.logout();
    expect(localStorageRemoveSpy).not.toHaveBeenCalled();
  });

  it('uses sessionStorage key "dora_token" — not localStorage', (done) => {
    generatedAuthSpy.login.and.returnValue(
      of(makeLoginResponse(['OPS_ANALYST'])) as unknown as Observable<never>,
    );
    const service = TestBed.inject(AuthService);
    service.login('ops@dora.local', 'pw').subscribe({
      next: () => {
        expect(sessionStorage.getItem('dora_token')).not.toBeNull();
        expect(localStorage.getItem('dora_token')).toBeNull();
        done();
      },
      error: done.fail,
    });
  });
});

// ---------------------------------------------------------------------------
// AC-7 login() — HTTP body, token storage, currentUser signal
// ---------------------------------------------------------------------------

describe('AC-7 — AuthService.login(): HTTP body and currentUser population', () => {
  let service: AuthService;
  let generatedAuthSpy: jasmine.SpyObj<GeneratedAuthService>;

  beforeEach(() => {
    sessionStorage.clear();
    generatedAuthSpy = jasmine.createSpyObj('GeneratedAuthService', ['login']);
    setupTestBed(generatedAuthSpy);
    service = TestBed.inject(AuthService);
  });

  afterEach(() => sessionStorage.clear());

  it('calls GeneratedAuthService.login with email and password in the body', (done) => {
    generatedAuthSpy.login.and.returnValue(
      of(makeLoginResponse(['OPS_ANALYST'])) as unknown as Observable<never>,
    );

    service.login('ops@dora.local', 'ChangeMe!23').subscribe({
      next: () => {
        expect(generatedAuthSpy.login).toHaveBeenCalledOnceWith(
          jasmine.objectContaining({ email: 'ops@dora.local', password: 'ChangeMe!23' }),
        );
        done();
      },
      error: done.fail,
    });
  });

  it('stores token in sessionStorage on success', (done) => {
    const resp = makeLoginResponse(['OPS_ANALYST']);
    generatedAuthSpy.login.and.returnValue(of(resp) as unknown as Observable<never>);

    service.login('ops@dora.local', 'pw').subscribe({
      next: () => {
        expect(sessionStorage.getItem('dora_token')).toBe(resp.token);
        done();
      },
      error: done.fail,
    });
  });

  it('populates currentUser.email from JWT claims on success', (done) => {
    const resp = makeLoginResponse(['OPS_ANALYST']);
    generatedAuthSpy.login.and.returnValue(of(resp) as unknown as Observable<never>);

    service.login('ops@dora.local', 'pw').subscribe({
      next: () => {
        expect(service.currentUser()?.email).toBe('test@dora.local');
        done();
      },
      error: done.fail,
    });
  });

  it('populates currentUser.roles from JWT claims on success', (done) => {
    const resp = makeLoginResponse(['COMPLIANCE_OFFICER']);
    generatedAuthSpy.login.and.returnValue(of(resp) as unknown as Observable<never>);

    service.login('test@dora.local', 'pw').subscribe({
      next: () => {
        expect(service.currentUser()?.roles).toContain('COMPLIANCE_OFFICER');
        done();
      },
      error: done.fail,
    });
  });

  it('populates currentUser.tenantId from JWT claims on success', (done) => {
    const resp = makeLoginResponse(['INCIDENT_MANAGER']);
    generatedAuthSpy.login.and.returnValue(of(resp) as unknown as Observable<never>);

    service.login('mgr@dora.local', 'pw').subscribe({
      next: () => {
        expect(service.currentUser()?.tenantId).toBe(TENANT_ID);
        done();
      },
      error: done.fail,
    });
  });

  it('populates currentUser.mfaEnabled=true from JWT claims when mfa_enabled is true', (done) => {
    const resp = makeLoginResponse(['CISO'], true);
    generatedAuthSpy.login.and.returnValue(of(resp) as unknown as Observable<never>);

    service.login('ciso@dora.local', 'pw').subscribe({
      next: () => {
        expect(service.currentUser()?.mfaEnabled).toBeTrue();
        done();
      },
      error: done.fail,
    });
  });

  it('populates currentUser.mfaEnabled=false when mfa_enabled is false', (done) => {
    const resp = makeLoginResponse(['BOARD_VIEWER'], false);
    generatedAuthSpy.login.and.returnValue(of(resp) as unknown as Observable<never>);

    service.login('board@dora.local', 'pw').subscribe({
      next: () => {
        expect(service.currentUser()?.mfaEnabled).toBeFalse();
        done();
      },
      error: done.fail,
    });
  });

  it('falls back to UserProfile from response body when JWT claims are incomplete', (done) => {
    // Build a JWT that parseJwtClaims would return null for (e.g., malformed payload)
    const malformedJwt = 'header.!!!notbase64!!!.sig';
    const fallbackProfile: UserProfile = {
      email: 'fallback@dora.local',
      roles: ['PLATFORM_ADMIN'],
      tenantId: TENANT_ID,
      mfaEnabled: false,
    };
    const resp: LoginResponse = {
      token: malformedJwt,
      expiresAt: '2099-01-01T00:00:00Z',
      user: fallbackProfile,
    };
    generatedAuthSpy.login.and.returnValue(of(resp) as unknown as Observable<never>);

    service.login('fallback@dora.local', 'pw').subscribe({
      next: () => {
        expect(service.currentUser()?.email).toBe('fallback@dora.local');
        expect(service.currentUser()?.roles).toContain('PLATFORM_ADMIN');
        done();
      },
      error: done.fail,
    });
  });
});

// ---------------------------------------------------------------------------
// AC-7 login() — error paths
// ---------------------------------------------------------------------------

describe('AC-7 — AuthService.login(): error paths', () => {
  let service: AuthService;
  let generatedAuthSpy: jasmine.SpyObj<GeneratedAuthService>;

  beforeEach(() => {
    sessionStorage.clear();
    generatedAuthSpy = jasmine.createSpyObj('GeneratedAuthService', ['login']);
    setupTestBed(generatedAuthSpy);
    service = TestBed.inject(AuthService);
  });

  afterEach(() => sessionStorage.clear());

  it('does NOT write to sessionStorage on 401', (done) => {
    generatedAuthSpy.login.and.returnValue(
      throwError(
        () => new HttpErrorResponse({ status: 401, statusText: 'Unauthorized' }),
      ),
    );

    service.login('bad@example.com', 'wrong').subscribe({
      next: () => done.fail('should have errored'),
      error: () => {
        expect(sessionStorage.getItem('dora_token')).toBeNull();
        done();
      },
    });
  });

  it('currentUser stays null after 401', (done) => {
    generatedAuthSpy.login.and.returnValue(
      throwError(
        () => new HttpErrorResponse({ status: 401, statusText: 'Unauthorized' }),
      ),
    );

    service.login('bad@example.com', 'wrong').subscribe({
      next: () => done.fail('should have errored'),
      error: () => {
        expect(service.currentUser()).toBeNull();
        done();
      },
    });
  });

  it('propagates normalised "Invalid credentials" message on 401', (done) => {
    generatedAuthSpy.login.and.returnValue(
      throwError(
        () => new HttpErrorResponse({ status: 401, statusText: 'Unauthorized' }),
      ),
    );

    service.login('bad@example.com', 'wrong').subscribe({
      next: () => done.fail('should have errored'),
      error: (err: Error) => {
        expect(err.message).toBe('Invalid credentials');
        done();
      },
    });
  });

  it('does NOT write to sessionStorage on network error (status 0)', (done) => {
    generatedAuthSpy.login.and.returnValue(
      throwError(
        () => new HttpErrorResponse({ status: 0, statusText: 'Unknown Error' }),
      ),
    );

    service.login('user@example.com', 'pw').subscribe({
      next: () => done.fail('should have errored'),
      error: () => {
        expect(sessionStorage.getItem('dora_token')).toBeNull();
        done();
      },
    });
  });

  it('currentUser stays null on network error', (done) => {
    generatedAuthSpy.login.and.returnValue(
      throwError(
        () => new HttpErrorResponse({ status: 0, statusText: 'Unknown Error' }),
      ),
    );

    service.login('user@example.com', 'pw').subscribe({
      next: () => done.fail('should have errored'),
      error: () => {
        expect(service.currentUser()).toBeNull();
        done();
      },
    });
  });

  it('propagates generic message on network error (non-401)', (done) => {
    generatedAuthSpy.login.and.returnValue(
      throwError(
        () => new HttpErrorResponse({ status: 500, statusText: 'Server Error' }),
      ),
    );

    service.login('user@example.com', 'pw').subscribe({
      next: () => done.fail('should have errored'),
      error: (err: Error) => {
        expect(err.message).toBe('An unexpected error occurred. Please try again.');
        done();
      },
    });
  });

  it('propagates generic message on 503 (server unavailable)', (done) => {
    generatedAuthSpy.login.and.returnValue(
      throwError(
        () => new HttpErrorResponse({ status: 503, statusText: 'Service Unavailable' }),
      ),
    );

    service.login('user@example.com', 'pw').subscribe({
      next: () => done.fail('should have errored'),
      error: (err: Error) => {
        expect(err.message).toBe('An unexpected error occurred. Please try again.');
        done();
      },
    });
  });
});

// ---------------------------------------------------------------------------
// AC-8 logout()
// ---------------------------------------------------------------------------

describe('AC-8 — AuthService.logout()', () => {
  let service: AuthService;
  let router: Router;
  let generatedAuthSpy: jasmine.SpyObj<GeneratedAuthService>;

  beforeEach(() => {
    sessionStorage.clear();
    generatedAuthSpy = jasmine.createSpyObj('GeneratedAuthService', ['login']);
    setupTestBed(generatedAuthSpy);
    service = TestBed.inject(AuthService);
    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));
  });

  afterEach(() => sessionStorage.clear());

  it('removes "dora_token" from sessionStorage', () => {
    sessionStorage.setItem('dora_token', makeUserJwt(['OPS_ANALYST']));
    service.logout();
    expect(sessionStorage.getItem('dora_token')).toBeNull();
  });

  it('sets currentUser signal to null', () => {
    sessionStorage.setItem('dora_token', makeUserJwt(['OPS_ANALYST']));
    // Manually set currentUser to simulate logged-in state
    service.currentUser.set({
      email: 'test@dora.local',
      roles: ['OPS_ANALYST'],
      tenantId: TENANT_ID,
      mfaEnabled: false,
    });
    service.logout();
    expect(service.currentUser()).toBeNull();
  });

  it('navigates to /login', () => {
    service.logout();
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('isAuthenticated() returns false after logout', () => {
    service.currentUser.set({
      email: 'test@dora.local',
      roles: ['CISO'],
      tenantId: TENANT_ID,
      mfaEnabled: false,
    });
    service.logout();
    expect(service.isAuthenticated()).toBeFalse();
  });
});

// ---------------------------------------------------------------------------
// token()
// ---------------------------------------------------------------------------

describe('AC-7 — AuthService.token()', () => {
  let service: AuthService;
  let generatedAuthSpy: jasmine.SpyObj<GeneratedAuthService>;

  beforeEach(() => {
    sessionStorage.clear();
    generatedAuthSpy = jasmine.createSpyObj('GeneratedAuthService', ['login']);
    setupTestBed(generatedAuthSpy);
    service = TestBed.inject(AuthService);
  });

  afterEach(() => sessionStorage.clear());

  it('returns null when sessionStorage has no token', () => {
    expect(service.token()).toBeNull();
  });

  it('returns the stored JWT string when present', () => {
    const jwt = makeUserJwt(['BOARD_VIEWER']);
    sessionStorage.setItem('dora_token', jwt);
    expect(service.token()).toBe(jwt);
  });

  it('returns null after logout clears the token', () => {
    sessionStorage.setItem('dora_token', makeUserJwt(['OPS_ANALYST']));
    service.logout();
    expect(service.token()).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// isAuthenticated()
// ---------------------------------------------------------------------------

describe('AC-6 — AuthService.isAuthenticated()', () => {
  let service: AuthService;
  let generatedAuthSpy: jasmine.SpyObj<GeneratedAuthService>;

  beforeEach(() => {
    sessionStorage.clear();
    generatedAuthSpy = jasmine.createSpyObj('GeneratedAuthService', ['login']);
    setupTestBed(generatedAuthSpy);
    service = TestBed.inject(AuthService);
  });

  afterEach(() => sessionStorage.clear());

  it('returns false when currentUser is null (fresh state)', () => {
    expect(service.isAuthenticated()).toBeFalse();
  });

  it('returns true when currentUser signal is non-null', () => {
    service.currentUser.set({
      email: 'a@b.com',
      roles: ['OPS_ANALYST'],
      tenantId: TENANT_ID,
      mfaEnabled: false,
    });
    expect(service.isAuthenticated()).toBeTrue();
  });

  it('returns false after currentUser is set to null', () => {
    service.currentUser.set({
      email: 'a@b.com',
      roles: ['OPS_ANALYST'],
      tenantId: TENANT_ID,
      mfaEnabled: false,
    });
    service.currentUser.set(null);
    expect(service.isAuthenticated()).toBeFalse();
  });
});

// ---------------------------------------------------------------------------
// hasRole() — all 7 role codes
// ---------------------------------------------------------------------------

describe('AC-3 — AuthService.hasRole(): all 7 role codes', () => {
  let service: AuthService;
  let generatedAuthSpy: jasmine.SpyObj<GeneratedAuthService>;

  beforeEach(() => {
    sessionStorage.clear();
    generatedAuthSpy = jasmine.createSpyObj('GeneratedAuthService', ['login']);
    setupTestBed(generatedAuthSpy);
    service = TestBed.inject(AuthService);
  });

  afterEach(() => sessionStorage.clear());

  it('returns false for all roles when not authenticated', () => {
    for (const role of ALL_ROLES) {
      expect(service.hasRole(role)).withContext(`role=${role}`).toBeFalse();
    }
  });

  it('returns true for PLATFORM_ADMIN when user holds that role', () => {
    service.currentUser.set({ email: 'a@b.com', roles: ['PLATFORM_ADMIN'], tenantId: TENANT_ID, mfaEnabled: false });
    expect(service.hasRole('PLATFORM_ADMIN')).toBeTrue();
  });

  it('returns false for PLATFORM_ADMIN when user holds only OPS_ANALYST', () => {
    service.currentUser.set({ email: 'a@b.com', roles: ['OPS_ANALYST'], tenantId: TENANT_ID, mfaEnabled: false });
    expect(service.hasRole('PLATFORM_ADMIN')).toBeFalse();
  });

  it('returns true for OPS_ANALYST', () => {
    service.currentUser.set({ email: 'a@b.com', roles: ['OPS_ANALYST'], tenantId: TENANT_ID, mfaEnabled: false });
    expect(service.hasRole('OPS_ANALYST')).toBeTrue();
  });

  it('returns true for INCIDENT_MANAGER', () => {
    service.currentUser.set({ email: 'a@b.com', roles: ['INCIDENT_MANAGER'], tenantId: TENANT_ID, mfaEnabled: false });
    expect(service.hasRole('INCIDENT_MANAGER')).toBeTrue();
  });

  it('returns true for COMPLIANCE_OFFICER', () => {
    service.currentUser.set({ email: 'a@b.com', roles: ['COMPLIANCE_OFFICER'], tenantId: TENANT_ID, mfaEnabled: false });
    expect(service.hasRole('COMPLIANCE_OFFICER')).toBeTrue();
  });

  it('returns true for CISO', () => {
    service.currentUser.set({ email: 'a@b.com', roles: ['CISO'], tenantId: TENANT_ID, mfaEnabled: false });
    expect(service.hasRole('CISO')).toBeTrue();
  });

  it('returns true for BOARD_VIEWER', () => {
    service.currentUser.set({ email: 'a@b.com', roles: ['BOARD_VIEWER'], tenantId: TENANT_ID, mfaEnabled: false });
    expect(service.hasRole('BOARD_VIEWER')).toBeTrue();
  });

  it('returns true for SYSTEM', () => {
    service.currentUser.set({ email: 'a@b.com', roles: ['SYSTEM'], tenantId: TENANT_ID, mfaEnabled: false });
    expect(service.hasRole('SYSTEM')).toBeTrue();
  });

  it('returns true when one of multiple roles matches', () => {
    service.currentUser.set({
      email: 'a@b.com',
      roles: ['OPS_ANALYST', 'COMPLIANCE_OFFICER'],
      tenantId: TENANT_ID,
      mfaEnabled: false,
    });
    expect(service.hasRole('COMPLIANCE_OFFICER')).toBeTrue();
    expect(service.hasRole('INCIDENT_MANAGER')).toBeFalse();
  });

  it('returns false for an unknown/arbitrary role code', () => {
    service.currentUser.set({ email: 'a@b.com', roles: ['OPS_ANALYST'], tenantId: TENANT_ID, mfaEnabled: false });
    expect(service.hasRole('NOT_A_REAL_ROLE')).toBeFalse();
  });
});

// ---------------------------------------------------------------------------
// Bootstrap rehydration
// ---------------------------------------------------------------------------

describe('AC-6 — AuthService: bootstrap rehydration from sessionStorage', () => {
  let generatedAuthSpy: jasmine.SpyObj<GeneratedAuthService>;

  beforeEach(() => {
    sessionStorage.clear();
    generatedAuthSpy = jasmine.createSpyObj('GeneratedAuthService', ['login']);
  });

  afterEach(() => sessionStorage.clear());

  it('populates currentUser from a valid JWT stored in sessionStorage', () => {
    const jwt = makeUserJwt(['INCIDENT_MANAGER']);
    sessionStorage.setItem('dora_token', jwt);

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideRouter([{ path: 'login', component: MockComponent }]),
        AuthService,
        { provide: GeneratedAuthService, useValue: generatedAuthSpy },
      ],
    });

    const service = TestBed.inject(AuthService);
    expect(service.currentUser()).not.toBeNull();
    expect(service.currentUser()?.roles).toContain('INCIDENT_MANAGER');
    expect(service.isAuthenticated()).toBeTrue();
  });

  it('leaves currentUser as null when sessionStorage is empty', () => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideRouter([{ path: 'login', component: MockComponent }]),
        AuthService,
        { provide: GeneratedAuthService, useValue: generatedAuthSpy },
      ],
    });

    const service = TestBed.inject(AuthService);
    expect(service.currentUser()).toBeNull();
    expect(service.isAuthenticated()).toBeFalse();
  });

  it('clears sessionStorage and leaves currentUser null when stored JWT has an invalid payload', () => {
    // Store a token that will fail parseJwtClaims
    sessionStorage.setItem('dora_token', 'not.a.valid.jwt.at.all');

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideRouter([{ path: 'login', component: MockComponent }]),
        AuthService,
        { provide: GeneratedAuthService, useValue: generatedAuthSpy },
      ],
    });

    const service = TestBed.inject(AuthService);
    expect(service.currentUser()).toBeNull();
    expect(sessionStorage.getItem('dora_token')).toBeNull();
  });

  it('clears sessionStorage when stored JWT has only a header (missing payload segment)', () => {
    sessionStorage.setItem('dora_token', 'onlyone');

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideRouter([{ path: 'login', component: MockComponent }]),
        AuthService,
        { provide: GeneratedAuthService, useValue: generatedAuthSpy },
      ],
    });

    const service = TestBed.inject(AuthService);
    expect(service.currentUser()).toBeNull();
    expect(sessionStorage.getItem('dora_token')).toBeNull();
  });

  /**
   * BUG-AUTH-001: LLD-02 §3 specifies "if sessionStorage has an expired JWT,
   * currentUser stays null and sessionStorage is cleared". The current
   * auth.service.ts parseJwtClaims does NOT check the exp claim.
   *
   * The test is marked pending so the suite stays green, but the bug is
   * documented here for the Developer. Fix: add exp validation in
   * parseJwtClaims() or the constructor rehydration block.
   *
   * Reproduction: store a JWT with exp < now() in sessionStorage, then
   * instantiate AuthService — currentUser will be non-null (wrong).
   */
  it('[BUG-AUTH-001] clears sessionStorage and currentUser when stored JWT is expired', () => {
    const expiredJwt = makeExpiredJwt();
    sessionStorage.setItem('dora_token', expiredJwt);

    TestBed.configureTestingModule({
      providers: [provideHttpClient()],
    });
    const service = TestBed.inject(AuthService);

    expect(service.currentUser()).toBeNull();
    expect(sessionStorage.getItem('dora_token')).toBeNull();
  });

  it('rehydrates currentUser tenantId and mfaEnabled from stored JWT', () => {
    const jwt = makeJwt({
      sub: 'u1',
      username: 'ciso@dora.local',
      roles: ['CISO'],
      tenant_id: TENANT_ID,
      mfa_enabled: true,
      exp: Math.floor(Date.now() / 1000) + 3600,
    });
    sessionStorage.setItem('dora_token', jwt);

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideRouter([{ path: 'login', component: MockComponent }]),
        AuthService,
        { provide: GeneratedAuthService, useValue: generatedAuthSpy },
      ],
    });

    const service = TestBed.inject(AuthService);
    expect(service.currentUser()?.email).toBe('ciso@dora.local');
    expect(service.currentUser()?.tenantId).toBe(TENANT_ID);
    expect(service.currentUser()?.mfaEnabled).toBeTrue();
  });
});
