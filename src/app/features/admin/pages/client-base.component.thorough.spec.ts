// @thorough — AC-3: ClientBaseComponent — loading, empty, error, DOM, validation, accessibility
import { ComponentFixture, TestBed, fakeAsync } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { Subject, of, throwError } from 'rxjs';
import { ClientBaseComponent } from './client-base.component';
import { AdminService } from '../services/admin.service';
import { ClientBaseEntry, ClientBaseHistory } from '../models/admin.view-model';

const MOCK_ENTRY_1: ClientBaseEntry = {
  id: 'entry-1',
  tenantId: 'tenant-1',
  clientCount: 1200000,
  effectiveFrom: '2026-01-01T00:00:00Z',
  setBy: 'user-123',
  createdAt: '2026-01-01T08:00:00Z',
};

const MOCK_ENTRY_2: ClientBaseEntry = {
  id: 'entry-2',
  tenantId: 'tenant-1',
  clientCount: 1350000,
  effectiveFrom: '2026-04-01T00:00:00Z',
  setBy: 'user-123',
  createdAt: '2026-04-01T09:00:00Z',
};

const MOCK_HISTORY_EMPTY: ClientBaseHistory = { entries: [] };
const MOCK_HISTORY_ONE: ClientBaseHistory = { entries: [MOCK_ENTRY_1] };
const MOCK_HISTORY_MULTI: ClientBaseHistory = { entries: [MOCK_ENTRY_2, MOCK_ENTRY_1] };

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

describe('ClientBaseComponent — thorough', () => {
  // ---------------------------------------------------------------------------
  // AC-3 — loading state while GET is pending
  // ---------------------------------------------------------------------------
  describe('AC-3 — loading state rendered while getClientBaseHistory is pending', () => {
    let fixture: ComponentFixture<ClientBaseComponent>;
    let adminService: jasmine.SpyObj<AdminService>;
    let subject$: Subject<ClientBaseHistory>;

    beforeEach(async () => {
      subject$ = new Subject<ClientBaseHistory>();
      adminService = buildAdminServiceSpy();
      adminService.getClientBaseHistory.and.returnValue(subject$.asObservable());

      await TestBed.configureTestingModule({
        imports: [ClientBaseComponent, ReactiveFormsModule],
        providers: [{ provide: AdminService, useValue: adminService }],
      }).compileComponents();

      fixture = TestBed.createComponent(ClientBaseComponent);
    });

    it('AC-3: renders loading status element before observable emits', fakeAsync(() => {
      fixture.detectChanges();
      const el = fixture.nativeElement as HTMLElement;
      const status = el.querySelector('[role="status"]') as HTMLElement;
      expect(status).withContext('role=status should exist during load').toBeTruthy();
      expect(status.textContent).toContain('Loading');
    }));

    it('AC-3: loading element has aria-live="polite"', fakeAsync(() => {
      fixture.detectChanges();
      const el = fixture.nativeElement as HTMLElement;
      const status = el.querySelector('[role="status"]') as HTMLElement;
      expect(status.getAttribute('aria-live')).toBe('polite');
    }));

    it('AC-3: history table NOT rendered while loading', fakeAsync(() => {
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('table')).toBeNull();
    }));

    it('AC-3: loading element disappears after observable emits', fakeAsync(() => {
      fixture.detectChanges();
      subject$.next(MOCK_HISTORY_ONE);
      subject$.complete();
      fixture.detectChanges();
      const loadingEls = Array.from(
        (fixture.nativeElement as HTMLElement).querySelectorAll('[role="status"]'),
      ).filter((e) => e.textContent?.includes('Loading'));
      expect(loadingEls.length).toBe(0);
    }));

    it('AC-3: set-client-base form renders even while history is loading', fakeAsync(() => {
      fixture.detectChanges();
      // The form section renders unconditionally at the top of the component.
      const form = fixture.nativeElement.querySelector('form') as HTMLFormElement;
      expect(form).withContext('set-count form should always be visible').toBeTruthy();
    }));
  });

  // ---------------------------------------------------------------------------
  // AC-3 — error state when getClientBaseHistory fails
  // ---------------------------------------------------------------------------
  describe('AC-3 — error state rendered when getClientBaseHistory fails', () => {
    let fixture: ComponentFixture<ClientBaseComponent>;
    let component: ClientBaseComponent;
    let adminService: jasmine.SpyObj<AdminService>;

    beforeEach(async () => {
      adminService = buildAdminServiceSpy();
      adminService.getClientBaseHistory.and.returnValue(
        throwError(() => new Error('Server error — please try again later.')),
      );
      await TestBed.configureTestingModule({
        imports: [ClientBaseComponent, ReactiveFormsModule],
        providers: [{ provide: AdminService, useValue: adminService }],
      }).compileComponents();
      fixture = TestBed.createComponent(ClientBaseComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
    });

    it('AC-3: renders error alert in DOM when GET fails', () => {
      const el = fixture.nativeElement as HTMLElement;
      const alert = el.querySelector('[role="alert"]') as HTMLElement;
      expect(alert).toBeTruthy();
      expect(alert.textContent).toContain('Server error');
    });

    it('AC-3: loadState is "error" after failed GET', () => {
      expect(component.loadState()).toBe('error');
    });

    it('AC-3: history table is not rendered when loadState is error', () => {
      expect(fixture.nativeElement.querySelector('table')).toBeNull();
    });

    it('AC-3: set-count form is still rendered even when history load fails', () => {
      // User must still be able to set a new count even if history fails.
      expect(fixture.nativeElement.querySelector('form')).toBeTruthy();
    });
  });

  // ---------------------------------------------------------------------------
  // AC-3 — empty state when no history entries
  // ---------------------------------------------------------------------------
  describe('AC-3 — empty state when history has zero entries', () => {
    let fixture: ComponentFixture<ClientBaseComponent>;
    let component: ClientBaseComponent;
    let adminService: jasmine.SpyObj<AdminService>;

    beforeEach(async () => {
      adminService = buildAdminServiceSpy();
      adminService.getClientBaseHistory.and.returnValue(of(MOCK_HISTORY_EMPTY));
      await TestBed.configureTestingModule({
        imports: [ClientBaseComponent, ReactiveFormsModule],
        providers: [{ provide: AdminService, useValue: adminService }],
      }).compileComponents();
      fixture = TestBed.createComponent(ClientBaseComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
    });

    it('AC-3: empty-state paragraph renders when entries is []', () => {
      const el = fixture.nativeElement as HTMLElement;
      const emptyEl = el.querySelector('.empty-state') as HTMLElement;
      expect(emptyEl).withContext('.empty-state should exist').toBeTruthy();
      expect(emptyEl.textContent).toContain('No client base entries');
    });

    it('AC-3: table NOT rendered when entries is empty', () => {
      expect(fixture.nativeElement.querySelector('table')).toBeNull();
    });

    it('AC-3: entries signal holds zero items', () => {
      expect(component.entries().length).toBe(0);
    });
  });

  // ---------------------------------------------------------------------------
  // AC-3 — multiple history rows render correctly
  // ---------------------------------------------------------------------------
  describe('AC-3 — multiple history entries render in table', () => {
    let fixture: ComponentFixture<ClientBaseComponent>;
    let adminService: jasmine.SpyObj<AdminService>;

    beforeEach(async () => {
      adminService = buildAdminServiceSpy();
      adminService.getClientBaseHistory.and.returnValue(of(MOCK_HISTORY_MULTI));
      await TestBed.configureTestingModule({
        imports: [ClientBaseComponent, ReactiveFormsModule],
        providers: [{ provide: AdminService, useValue: adminService }],
      }).compileComponents();
      fixture = TestBed.createComponent(ClientBaseComponent);
      fixture.detectChanges();
    });

    it('AC-3: renders 2 table rows for 2 history entries', () => {
      const rows = fixture.nativeElement.querySelectorAll('tbody tr');
      expect(rows.length).toBe(2);
    });

    it('AC-3: formatted client count appears in DOM (1,350,000)', () => {
      const el = fixture.nativeElement as HTMLElement;
      // DecimalPipe formats 1350000 as "1,350,000"
      expect(el.textContent).toContain('1,350,000');
    });

    it('AC-3: effectiveFrom date slice renders first 10 chars', () => {
      const el = fixture.nativeElement as HTMLElement;
      expect(el.textContent).toContain('2026-04-01');
    });
  });

  // ---------------------------------------------------------------------------
  // AC-3 — clientCount form validation boundaries
  // ---------------------------------------------------------------------------
  describe('AC-3 — clientCount form validation boundaries', () => {
    let fixture: ComponentFixture<ClientBaseComponent>;
    let component: ClientBaseComponent;
    let adminService: jasmine.SpyObj<AdminService>;

    beforeEach(async () => {
      adminService = buildAdminServiceSpy();
      adminService.getClientBaseHistory.and.returnValue(of(MOCK_HISTORY_ONE));
      await TestBed.configureTestingModule({
        imports: [ClientBaseComponent, ReactiveFormsModule],
        providers: [{ provide: AdminService, useValue: adminService }],
      }).compileComponents();
      fixture = TestBed.createComponent(ClientBaseComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
    });

    it('AC-3: null clientCount has required error', () => {
      component.form.patchValue({ clientCount: null });
      component.form.get('clientCount')?.markAsTouched();
      expect(component.form.get('clientCount')?.errors?.['required']).toBeTruthy();
    });

    it('AC-3: clientCount of 0 is valid (min boundary)', () => {
      component.form.patchValue({ clientCount: 0, effectiveFrom: '2026-01-01' });
      component.form.get('clientCount')?.markAsTouched();
      expect(component.form.get('clientCount')?.errors).toBeNull();
    });

    it('AC-3: clientCount of -1 has min error', () => {
      component.form.patchValue({ clientCount: -1 });
      component.form.get('clientCount')?.markAsTouched();
      expect(component.form.get('clientCount')?.errors?.['min']).toBeTruthy();
    });

    it('AC-3: large clientCount value (10 million) is valid', () => {
      component.form.patchValue({ clientCount: 10_000_000, effectiveFrom: '2026-01-01' });
      expect(component.form.get('clientCount')?.errors).toBeNull();
    });

    it('AC-3: required error message renders in DOM when clientCount missing on submit', () => {
      component.form.patchValue({ clientCount: null, effectiveFrom: '2026-01-01' });
      component.onSubmit();
      fixture.detectChanges();
      const el = fixture.nativeElement as HTMLElement;
      const errors = Array.from(el.querySelectorAll('.field-error')) as HTMLElement[];
      const countError = errors.find((e) => e.textContent?.toLowerCase().includes('client count'));
      expect(countError).withContext('client count required error should render').toBeTruthy();
    });

    it('AC-3: min error message renders in DOM when clientCount is negative and touched', () => {
      component.form.patchValue({ clientCount: -5 });
      component.form.get('clientCount')?.markAsTouched();
      fixture.detectChanges();
      const el = fixture.nativeElement as HTMLElement;
      const errors = Array.from(el.querySelectorAll('.field-error')) as HTMLElement[];
      const minError = errors.find((e) => e.textContent?.toLowerCase().includes('0 or greater'));
      expect(minError).withContext('min error should render when count is negative').toBeTruthy();
    });

    it('AC-3: clientCount input has aria-required="true"', () => {
      const input = fixture.nativeElement.querySelector('#clientCount') as HTMLInputElement;
      expect(input.getAttribute('aria-required')).toBe('true');
    });

    it('AC-3: clientCount input has aria-invalid="true" when touched and invalid', () => {
      component.form.patchValue({ clientCount: null });
      component.form.get('clientCount')?.markAsTouched();
      fixture.detectChanges();
      const input = fixture.nativeElement.querySelector('#clientCount') as HTMLInputElement;
      expect(input.getAttribute('aria-invalid')).toBe('true');
    });
  });

  // ---------------------------------------------------------------------------
  // AC-3 — effectiveFrom form validation
  // ---------------------------------------------------------------------------
  describe('AC-3 — effectiveFrom required validation', () => {
    let fixture: ComponentFixture<ClientBaseComponent>;
    let component: ClientBaseComponent;
    let adminService: jasmine.SpyObj<AdminService>;

    beforeEach(async () => {
      adminService = buildAdminServiceSpy();
      adminService.getClientBaseHistory.and.returnValue(of(MOCK_HISTORY_ONE));
      await TestBed.configureTestingModule({
        imports: [ClientBaseComponent, ReactiveFormsModule],
        providers: [{ provide: AdminService, useValue: adminService }],
      }).compileComponents();
      fixture = TestBed.createComponent(ClientBaseComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
    });

    it('AC-3: empty effectiveFrom has required error', () => {
      component.form.patchValue({ effectiveFrom: '' });
      component.form.get('effectiveFrom')?.markAsTouched();
      expect(component.form.get('effectiveFrom')?.errors?.['required']).toBeTruthy();
    });

    it('AC-3: effectiveFrom required error renders in DOM when touched', () => {
      component.form.patchValue({ effectiveFrom: '' });
      component.form.get('effectiveFrom')?.markAsTouched();
      fixture.detectChanges();
      const el = fixture.nativeElement as HTMLElement;
      const errors = Array.from(el.querySelectorAll('.field-error')) as HTMLElement[];
      const dateError = errors.find((e) => e.textContent?.toLowerCase().includes('effective'));
      expect(dateError).toBeTruthy();
    });

    it('AC-3: effectiveFrom input has aria-required="true"', () => {
      const input = fixture.nativeElement.querySelector('#effectiveFrom') as HTMLInputElement;
      expect(input.getAttribute('aria-required')).toBe('true');
    });
  });

  // ---------------------------------------------------------------------------
  // AC-3 — save success and state transitions
  // ---------------------------------------------------------------------------
  describe('AC-3 — save success state and DOM feedback', () => {
    let fixture: ComponentFixture<ClientBaseComponent>;
    let component: ClientBaseComponent;
    let adminService: jasmine.SpyObj<AdminService>;

    beforeEach(async () => {
      adminService = buildAdminServiceSpy();
      adminService.getClientBaseHistory.and.returnValue(of(MOCK_HISTORY_ONE));
      adminService.setClientBase.and.returnValue(of(MOCK_ENTRY_1));
      await TestBed.configureTestingModule({
        imports: [ClientBaseComponent, ReactiveFormsModule],
        providers: [{ provide: AdminService, useValue: adminService }],
      }).compileComponents();
      fixture = TestBed.createComponent(ClientBaseComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
    });

    it('AC-3: "Client base count saved." message renders in DOM after successful save', () => {
      component.form.patchValue({ clientCount: 500000, effectiveFrom: '2026-06-01' });
      component.onSubmit();
      fixture.detectChanges();
      const el = fixture.nativeElement as HTMLElement;
      const successMsg = el.querySelector('.success-message') as HTMLElement;
      expect(successMsg).toBeTruthy();
      expect(successMsg.textContent).toContain('saved');
    });

    it('AC-3: success message has role="status" and aria-live="polite"', () => {
      component.form.patchValue({ clientCount: 500000, effectiveFrom: '2026-06-01' });
      component.onSubmit();
      fixture.detectChanges();
      const el = fixture.nativeElement as HTMLElement;
      const statuses = Array.from(el.querySelectorAll('[role="status"]')) as HTMLElement[];
      const savedStatus = statuses.find((e) => e.textContent?.includes('saved'));
      expect(savedStatus).toBeTruthy();
      expect(savedStatus?.getAttribute('aria-live')).toBe('polite');
    });

    it('AC-3: save button text is "Saving…" when saveState is saving', () => {
      component.saveState.set('saving');
      fixture.detectChanges();
      const button = fixture.nativeElement.querySelector('button[type="submit"]') as HTMLButtonElement;
      expect(button.textContent?.trim()).toBe('Saving…');
    });

    it('AC-3: save button is disabled when saveState is "saving"', () => {
      component.saveState.set('saving');
      fixture.detectChanges();
      const button = fixture.nativeElement.querySelector('button[type="submit"]') as HTMLButtonElement;
      expect(button.disabled).toBeTrue();
    });

    it('AC-3: save button is enabled when saveState is "idle"', () => {
      component.saveState.set('idle');
      fixture.detectChanges();
      const button = fixture.nativeElement.querySelector('button[type="submit"]') as HTMLButtonElement;
      expect(button.disabled).toBeFalse();
    });

    it('AC-3: save button is enabled when saveState is "saved" (allow re-save)', () => {
      component.saveState.set('saved');
      fixture.detectChanges();
      const button = fixture.nativeElement.querySelector('button[type="submit"]') as HTMLButtonElement;
      expect(button.disabled).toBeFalse();
    });

    it('AC-3: form resets after successful save', () => {
      component.form.patchValue({ clientCount: 500000, effectiveFrom: '2026-06-01' });
      component.onSubmit();
      expect(component.form.value['clientCount']).toBeFalsy();
      expect(component.form.value['effectiveFrom']).toBeFalsy();
    });

    it('AC-3: save button has aria-label="Save client base count"', () => {
      const button = fixture.nativeElement.querySelector('button[type="submit"]') as HTMLButtonElement;
      expect(button.getAttribute('aria-label')).toBe('Save client base count');
    });
  });

  // ---------------------------------------------------------------------------
  // AC-3 — save error state
  // ---------------------------------------------------------------------------
  describe('AC-3 — save error state renders in DOM', () => {
    let fixture: ComponentFixture<ClientBaseComponent>;
    let component: ClientBaseComponent;
    let adminService: jasmine.SpyObj<AdminService>;

    beforeEach(async () => {
      adminService = buildAdminServiceSpy();
      adminService.getClientBaseHistory.and.returnValue(of(MOCK_HISTORY_ONE));
      adminService.setClientBase.and.returnValue(
        throwError(() => new Error('Conflict — effective date already set.')),
      );
      await TestBed.configureTestingModule({
        imports: [ClientBaseComponent, ReactiveFormsModule],
        providers: [{ provide: AdminService, useValue: adminService }],
      }).compileComponents();
      fixture = TestBed.createComponent(ClientBaseComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
    });

    it('AC-3: save error message renders in DOM after failed POST', () => {
      component.form.patchValue({ clientCount: 500000, effectiveFrom: '2026-06-01' });
      component.onSubmit();
      fixture.detectChanges();
      const el = fixture.nativeElement as HTMLElement;
      const alert = el.querySelector('.error-message[role="alert"]') as HTMLElement;
      expect(alert).toBeTruthy();
      expect(alert.textContent).toContain('Conflict');
    });

    it('AC-3: saveError signal holds the error message', () => {
      component.form.patchValue({ clientCount: 500000, effectiveFrom: '2026-06-01' });
      component.onSubmit();
      expect(component.saveError()).toBe('Conflict — effective date already set.');
    });

    it('AC-3: saveState is "error" after failed POST', () => {
      component.form.patchValue({ clientCount: 500000, effectiveFrom: '2026-06-01' });
      component.onSubmit();
      expect(component.saveState()).toBe('error');
    });

    it('AC-3: save button is enabled when saveState is "error" (allow retry)', () => {
      component.saveState.set('error');
      fixture.detectChanges();
      const button = fixture.nativeElement.querySelector('button[type="submit"]') as HTMLButtonElement;
      expect(button.disabled).toBeFalse();
    });
  });

  // ---------------------------------------------------------------------------
  // AC-3 — DOM structure and accessibility
  // ---------------------------------------------------------------------------
  describe('AC-3 — DOM structure and accessibility', () => {
    let fixture: ComponentFixture<ClientBaseComponent>;
    let adminService: jasmine.SpyObj<AdminService>;

    beforeEach(async () => {
      adminService = buildAdminServiceSpy();
      adminService.getClientBaseHistory.and.returnValue(of(MOCK_HISTORY_ONE));
      await TestBed.configureTestingModule({
        imports: [ClientBaseComponent, ReactiveFormsModule],
        providers: [{ provide: AdminService, useValue: adminService }],
      }).compileComponents();
      fixture = TestBed.createComponent(ClientBaseComponent);
      fixture.detectChanges();
    });

    it('AC-3: h1 heading text is "Client Base"', () => {
      const h1 = fixture.nativeElement.querySelector('h1') as HTMLElement;
      expect(h1.textContent?.trim()).toBe('Client Base');
    });

    it('AC-3: main element has aria-labelledby pointing to the h1', () => {
      const main = fixture.nativeElement.querySelector('main') as HTMLElement;
      const h1Id = fixture.nativeElement.querySelector('h1')?.id;
      expect(main.getAttribute('aria-labelledby')).toBe(h1Id);
    });

    it('accessibility: form has novalidate attribute', () => {
      const form = fixture.nativeElement.querySelector('form') as HTMLFormElement;
      expect(form.hasAttribute('novalidate')).toBeTrue();
    });

    it('accessibility: form has aria-label', () => {
      const form = fixture.nativeElement.querySelector('form') as HTMLFormElement;
      expect(form.getAttribute('aria-label')).toBeTruthy();
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

    it('accessibility: history table has aria-label', () => {
      const table = fixture.nativeElement.querySelector('table') as HTMLTableElement;
      expect(table.getAttribute('aria-label')).toBeTruthy();
    });

    it('accessibility: history table has caption element', () => {
      expect(fixture.nativeElement.querySelector('caption')).toBeTruthy();
    });

    it('accessibility: history table th elements have scope="col"', () => {
      const headers = fixture.nativeElement.querySelectorAll('th') as NodeListOf<HTMLTableCellElement>;
      headers.forEach((th) => {
        expect(th.getAttribute('scope')).toBe('col');
      });
    });

    it('accessibility: history section has aria-labelledby pointing to its h2', () => {
      const el = fixture.nativeElement as HTMLElement;
      const section = el.querySelector('.history-section') as HTMLElement;
      const h2Id = el.querySelector('.history-section h2')?.id ?? null;
      expect(section.getAttribute('aria-labelledby')).toBe(h2Id);
    });
  });
});
