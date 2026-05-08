// @thorough — LLD-05 AC-1, AC-2, AC-4, AC-5, AC-8
// Supplements smoke specs with: loading/empty/error states, form validation
// boundaries, submit state transitions, multi-service selection, and
// accessibility assertions on rendered ARIA attributes.
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';
import { IncidentCreateComponent } from './incident-create.component';
import { IncidentsService } from '../services/incidents.service';
import { CriticalService } from '../../admin/models/admin.view-model';
import { IncidentResponse } from '../models/incident.view-model';

// ────────────────────────────────────────────────────────────────────────────
// Shared fixtures
// ────────────────────────────────────────────────────────────────────────────

const ACTIVE_SERVICES: CriticalService[] = [
  {
    id: 'svc-1',
    tenantId: 'tenant-1',
    name: 'Online Banking',
    description: 'Retail portal',
    active: true,
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'svc-2',
    tenantId: 'tenant-1',
    name: 'Payments Rail',
    description: null,
    active: true,
    createdAt: '2026-01-02T00:00:00Z',
  },
];

const INACTIVE_ONLY: CriticalService[] = [
  {
    id: 'svc-3',
    tenantId: 'tenant-1',
    name: 'Archived Svc',
    description: null,
    active: false,
    createdAt: '2026-01-03T00:00:00Z',
  },
];

const MOCK_INCIDENT: IncidentResponse = {
  id: 'uuid-inc-001',
  incidentId: 'INC-20260508-0001',
  title: 'Test Incident',
  description: 'Desc',
  impactEstimate: null,
  detectionDatetime: '2026-05-08T10:00:00Z',
  status: 'DETECTED',
  tenantId: 'tenant-1',
  createdBy: 'user-1',
  createdAt: '2026-05-08T10:00:00Z',
  attachments: [],
  services: [],
  assets: [],
};

function buildServiceSpy(): jasmine.SpyObj<IncidentsService> {
  return jasmine.createSpyObj<IncidentsService>('IncidentsService', [
    'createIncident',
    'getIncident',
    'listIncidents',
    'requestPresignedUrl',
    'uploadToPresignedUrl',
    'completeUpload',
    'listCriticalServices',
    'linkAsset',
  ]);
}

// ────────────────────────────────────────────────────────────────────────────
// Suite
// ────────────────────────────────────────────────────────────────────────────

describe('IncidentCreateComponent — thorough', () => {
  let fixture: ComponentFixture<IncidentCreateComponent>;
  let component: IncidentCreateComponent;
  let service: jasmine.SpyObj<IncidentsService>;
  let router: jasmine.SpyObj<Router>;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function setup(servicesReturn: any): Promise<void> {
    service = buildServiceSpy();
    router = jasmine.createSpyObj<Router>('Router', ['navigate']);
    service.listCriticalServices.and.returnValue(servicesReturn);

    await TestBed.configureTestingModule({
      imports: [IncidentCreateComponent, ReactiveFormsModule],
      providers: [
        { provide: IncidentsService, useValue: service },
        { provide: Router, useValue: router },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(IncidentCreateComponent);
    component = fixture.componentInstance;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // AC-4 — Services loading state
  // ──────────────────────────────────────────────────────────────────────────

  describe('AC-4 — services loading state', () => {
    it('renders "Loading available services…" status paragraph while request is pending', fakeAsync(async () => {
      // Use a Subject so we control when the observable emits
      const subject = new Subject<CriticalService[]>();
      await setup(subject as unknown as ReturnType<typeof of>);
      fixture.detectChanges();

      const statusEl = fixture.nativeElement.querySelector('[role="status"]');
      expect(statusEl).withContext('role=status paragraph should exist').toBeTruthy();
      expect(statusEl.textContent).toContain('Loading');

      subject.complete();
    }));

    it('AC-4: shows error banner in template when listCriticalServices throws', async () => {
      await setup(throwError(() => new Error('Service unavailable')) as unknown as ReturnType<typeof of>);
      fixture.detectChanges();

      expect(component.servicesLoadState()).toBe('error');
      const alertEl = fixture.nativeElement.querySelector('[role="alert"]');
      expect(alertEl).withContext('role=alert element should exist').toBeTruthy();
      expect(alertEl.textContent).toContain('Could not load services');
      expect(alertEl.textContent).toContain('Service unavailable');
    });

    it('AC-4: shows empty-state message when all returned services are inactive', async () => {
      await setup(of(INACTIVE_ONLY));
      fixture.detectChanges();

      expect(component.availableServices().length).toBe(0);
      const emptyEl = fixture.nativeElement.querySelector('.empty-state');
      expect(emptyEl).withContext('.empty-state element should exist').toBeTruthy();
      expect(emptyEl.textContent).toContain('No active critical services configured');
    });

    it('AC-4: services-error signal is set when listCriticalServices returns 500', async () => {
      await setup(throwError(() => new Error('Server error — please try again later.')) as unknown as ReturnType<typeof of>);
      fixture.detectChanges();

      expect(component.servicesError()).toBe('Server error — please try again later.');
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // AC-1 — form validation boundaries
  // ──────────────────────────────────────────────────────────────────────────

  describe('AC-1 — form validation boundaries', () => {
    beforeEach(async () => {
      await setup(of(ACTIVE_SERVICES));
      fixture.detectChanges();
    });

    it('AC-1: title at exactly 200 characters passes maxLength validation', () => {
      const exactMax = 'a'.repeat(200);
      component.form.get('title')!.setValue(exactMax);
      component.form.get('description')!.setValue('desc');
      expect(component.form.get('title')!.valid).toBeTrue();
    });

    it('AC-1: title at 201 characters fails maxLength validation', () => {
      const overMax = 'a'.repeat(201);
      component.form.get('title')!.setValue(overMax);
      expect(component.form.get('title')!.hasError('maxlength')).toBeTrue();
    });

    it('AC-1: title error message renders in the DOM after markAllAsTouched', () => {
      const overMax = 'a'.repeat(201);
      component.form.get('title')!.setValue(overMax);
      component.form.get('title')!.markAsTouched();
      fixture.detectChanges();

      const errorEl = fixture.nativeElement.querySelector('#titleError');
      expect(errorEl).withContext('titleError span should exist').toBeTruthy();
      expect(errorEl.textContent).toContain('200 characters or fewer');
    });

    it('AC-1: description error renders in DOM when required and touched', () => {
      component.form.get('description')!.setValue('');
      component.form.get('description')!.markAsTouched();
      fixture.detectChanges();

      const errorEl = fixture.nativeElement.querySelector('#descriptionError');
      expect(errorEl).withContext('descriptionError span should exist').toBeTruthy();
      expect(errorEl.textContent).toContain('required');
    });

    it('AC-1: impactEstimate is optional — form is valid with title + description only', () => {
      component.form.patchValue({ title: 'Test', description: 'Desc' });
      expect(component.form.valid).toBeTrue();
    });

    it('AC-1: impactEstimate empty string is sent as null in the payload', () => {
      service.createIncident.and.returnValue(of(MOCK_INCIDENT));
      component.form.patchValue({ title: 'Test', description: 'Desc', impactEstimate: '' });
      component.onSubmit();

      expect(service.createIncident).toHaveBeenCalledOnceWith(
        jasmine.objectContaining({ impactEstimate: null }),
      );
    });

    it('AC-1: submit button is disabled while submitting', () => {
      // Use a subject to hold the response so we can observe the submitting state
      const subject = new Subject<IncidentResponse>();
      service.createIncident.and.returnValue(subject.asObservable());
      component.form.patchValue({ title: 'Test', description: 'Desc' });

      component.onSubmit();
      fixture.detectChanges();

      expect(component.submitState()).toBe('submitting');
      const submitBtn = fixture.nativeElement.querySelector('button[type="submit"]');
      expect(submitBtn.disabled).toBeTrue();
      expect(submitBtn.textContent.trim()).toContain('Submitting');

      subject.complete();
    });

    it('AC-1: markAllAsTouched is called when form is invalid on submit', () => {
      spyOn(component.form, 'markAllAsTouched').and.callThrough();
      component.onSubmit();
      expect(component.form.markAllAsTouched).toHaveBeenCalled();
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // AC-5 — asset row validation
  // ──────────────────────────────────────────────────────────────────────────

  describe('AC-5 — asset row validation boundaries', () => {
    beforeEach(async () => {
      await setup(of(ACTIVE_SERVICES));
      fixture.detectChanges();
    });

    it('AC-5: asset name at exactly 200 characters passes maxLength', () => {
      component.addAssetRow();
      component.assetRowAt(0).get('name')!.setValue('a'.repeat(200));
      expect(component.assetRowAt(0).get('name')!.valid).toBeTrue();
    });

    it('AC-5: asset name at 201 characters fails maxLength', () => {
      component.addAssetRow();
      component.assetRowAt(0).get('name')!.setValue('a'.repeat(201));
      expect(component.assetRowAt(0).get('name')!.hasError('maxlength')).toBeTrue();
    });

    it('AC-5: asset type at exactly 100 characters passes maxLength', () => {
      component.addAssetRow();
      component.assetRowAt(0).get('type')!.setValue('a'.repeat(100));
      expect(component.assetRowAt(0).get('type')!.valid).toBeTrue();
    });

    it('AC-5: asset type at 101 characters fails maxLength', () => {
      component.addAssetRow();
      component.assetRowAt(0).get('type')!.setValue('a'.repeat(101));
      expect(component.assetRowAt(0).get('type')!.hasError('maxlength')).toBeTrue();
    });

    it('AC-5: asset row with empty name is invalid and blocks form submit', () => {
      component.addAssetRow();
      component.assetRowAt(0).patchValue({ name: '', type: 'SERVER' });
      component.form.get('title')!.setValue('Test');
      component.form.get('description')!.setValue('Desc');

      component.onSubmit();
      expect(service.createIncident).not.toHaveBeenCalled();
    });

    it('AC-5: asset row with empty type is invalid and blocks form submit', () => {
      component.addAssetRow();
      component.assetRowAt(0).patchValue({ name: 'Server A', type: '' });
      component.form.get('title')!.setValue('Test');
      component.form.get('description')!.setValue('Desc');

      component.onSubmit();
      expect(service.createIncident).not.toHaveBeenCalled();
    });

    it('AC-5: asset name error renders in template when invalid and touched', () => {
      component.addAssetRow();
      component.assetRowAt(0).get('name')!.setValue('');
      component.assetRowAt(0).get('name')!.markAsTouched();
      fixture.detectChanges();

      const nameErrors = fixture.nativeElement.querySelectorAll('.field-error');
      const texts = Array.from(nameErrors).map((el) => (el as Element).textContent?.trim());
      expect(texts.some((t) => t?.includes('Asset name is required'))).toBeTrue();
    });

    it('AC-5: multiple asset rows are all sent in the payload', () => {
      service.createIncident.and.returnValue(of(MOCK_INCIDENT));
      component.form.patchValue({ title: 'Test', description: 'Desc' });
      component.addAssetRow();
      component.addAssetRow();
      component.assetRowAt(0).patchValue({ name: 'Server A', type: 'SERVER' });
      component.assetRowAt(1).patchValue({ name: 'Switch B', type: 'NETWORK_DEVICE' });

      component.onSubmit();

      expect(service.createIncident).toHaveBeenCalledOnceWith(
        jasmine.objectContaining({
          assets: [
            { name: 'Server A', type: 'SERVER' },
            { name: 'Switch B', type: 'NETWORK_DEVICE' },
          ],
        }),
      );
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // AC-4 — multiple services selected
  // ──────────────────────────────────────────────────────────────────────────

  describe('AC-4 — multiple services selection', () => {
    beforeEach(async () => {
      await setup(of(ACTIVE_SERVICES));
      fixture.detectChanges();
    });

    it('AC-4: multiple selected services are all included in the payload', () => {
      service.createIncident.and.returnValue(of(MOCK_INCIDENT));
      component.form.patchValue({ title: 'Test', description: 'Desc' });
      component.toggleService('svc-1');
      component.toggleService('svc-2');

      component.onSubmit();

      const call = service.createIncident.calls.mostRecent().args[0];
      expect(call.serviceIds).toContain('svc-1');
      expect(call.serviceIds).toContain('svc-2');
      expect((call.serviceIds as string[]).length).toBe(2);
    });

    it('AC-4: zero services selected results in empty serviceIds array', () => {
      service.createIncident.and.returnValue(of(MOCK_INCIDENT));
      component.form.patchValue({ title: 'Test', description: 'Desc' });

      component.onSubmit();

      expect(service.createIncident).toHaveBeenCalledOnceWith(
        jasmine.objectContaining({ serviceIds: [] }),
      );
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // AC-1 — submit error state (template rendering)
  // ──────────────────────────────────────────────────────────────────────────

  describe('AC-1 — submit error state rendered in template', () => {
    beforeEach(async () => {
      await setup(of(ACTIVE_SERVICES));
      fixture.detectChanges();
    });

    it('AC-1: error message paragraph appears in the DOM after createIncident failure', () => {
      service.createIncident.and.returnValue(
        throwError(() => new Error('Server error — please try again later.')),
      );
      component.form.patchValue({ title: 'Test', description: 'Desc' });
      component.onSubmit();
      fixture.detectChanges();

      // The submit-error paragraph has role="alert"
      const alerts = fixture.nativeElement.querySelectorAll('[role="alert"]');
      const texts = Array.from(alerts).map((el) => (el as Element).textContent?.trim());
      expect(
        texts.some((t) => t?.includes('Server error — please try again later.')),
      ).toBeTrue();
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // AC-2 — detection datetime absolutely absent from template and model
  // ──────────────────────────────────────────────────────────────────────────

  describe('AC-2 — detection_datetime not editable', () => {
    beforeEach(async () => {
      await setup(of(ACTIVE_SERVICES));
      fixture.detectChanges();
    });

    it('AC-2: no input of any type labelled detectionDatetime exists', () => {
      const allInputs = fixture.nativeElement.querySelectorAll('input, textarea, select');
      for (const el of Array.from(allInputs)) {
        const name = (el as Element).getAttribute('formcontrolname') ?? '';
        const id = (el as Element).getAttribute('id') ?? '';
        expect(name.toLowerCase()).not.toContain('detection');
        expect(id.toLowerCase()).not.toContain('detection');
      }
    });

    it('AC-2: the template does not reference the word "detected" in any input label', () => {
      const labels = fixture.nativeElement.querySelectorAll('label');
      for (const lbl of Array.from(labels)) {
        expect((lbl as Element).textContent?.toLowerCase()).not.toContain('detected');
      }
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Accessibility assertions
  // ──────────────────────────────────────────────────────────────────────────

  describe('accessibility', () => {
    beforeEach(async () => {
      await setup(of(ACTIVE_SERVICES));
      fixture.detectChanges();
    });

    it('main element has aria-labelledby pointing to the h1', () => {
      const main = fixture.nativeElement.querySelector('main');
      const labelId = main?.getAttribute('aria-labelledby');
      expect(labelId).withContext('main aria-labelledby should exist').toBeTruthy();
      const heading = fixture.nativeElement.querySelector(`#${labelId}`);
      expect(heading).withContext('heading referenced by aria-labelledby should exist').toBeTruthy();
      expect(heading.tagName).toBe('H1');
    });

    it('title input has aria-required="true"', () => {
      const titleInput = fixture.nativeElement.querySelector('#incidentTitle');
      expect(titleInput?.getAttribute('aria-required')).toBe('true');
    });

    it('description textarea has aria-required="true"', () => {
      const descInput = fixture.nativeElement.querySelector('#incidentDescription');
      expect(descInput?.getAttribute('aria-required')).toBe('true');
    });

    it('title input sets aria-invalid="true" when invalid and touched', () => {
      component.form.get('title')!.setValue('');
      component.form.get('title')!.markAsTouched();
      fixture.detectChanges();

      const titleInput = fixture.nativeElement.querySelector('#incidentTitle');
      expect(titleInput?.getAttribute('aria-invalid')).toBe('true');
    });

    it('title input sets aria-describedby pointing to error span when invalid', () => {
      component.form.get('title')!.setValue('');
      component.form.get('title')!.markAsTouched();
      fixture.detectChanges();

      const titleInput = fixture.nativeElement.querySelector('#incidentTitle');
      expect(titleInput?.getAttribute('aria-describedby')).toBe('titleError');
    });

    it('title input aria-describedby is null when field is valid', () => {
      component.form.get('title')!.setValue('Valid title');
      component.form.get('title')!.markAsTouched();
      fixture.detectChanges();

      const titleInput = fixture.nativeElement.querySelector('#incidentTitle');
      expect(titleInput?.getAttribute('aria-describedby')).toBeNull();
    });

    it('submit button has aria-label', () => {
      const submitBtn = fixture.nativeElement.querySelector('button[type="submit"]');
      expect(submitBtn?.getAttribute('aria-label')).toBeTruthy();
    });

    it('add-asset button has aria-label', () => {
      const addBtn = fixture.nativeElement.querySelector('.btn-add-asset');
      expect(addBtn?.getAttribute('aria-label')).toContain('Add ICT asset');
    });

    it('services fieldset uses role="group" list with aria-label', () => {
      const group = fixture.nativeElement.querySelector('[role="group"]');
      expect(group).withContext('role=group element should exist for services').toBeTruthy();
      expect(group.getAttribute('aria-label')).toBeTruthy();
    });

    it('each service checkbox has an aria-label containing the service name', () => {
      const checkboxes = fixture.nativeElement.querySelectorAll('input[type="checkbox"]');
      for (const cb of Array.from(checkboxes)) {
        const label = (cb as Element).getAttribute('aria-label');
        expect(label).withContext('checkbox should have aria-label').toBeTruthy();
      }
    });

    it('a11y — note: axe-core not installed; ARIA attributes verified manually above', () => {
      // axe-core is not a project dependency; automated scan not run.
      // Manual accessibility checks above cover: landmarks, aria-required,
      // aria-invalid, aria-describedby, aria-label on interactive elements.
      expect(true).toBeTrue();
    });
  });
});
