/**
 * @thorough
 * LoginComponent thorough specs — LLD-02 §3 (Frontend)
 *
 * Covers:
 *  - AC-6: Form renders email + password fields and submit button
 *  - AC-6: Submit button disabled while request in flight (loading state)
 *  - AC-6: Submit button re-enabled after request completes (success and error)
 *  - AC-6: On valid login → AuthService.login() called with correct args
 *  - AC-6: On valid login → navigates to returnUrl from query params
 *  - AC-6: On valid login with no returnUrl → navigates to /
 *  - AC-6: On 401 → "Invalid credentials" shown in DOM
 *  - AC-6: On network error → generic error shown, form not stuck in loading state
 *  - AC-6: Empty form submission → invalid, no API call
 *  - Accessibility: labels associated with inputs; submit button keyboard-focusable
 */
import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ComponentFixture } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter, Router } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { Component } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';

import { LoginComponent } from './login.component';
import { AuthService } from './auth.service';

// ---------------------------------------------------------------------------
// Dummy components for route config
// ---------------------------------------------------------------------------

@Component({ standalone: true, template: '<p>home</p>' })
class MockHomeComponent {}

@Component({ standalone: true, template: '<p>dashboard</p>' })
class MockDashboardComponent {}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildAuthSpy(): jasmine.SpyObj<AuthService> {
  return jasmine.createSpyObj<AuthService>('AuthService', [
    'login',
    'logout',
    'isAuthenticated',
    'hasRole',
    'token',
  ]);
}

interface TestContext {
  fixture: ComponentFixture<LoginComponent>;
  component: LoginComponent;
  emailInput: HTMLInputElement;
  passwordInput: HTMLInputElement;
  submitButton: HTMLButtonElement;
  authSpy: jasmine.SpyObj<AuthService>;
}

function fillForm(
  fixture: ComponentFixture<LoginComponent>,
  email: string,
  password: string,
): void {
  fixture.componentInstance.form.setValue({ email, password });
  fixture.detectChanges();
}

// ---------------------------------------------------------------------------
// AC-6 — Form structure renders correctly
// ---------------------------------------------------------------------------

describe('AC-6 — LoginComponent: form renders email, password fields and submit button', () => {
  let fixture: ComponentFixture<LoginComponent>;
  let authSpy: jasmine.SpyObj<AuthService>;

  beforeEach(async () => {
    authSpy = buildAuthSpy();
    authSpy.login.and.returnValue(of(void 0));

    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        provideHttpClient(),
        provideRouter([{ path: '', component: MockHomeComponent }]),
        { provide: AuthService, useValue: authSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    fixture.detectChanges();
  });

  it('renders an email input with id="email"', () => {
    const emailInput = fixture.debugElement.query(By.css('#email'));
    expect(emailInput).toBeTruthy();
    expect(emailInput.nativeElement.type).toBe('email');
  });

  it('renders a password input with id="password"', () => {
    const passwordInput = fixture.debugElement.query(By.css('#password'));
    expect(passwordInput).toBeTruthy();
    expect(passwordInput.nativeElement.type).toBe('password');
  });

  it('renders a submit button of type="submit"', () => {
    const submitBtn = fixture.debugElement.query(By.css('button[type="submit"]'));
    expect(submitBtn).toBeTruthy();
  });

  it('submit button shows "Sign in" text initially', () => {
    const submitBtn = fixture.debugElement.query(By.css('button[type="submit"]'));
    expect(submitBtn.nativeElement.textContent).toContain('Sign in');
  });

  it('email label is associated with the email input (for= attribute)', () => {
    const label = fixture.debugElement.query(By.css('label[for="email"]'));
    expect(label).toBeTruthy();
  });

  it('password label is associated with the password input (for= attribute)', () => {
    const label = fixture.debugElement.query(By.css('label[for="password"]'));
    expect(label).toBeTruthy();
  });

  it('email input has aria-required="true"', () => {
    const emailInput = fixture.debugElement.query(By.css('#email'));
    expect(emailInput.nativeElement.getAttribute('aria-required')).toBe('true');
  });

  it('password input has aria-required="true"', () => {
    const passwordInput = fixture.debugElement.query(By.css('#password'));
    expect(passwordInput.nativeElement.getAttribute('aria-required')).toBe('true');
  });

  it('submit button has an aria-label for screen readers', () => {
    const submitBtn = fixture.debugElement.query(By.css('button[type="submit"]'));
    expect(submitBtn.nativeElement.getAttribute('aria-label')).toBeTruthy();
  });

  it('error banner is NOT visible on initial render', () => {
    const errorBanner = fixture.debugElement.query(By.css('.error-banner'));
    expect(errorBanner).toBeNull();
  });

  it('form has novalidate attribute (validation is handled by Angular)', () => {
    const form = fixture.debugElement.query(By.css('form'));
    expect(form.nativeElement.hasAttribute('novalidate')).toBeTrue();
  });
});

// ---------------------------------------------------------------------------
// Accessibility: keyboard and ARIA
// ---------------------------------------------------------------------------

describe('AC-6 — LoginComponent: accessibility', () => {
  let fixture: ComponentFixture<LoginComponent>;
  let authSpy: jasmine.SpyObj<AuthService>;

  beforeEach(async () => {
    authSpy = buildAuthSpy();
    authSpy.login.and.returnValue(of(void 0));

    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        provideHttpClient(),
        provideRouter([{ path: '', component: MockHomeComponent }]),
        { provide: AuthService, useValue: authSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    fixture.detectChanges();
  });

  it('submit button is focusable (not excluded from tab order)', () => {
    const submitBtn: HTMLButtonElement = fixture.debugElement.query(
      By.css('button[type="submit"]'),
    ).nativeElement;
    // tabIndex -1 would exclude it; anything >= 0 (including default 0) is focusable
    expect(submitBtn.tabIndex).toBeGreaterThanOrEqual(0);
  });

  it('email input is focusable', () => {
    const emailInput: HTMLInputElement = fixture.debugElement.query(
      By.css('#email'),
    ).nativeElement;
    expect(emailInput.tabIndex).toBeGreaterThanOrEqual(0);
  });

  it('password input is focusable', () => {
    const passwordInput: HTMLInputElement = fixture.debugElement.query(
      By.css('#password'),
    ).nativeElement;
    expect(passwordInput.tabIndex).toBeGreaterThanOrEqual(0);
  });

  it('error banner has role="alert" for screen reader announcement', fakeAsync(() => {
    authSpy.login.and.returnValue(throwError(() => new Error('Invalid credentials')));
    fillForm(fixture, 'bad@example.com', 'wrong');
    fixture.componentInstance.onSubmit();
    tick();
    fixture.detectChanges();

    const errorBanner = fixture.debugElement.query(By.css('.error-banner'));
    expect(errorBanner).toBeTruthy();
    expect(errorBanner.nativeElement.getAttribute('role')).toBe('alert');
  }));

  it('error banner has aria-live="assertive"', fakeAsync(() => {
    authSpy.login.and.returnValue(throwError(() => new Error('Invalid credentials')));
    fillForm(fixture, 'bad@example.com', 'wrong');
    fixture.componentInstance.onSubmit();
    tick();
    fixture.detectChanges();

    const errorBanner = fixture.debugElement.query(By.css('.error-banner'));
    expect(errorBanner.nativeElement.getAttribute('aria-live')).toBe('assertive');
  }));

  it('email input gets aria-invalid=true and aria-describedby when validation fails', () => {
    const emailInput = fixture.debugElement.query(By.css('#email'));
    // Mark as touched with no value to trigger validation
    fixture.componentInstance.emailControl.markAsTouched();
    fixture.detectChanges();

    expect(emailInput.nativeElement.getAttribute('aria-invalid')).toBe('true');
    expect(emailInput.nativeElement.getAttribute('aria-describedby')).toBe('email-error');
  });
});

// ---------------------------------------------------------------------------
// AC-6 — Loading state
// ---------------------------------------------------------------------------

describe('AC-6 — LoginComponent: loading state disables submit button', () => {
  let fixture: ComponentFixture<LoginComponent>;
  let authSpy: jasmine.SpyObj<AuthService>;

  beforeEach(async () => {
    authSpy = buildAuthSpy();

    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        provideHttpClient(),
        provideRouter([{ path: '', component: MockHomeComponent }]),
        { provide: AuthService, useValue: authSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    fixture.detectChanges();
  });

  it('submit button is disabled while HTTP request is in flight', fakeAsync(() => {
    // Never-completing observable keeps loading=true
    authSpy.login.and.returnValue(new Observable(() => () => undefined));
    fillForm(fixture, 'ops@dora.local', 'ChangeMe!23');
    fixture.componentInstance.onSubmit();
    fixture.detectChanges();

    const submitBtn: HTMLButtonElement = fixture.debugElement.query(
      By.css('button[type="submit"]'),
    ).nativeElement;
    expect(submitBtn.disabled).toBeTrue();
  }));

  it('submit button shows "Signing in…" text while loading', fakeAsync(() => {
    authSpy.login.and.returnValue(new Observable(() => () => undefined));
    fillForm(fixture, 'ops@dora.local', 'ChangeMe!23');
    fixture.componentInstance.onSubmit();
    fixture.detectChanges();

    const submitBtn = fixture.debugElement.query(By.css('button[type="submit"]'));
    expect(submitBtn.nativeElement.textContent).toContain('Signing in');
  }));

  it('submit button is re-enabled after successful login', fakeAsync(() => {
    authSpy.login.and.returnValue(of(void 0));
    fillForm(fixture, 'ops@dora.local', 'ChangeMe!23');
    fixture.componentInstance.onSubmit();
    tick();
    fixture.detectChanges();

    const submitBtn: HTMLButtonElement = fixture.debugElement.query(
      By.css('button[type="submit"]'),
    ).nativeElement;
    expect(submitBtn.disabled).toBeFalse();
  }));

  it('submit button is re-enabled after login error', fakeAsync(() => {
    authSpy.login.and.returnValue(throwError(() => new Error('Invalid credentials')));
    fillForm(fixture, 'bad@example.com', 'wrong');
    fixture.componentInstance.onSubmit();
    tick();
    fixture.detectChanges();

    const submitBtn: HTMLButtonElement = fixture.debugElement.query(
      By.css('button[type="submit"]'),
    ).nativeElement;
    expect(submitBtn.disabled).toBeFalse();
  }));

  it('isLoading signal is false before submission', () => {
    expect(fixture.componentInstance.isLoading()).toBeFalse();
  });

  it('isLoading signal is true during in-flight request', fakeAsync(() => {
    authSpy.login.and.returnValue(new Observable(() => () => undefined));
    fillForm(fixture, 'ops@dora.local', 'ChangeMe!23');
    fixture.componentInstance.onSubmit();
    expect(fixture.componentInstance.isLoading()).toBeTrue();
  }));

  it('isLoading signal is false after successful completion', fakeAsync(() => {
    authSpy.login.and.returnValue(of(void 0));
    fillForm(fixture, 'ops@dora.local', 'ChangeMe!23');
    fixture.componentInstance.onSubmit();
    tick();
    expect(fixture.componentInstance.isLoading()).toBeFalse();
  }));
});

// ---------------------------------------------------------------------------
// AC-6 — Successful login navigation
// ---------------------------------------------------------------------------

describe('AC-6 — LoginComponent: successful login navigates correctly', () => {
  let authSpy: jasmine.SpyObj<AuthService>;

  beforeEach(() => {
    authSpy = buildAuthSpy();
    authSpy.login.and.returnValue(of(void 0));
  });

  it('calls AuthService.login() with email and password from form', fakeAsync(async () => {
    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        provideHttpClient(),
        provideRouter([{ path: '', component: MockHomeComponent }]),
        { provide: AuthService, useValue: authSpy },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(LoginComponent);
    fixture.detectChanges();
    fillForm(fixture, 'ops@dora.local', 'ChangeMe!23');
    fixture.componentInstance.onSubmit();
    tick();

    expect(authSpy.login).toHaveBeenCalledOnceWith('ops@dora.local', 'ChangeMe!23');
  }));

  it('navigates to returnUrl from query params after successful login', fakeAsync(async () => {
    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        provideHttpClient(),
        provideRouter([
          { path: '', component: MockHomeComponent },
          { path: 'dashboard', component: MockDashboardComponent },
        ]),
        { provide: AuthService, useValue: authSpy },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParamMap: {
                get: (key: string) => (key === 'returnUrl' ? '/dashboard' : null),
              },
            },
          },
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(LoginComponent);
    const router = TestBed.inject(Router);
    const navigateSpy = spyOn(router, 'navigateByUrl').and.returnValue(Promise.resolve(true));
    fixture.detectChanges();

    fillForm(fixture, 'ops@dora.local', 'ChangeMe!23');
    fixture.componentInstance.onSubmit();
    tick();

    expect(navigateSpy).toHaveBeenCalledWith('/dashboard');
  }));

  it('navigates to "/" when no returnUrl query param is present', fakeAsync(async () => {
    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        provideHttpClient(),
        provideRouter([{ path: '', component: MockHomeComponent }]),
        { provide: AuthService, useValue: authSpy },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParamMap: {
                get: (_: string) => null,
              },
            },
          },
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(LoginComponent);
    const router = TestBed.inject(Router);
    const navigateSpy = spyOn(router, 'navigateByUrl').and.returnValue(Promise.resolve(true));
    fixture.detectChanges();

    fillForm(fixture, 'ops@dora.local', 'ChangeMe!23');
    fixture.componentInstance.onSubmit();
    tick();

    expect(navigateSpy).toHaveBeenCalledWith('/');
  }));
});

// ---------------------------------------------------------------------------
// AC-6 — Error states
// ---------------------------------------------------------------------------

describe('AC-6 — LoginComponent: 401 error shows "Invalid credentials"', () => {
  let fixture: ComponentFixture<LoginComponent>;
  let authSpy: jasmine.SpyObj<AuthService>;

  beforeEach(async () => {
    authSpy = buildAuthSpy();
    authSpy.login.and.returnValue(throwError(() => new Error('Invalid credentials')));

    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        provideHttpClient(),
        provideRouter([]),
        { provide: AuthService, useValue: authSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    fixture.detectChanges();
  });

  it('shows error banner with "Invalid credentials" text after 401', fakeAsync(() => {
    fillForm(fixture, 'bad@example.com', 'wrong');
    fixture.componentInstance.onSubmit();
    tick();
    fixture.detectChanges();

    const errorBanner = fixture.debugElement.query(By.css('.error-banner'));
    expect(errorBanner).toBeTruthy();
    expect(errorBanner.nativeElement.textContent).toContain('Invalid credentials');
  }));

  it('errorMessage signal contains "Invalid credentials" after 401', fakeAsync(() => {
    fillForm(fixture, 'bad@example.com', 'wrong');
    fixture.componentInstance.onSubmit();
    tick();

    expect(fixture.componentInstance.errorMessage()).toBe('Invalid credentials');
  }));

  it('error banner is cleared (null) before next submission attempt', fakeAsync(() => {
    // First failed attempt
    fillForm(fixture, 'bad@example.com', 'wrong');
    fixture.componentInstance.onSubmit();
    tick();
    fixture.detectChanges();
    expect(fixture.componentInstance.errorMessage()).toBeTruthy();

    // Second attempt — errorMessage cleared when submit starts
    authSpy.login.and.returnValue(new Observable(() => () => undefined));
    fixture.componentInstance.onSubmit();
    // errorMessage is cleared before the observable resolves
    expect(fixture.componentInstance.errorMessage()).toBeNull();
  }));
});

describe('AC-6 — LoginComponent: network error shows generic message', () => {
  let fixture: ComponentFixture<LoginComponent>;
  let authSpy: jasmine.SpyObj<AuthService>;

  beforeEach(async () => {
    authSpy = buildAuthSpy();
    authSpy.login.and.returnValue(
      throwError(() => new Error('An unexpected error occurred. Please try again.')),
    );

    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        provideHttpClient(),
        provideRouter([]),
        { provide: AuthService, useValue: authSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    fixture.detectChanges();
  });

  it('shows generic error message in DOM on network error', fakeAsync(() => {
    fillForm(fixture, 'user@example.com', 'pw');
    fixture.componentInstance.onSubmit();
    tick();
    fixture.detectChanges();

    const errorBanner = fixture.debugElement.query(By.css('.error-banner'));
    expect(errorBanner).toBeTruthy();
    expect(errorBanner.nativeElement.textContent).toContain('unexpected error');
  }));

  it('form is NOT stuck in loading state after network error', fakeAsync(() => {
    fillForm(fixture, 'user@example.com', 'pw');
    fixture.componentInstance.onSubmit();
    tick();

    expect(fixture.componentInstance.isLoading()).toBeFalse();
  }));
});

// ---------------------------------------------------------------------------
// AC-6 — Empty/invalid form submission
// ---------------------------------------------------------------------------

describe('AC-6 — LoginComponent: empty form submission does not call AuthService.login()', () => {
  let fixture: ComponentFixture<LoginComponent>;
  let authSpy: jasmine.SpyObj<AuthService>;

  beforeEach(async () => {
    authSpy = buildAuthSpy();

    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        provideHttpClient(),
        provideRouter([]),
        { provide: AuthService, useValue: authSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    fixture.detectChanges();
  });

  it('does not call AuthService.login() when form is empty', fakeAsync(() => {
    fixture.componentInstance.onSubmit();
    tick();
    expect(authSpy.login).not.toHaveBeenCalled();
  }));

  it('marks all controls as touched when submitting empty form', fakeAsync(() => {
    fixture.componentInstance.onSubmit();
    tick();
    fixture.detectChanges();

    expect(fixture.componentInstance.emailControl.touched).toBeTrue();
    expect(fixture.componentInstance.passwordControl.touched).toBeTrue();
  }));

  it('does not call AuthService.login() when email is missing', fakeAsync(() => {
    fixture.componentInstance.form.setValue({ email: '', password: 'ChangeMe!23' });
    fixture.componentInstance.onSubmit();
    tick();
    expect(authSpy.login).not.toHaveBeenCalled();
  }));

  it('does not call AuthService.login() when email is invalid format', fakeAsync(() => {
    fixture.componentInstance.form.setValue({ email: 'notanemail', password: 'ChangeMe!23' });
    fixture.componentInstance.onSubmit();
    tick();
    expect(authSpy.login).not.toHaveBeenCalled();
  }));

  it('does not call AuthService.login() when password is missing', fakeAsync(() => {
    fixture.componentInstance.form.setValue({ email: 'valid@example.com', password: '' });
    fixture.componentInstance.onSubmit();
    tick();
    expect(authSpy.login).not.toHaveBeenCalled();
  }));

  it('shows email validation error message when email is empty and touched', fakeAsync(() => {
    fixture.componentInstance.emailControl.setValue('');
    fixture.componentInstance.emailControl.markAsTouched();
    fixture.detectChanges();

    const emailError = fixture.debugElement.query(By.css('#email-error'));
    expect(emailError).toBeTruthy();
    expect(emailError.nativeElement.textContent).toContain('required');
  }));

  it('shows email format validation error when email is invalid and touched', fakeAsync(() => {
    fixture.componentInstance.emailControl.setValue('notanemail');
    fixture.componentInstance.emailControl.markAsTouched();
    fixture.detectChanges();

    const emailError = fixture.debugElement.query(By.css('#email-error'));
    expect(emailError).toBeTruthy();
    expect(emailError.nativeElement.textContent).toContain('valid email');
  }));

  it('shows password validation error when password is empty and touched', fakeAsync(() => {
    fixture.componentInstance.passwordControl.setValue('');
    fixture.componentInstance.passwordControl.markAsTouched();
    fixture.detectChanges();

    const passwordError = fixture.debugElement.query(By.css('#password-error'));
    expect(passwordError).toBeTruthy();
    expect(passwordError.nativeElement.textContent).toContain('required');
  }));

  it('isLoading stays false when form validation prevents submission', fakeAsync(() => {
    fixture.componentInstance.onSubmit();
    tick();
    expect(fixture.componentInstance.isLoading()).toBeFalse();
  }));
});
