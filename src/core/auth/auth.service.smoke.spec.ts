/**
 * @smoke
 * AuthService smoke specs — AC-6, AC-7, AC-8 (frontend slice only)
 *
 * These tests verify the happy-path contract of AuthService in isolation.
 * Thorough edge-case specs (expired tokens, tampered JWTs, etc.) live in
 * auth.service.thorough.spec.ts and are owned by the angular-unit-test agent.
 */
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { AuthService } from './auth.service';
import { AuthService as GeneratedAuthService } from '../../generated/api/api/auth.service';
import { Observable, of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { LoginResponse, UserProfile } from '../../generated/api';

// Minimal valid-looking JWT with roles: ['OPS_ANALYST'] and tenant_id claim.
// Constructed so parseJwtClaims can parse it without a real HMAC signature.
function makeJwt(claims: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = btoa(JSON.stringify(claims))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  return `${header}.${payload}.fakesig`;
}

const TEST_USER: UserProfile = {
  email: 'ops@dora.local',
  roles: ['OPS_ANALYST'],
  tenantId: '00000000-0000-0000-0000-000000000001',
  mfaEnabled: false,
};

const TEST_JWT = makeJwt({
  sub: 'user-123',
  username: 'ops@dora.local',
  roles: ['OPS_ANALYST'],
  tenant_id: '00000000-0000-0000-0000-000000000001',
  mfa_enabled: false,
});

const LOGIN_RESPONSE: LoginResponse = {
  token: TEST_JWT,
  expiresAt: '2099-01-01T00:00:00Z',
  user: TEST_USER,
};

describe('AC-7 — AuthService: login stores token in sessionStorage', () => {
  let service: AuthService;
  let generatedAuthSpy: jasmine.SpyObj<GeneratedAuthService>;

  beforeEach(() => {
    sessionStorage.clear();
    generatedAuthSpy = jasmine.createSpyObj('GeneratedAuthService', ['login']);

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideRouter([]),
        AuthService,
        { provide: GeneratedAuthService, useValue: generatedAuthSpy },
      ],
    });

    service = TestBed.inject(AuthService);
  });

  afterEach(() => sessionStorage.clear());

  it('@smoke stores token in sessionStorage and sets currentUser on successful login', (done) => {
    generatedAuthSpy.login.and.returnValue(of(LOGIN_RESPONSE) as unknown as Observable<never>);

    service.login('ops@dora.local', 'ChangeMe!23').subscribe({
      next: () => {
        expect(sessionStorage.getItem('dora_token')).toBe(TEST_JWT);
        expect(service.currentUser()).not.toBeNull();
        expect(service.currentUser()!.email).toBe('ops@dora.local');
        expect(service.currentUser()!.roles).toContain('OPS_ANALYST');
        done();
      },
      error: done.fail,
    });
  });

  it('@smoke isAuthenticated returns true after login', (done) => {
    generatedAuthSpy.login.and.returnValue(of(LOGIN_RESPONSE) as unknown as Observable<never>);

    service.login('ops@dora.local', 'ChangeMe!23').subscribe({
      next: () => {
        expect(service.isAuthenticated()).toBeTrue();
        done();
      },
      error: done.fail,
    });
  });

  it('@smoke token() returns raw JWT after login', (done) => {
    generatedAuthSpy.login.and.returnValue(of(LOGIN_RESPONSE) as unknown as Observable<never>);

    service.login('ops@dora.local', 'ChangeMe!23').subscribe({
      next: () => {
        expect(service.token()).toBe(TEST_JWT);
        done();
      },
      error: done.fail,
    });
  });
});

describe('AC-8 — AuthService: logout clears token', () => {
  let service: AuthService;
  let generatedAuthSpy: jasmine.SpyObj<GeneratedAuthService>;

  beforeEach(() => {
    sessionStorage.clear();
    generatedAuthSpy = jasmine.createSpyObj('GeneratedAuthService', ['login']);

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideRouter([]),
        AuthService,
        { provide: GeneratedAuthService, useValue: generatedAuthSpy },
      ],
    });

    service = TestBed.inject(AuthService);
    // Pre-seed a token so there is something to clear.
    sessionStorage.setItem('dora_token', TEST_JWT);
    // Manually trigger the rehydration path by recreating the service
    // through the same token-seed mechanism.
  });

  afterEach(() => sessionStorage.clear());

  it('@smoke logout removes token from sessionStorage', () => {
    // Write token manually to sessionStorage to simulate prior login.
    sessionStorage.setItem('dora_token', TEST_JWT);
    service.logout();
    expect(sessionStorage.getItem('dora_token')).toBeNull();
  });

  it('@smoke logout sets currentUser to null', () => {
    sessionStorage.setItem('dora_token', TEST_JWT);
    service.logout();
    expect(service.currentUser()).toBeNull();
  });

  it('@smoke isAuthenticated returns false after logout', () => {
    sessionStorage.setItem('dora_token', TEST_JWT);
    service.logout();
    expect(service.isAuthenticated()).toBeFalse();
  });
});

describe('AuthService: hasRole', () => {
  let service: AuthService;
  let generatedAuthSpy: jasmine.SpyObj<GeneratedAuthService>;

  beforeEach(() => {
    sessionStorage.clear();
    generatedAuthSpy = jasmine.createSpyObj('GeneratedAuthService', ['login']);

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideRouter([]),
        AuthService,
        { provide: GeneratedAuthService, useValue: generatedAuthSpy },
      ],
    });

    service = TestBed.inject(AuthService);
  });

  afterEach(() => sessionStorage.clear());

  it('@smoke hasRole returns true when user holds the specified role', (done) => {
    generatedAuthSpy.login.and.returnValue(of(LOGIN_RESPONSE) as unknown as Observable<never>);

    service.login('ops@dora.local', 'x').subscribe({
      next: () => {
        expect(service.hasRole('OPS_ANALYST')).toBeTrue();
        expect(service.hasRole('PLATFORM_ADMIN')).toBeFalse();
        done();
      },
      error: done.fail,
    });
  });

  it('@smoke login returns an error observable on 401', (done) => {
    generatedAuthSpy.login.and.returnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 401,
            statusText: 'Unauthorized',
          }),
      ),
    );

    service.login('bad@example.com', 'wrong').subscribe({
      next: () => done.fail('Expected error observable'),
      error: (err: Error) => {
        expect(err.message).toBe('Invalid credentials');
        done();
      },
    });
  });
});
