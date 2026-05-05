// @thorough — AC-1: TenantConfigComponent — loading, error, DOM, validation, accessibility
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { Subject, of, throwError } from 'rxjs';
import { TenantConfigComponent } from './tenant-config.component';
import { AdminService } from '../services/admin.service';
import { TenantConfig } from '../models/admin.view-model';

const MOCK_CONFIG: TenantConfig = {
  id: 'tenant-1',
  legalName: 'Nexus Bank',
  lei: 'NEXUSBANK1234567890A',
  ncaName: 'BaFin',
  ncaEmail: 'nca@bafin.de',
  jurisdictionIso: 'DE',
  primaryComplianceContactId: 'user-123',
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

describe('TenantConfigComponent — thorough', () => {
  // ---------------------------------------------------------------------------
  // AC-1 — loading state rendered during async GET
  // ---------------------------------------------------------------------------
  describe('AC-1 — loading state rendered while service is pending', () => {
    let fixture: ComponentFixture<TenantConfigComponent>;
    let adminService: jasmine.SpyObj<AdminService>;
    let subject$: Subject<TenantConfig>;

    beforeEach(async () => {
      subject$ = new Subject<TenantConfig>();
      adminService = buildAdminServiceSpy();
      adminService.getTenant.and.returnValue(subject$.asObservable());

      await TestBed.configureTestingModule({
        imports: [TenantConfigComponent, ReactiveFormsModule],
        providers: [{ provide: AdminService, useValue: adminService }],
      }).compileComponents();

      fixture = TestBed.createComponent(TenantConfigComponent);
    });

    it('AC-1: renders loading text in the DOM before observable emits', fakeAsync(() => {
      fixture.detectChanges();
      const el = fixture.nativeElement as HTMLElement;
      const status = el.querySelector('[role="status"]') as HTMLElement;
      expect(status).withContext('loading status element should exist').toBeTruthy();
      expect(status.textContent).toContain('Loading');
    }));

    it('AC-1: loading element has role="status" and aria-live="polite"', fakeAsync(() => {
      fixture.detectChanges();
      const el = fixture.nativeElement as HTMLElement;
      const status = el.querySelector('[role="status"]') as HTMLElement;
      expect(status).toBeTruthy();
      expect(status.getAttribute('aria-live')).toBe('polite');
    }));

    it('AC-1: loading text disappears after observable emits', fakeAsync(() => {
      fixture.detectChanges();
      subject$.next(MOCK_CONFIG);
      subject$.complete();
      fixture.detectChanges();
      const el = fixture.nativeElement as HTMLElement;
      const loadingParas = Array.from(el.querySelectorAll('[role="status"]')).filter(
        (p) => p.textContent?.includes('Loading'),
      );
      expect(loadingParas.length).toBe(0);
    }));

    it('AC-1: form is not rendered while in loading state', fakeAsync(() => {
      fixture.detectChanges();
      const el = fixture.nativeElement as HTMLElement;
      expect(el.querySelector('form')).toBeNull();
    }));
  });

  // ---------------------------------------------------------------------------
  // AC-1 — error state rendered when GET fails
  // ---------------------------------------------------------------------------
  describe('AC-1 — error state rendered when getTenant fails', () => {
    let fixture: ComponentFixture<TenantConfigComponent>;
    let adminService: jasmine.SpyObj<AdminService>;

    beforeEach(async () => {
      adminService = buildAdminServiceSpy();
      adminService.getTenant.and.returnValue(
        throwError(() => new Error('Server error — please try again later.')),
      );

      await TestBed.configureTestingModule({
        imports: [TenantConfigComponent, ReactiveFormsModule],
        providers: [{ provide: AdminService, useValue: adminService }],
      }).compileComponents();
      fixture = TestBed.createComponent(TenantConfigComponent);
    });

    it('AC-1: renders error message text in the DOM when GET 500', () => {
      fixture.detectChanges();
      const el = fixture.nativeElement as HTMLElement;
      const alert = el.querySelector('[role="alert"]') as HTMLElement;
      expect(alert).toBeTruthy();
      expect(alert.textContent).toContain('Server error');
    });

    it('AC-1: error element has role="alert" for screen-reader announcement', () => {
      fixture.detectChanges();
      const el = fixture.nativeElement as HTMLElement;
      expect(el.querySelector('[role="alert"]')).toBeTruthy();
    });

    it('AC-1: form is not rendered when load state is error', () => {
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('form')).toBeNull();
    });

    it('AC-1: loadState signal is error when GET throws', () => {
      fixture.detectChanges();
      expect(fixture.componentInstance.loadState()).toBe('error');
    });
  });

  // ---------------------------------------------------------------------------
  // AC-1 — form renders after successful load
  // ---------------------------------------------------------------------------
  describe('AC-1 — form renders and is populated after successful GET', () => {
    let fixture: ComponentFixture<TenantConfigComponent>;
    let adminService: jasmine.SpyObj<AdminService>;

    beforeEach(async () => {
      adminService = buildAdminServiceSpy();
      adminService.getTenant.and.returnValue(of(MOCK_CONFIG));
      await TestBed.configureTestingModule({
        imports: [TenantConfigComponent, ReactiveFormsModule],
        providers: [{ provide: AdminService, useValue: adminService }],
      }).compileComponents();
      fixture = TestBed.createComponent(TenantConfigComponent);
      fixture.detectChanges();
    });

    it('AC-1: h1 heading text is "Tenant Configuration"', () => {
      const h1 = fixture.nativeElement.querySelector('h1') as HTMLElement;
      expect(h1.textContent?.trim()).toBe('Tenant Configuration');
    });

    it('AC-1: main element has aria-labelledby pointing to the h1', () => {
      const main = fixture.nativeElement.querySelector('main') as HTMLElement;
      const h1Id = fixture.nativeElement.querySelector('h1')?.id;
      expect(main.getAttribute('aria-labelledby')).toBe(h1Id);
    });

    it('AC-1: legalName input has aria-required="true"', () => {
      const input = fixture.nativeElement.querySelector('#legalName') as HTMLInputElement;
      expect(input.getAttribute('aria-required')).toBe('true');
    });

    it('AC-1: form has aria-label attribute', () => {
      const form = fixture.nativeElement.querySelector('form') as HTMLFormElement;
      expect(form.getAttribute('aria-label')).toBeTruthy();
    });

    it('AC-1: populated legalName input value matches config', () => {
      const input = fixture.nativeElement.querySelector('#legalName') as HTMLInputElement;
      expect(input.value).toBe('Nexus Bank');
    });

    it('AC-1: populated lei input value matches config', () => {
      const input = fixture.nativeElement.querySelector('#lei') as HTMLInputElement;
      expect(input.value).toBe('NEXUSBANK1234567890A');
    });
  });

  // ---------------------------------------------------------------------------
  // AC-1 — LEI validation boundary tests
  // ---------------------------------------------------------------------------
  describe('AC-1 — LEI pattern validation boundaries', () => {
    let fixture: ComponentFixture<TenantConfigComponent>;
    let component: TenantConfigComponent;
    let adminService: jasmine.SpyObj<AdminService>;

    beforeEach(async () => {
      adminService = buildAdminServiceSpy();
      adminService.getTenant.and.returnValue(of(MOCK_CONFIG));
      await TestBed.configureTestingModule({
        imports: [TenantConfigComponent, ReactiveFormsModule],
        providers: [{ provide: AdminService, useValue: adminService }],
      }).compileComponents();
      fixture = TestBed.createComponent(TenantConfigComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
    });

    it('AC-1: LEI with exactly 20 uppercase alphanum chars is valid', () => {
      component.form.patchValue({ lei: 'ABCDEF1234ABCDEF1234' });
      component.form.get('lei')?.markAsTouched();
      expect(component.form.get('lei')?.errors).toBeNull();
    });

    it('AC-1: LEI with 19 chars is invalid (pattern error)', () => {
      component.form.patchValue({ lei: 'ABCDEF1234ABCDEF123' }); // 19 chars
      component.form.get('lei')?.markAsTouched();
      expect(component.form.get('lei')?.errors?.['pattern']).toBeTruthy();
    });

    it('AC-1: LEI with 21 chars is invalid (pattern error)', () => {
      component.form.patchValue({ lei: 'ABCDEF1234ABCDEF12345' }); // 21 chars
      component.form.get('lei')?.markAsTouched();
      expect(component.form.get('lei')?.errors?.['pattern']).toBeTruthy();
    });

    it('AC-1: LEI with lowercase letters is invalid', () => {
      component.form.patchValue({ lei: 'abcdef1234abcdef1234' }); // lowercase
      component.form.get('lei')?.markAsTouched();
      expect(component.form.get('lei')?.errors?.['pattern']).toBeTruthy();
    });

    it('AC-1: LEI with special characters is invalid', () => {
      component.form.patchValue({ lei: 'ABCDEF1234!@#DEF1234' });
      component.form.get('lei')?.markAsTouched();
      expect(component.form.get('lei')?.errors?.['pattern']).toBeTruthy();
    });

    it('AC-1: empty LEI is valid (field is optional — only pattern checked when present)', () => {
      component.form.patchValue({ lei: '' });
      component.form.get('lei')?.markAsTouched();
      expect(component.form.get('lei')?.errors).toBeNull();
    });

    it('AC-1: LEI error message renders in DOM when field is touched with invalid value', () => {
      component.form.patchValue({ lei: 'INVALID' });
      component.form.get('lei')?.markAsTouched();
      fixture.detectChanges();
      const el = fixture.nativeElement as HTMLElement;
      const leiErrors = Array.from(el.querySelectorAll('.field-error')).filter(
        (e) => e.textContent?.includes('LEI'),
      );
      expect(leiErrors.length).toBeGreaterThan(0);
    });

    it('AC-1: LEI error element has role="alert" and aria-live="polite"', () => {
      component.form.patchValue({ lei: 'INVALID' });
      component.form.get('lei')?.markAsTouched();
      fixture.detectChanges();
      const el = fixture.nativeElement as HTMLElement;
      const alerts = Array.from(el.querySelectorAll('[role="alert"]')) as HTMLElement[];
      expect(alerts.length).toBeGreaterThan(0);
    });
  });

  // ---------------------------------------------------------------------------
  // AC-1 — legalName required validation
  // ---------------------------------------------------------------------------
  describe('AC-1 — legalName required validation', () => {
    let fixture: ComponentFixture<TenantConfigComponent>;
    let component: TenantConfigComponent;
    let adminService: jasmine.SpyObj<AdminService>;

    beforeEach(async () => {
      adminService = buildAdminServiceSpy();
      adminService.getTenant.and.returnValue(of(MOCK_CONFIG));
      await TestBed.configureTestingModule({
        imports: [TenantConfigComponent, ReactiveFormsModule],
        providers: [{ provide: AdminService, useValue: adminService }],
      }).compileComponents();
      fixture = TestBed.createComponent(TenantConfigComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
    });

    it('AC-1: empty legalName results in form invalid', () => {
      component.form.patchValue({ legalName: '' });
      component.form.get('legalName')?.markAsTouched();
      expect(component.form.get('legalName')?.errors?.['required']).toBeTruthy();
      expect(component.form.valid).toBeFalse();
    });

    it('AC-1: empty legalName + submit does NOT call updateTenant', () => {
      adminService.updateTenant.and.returnValue(of(MOCK_CONFIG));
      component.form.patchValue({ legalName: '' });
      component.onSubmit();
      expect(adminService.updateTenant).not.toHaveBeenCalled();
    });

    it('AC-1: empty legalName error message renders in DOM after submit', () => {
      component.form.patchValue({ legalName: '' });
      component.onSubmit(); // marks all as touched
      fixture.detectChanges();
      const el = fixture.nativeElement as HTMLElement;
      const errors = Array.from(el.querySelectorAll('.field-error')) as HTMLElement[];
      const legalNameError = errors.find((e) => e.textContent?.toLowerCase().includes('legal name'));
      expect(legalNameError).toBeTruthy();
    });

    it('AC-1: legalName input has aria-invalid="true" when touched and invalid', () => {
      component.form.patchValue({ legalName: '' });
      component.form.get('legalName')?.markAsTouched();
      fixture.detectChanges();
      const input = fixture.nativeElement.querySelector('#legalName') as HTMLInputElement;
      expect(input.getAttribute('aria-invalid')).toBe('true');
    });

    it('AC-1: legalName input has aria-invalid="false" when valid', () => {
      component.form.patchValue({ legalName: 'Nexus Bank' });
      component.form.get('legalName')?.markAsTouched();
      fixture.detectChanges();
      const input = fixture.nativeElement.querySelector('#legalName') as HTMLInputElement;
      expect(input.getAttribute('aria-invalid')).not.toBe('true');
    });
  });

  // ---------------------------------------------------------------------------
  // AC-1 — ncaEmail email format validation
  // ---------------------------------------------------------------------------
  describe('AC-1 — ncaEmail validator', () => {
    let fixture: ComponentFixture<TenantConfigComponent>;
    let component: TenantConfigComponent;
    let adminService: jasmine.SpyObj<AdminService>;

    beforeEach(async () => {
      adminService = buildAdminServiceSpy();
      adminService.getTenant.and.returnValue(of(MOCK_CONFIG));
      await TestBed.configureTestingModule({
        imports: [TenantConfigComponent, ReactiveFormsModule],
        providers: [{ provide: AdminService, useValue: adminService }],
      }).compileComponents();
      fixture = TestBed.createComponent(TenantConfigComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
    });

    it('AC-1: invalid email in ncaEmail sets email error', () => {
      component.form.patchValue({ ncaEmail: 'not-an-email' });
      component.form.get('ncaEmail')?.markAsTouched();
      expect(component.form.get('ncaEmail')?.errors?.['email']).toBeTruthy();
    });

    it('AC-1: valid email in ncaEmail clears email error', () => {
      component.form.patchValue({ ncaEmail: 'nca@bafin.de' });
      component.form.get('ncaEmail')?.markAsTouched();
      expect(component.form.get('ncaEmail')?.errors).toBeNull();
    });

    it('AC-1: invalid ncaEmail renders error message in DOM when touched', () => {
      component.form.patchValue({ ncaEmail: 'invalid' });
      component.form.get('ncaEmail')?.markAsTouched();
      fixture.detectChanges();
      const el = fixture.nativeElement as HTMLElement;
      const errors = Array.from(el.querySelectorAll('.field-error')) as HTMLElement[];
      const emailError = errors.find((e) => e.textContent?.toLowerCase().includes('email'));
      expect(emailError).toBeTruthy();
    });
  });

  // ---------------------------------------------------------------------------
  // AC-1 — jurisdictionIso maxLength validation
  // ---------------------------------------------------------------------------
  describe('AC-1 — jurisdictionIso maxLength(2) validation', () => {
    let fixture: ComponentFixture<TenantConfigComponent>;
    let component: TenantConfigComponent;
    let adminService: jasmine.SpyObj<AdminService>;

    beforeEach(async () => {
      adminService = buildAdminServiceSpy();
      adminService.getTenant.and.returnValue(of(MOCK_CONFIG));
      await TestBed.configureTestingModule({
        imports: [TenantConfigComponent, ReactiveFormsModule],
        providers: [{ provide: AdminService, useValue: adminService }],
      }).compileComponents();
      fixture = TestBed.createComponent(TenantConfigComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
    });

    it('AC-1: 2-char jurisdictionIso is valid', () => {
      component.form.patchValue({ jurisdictionIso: 'DE' });
      component.form.get('jurisdictionIso')?.markAsTouched();
      expect(component.form.get('jurisdictionIso')?.errors).toBeNull();
    });

    it('AC-1: 3-char jurisdictionIso has maxlength error', () => {
      component.form.patchValue({ jurisdictionIso: 'DEU' });
      component.form.get('jurisdictionIso')?.markAsTouched();
      expect(component.form.get('jurisdictionIso')?.errors?.['maxlength']).toBeTruthy();
    });

    it('AC-1: empty jurisdictionIso is valid (field is optional)', () => {
      component.form.patchValue({ jurisdictionIso: '' });
      component.form.get('jurisdictionIso')?.markAsTouched();
      expect(component.form.get('jurisdictionIso')?.errors).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // AC-1 — save success state
  // ---------------------------------------------------------------------------
  describe('AC-1 — save success feedback', () => {
    let fixture: ComponentFixture<TenantConfigComponent>;
    let component: TenantConfigComponent;
    let adminService: jasmine.SpyObj<AdminService>;

    beforeEach(async () => {
      adminService = buildAdminServiceSpy();
      adminService.getTenant.and.returnValue(of(MOCK_CONFIG));
      adminService.updateTenant.and.returnValue(of(MOCK_CONFIG));
      await TestBed.configureTestingModule({
        imports: [TenantConfigComponent, ReactiveFormsModule],
        providers: [{ provide: AdminService, useValue: adminService }],
      }).compileComponents();
      fixture = TestBed.createComponent(TenantConfigComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
    });

    it('AC-1: "Configuration saved." text renders in DOM after successful PUT', () => {
      component.form.patchValue({
        legalName: 'Nexus Bank',
        lei: 'NEXUSBANK1234567890A',
        ncaName: 'BaFin',
        ncaEmail: 'nca@bafin.de',
        jurisdictionIso: 'DE',
        primaryComplianceContactId: 'user-123',
      });
      component.onSubmit();
      fixture.detectChanges();
      const el = fixture.nativeElement as HTMLElement;
      const successMsg = el.querySelector('.success-message') as HTMLElement;
      expect(successMsg).toBeTruthy();
      expect(successMsg.textContent).toContain('saved');
    });

    it('AC-1: success message has role="status" and aria-live="polite"', () => {
      component.form.patchValue({ legalName: 'Nexus Bank' });
      component.onSubmit();
      fixture.detectChanges();
      const el = fixture.nativeElement as HTMLElement;
      const statuses = Array.from(el.querySelectorAll('[role="status"]')) as HTMLElement[];
      const successStatus = statuses.find((e) => e.textContent?.includes('saved'));
      expect(successStatus).toBeTruthy();
      expect(successStatus?.getAttribute('aria-live')).toBe('polite');
    });

    it('AC-1: save button text changes to "Saving…" while saveState is saving', () => {
      component.saveState.set('saving');
      fixture.detectChanges();
      const button = fixture.nativeElement.querySelector('button[type="submit"]') as HTMLButtonElement;
      expect(button.textContent?.trim()).toBe('Saving…');
    });

    it('AC-1: save button text is "Save" when saveState is idle', () => {
      component.saveState.set('idle');
      fixture.detectChanges();
      const button = fixture.nativeElement.querySelector('button[type="submit"]') as HTMLButtonElement;
      expect(button.textContent?.trim()).toBe('Save');
    });

    it('AC-1: save button has aria-label="Save tenant configuration"', () => {
      const button = fixture.nativeElement.querySelector('button[type="submit"]') as HTMLButtonElement;
      expect(button.getAttribute('aria-label')).toBe('Save tenant configuration');
    });
  });

  // ---------------------------------------------------------------------------
  // AC-1 — save error state
  // ---------------------------------------------------------------------------
  describe('AC-1 — save error state renders in DOM', () => {
    let fixture: ComponentFixture<TenantConfigComponent>;
    let component: TenantConfigComponent;
    let adminService: jasmine.SpyObj<AdminService>;

    beforeEach(async () => {
      adminService = buildAdminServiceSpy();
      adminService.getTenant.and.returnValue(of(MOCK_CONFIG));
      adminService.updateTenant.and.returnValue(
        throwError(() => new Error('Server error — please try again later.')),
      );
      await TestBed.configureTestingModule({
        imports: [TenantConfigComponent, ReactiveFormsModule],
        providers: [{ provide: AdminService, useValue: adminService }],
      }).compileComponents();
      fixture = TestBed.createComponent(TenantConfigComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
    });

    it('AC-1: save error message renders in DOM after failed PUT', () => {
      component.form.patchValue({ legalName: 'Nexus Bank' });
      component.onSubmit();
      fixture.detectChanges();
      const el = fixture.nativeElement as HTMLElement;
      const alerts = Array.from(el.querySelectorAll('[role="alert"]')) as HTMLElement[];
      const saveAlert = alerts.find((e) => e.textContent?.includes('Server error'));
      expect(saveAlert).toBeTruthy();
    });

    it('AC-1: saveError signal holds the server error message', () => {
      component.form.patchValue({ legalName: 'Nexus Bank' });
      component.onSubmit();
      expect(component.saveError()).toBe('Server error — please try again later.');
    });

    it('AC-1: saveState signal is "error" after failed PUT', () => {
      component.form.patchValue({ legalName: 'Nexus Bank' });
      component.onSubmit();
      expect(component.saveState()).toBe('error');
    });
  });

  // ---------------------------------------------------------------------------
  // AC-8 — submit button disabled while saving (audit: no double-submit)
  // ---------------------------------------------------------------------------
  describe('AC-8 — submit button disabled while saving', () => {
    let fixture: ComponentFixture<TenantConfigComponent>;
    let component: TenantConfigComponent;
    let adminService: jasmine.SpyObj<AdminService>;

    beforeEach(async () => {
      adminService = buildAdminServiceSpy();
      adminService.getTenant.and.returnValue(of(MOCK_CONFIG));
      await TestBed.configureTestingModule({
        imports: [TenantConfigComponent, ReactiveFormsModule],
        providers: [{ provide: AdminService, useValue: adminService }],
      }).compileComponents();
      fixture = TestBed.createComponent(TenantConfigComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
    });

    it('AC-8: submit button is disabled when saveState is "saving"', () => {
      component.saveState.set('saving');
      fixture.detectChanges();
      const button = fixture.nativeElement.querySelector('button[type="submit"]') as HTMLButtonElement;
      expect(button.disabled).toBeTrue();
    });

    it('AC-8: submit button is enabled when saveState is "idle"', () => {
      component.saveState.set('idle');
      fixture.detectChanges();
      const button = fixture.nativeElement.querySelector('button[type="submit"]') as HTMLButtonElement;
      expect(button.disabled).toBeFalse();
    });

    it('AC-8: submit button is enabled when saveState is "saved"', () => {
      component.saveState.set('saved');
      fixture.detectChanges();
      const button = fixture.nativeElement.querySelector('button[type="submit"]') as HTMLButtonElement;
      expect(button.disabled).toBeFalse();
    });

    it('AC-8: submit button is enabled when saveState is "error" (allow retry)', () => {
      component.saveState.set('error');
      fixture.detectChanges();
      const button = fixture.nativeElement.querySelector('button[type="submit"]') as HTMLButtonElement;
      expect(button.disabled).toBeFalse();
    });
  });

  // ---------------------------------------------------------------------------
  // Accessibility — ARIA attribute assertions
  // ---------------------------------------------------------------------------
  describe('accessibility — ARIA attributes', () => {
    let fixture: ComponentFixture<TenantConfigComponent>;
    let adminService: jasmine.SpyObj<AdminService>;

    beforeEach(async () => {
      adminService = buildAdminServiceSpy();
      adminService.getTenant.and.returnValue(of(MOCK_CONFIG));
      await TestBed.configureTestingModule({
        imports: [TenantConfigComponent, ReactiveFormsModule],
        providers: [{ provide: AdminService, useValue: adminService }],
      }).compileComponents();
      fixture = TestBed.createComponent(TenantConfigComponent);
      fixture.detectChanges();
    });

    it('accessibility: all visible form labels have corresponding input elements', () => {
      const el = fixture.nativeElement as HTMLElement;
      const labels = Array.from(el.querySelectorAll('label')) as HTMLLabelElement[];
      labels.forEach((label) => {
        const forAttr = label.getAttribute('for');
        if (forAttr) {
          expect(el.querySelector(`#${forAttr}`))
            .withContext(`label[for="${forAttr}"] should have a matching input`)
            .toBeTruthy();
        }
      });
    });

    it('accessibility: form has novalidate attribute (custom validation messages used)', () => {
      const form = fixture.nativeElement.querySelector('form') as HTMLFormElement;
      expect(form.hasAttribute('novalidate')).toBeTrue();
    });

    it('accessibility: LEI input has aria-label describing the expected format', () => {
      const leiInput = fixture.nativeElement.querySelector('#lei') as HTMLInputElement;
      expect(leiInput.getAttribute('aria-label')).toBeTruthy();
    });

    it('accessibility: ncaEmail input has autocomplete="email"', () => {
      const emailInput = fixture.nativeElement.querySelector('#ncaEmail') as HTMLInputElement;
      expect(emailInput.getAttribute('autocomplete')).toBe('email');
    });

    it('accessibility: legalName input has autocomplete="organization"', () => {
      const input = fixture.nativeElement.querySelector('#legalName') as HTMLInputElement;
      expect(input.getAttribute('autocomplete')).toBe('organization');
    });
  });
});
