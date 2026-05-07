// @thorough — AC-4: NcaEmailComponent — loading, error, DOM, validation, accessibility
import { ComponentFixture, TestBed, fakeAsync } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { Subject, of, throwError } from 'rxjs';
import { NcaEmailComponent } from './nca-email.component';
import { AdminService } from '../services/admin.service';
import { NcaEmailConfig } from '../models/admin.view-model';

const MOCK_CONFIG: NcaEmailConfig = {
  tenantId: 'tenant-1',
  sender: 'noreply@dora.local',
  recipient: 'nca@bafin.de',
  subjectTemplate: '[DORA][{{incidentId}}] Initial Notification',
  updatedAt: '2026-01-01T00:00:00Z',
};

function buildAdminServiceSpy(): jasmine.SpyObj<AdminService> {
  return jasmine.createSpyObj<AdminService>('AdminService', [
    'getTenant',
    'updateTenant',
    'listCriticalServices',
    'createCriticalService',
    'archiveCriticalService',
    'getClientBaseHistory',
    'setClientBase',
    'getNcaEmailConfig',
    'updateNcaEmailConfig',
  ]);
}

describe('NcaEmailComponent — thorough', () => {
  // ---------------------------------------------------------------------------
  // AC-4 — loading state while GET is pending
  // ---------------------------------------------------------------------------
  describe('AC-4 — loading state rendered while getNcaEmailConfig is pending', () => {
    let fixture: ComponentFixture<NcaEmailComponent>;
    let adminService: jasmine.SpyObj<AdminService>;
    let subject$: Subject<NcaEmailConfig>;

    beforeEach(async () => {
      subject$ = new Subject<NcaEmailConfig>();
      adminService = buildAdminServiceSpy();
      adminService.getNcaEmailConfig.and.returnValue(subject$.asObservable());

      await TestBed.configureTestingModule({
        imports: [NcaEmailComponent, ReactiveFormsModule],
        providers: [{ provide: AdminService, useValue: adminService }],
      }).compileComponents();

      fixture = TestBed.createComponent(NcaEmailComponent);
    });

    it('AC-4: renders loading status element before observable emits', fakeAsync(() => {
      fixture.detectChanges();
      const el = fixture.nativeElement as HTMLElement;
      const status = el.querySelector('[role="status"]') as HTMLElement;
      expect(status).withContext('role=status should exist during load').toBeTruthy();
      expect(status.textContent).toContain('Loading');
    }));

    it('AC-4: loading element has aria-live="polite"', fakeAsync(() => {
      fixture.detectChanges();
      const el = fixture.nativeElement as HTMLElement;
      const status = el.querySelector('[role="status"]') as HTMLElement;
      expect(status.getAttribute('aria-live')).toBe('polite');
    }));

    it('AC-4: form is NOT rendered while loading', fakeAsync(() => {
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('form')).toBeNull();
    }));

    it('AC-4: loading element disappears after observable emits', fakeAsync(() => {
      fixture.detectChanges();
      subject$.next(MOCK_CONFIG);
      subject$.complete();
      fixture.detectChanges();
      const loadingEls = Array.from(
        (fixture.nativeElement as HTMLElement).querySelectorAll('[role="status"]'),
      ).filter((e) => e.textContent?.includes('Loading'));
      expect(loadingEls.length).toBe(0);
    }));
  });

  // ---------------------------------------------------------------------------
  // AC-4 — error state when GET fails
  // ---------------------------------------------------------------------------
  describe('AC-4 — error state rendered when getNcaEmailConfig fails', () => {
    let fixture: ComponentFixture<NcaEmailComponent>;
    let component: NcaEmailComponent;
    let adminService: jasmine.SpyObj<AdminService>;

    beforeEach(async () => {
      adminService = buildAdminServiceSpy();
      adminService.getNcaEmailConfig.and.returnValue(
        throwError(() => new Error('Server error — please try again later.')),
      );
      await TestBed.configureTestingModule({
        imports: [NcaEmailComponent, ReactiveFormsModule],
        providers: [{ provide: AdminService, useValue: adminService }],
      }).compileComponents();
      fixture = TestBed.createComponent(NcaEmailComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
    });

    it('AC-4: renders error alert in DOM when GET fails', () => {
      const el = fixture.nativeElement as HTMLElement;
      const alert = el.querySelector('[role="alert"]') as HTMLElement;
      expect(alert).toBeTruthy();
      expect(alert.textContent).toContain('Server error');
    });

    it('AC-4: error element has role="alert"', () => {
      expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeTruthy();
    });

    it('AC-4: loadState is "error" after failed GET', () => {
      expect(component.loadState()).toBe('error');
    });

    it('AC-4: form NOT rendered when loadState is error', () => {
      expect(fixture.nativeElement.querySelector('form')).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // AC-4 — form renders and is populated after successful GET
  // ---------------------------------------------------------------------------
  describe('AC-4 — form renders and is populated after successful GET', () => {
    let fixture: ComponentFixture<NcaEmailComponent>;
    let adminService: jasmine.SpyObj<AdminService>;

    beforeEach(async () => {
      adminService = buildAdminServiceSpy();
      adminService.getNcaEmailConfig.and.returnValue(of(MOCK_CONFIG));
      await TestBed.configureTestingModule({
        imports: [NcaEmailComponent, ReactiveFormsModule],
        providers: [{ provide: AdminService, useValue: adminService }],
      }).compileComponents();
      fixture = TestBed.createComponent(NcaEmailComponent);
      fixture.detectChanges();
    });

    it('AC-4: h1 heading text is "NCA Email Configuration"', () => {
      const h1 = fixture.nativeElement.querySelector('h1') as HTMLElement;
      expect(h1.textContent?.trim()).toBe('NCA Email Configuration');
    });

    it('AC-4: sender input is populated from config', () => {
      const input = fixture.nativeElement.querySelector('#sender') as HTMLInputElement;
      expect(input.value).toBe('noreply@dora.local');
    });

    it('AC-4: recipient input is populated from config', () => {
      const input = fixture.nativeElement.querySelector('#recipient') as HTMLInputElement;
      expect(input.value).toBe('nca@bafin.de');
    });

    it('AC-4: subjectTemplate input is populated from config', () => {
      const input = fixture.nativeElement.querySelector('#subjectTemplate') as HTMLInputElement;
      expect(input.value).toBe('[DORA][{{incidentId}}] Initial Notification');
    });

    it('AC-4: main element has aria-labelledby pointing to the h1', () => {
      const main = fixture.nativeElement.querySelector('main') as HTMLElement;
      const h1Id = fixture.nativeElement.querySelector('h1')?.id;
      expect(main.getAttribute('aria-labelledby')).toBe(h1Id);
    });
  });

  // ---------------------------------------------------------------------------
  // AC-4 — sender email validation boundaries
  // ---------------------------------------------------------------------------
  describe('AC-4 — sender email validation boundaries', () => {
    let fixture: ComponentFixture<NcaEmailComponent>;
    let component: NcaEmailComponent;
    let adminService: jasmine.SpyObj<AdminService>;

    beforeEach(async () => {
      adminService = buildAdminServiceSpy();
      adminService.getNcaEmailConfig.and.returnValue(of(MOCK_CONFIG));
      await TestBed.configureTestingModule({
        imports: [NcaEmailComponent, ReactiveFormsModule],
        providers: [{ provide: AdminService, useValue: adminService }],
      }).compileComponents();
      fixture = TestBed.createComponent(NcaEmailComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
    });

    it('AC-4: valid sender email clears errors', () => {
      component.form.patchValue({ sender: 'noreply@example.com' });
      component.form.get('sender')?.markAsTouched();
      expect(component.form.get('sender')?.errors).toBeNull();
    });

    it('AC-4: invalid sender email sets email error', () => {
      component.form.patchValue({ sender: 'not-valid' });
      component.form.get('sender')?.markAsTouched();
      expect(component.form.get('sender')?.errors?.['email']).toBeTruthy();
    });

    it('AC-4: empty sender sets required error', () => {
      component.form.patchValue({ sender: '' });
      component.form.get('sender')?.markAsTouched();
      expect(component.form.get('sender')?.errors?.['required']).toBeTruthy();
    });

    it('AC-4: sender email error renders in DOM when touched', () => {
      component.form.patchValue({ sender: 'invalid-email' });
      component.form.get('sender')?.markAsTouched();
      fixture.detectChanges();
      const el = fixture.nativeElement as HTMLElement;
      const errors = Array.from(el.querySelectorAll('.field-error')) as HTMLElement[];
      const emailError = errors.find((e) => e.textContent?.toLowerCase().includes('valid sender'));
      expect(emailError).withContext('sender email error message should render').toBeTruthy();
    });

    it('AC-4: sender required error renders in DOM when touched', () => {
      component.form.patchValue({ sender: '' });
      component.form.get('sender')?.markAsTouched();
      fixture.detectChanges();
      const el = fixture.nativeElement as HTMLElement;
      const errors = Array.from(el.querySelectorAll('.field-error')) as HTMLElement[];
      const reqError = errors.find((e) => e.textContent?.toLowerCase().includes('sender address is required'));
      expect(reqError).toBeTruthy();
    });

    it('AC-4: sender input has aria-required="true"', () => {
      const input = fixture.nativeElement.querySelector('#sender') as HTMLInputElement;
      expect(input.getAttribute('aria-required')).toBe('true');
    });

    it('AC-4: sender input has aria-invalid="true" when touched and invalid', () => {
      component.form.patchValue({ sender: 'bad' });
      component.form.get('sender')?.markAsTouched();
      fixture.detectChanges();
      const input = fixture.nativeElement.querySelector('#sender') as HTMLInputElement;
      expect(input.getAttribute('aria-invalid')).toBe('true');
    });

    it('AC-4: sender input has autocomplete="email"', () => {
      const input = fixture.nativeElement.querySelector('#sender') as HTMLInputElement;
      expect(input.getAttribute('autocomplete')).toBe('email');
    });
  });

  // ---------------------------------------------------------------------------
  // AC-4 — recipient email validation boundaries
  // ---------------------------------------------------------------------------
  describe('AC-4 — recipient email validation boundaries', () => {
    let fixture: ComponentFixture<NcaEmailComponent>;
    let component: NcaEmailComponent;
    let adminService: jasmine.SpyObj<AdminService>;

    beforeEach(async () => {
      adminService = buildAdminServiceSpy();
      adminService.getNcaEmailConfig.and.returnValue(of(MOCK_CONFIG));
      await TestBed.configureTestingModule({
        imports: [NcaEmailComponent, ReactiveFormsModule],
        providers: [{ provide: AdminService, useValue: adminService }],
      }).compileComponents();
      fixture = TestBed.createComponent(NcaEmailComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
    });

    it('AC-4: valid recipient email clears errors', () => {
      component.form.patchValue({ recipient: 'nca@authority.de' });
      component.form.get('recipient')?.markAsTouched();
      expect(component.form.get('recipient')?.errors).toBeNull();
    });

    it('AC-4: invalid recipient email sets email error', () => {
      component.form.patchValue({ recipient: 'not-an-email' });
      component.form.get('recipient')?.markAsTouched();
      expect(component.form.get('recipient')?.errors?.['email']).toBeTruthy();
    });

    it('AC-4: empty recipient sets required error', () => {
      component.form.patchValue({ recipient: '' });
      component.form.get('recipient')?.markAsTouched();
      expect(component.form.get('recipient')?.errors?.['required']).toBeTruthy();
    });

    it('AC-4: recipient email error renders in DOM when touched', () => {
      component.form.patchValue({ recipient: 'bad-email' });
      component.form.get('recipient')?.markAsTouched();
      fixture.detectChanges();
      const el = fixture.nativeElement as HTMLElement;
      const errors = Array.from(el.querySelectorAll('.field-error')) as HTMLElement[];
      const emailError = errors.find((e) => e.textContent?.toLowerCase().includes('valid recipient'));
      expect(emailError).toBeTruthy();
    });

    it('AC-4: recipient input has aria-required="true"', () => {
      const input = fixture.nativeElement.querySelector('#recipient') as HTMLInputElement;
      expect(input.getAttribute('aria-required')).toBe('true');
    });

    it('AC-4: recipient input has autocomplete="email"', () => {
      const input = fixture.nativeElement.querySelector('#recipient') as HTMLInputElement;
      expect(input.getAttribute('autocomplete')).toBe('email');
    });
  });

  // ---------------------------------------------------------------------------
  // AC-4 — subjectTemplate validation boundaries
  // ---------------------------------------------------------------------------
  describe('AC-4 — subjectTemplate validation boundaries', () => {
    let fixture: ComponentFixture<NcaEmailComponent>;
    let component: NcaEmailComponent;
    let adminService: jasmine.SpyObj<AdminService>;

    beforeEach(async () => {
      adminService = buildAdminServiceSpy();
      adminService.getNcaEmailConfig.and.returnValue(of(MOCK_CONFIG));
      await TestBed.configureTestingModule({
        imports: [NcaEmailComponent, ReactiveFormsModule],
        providers: [{ provide: AdminService, useValue: adminService }],
      }).compileComponents();
      fixture = TestBed.createComponent(NcaEmailComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
    });

    it('AC-4: empty subjectTemplate sets required error', () => {
      component.form.patchValue({ subjectTemplate: '' });
      component.form.get('subjectTemplate')?.markAsTouched();
      expect(component.form.get('subjectTemplate')?.errors?.['required']).toBeTruthy();
    });

    it('AC-4: subjectTemplate at exactly 500 chars is valid', () => {
      component.form.patchValue({ subjectTemplate: 'a'.repeat(500) });
      component.form.get('subjectTemplate')?.markAsTouched();
      expect(component.form.get('subjectTemplate')?.errors).toBeNull();
    });

    it('AC-4: subjectTemplate at 501 chars has maxlength error', () => {
      component.form.patchValue({ subjectTemplate: 'a'.repeat(501) });
      component.form.get('subjectTemplate')?.markAsTouched();
      expect(component.form.get('subjectTemplate')?.errors?.['maxlength']).toBeTruthy();
    });

    it('AC-4: subjectTemplate at 1 char is valid', () => {
      component.form.patchValue({ subjectTemplate: 'S' });
      component.form.get('subjectTemplate')?.markAsTouched();
      expect(component.form.get('subjectTemplate')?.errors).toBeNull();
    });

    it('AC-4: required error renders in DOM when subjectTemplate is empty and touched', () => {
      component.form.patchValue({ subjectTemplate: '' });
      component.form.get('subjectTemplate')?.markAsTouched();
      fixture.detectChanges();
      const el = fixture.nativeElement as HTMLElement;
      const errors = Array.from(el.querySelectorAll('.field-error')) as HTMLElement[];
      const reqError = errors.find((e) => e.textContent?.toLowerCase().includes('subject template is required'));
      expect(reqError).toBeTruthy();
    });

    it('AC-4: maxlength error renders in DOM when subjectTemplate exceeds 500 chars', () => {
      component.form.patchValue({ subjectTemplate: 'x'.repeat(501) });
      component.form.get('subjectTemplate')?.markAsTouched();
      fixture.detectChanges();
      const el = fixture.nativeElement as HTMLElement;
      const errors = Array.from(el.querySelectorAll('.field-error')) as HTMLElement[];
      const maxErr = errors.find((e) => e.textContent?.toLowerCase().includes('500'));
      expect(maxErr).withContext('maxlength error should mention 500 chars').toBeTruthy();
    });

    it('AC-4: subjectTemplate input has aria-required="true"', () => {
      const input = fixture.nativeElement.querySelector('#subjectTemplate') as HTMLInputElement;
      expect(input.getAttribute('aria-required')).toBe('true');
    });

    it('AC-4: subjectTemplate input has aria-describedby pointing to hint paragraph', () => {
      const input = fixture.nativeElement.querySelector('#subjectTemplate') as HTMLInputElement;
      const describedBy = input.getAttribute('aria-describedby');
      expect(describedBy).toBeTruthy();
      const hint = fixture.nativeElement.querySelector(`#${describedBy}`) as HTMLElement;
      expect(hint).withContext('aria-describedby should point to existing element').toBeTruthy();
    });

    it('AC-4: subjectTemplate input has maxlength="500" attribute (prevents browser overflow)', () => {
      const input = fixture.nativeElement.querySelector('#subjectTemplate') as HTMLInputElement;
      expect(input.getAttribute('maxlength')).toBe('500');
    });
  });

  // ---------------------------------------------------------------------------
  // AC-4 — invalid form: all 3 fields empty → submit blocked
  // ---------------------------------------------------------------------------
  describe('AC-4 — invalid form blocks submission', () => {
    let fixture: ComponentFixture<NcaEmailComponent>;
    let component: NcaEmailComponent;
    let adminService: jasmine.SpyObj<AdminService>;

    beforeEach(async () => {
      adminService = buildAdminServiceSpy();
      adminService.getNcaEmailConfig.and.returnValue(of(MOCK_CONFIG));
      await TestBed.configureTestingModule({
        imports: [NcaEmailComponent, ReactiveFormsModule],
        providers: [{ provide: AdminService, useValue: adminService }],
      }).compileComponents();
      fixture = TestBed.createComponent(NcaEmailComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
    });

    it('AC-4: form invalid when all fields empty', () => {
      component.form.patchValue({ sender: '', recipient: '', subjectTemplate: '' });
      expect(component.form.invalid).toBeTrue();
    });

    it('AC-4: onSubmit with invalid form does NOT call updateNcaEmailConfig', () => {
      component.form.patchValue({ sender: '', recipient: '', subjectTemplate: '' });
      component.onSubmit();
      expect(adminService.updateNcaEmailConfig).not.toHaveBeenCalled();
    });

    it('AC-4: onSubmit with invalid form marks all controls as touched (errors show)', () => {
      component.form.patchValue({ sender: '', recipient: '', subjectTemplate: '' });
      component.onSubmit();
      expect(component.form.get('sender')?.touched).toBeTrue();
      expect(component.form.get('recipient')?.touched).toBeTrue();
      expect(component.form.get('subjectTemplate')?.touched).toBeTrue();
    });
  });

  // ---------------------------------------------------------------------------
  // AC-4 — save success state
  // ---------------------------------------------------------------------------
  describe('AC-4 — save success state and DOM feedback', () => {
    let fixture: ComponentFixture<NcaEmailComponent>;
    let component: NcaEmailComponent;
    let adminService: jasmine.SpyObj<AdminService>;

    beforeEach(async () => {
      adminService = buildAdminServiceSpy();
      adminService.getNcaEmailConfig.and.returnValue(of(MOCK_CONFIG));
      adminService.updateNcaEmailConfig.and.returnValue(of(MOCK_CONFIG));
      await TestBed.configureTestingModule({
        imports: [NcaEmailComponent, ReactiveFormsModule],
        providers: [{ provide: AdminService, useValue: adminService }],
      }).compileComponents();
      fixture = TestBed.createComponent(NcaEmailComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
    });

    it('AC-4: "Configuration saved." text renders in DOM after successful PUT', () => {
      component.form.patchValue({
        sender: 'noreply@dora.local',
        recipient: 'nca@bafin.de',
        subjectTemplate: '[DORA] Test',
      });
      component.onSubmit();
      fixture.detectChanges();
      const el = fixture.nativeElement as HTMLElement;
      const successMsg = el.querySelector('.success-message') as HTMLElement;
      expect(successMsg).toBeTruthy();
      expect(successMsg.textContent).toContain('saved');
    });

    it('AC-4: success message has role="status" and aria-live="polite"', () => {
      component.form.patchValue({
        sender: 'noreply@dora.local',
        recipient: 'nca@bafin.de',
        subjectTemplate: '[DORA] Test',
      });
      component.onSubmit();
      fixture.detectChanges();
      const el = fixture.nativeElement as HTMLElement;
      const statuses = Array.from(el.querySelectorAll('[role="status"]')) as HTMLElement[];
      const savedStatus = statuses.find((e) => e.textContent?.includes('saved'));
      expect(savedStatus).toBeTruthy();
      expect(savedStatus?.getAttribute('aria-live')).toBe('polite');
    });

    it('AC-4: saveState is "saved" after successful PUT', () => {
      component.form.patchValue({
        sender: 'noreply@dora.local',
        recipient: 'nca@bafin.de',
        subjectTemplate: '[DORA] Test',
      });
      component.onSubmit();
      expect(component.saveState()).toBe('saved');
    });

    it('AC-4: save button text is "Saving…" when saveState is saving', () => {
      component.saveState.set('saving');
      fixture.detectChanges();
      const button = fixture.nativeElement.querySelector('button[type="submit"]') as HTMLButtonElement;
      expect(button.textContent?.trim()).toBe('Saving…');
    });

    it('AC-4: save button is disabled when saveState is "saving"', () => {
      component.saveState.set('saving');
      fixture.detectChanges();
      const button = fixture.nativeElement.querySelector('button[type="submit"]') as HTMLButtonElement;
      expect(button.disabled).toBeTrue();
    });

    it('AC-4: save button is enabled when saveState is "idle"', () => {
      component.saveState.set('idle');
      fixture.detectChanges();
      const button = fixture.nativeElement.querySelector('button[type="submit"]') as HTMLButtonElement;
      expect(button.disabled).toBeFalse();
    });

    it('AC-4: save button is enabled when saveState is "saved" (allow re-save)', () => {
      component.saveState.set('saved');
      fixture.detectChanges();
      const button = fixture.nativeElement.querySelector('button[type="submit"]') as HTMLButtonElement;
      expect(button.disabled).toBeFalse();
    });

    it('AC-4: save button has aria-label="Save NCA email configuration"', () => {
      const button = fixture.nativeElement.querySelector('button[type="submit"]') as HTMLButtonElement;
      expect(button.getAttribute('aria-label')).toBe('Save NCA email configuration');
    });

    it('AC-4: saveError is cleared after successful save', () => {
      // Pre-set an existing error to confirm it gets cleared.
      component.saveError.set('Previous error');
      component.form.patchValue({
        sender: 'noreply@dora.local',
        recipient: 'nca@bafin.de',
        subjectTemplate: '[DORA] Test',
      });
      component.onSubmit();
      expect(component.saveError()).toBe('');
    });
  });

  // ---------------------------------------------------------------------------
  // AC-4 — save error state
  // ---------------------------------------------------------------------------
  describe('AC-4 — save error state renders in DOM', () => {
    let fixture: ComponentFixture<NcaEmailComponent>;
    let component: NcaEmailComponent;
    let adminService: jasmine.SpyObj<AdminService>;

    beforeEach(async () => {
      adminService = buildAdminServiceSpy();
      adminService.getNcaEmailConfig.and.returnValue(of(MOCK_CONFIG));
      adminService.updateNcaEmailConfig.and.returnValue(
        throwError(() => new Error('Permission denied')),
      );
      await TestBed.configureTestingModule({
        imports: [NcaEmailComponent, ReactiveFormsModule],
        providers: [{ provide: AdminService, useValue: adminService }],
      }).compileComponents();
      fixture = TestBed.createComponent(NcaEmailComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
    });

    it('AC-4: error alert renders in DOM after failed PUT', () => {
      component.form.patchValue({
        sender: 'noreply@dora.local',
        recipient: 'nca@bafin.de',
        subjectTemplate: '[DORA] Test',
      });
      component.onSubmit();
      fixture.detectChanges();
      const el = fixture.nativeElement as HTMLElement;
      const alert = el.querySelector('.error-message[role="alert"]') as HTMLElement;
      expect(alert).toBeTruthy();
      expect(alert.textContent).toContain('Permission denied');
    });

    it('AC-4: saveError signal holds the error message', () => {
      component.form.patchValue({
        sender: 'noreply@dora.local',
        recipient: 'nca@bafin.de',
        subjectTemplate: '[DORA] Test',
      });
      component.onSubmit();
      expect(component.saveError()).toBe('Permission denied');
    });

    it('AC-4: saveState is "error" after failed PUT', () => {
      component.form.patchValue({
        sender: 'noreply@dora.local',
        recipient: 'nca@bafin.de',
        subjectTemplate: '[DORA] Test',
      });
      component.onSubmit();
      expect(component.saveState()).toBe('error');
    });

    it('AC-4: save button is enabled when saveState is "error" (allow retry)', () => {
      component.saveState.set('error');
      fixture.detectChanges();
      const button = fixture.nativeElement.querySelector('button[type="submit"]') as HTMLButtonElement;
      expect(button.disabled).toBeFalse();
    });
  });

  // ---------------------------------------------------------------------------
  // AC-4 — accessibility
  // ---------------------------------------------------------------------------
  describe('AC-4 — accessibility attributes', () => {
    let fixture: ComponentFixture<NcaEmailComponent>;
    let adminService: jasmine.SpyObj<AdminService>;

    beforeEach(async () => {
      adminService = buildAdminServiceSpy();
      adminService.getNcaEmailConfig.and.returnValue(of(MOCK_CONFIG));
      await TestBed.configureTestingModule({
        imports: [NcaEmailComponent, ReactiveFormsModule],
        providers: [{ provide: AdminService, useValue: adminService }],
      }).compileComponents();
      fixture = TestBed.createComponent(NcaEmailComponent);
      fixture.detectChanges();
    });

    it('accessibility: form has aria-label attribute', () => {
      const form = fixture.nativeElement.querySelector('form') as HTMLFormElement;
      expect(form.getAttribute('aria-label')).toBeTruthy();
    });

    it('accessibility: form has novalidate attribute', () => {
      const form = fixture.nativeElement.querySelector('form') as HTMLFormElement;
      expect(form.hasAttribute('novalidate')).toBeTrue();
    });

    it('accessibility: all labels have matching input elements', () => {
      const el = fixture.nativeElement as HTMLElement;
      const labels = Array.from(el.querySelectorAll('label')) as HTMLLabelElement[];
      labels.forEach((label) => {
        const forAttr = label.getAttribute('for');
        if (forAttr) {
          expect(el.querySelector(`#${forAttr}`))
            .withContext(`label[for="${forAttr}"] should have matching input`)
            .toBeTruthy();
        }
      });
    });

    it('accessibility: field-error elements use role="alert" and aria-live="polite"', () => {
      // Trigger a validation error to verify the error element attributes
      fixture.componentInstance.form.patchValue({ sender: 'invalid' });
      fixture.componentInstance.form.get('sender')?.markAsTouched();
      fixture.detectChanges();
      const alert = fixture.nativeElement.querySelector('.field-error[role="alert"]') as HTMLElement;
      expect(alert).toBeTruthy();
      expect(alert.getAttribute('aria-live')).toBe('polite');
    });
  });
});
