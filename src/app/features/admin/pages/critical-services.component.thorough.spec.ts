// @thorough — AC-2: CriticalServicesComponent — loading, empty, error, DOM, validation, accessibility
import { ComponentFixture, TestBed, fakeAsync } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { Subject, of, throwError } from 'rxjs';
import { CriticalServicesComponent } from './critical-services.component';
import { AdminService } from '../services/admin.service';
import { CriticalService } from '../models/admin.view-model';

const MOCK_ACTIVE: CriticalService[] = [
  {
    id: 'svc-1',
    tenantId: 'tenant-1',
    name: 'Online Banking',
    description: 'Retail online banking portal',
    active: true,
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'svc-2',
    tenantId: 'tenant-1',
    name: 'Payment Processing',
    description: null,
    active: true,
    createdAt: '2026-01-02T00:00:00Z',
  },
];

const MOCK_WITH_ARCHIVED: CriticalService[] = [
  ...MOCK_ACTIVE,
  {
    id: 'svc-3',
    tenantId: 'tenant-1',
    name: 'Archived Service',
    description: null,
    active: false,
    createdAt: '2025-12-01T00:00:00Z',
  },
];

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

describe('CriticalServicesComponent — thorough', () => {
  // ---------------------------------------------------------------------------
  // AC-2 — loading state while GET is pending
  // ---------------------------------------------------------------------------
  describe('AC-2 — loading state rendered while listCriticalServices is pending', () => {
    let fixture: ComponentFixture<CriticalServicesComponent>;
    let adminService: jasmine.SpyObj<AdminService>;
    let subject$: Subject<CriticalService[]>;

    beforeEach(async () => {
      subject$ = new Subject<CriticalService[]>();
      adminService = buildAdminServiceSpy();
      adminService.listCriticalServices.and.returnValue(subject$.asObservable());

      await TestBed.configureTestingModule({
        imports: [CriticalServicesComponent, ReactiveFormsModule],
        providers: [{ provide: AdminService, useValue: adminService }],
      }).compileComponents();

      fixture = TestBed.createComponent(CriticalServicesComponent);
    });

    it('AC-2: renders loading status element before observable emits', fakeAsync(() => {
      fixture.detectChanges();
      const el = fixture.nativeElement as HTMLElement;
      const status = el.querySelector('[role="status"]') as HTMLElement;
      expect(status).withContext('role=status element should exist during load').toBeTruthy();
      expect(status.textContent).toContain('Loading');
    }));

    it('AC-2: loading element has aria-live="polite"', fakeAsync(() => {
      fixture.detectChanges();
      const el = fixture.nativeElement as HTMLElement;
      const status = el.querySelector('[role="status"]') as HTMLElement;
      expect(status).toBeTruthy();
      expect(status.getAttribute('aria-live')).toBe('polite');
    }));

    it('AC-2: table is not rendered while loading', fakeAsync(() => {
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('table')).toBeNull();
    }));

    it('AC-2: add form section is not rendered while loading', fakeAsync(() => {
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('form')).toBeNull();
    }));

    it('AC-2: loading element disappears after observable emits', fakeAsync(() => {
      fixture.detectChanges();
      subject$.next(MOCK_ACTIVE);
      subject$.complete();
      fixture.detectChanges();
      const el = fixture.nativeElement as HTMLElement;
      const loadingEls = Array.from(el.querySelectorAll('[role="status"]')).filter(
        (e) => e.textContent?.includes('Loading'),
      );
      expect(loadingEls.length).toBe(0);
    }));
  });

  // ---------------------------------------------------------------------------
  // AC-2 — error state when listCriticalServices fails
  // ---------------------------------------------------------------------------
  describe('AC-2 — error state rendered when listCriticalServices fails', () => {
    let fixture: ComponentFixture<CriticalServicesComponent>;
    let component: CriticalServicesComponent;
    let adminService: jasmine.SpyObj<AdminService>;

    beforeEach(async () => {
      adminService = buildAdminServiceSpy();
      adminService.listCriticalServices.and.returnValue(
        throwError(() => new Error('Server error — please try again later.')),
      );
      await TestBed.configureTestingModule({
        imports: [CriticalServicesComponent, ReactiveFormsModule],
        providers: [{ provide: AdminService, useValue: adminService }],
      }).compileComponents();
      fixture = TestBed.createComponent(CriticalServicesComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
    });

    it('AC-2: renders error alert element in DOM when GET fails', () => {
      const el = fixture.nativeElement as HTMLElement;
      const alert = el.querySelector('[role="alert"]') as HTMLElement;
      expect(alert).withContext('role=alert should be present on error').toBeTruthy();
      expect(alert.textContent).toContain('Server error');
    });

    it('AC-2: error element has role="alert" for screen-reader announcement', () => {
      expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeTruthy();
    });

    it('AC-2: loadState signal is "error" after failed GET', () => {
      expect(component.loadState()).toBe('error');
    });

    it('AC-2: table is not rendered when state is error', () => {
      expect(fixture.nativeElement.querySelector('table')).toBeNull();
    });

    it('AC-2: add form section is not rendered when state is error', () => {
      expect(fixture.nativeElement.querySelector('form')).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // AC-2 — empty state when no active services
  // ---------------------------------------------------------------------------
  describe('AC-2 — empty state when API returns no active services', () => {
    let fixture: ComponentFixture<CriticalServicesComponent>;
    let component: CriticalServicesComponent;
    let adminService: jasmine.SpyObj<AdminService>;

    beforeEach(async () => {
      adminService = buildAdminServiceSpy();
      // API returns one service but it is archived (active: false)
      adminService.listCriticalServices.and.returnValue(
        of([{ id: 'svc-99', tenantId: 't1', name: 'Old Svc', description: null, active: false, createdAt: '2025-01-01T00:00:00Z' }]),
      );
      await TestBed.configureTestingModule({
        imports: [CriticalServicesComponent, ReactiveFormsModule],
        providers: [{ provide: AdminService, useValue: adminService }],
      }).compileComponents();
      fixture = TestBed.createComponent(CriticalServicesComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
    });

    it('AC-2: empty-state paragraph renders when no active services', () => {
      const el = fixture.nativeElement as HTMLElement;
      const emptyEl = el.querySelector('.empty-state') as HTMLElement;
      expect(emptyEl).withContext('.empty-state should be present').toBeTruthy();
      expect(emptyEl.textContent).toContain('No active critical services');
    });

    it('AC-2: table is NOT rendered when services list is empty after filtering', () => {
      expect(fixture.nativeElement.querySelector('table')).toBeNull();
    });

    it('AC-2: services signal holds zero items', () => {
      expect(component.services().length).toBe(0);
    });

    it('AC-2: empty state renders AND add form is shown (user can add first service)', () => {
      // Add form must still be accessible even in empty state
      const form = fixture.nativeElement.querySelector('form') as HTMLFormElement;
      expect(form).withContext('add form should render in empty state').toBeTruthy();
    });
  });

  // ---------------------------------------------------------------------------
  // AC-2 — empty state when API returns truly empty array
  // ---------------------------------------------------------------------------
  describe('AC-2 — empty state when API returns []', () => {
    let fixture: ComponentFixture<CriticalServicesComponent>;
    let adminService: jasmine.SpyObj<AdminService>;

    beforeEach(async () => {
      adminService = buildAdminServiceSpy();
      adminService.listCriticalServices.and.returnValue(of([]));
      await TestBed.configureTestingModule({
        imports: [CriticalServicesComponent, ReactiveFormsModule],
        providers: [{ provide: AdminService, useValue: adminService }],
      }).compileComponents();
      fixture = TestBed.createComponent(CriticalServicesComponent);
      fixture.detectChanges();
    });

    it('AC-2: empty-state paragraph renders when API returns []', () => {
      const el = fixture.nativeElement as HTMLElement;
      expect(el.querySelector('.empty-state')).toBeTruthy();
    });
  });

  // ---------------------------------------------------------------------------
  // AC-2 — archived services filtered from active list
  // ---------------------------------------------------------------------------
  describe('AC-2 — archived services are filtered from the rendered list', () => {
    let fixture: ComponentFixture<CriticalServicesComponent>;
    let component: CriticalServicesComponent;
    let adminService: jasmine.SpyObj<AdminService>;

    beforeEach(async () => {
      adminService = buildAdminServiceSpy();
      adminService.listCriticalServices.and.returnValue(of(MOCK_WITH_ARCHIVED));
      await TestBed.configureTestingModule({
        imports: [CriticalServicesComponent, ReactiveFormsModule],
        providers: [{ provide: AdminService, useValue: adminService }],
      }).compileComponents();
      fixture = TestBed.createComponent(CriticalServicesComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
    });

    it('AC-2: archived service is NOT in the services signal', () => {
      const names = component.services().map((s) => s.name);
      expect(names).not.toContain('Archived Service');
    });

    it('AC-2: archived service name does NOT appear in DOM', () => {
      const el = fixture.nativeElement as HTMLElement;
      expect(el.textContent).not.toContain('Archived Service');
    });

    it('AC-2: only 2 table rows are rendered (active services)', () => {
      const rows = fixture.nativeElement.querySelectorAll('tbody tr');
      expect(rows.length).toBe(2);
    });

    it('AC-2: description "—" rendered for null description in DOM', () => {
      const el = fixture.nativeElement as HTMLElement;
      // Payment Processing has null description — template renders "—"
      const cells = Array.from(el.querySelectorAll('tbody td')) as HTMLElement[];
      const descriptionCells = cells.filter((_, i) => i % 4 === 1); // second column in each row
      const hasEmptyDash = descriptionCells.some((c) => c.textContent?.trim() === '—');
      expect(hasEmptyDash).toBeTrue();
    });
  });

  // ---------------------------------------------------------------------------
  // AC-2 — add form name required validation
  // ---------------------------------------------------------------------------
  describe('AC-2 — add form required name validation', () => {
    let fixture: ComponentFixture<CriticalServicesComponent>;
    let component: CriticalServicesComponent;
    let adminService: jasmine.SpyObj<AdminService>;

    beforeEach(async () => {
      adminService = buildAdminServiceSpy();
      adminService.listCriticalServices.and.returnValue(of(MOCK_ACTIVE));
      await TestBed.configureTestingModule({
        imports: [CriticalServicesComponent, ReactiveFormsModule],
        providers: [{ provide: AdminService, useValue: adminService }],
      }).compileComponents();
      fixture = TestBed.createComponent(CriticalServicesComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
    });

    it('AC-2: empty name field results in form invalid', () => {
      component.addForm.patchValue({ name: '' });
      component.addForm.get('name')?.markAsTouched();
      expect(component.addForm.invalid).toBeTrue();
      expect(component.addForm.get('name')?.errors?.['required']).toBeTruthy();
    });

    it('AC-2: empty name field + onAdd() does NOT call createCriticalService', () => {
      component.addForm.patchValue({ name: '' });
      component.onAdd();
      expect(adminService.createCriticalService).not.toHaveBeenCalled();
    });

    it('AC-2: validation error message renders in DOM after submit with empty name', () => {
      component.addForm.patchValue({ name: '' });
      component.onAdd(); // marks all touched
      fixture.detectChanges();
      const el = fixture.nativeElement as HTMLElement;
      const errors = Array.from(el.querySelectorAll('.field-error')) as HTMLElement[];
      const nameError = errors.find((e) => e.textContent?.toLowerCase().includes('name'));
      expect(nameError).withContext('name required error should render in DOM').toBeTruthy();
    });

    it('AC-2: name input has aria-required="true"', () => {
      const input = fixture.nativeElement.querySelector('#serviceName') as HTMLInputElement;
      expect(input.getAttribute('aria-required')).toBe('true');
    });

    it('AC-2: name input has aria-invalid="true" when touched and invalid', () => {
      component.addForm.patchValue({ name: '' });
      component.addForm.get('name')?.markAsTouched();
      fixture.detectChanges();
      const input = fixture.nativeElement.querySelector('#serviceName') as HTMLInputElement;
      expect(input.getAttribute('aria-invalid')).toBe('true');
    });

    it('AC-2: field-error element has role="alert" and aria-live="polite"', () => {
      component.addForm.patchValue({ name: '' });
      component.addForm.get('name')?.markAsTouched();
      fixture.detectChanges();
      const el = fixture.nativeElement as HTMLElement;
      const alert = el.querySelector('.field-error[role="alert"]') as HTMLElement;
      expect(alert).toBeTruthy();
      expect(alert.getAttribute('aria-live')).toBe('polite');
    });
  });

  // ---------------------------------------------------------------------------
  // AC-2 — add form null description treated as optional
  // ---------------------------------------------------------------------------
  describe('AC-2 — description is optional in add form', () => {
    let fixture: ComponentFixture<CriticalServicesComponent>;
    let component: CriticalServicesComponent;
    let adminService: jasmine.SpyObj<AdminService>;

    beforeEach(async () => {
      adminService = buildAdminServiceSpy();
      adminService.listCriticalServices.and.returnValue(of(MOCK_ACTIVE));
      adminService.createCriticalService.and.returnValue(of(MOCK_ACTIVE[0]));
      await TestBed.configureTestingModule({
        imports: [CriticalServicesComponent, ReactiveFormsModule],
        providers: [{ provide: AdminService, useValue: adminService }],
      }).compileComponents();
      fixture = TestBed.createComponent(CriticalServicesComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
    });

    it('AC-2: submitting with name only (no description) sends null description', () => {
      component.addForm.patchValue({ name: 'ATM Services', description: '' });
      component.onAdd();
      expect(adminService.createCriticalService).toHaveBeenCalledOnceWith({
        name: 'ATM Services',
        description: null,
      });
    });
  });

  // ---------------------------------------------------------------------------
  // AC-2 — add state feedback (adding → idle, error)
  // ---------------------------------------------------------------------------
  describe('AC-2 — add state transitions render correctly', () => {
    let fixture: ComponentFixture<CriticalServicesComponent>;
    let component: CriticalServicesComponent;
    let adminService: jasmine.SpyObj<AdminService>;

    beforeEach(async () => {
      adminService = buildAdminServiceSpy();
      adminService.listCriticalServices.and.returnValue(of(MOCK_ACTIVE));
      await TestBed.configureTestingModule({
        imports: [CriticalServicesComponent, ReactiveFormsModule],
        providers: [{ provide: AdminService, useValue: adminService }],
      }).compileComponents();
      fixture = TestBed.createComponent(CriticalServicesComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
    });

    it('AC-2: add button text is "Add service" when addState is idle', () => {
      component.addState.set('idle');
      fixture.detectChanges();
      const button = fixture.nativeElement.querySelector('button[type="submit"]') as HTMLButtonElement;
      expect(button.textContent?.trim()).toBe('Add service');
    });

    it('AC-2: add button text is "Adding…" when addState is saving', () => {
      component.addState.set('saving');
      fixture.detectChanges();
      const button = fixture.nativeElement.querySelector('button[type="submit"]') as HTMLButtonElement;
      expect(button.textContent?.trim()).toBe('Adding…');
    });

    it('AC-2: add button is disabled when addState is saving (prevents double-submit)', () => {
      component.addState.set('saving');
      fixture.detectChanges();
      const button = fixture.nativeElement.querySelector('button[type="submit"]') as HTMLButtonElement;
      expect(button.disabled).toBeTrue();
    });

    it('AC-2: add button is enabled when addState is idle', () => {
      component.addState.set('idle');
      fixture.detectChanges();
      const button = fixture.nativeElement.querySelector('button[type="submit"]') as HTMLButtonElement;
      expect(button.disabled).toBeFalse();
    });

    it('AC-2: add error message renders in DOM when addState is error', () => {
      adminService.createCriticalService.and.returnValue(
        throwError(() => new Error('Duplicate service name')),
      );
      component.addForm.patchValue({ name: 'Online Banking', description: '' });
      component.onAdd();
      fixture.detectChanges();
      const el = fixture.nativeElement as HTMLElement;
      const alert = el.querySelector('.error-message[role="alert"]') as HTMLElement;
      expect(alert).toBeTruthy();
      expect(alert.textContent).toContain('Duplicate service name');
    });

    it('AC-2: addError signal holds the error message after failed create', () => {
      adminService.createCriticalService.and.returnValue(
        throwError(() => new Error('Server error — please try again later.')),
      );
      component.addForm.patchValue({ name: 'Test', description: '' });
      component.onAdd();
      expect(component.addError()).toBe('Server error — please try again later.');
    });

    it('AC-2: addState is "error" after failed createCriticalService', () => {
      adminService.createCriticalService.and.returnValue(
        throwError(() => new Error('fail')),
      );
      component.addForm.patchValue({ name: 'Test', description: '' });
      component.onAdd();
      expect(component.addState()).toBe('error');
    });

    it('AC-2: addError is cleared and form resets after successful add', () => {
      adminService.createCriticalService.and.returnValue(of(MOCK_ACTIVE[0]));
      component.addForm.patchValue({ name: 'New Service', description: 'desc' });
      component.onAdd();
      expect(component.addError()).toBe('');
      expect(component.addForm.value['name']).toBeFalsy();
    });
  });

  // ---------------------------------------------------------------------------
  // AC-2 — archive button states
  // ---------------------------------------------------------------------------
  describe('AC-2 — archive button states and error handling', () => {
    let fixture: ComponentFixture<CriticalServicesComponent>;
    let component: CriticalServicesComponent;
    let adminService: jasmine.SpyObj<AdminService>;

    beforeEach(async () => {
      adminService = buildAdminServiceSpy();
      adminService.listCriticalServices.and.returnValue(of(MOCK_ACTIVE));
      await TestBed.configureTestingModule({
        imports: [CriticalServicesComponent, ReactiveFormsModule],
        providers: [{ provide: AdminService, useValue: adminService }],
      }).compileComponents();
      fixture = TestBed.createComponent(CriticalServicesComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
    });

    it('AC-2: isArchiving returns false before archive is called', () => {
      expect(component.isArchiving('svc-1')).toBeFalse();
    });

    it('AC-2: archive button shows "Archiving…" text and is disabled while in progress', () => {
      component.archiveState.update((s) => ({ ...s, 'svc-1': 'archiving' }));
      fixture.detectChanges();
      const buttons = fixture.nativeElement.querySelectorAll(
        '.btn-archive',
      ) as NodeListOf<HTMLButtonElement>;
      // First button corresponds to svc-1 (Online Banking)
      expect(buttons[0].textContent?.trim()).toBe('Archiving…');
      expect(buttons[0].disabled).toBeTrue();
    });

    it('AC-2: archive error sets errorMessage signal', () => {
      adminService.archiveCriticalService.and.returnValue(
        throwError(() => new Error('Archive failed')),
      );
      component.onArchive(MOCK_ACTIVE[0]);
      expect(component.errorMessage()).toBe('Archive failed');
    });

    it('AC-2: archive error sets archiveState to "error" for the service', () => {
      adminService.archiveCriticalService.and.returnValue(
        throwError(() => new Error('fail')),
      );
      component.onArchive(MOCK_ACTIVE[0]);
      expect(component.archiveState()['svc-1']).toBe('error');
    });

    it('AC-2: archive success resets archiveState to "idle"', () => {
      adminService.archiveCriticalService.and.returnValue(of(undefined));
      component.onArchive(MOCK_ACTIVE[0]);
      expect(component.archiveState()['svc-1']).toBe('idle');
    });

    it('AC-2: archive buttons have correct aria-label attributes', () => {
      const buttons = fixture.nativeElement.querySelectorAll(
        '.btn-archive',
      ) as NodeListOf<HTMLButtonElement>;
      expect(buttons[0].getAttribute('aria-label')).toBe('Archive Online Banking');
      expect(buttons[1].getAttribute('aria-label')).toBe('Archive Payment Processing');
    });
  });

  // ---------------------------------------------------------------------------
  // AC-2 — DOM structure and accessibility
  // ---------------------------------------------------------------------------
  describe('AC-2 — DOM structure and accessibility after successful load', () => {
    let fixture: ComponentFixture<CriticalServicesComponent>;
    let adminService: jasmine.SpyObj<AdminService>;

    beforeEach(async () => {
      adminService = buildAdminServiceSpy();
      adminService.listCriticalServices.and.returnValue(of(MOCK_ACTIVE));
      await TestBed.configureTestingModule({
        imports: [CriticalServicesComponent, ReactiveFormsModule],
        providers: [{ provide: AdminService, useValue: adminService }],
      }).compileComponents();
      fixture = TestBed.createComponent(CriticalServicesComponent);
      fixture.detectChanges();
    });

    it('AC-2: h1 heading text is "Critical Services"', () => {
      const h1 = fixture.nativeElement.querySelector('h1') as HTMLElement;
      expect(h1.textContent?.trim()).toBe('Critical Services');
    });

    it('AC-2: main element has aria-labelledby pointing to the h1', () => {
      const main = fixture.nativeElement.querySelector('main') as HTMLElement;
      const h1Id = fixture.nativeElement.querySelector('h1')?.id;
      expect(main.getAttribute('aria-labelledby')).toBe(h1Id);
    });

    it('accessibility: table has aria-label attribute', () => {
      const table = fixture.nativeElement.querySelector('table') as HTMLTableElement;
      expect(table.getAttribute('aria-label')).toBeTruthy();
    });

    it('accessibility: table has caption (visually hidden) for screen readers', () => {
      const caption = fixture.nativeElement.querySelector('caption') as HTMLElement;
      expect(caption).withContext('table caption should exist').toBeTruthy();
    });

    it('accessibility: all th elements have scope="col"', () => {
      const headers = fixture.nativeElement.querySelectorAll('th') as NodeListOf<HTMLTableCellElement>;
      headers.forEach((th) => {
        expect(th.getAttribute('scope')).toBe('col');
      });
    });

    it('accessibility: add form has aria-label', () => {
      const form = fixture.nativeElement.querySelector('form') as HTMLFormElement;
      expect(form.getAttribute('aria-label')).toBeTruthy();
    });

    it('accessibility: add form has novalidate attribute (custom messages used)', () => {
      const form = fixture.nativeElement.querySelector('form') as HTMLFormElement;
      expect(form.hasAttribute('novalidate')).toBeTrue();
    });

    it('accessibility: add section has aria-labelledby pointing to h2', () => {
      const el = fixture.nativeElement as HTMLElement;
      const addSection = el.querySelector('.add-section') as HTMLElement;
      const h2Id = el.querySelector('.add-section h2')?.id ?? null;
      expect(addSection.getAttribute('aria-labelledby')).toBe(h2Id);
    });

    it('accessibility: label[for="serviceName"] has matching #serviceName input', () => {
      const el = fixture.nativeElement as HTMLElement;
      const label = el.querySelector('label[for="serviceName"]');
      expect(label).toBeTruthy();
      expect(el.querySelector('#serviceName')).toBeTruthy();
    });
  });
});
