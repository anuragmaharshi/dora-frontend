/**
 * @smoke
 * authGuard smoke spec — AC-6: unauthenticated user redirected to /login
 *
 * Uses RouterTestingHarness for a realistic route-activation test.
 */
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter, Router } from '@angular/router';
import { Component } from '@angular/core';
import { AuthService } from './auth.service';
import { authGuard } from './auth.guard';

@Component({ standalone: true, template: '<p>protected</p>' })
class MockProtectedComponent {}

@Component({ standalone: true, template: '<p>login</p>' })
class MockLoginComponent {}

describe('AC-6 — authGuard: unauthenticated user redirected to /login', () => {
  let router: Router;
  let authService: jasmine.SpyObj<AuthService>;

  beforeEach(() => {
    authService = jasmine.createSpyObj('AuthService', ['isAuthenticated', 'token', 'hasRole', 'currentUser']);
    authService.isAuthenticated.and.returnValue(false);

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideRouter([
          { path: 'login', component: MockLoginComponent },
          {
            path: 'protected',
            component: MockProtectedComponent,
            canActivate: [authGuard],
          },
        ]),
        { provide: AuthService, useValue: authService },
      ],
    });

    router = TestBed.inject(Router);
  });

  it('@smoke redirects unauthenticated user to /login with returnUrl', async () => {
    await router.navigate(['/protected']);
    expect(router.url).toContain('/login');
    expect(router.url).toContain('returnUrl');
  });

  it('@smoke allows authenticated user to access guarded route', async () => {
    authService.isAuthenticated.and.returnValue(true);
    await router.navigate(['/protected']);
    expect(router.url).toBe('/protected');
  });
});
