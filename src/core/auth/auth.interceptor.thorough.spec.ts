/**
 * @thorough
 * authInterceptor thorough specs — LLD-02 §3 (Frontend)
 *
 * Covers:
 *  - AC-7: Bearer token attached on authenticated requests to /api/v1/auth/me
 *  - AC-7: Header NOT attached when the URL is /api/v1/auth/login (skip rule)
 *  - AC-7: No Authorization header when sessionStorage has no token
 *  - AC-7: No Authorization header even when token is present but URL is /auth/login
 */
import { TestBed } from '@angular/core/testing';
import {
  provideHttpClient,
  withInterceptors,
  HttpClient,
} from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { Component } from '@angular/core';

import { authInterceptor } from './auth.interceptor';
import { AuthService } from './auth.service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeJwt(claims: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const payload = btoa(JSON.stringify(claims))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${header}.${payload}.fakesig`;
}

const TEST_TOKEN = makeJwt({
  sub: 'user-1',
  username: 'ops@dora.local',
  roles: ['OPS_ANALYST'],
  tenant_id: '00000000-0000-0000-0000-000000000001',
  mfa_enabled: false,
});

@Component({ standalone: true, template: '' })
class MockComponent {}

// ---------------------------------------------------------------------------
// AC-7 — interceptor attaches Authorization header
// ---------------------------------------------------------------------------

describe('AC-7 — authInterceptor: Authorization header on authenticated requests', () => {
  let httpClient: HttpClient;
  let httpController: HttpTestingController;
  let authServiceSpy: jasmine.SpyObj<AuthService>;

  beforeEach(() => {
    sessionStorage.clear();
    authServiceSpy = jasmine.createSpyObj('AuthService', ['token', 'isAuthenticated', 'hasRole', 'currentUser']);

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        provideRouter([{ path: 'login', component: MockComponent }]),
        { provide: AuthService, useValue: authServiceSpy },
      ],
    });

    httpClient = TestBed.inject(HttpClient);
    httpController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpController.verify();
    sessionStorage.clear();
  });

  it('attaches Authorization: Bearer header to GET /api/v1/auth/me when token is present', () => {
    authServiceSpy.token.and.returnValue(TEST_TOKEN);

    httpClient.get('/api/v1/auth/me').subscribe();

    const req = httpController.expectOne('/api/v1/auth/me');
    expect(req.request.headers.get('Authorization')).toBe(`Bearer ${TEST_TOKEN}`);
    req.flush({});
  });

  it('attaches Authorization header to an arbitrary authenticated API request', () => {
    authServiceSpy.token.and.returnValue(TEST_TOKEN);

    httpClient.get('/api/v1/incidents').subscribe();

    const req = httpController.expectOne('/api/v1/incidents');
    expect(req.request.headers.get('Authorization')).toBe(`Bearer ${TEST_TOKEN}`);
    req.flush([]);
  });

  it('does NOT attach Authorization header when token is null', () => {
    authServiceSpy.token.and.returnValue(null);

    httpClient.get('/api/v1/auth/me').subscribe();

    const req = httpController.expectOne('/api/v1/auth/me');
    expect(req.request.headers.has('Authorization')).toBeFalse();
    req.flush({});
  });

  it('does NOT attach Authorization header for POST /api/v1/auth/login even when token is present', () => {
    authServiceSpy.token.and.returnValue(TEST_TOKEN);

    httpClient.post('/api/v1/auth/login', { email: 'a@b.com', password: 'pw' }).subscribe();

    const req = httpController.expectOne('/api/v1/auth/login');
    expect(req.request.headers.has('Authorization')).toBeFalse();
    req.flush({ token: TEST_TOKEN, expiresAt: '2099-01-01T00:00:00Z', user: {} });
  });

  it('does NOT attach Authorization header for any URL containing /auth/login (path variant)', () => {
    authServiceSpy.token.and.returnValue(TEST_TOKEN);

    // Test with a base-path-prefixed URL
    httpClient.post('https://api.example.com/api/v1/auth/login', {}).subscribe();

    const req = httpController.expectOne('https://api.example.com/api/v1/auth/login');
    expect(req.request.headers.has('Authorization')).toBeFalse();
    req.flush({});
  });

  it('passes the request through unchanged (no header) when no token and URL is /auth/login', () => {
    authServiceSpy.token.and.returnValue(null);

    httpClient.post('/api/v1/auth/login', {}).subscribe();

    const req = httpController.expectOne('/api/v1/auth/login');
    expect(req.request.headers.has('Authorization')).toBeFalse();
    req.flush({});
  });

  it('preserves existing headers while adding Authorization', () => {
    authServiceSpy.token.and.returnValue(TEST_TOKEN);

    httpClient
      .get('/api/v1/auth/me', { headers: { 'X-Custom-Header': 'custom-value' } })
      .subscribe();

    const req = httpController.expectOne('/api/v1/auth/me');
    expect(req.request.headers.get('Authorization')).toBe(`Bearer ${TEST_TOKEN}`);
    expect(req.request.headers.get('X-Custom-Header')).toBe('custom-value');
    req.flush({});
  });

  it('token() is called once per request to read the latest stored value', () => {
    authServiceSpy.token.and.returnValue(TEST_TOKEN);

    httpClient.get('/api/v1/some-endpoint').subscribe();

    const req = httpController.expectOne('/api/v1/some-endpoint');
    expect(authServiceSpy.token).toHaveBeenCalledTimes(1);
    req.flush({});
  });
});
