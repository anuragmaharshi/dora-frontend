/**
 * @thorough
 * authGuard thorough specs — LLD-02 §3 (Frontend)
 *
 * Covers:
 *  - AC-6: Unauthenticated → /login?returnUrl=<encoded-path>
 *  - AC-6: Authenticated → guard returns true, no redirect
 *  - AC-6: returnUrl is URL-encoded for nested/special paths
 *  - AC-6: Guard is called with an ActivatedRouteSnapshot
 */
import { TestBed } from '@angular/core/testing';
import {
  provideRouter,
  Router,
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
} from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { Component } from '@angular/core';

import { authGuard } from './auth.guard';
import { AuthService } from './auth.service';

// ---------------------------------------------------------------------------
// Dummy components for route config
// ---------------------------------------------------------------------------

@Component({ standalone: true, template: '<p>protected</p>' })
class MockProtectedComponent {}

@Component({ standalone: true, template: '<p>nested</p>' })
class MockNestedComponent {}

@Component({ standalone: true, template: '<p>login</p>' })
class MockLoginComponent {}

@Component({ standalone: true, template: '<p>403</p>' })
class Mock403Component {}

@Component({ standalone: true, template: '<router-outlet />' })
class MockShellComponent {}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildAuthServiceSpy(authenticated: boolean): jasmine.SpyObj<AuthService> {
  const spy = jasmine.createSpyObj<AuthService>('AuthService', [
    'isAuthenticated',
    'hasRole',
    'token',
    'logout',
  ]);
  spy.isAuthenticated.and.returnValue(authenticated);
  spy.token.and.returnValue(authenticated ? 'mock-token' : null);
  return spy;
}

// ---------------------------------------------------------------------------
// AC-6 — authGuard redirect behaviour
// ---------------------------------------------------------------------------

describe('AC-6 — authGuard: unauthenticated user redirected to /login with returnUrl', () => {
  let router: Router;
  let authService: jasmine.SpyObj<AuthService>;

  beforeEach(() => {
    sessionStorage.clear();
    authService = buildAuthServiceSpy(false);

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideRouter([
          { path: 'login', component: MockLoginComponent },
          { path: '403', component: Mock403Component },
          {
            path: 'dashboard',
            component: MockProtectedComponent,
            canActivate: [authGuard],
          },
          {
            path: 'admin/users',
            component: MockNestedComponent,
            canActivate: [authGuard],
          },
        ]),
        { provide: AuthService, useValue: authService },
      ],
    });

    router = TestBed.inject(Router);
  });

  afterEach(() => sessionStorage.clear());

  it('redirects to /login when accessing /dashboard unauthenticated', async () => {
    await router.navigate(['/dashboard']);
    expect(router.url).toContain('/login');
  });

  it('includes returnUrl=%2Fdashboard query param when accessing /dashboard', async () => {
    await router.navigate(['/dashboard']);
    expect(router.url).toContain('returnUrl=%2Fdashboard');
  });

  it('URL-encodes nested path in returnUrl — /admin/users → %2Fadmin%2Fusers', async () => {
    await router.navigate(['/admin/users']);
    // The path segment /admin/users should appear URL-encoded as %2Fadmin%2Fusers
    expect(router.url).toContain('returnUrl=%2Fadmin%2Fusers');
  });

  it('does not navigate to the protected route when unauthenticated', async () => {
    await router.navigate(['/dashboard']);
    expect(router.url).not.toBe('/dashboard');
  });
});

describe('AC-6 — authGuard: authenticated user passes through', () => {
  let router: Router;
  let authService: jasmine.SpyObj<AuthService>;

  beforeEach(() => {
    sessionStorage.clear();
    authService = buildAuthServiceSpy(true);

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideRouter([
          { path: 'login', component: MockLoginComponent },
          {
            path: 'dashboard',
            component: MockProtectedComponent,
            canActivate: [authGuard],
          },
        ]),
        { provide: AuthService, useValue: authService },
      ],
    });

    router = TestBed.inject(Router);
  });

  afterEach(() => sessionStorage.clear());

  it('allows navigation to /dashboard for an authenticated user', async () => {
    await router.navigate(['/dashboard']);
    expect(router.url).toBe('/dashboard');
  });

  it('does NOT redirect to /login for an authenticated user', async () => {
    await router.navigate(['/dashboard']);
    expect(router.url).not.toContain('/login');
  });

  it('isAuthenticated() is called during guard execution', async () => {
    await router.navigate(['/dashboard']);
    expect(authService.isAuthenticated).toHaveBeenCalled();
  });
});

describe('AC-6 — authGuard: guard receives ActivatedRouteSnapshot', () => {
  it('guard function receives route and state arguments', () => {
    const authServiceSpy = buildAuthServiceSpy(false);
    const routerSpy = jasmine.createSpyObj<Router>('Router', ['navigate']);
    routerSpy.navigate.and.returnValue(Promise.resolve(true));

    // Call the guard function directly
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideRouter([{ path: 'login', component: MockLoginComponent }]),
        { provide: AuthService, useValue: authServiceSpy },
      ],
    });

    const routerFromTestBed = TestBed.inject(Router);
    const navigateSpy = spyOn(routerFromTestBed, 'navigate').and.returnValue(
      Promise.resolve(true),
    );

    const mockRoute = {} as ActivatedRouteSnapshot;
    const mockState = { url: '/some-path' } as RouterStateSnapshot;

    // Execute the guard in the injector context
    const result = TestBed.runInInjectionContext(() => authGuard(mockRoute, mockState));

    expect(result).toBeFalse();
    expect(navigateSpy).toHaveBeenCalledWith(
      ['/login'],
      jasmine.objectContaining({ queryParams: { returnUrl: '/some-path' } }),
    );
  });

  it('guard returns true and does not navigate when user is authenticated', () => {
    const authServiceSpy = buildAuthServiceSpy(true);

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideRouter([{ path: 'login', component: MockLoginComponent }]),
        { provide: AuthService, useValue: authServiceSpy },
      ],
    });

    const routerFromTestBed = TestBed.inject(Router);
    const navigateSpy = spyOn(routerFromTestBed, 'navigate').and.returnValue(
      Promise.resolve(true),
    );

    const mockRoute = {} as ActivatedRouteSnapshot;
    const mockState = { url: '/dashboard' } as RouterStateSnapshot;

    const result = TestBed.runInInjectionContext(() => authGuard(mockRoute, mockState));

    expect(result).toBeTrue();
    expect(navigateSpy).not.toHaveBeenCalled();
  });
});
