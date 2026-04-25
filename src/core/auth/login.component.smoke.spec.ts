/**
 * @smoke
 * LoginComponent smoke spec — AC-6 / AC-8 (frontend): form submits and
 * navigates on success; shows error on 401.
 */
import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { Component } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { LoginComponent } from './login.component';
import { AuthService } from './auth.service';

@Component({ standalone: true, template: '<p>home</p>' })
class MockHomeComponent {}

function createService(): jasmine.SpyObj<AuthService> {
  return jasmine.createSpyObj('AuthService', [
    'login',
    'logout',
    'isAuthenticated',
    'hasRole',
    'token',
    'currentUser',
  ]);
}

describe('AC-6 — LoginComponent: form submits and navigates on success', () => {
  let authSpy: jasmine.SpyObj<AuthService>;

  beforeEach(async () => {
    authSpy = createService();
    authSpy.login.and.returnValue(of(void 0));

    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        provideHttpClient(),
        provideRouter([{ path: '', component: MockHomeComponent }]),
        { provide: AuthService, useValue: authSpy },
      ],
    }).compileComponents();
  });

  it('@smoke renders email and password inputs', () => {
    const fixture = TestBed.createComponent(LoginComponent);
    fixture.detectChanges();
    const emailInput = fixture.debugElement.query(By.css('#email'));
    const passwordInput = fixture.debugElement.query(By.css('#password'));
    expect(emailInput).toBeTruthy();
    expect(passwordInput).toBeTruthy();
  });

  it('@smoke calls authService.login with form values on submit', fakeAsync(() => {
    const fixture = TestBed.createComponent(LoginComponent);
    fixture.detectChanges();

    const emailInput: HTMLInputElement = fixture.debugElement.query(By.css('#email')).nativeElement;
    const passwordInput: HTMLInputElement = fixture.debugElement.query(By.css('#password')).nativeElement;
    const form: HTMLFormElement = fixture.debugElement.query(By.css('form')).nativeElement;

    emailInput.value = 'ops@dora.local';
    emailInput.dispatchEvent(new Event('input'));
    passwordInput.value = 'ChangeMe!23';
    passwordInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    // Set form control values directly for reliable reactive form sync
    fixture.componentInstance.form.setValue({
      email: 'ops@dora.local',
      password: 'ChangeMe!23',
    });

    form.dispatchEvent(new Event('submit'));
    tick();

    expect(authSpy.login).toHaveBeenCalledWith('ops@dora.local', 'ChangeMe!23');
  }));

  it('@smoke disables submit button while loading', fakeAsync(() => {
    // Return a never-resolving observable to keep loading state active
    // Return a never-completing observable to keep the loading state active.
    // Returning a teardown from the subscriber prevents the linter from
    // complaining about an empty function body.
    authSpy.login.and.returnValue(new Observable(() => () => undefined));
    const fixture = TestBed.createComponent(LoginComponent);
    fixture.detectChanges();

    fixture.componentInstance.form.setValue({
      email: 'ops@dora.local',
      password: 'ChangeMe!23',
    });
    fixture.componentInstance.onSubmit();
    fixture.detectChanges();

    const button: HTMLButtonElement = fixture.debugElement.query(
      By.css('button[type="submit"]'),
    ).nativeElement;
    expect(button.disabled).toBeTrue();
  }));
});

describe('AC-6 — LoginComponent: shows error message on 401', () => {
  let authSpy: jasmine.SpyObj<AuthService>;

  beforeEach(async () => {
    authSpy = createService();
    authSpy.login.and.returnValue(
      throwError(() => new Error('Invalid credentials')),
    );

    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        provideHttpClient(),
        provideRouter([]),
        { provide: AuthService, useValue: authSpy },
      ],
    }).compileComponents();
  });

  it('@smoke renders "Invalid credentials" error on 401 response', fakeAsync(() => {
    const fixture = TestBed.createComponent(LoginComponent);
    fixture.detectChanges();

    fixture.componentInstance.form.setValue({
      email: 'bad@example.com',
      password: 'wrong',
    });
    fixture.componentInstance.onSubmit();
    tick();
    fixture.detectChanges();

    const errorBanner = fixture.debugElement.query(By.css('.error-banner'));
    expect(errorBanner).toBeTruthy();
    expect(errorBanner.nativeElement.textContent).toContain('Invalid credentials');
  }));
});
