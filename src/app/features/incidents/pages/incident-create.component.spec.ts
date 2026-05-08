// @smoke — LLD-05 AC-1, AC-2, AC-4, AC-5, AC-8
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { IncidentCreateComponent } from './incident-create.component';
import { IncidentsService } from '../services/incidents.service';
import { CriticalService } from '../../admin/models/admin.view-model';
import { IncidentResponse } from '../models/incident.view-model';

const MOCK_SERVICES: CriticalService[] = [
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

describe('AC-1, AC-2, AC-4, AC-5, AC-8 — IncidentCreateComponent @smoke', () => {
  let fixture: ComponentFixture<IncidentCreateComponent>;
  let component: IncidentCreateComponent;
  let service: jasmine.SpyObj<IncidentsService>;
  let router: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    service = buildServiceSpy();
    router = jasmine.createSpyObj<Router>('Router', ['navigate']);
    service.listCriticalServices.and.returnValue(of(MOCK_SERVICES));

    await TestBed.configureTestingModule({
      imports: [IncidentCreateComponent, ReactiveFormsModule],
      providers: [
        { provide: IncidentsService, useValue: service },
        { provide: Router, useValue: router },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(IncidentCreateComponent);
    component = fixture.componentInstance;
  });

  // AC-4: Affected services multiselect populated from /api/v1/admin/critical-services
  it('AC-4: loads only active critical services on init', () => {
    fixture.detectChanges();
    expect(service.listCriticalServices).toHaveBeenCalledTimes(1);
    expect(component.servicesLoadState()).toBe('loaded');
    // Active services only — archived one excluded.
    expect(component.availableServices().length).toBe(2);
    const names = component.availableServices().map((s) => s.name);
    expect(names).toContain('Online Banking');
    expect(names).toContain('Payments Rail');
    expect(names).not.toContain('Archived Svc');
  });

  // AC-4: Checkboxes render for each active service
  it('AC-4: renders a checkbox for each active service', () => {
    fixture.detectChanges();
    const checkboxes = fixture.nativeElement.querySelectorAll('input[type="checkbox"]');
    expect(checkboxes.length).toBe(2);
  });

  // AC-4: Toggling a service adds it to the selected set
  it('AC-4: toggleService adds and removes from selectedServiceIds', () => {
    fixture.detectChanges();
    component.toggleService('svc-1');
    expect(component.isServiceSelected('svc-1')).toBeTrue();
    component.toggleService('svc-1');
    expect(component.isServiceSelected('svc-1')).toBeFalse();
  });

  // AC-2: detection_datetime NOT present in the form — server-stamped only
  it('AC-2: form does not have a detectionDatetime control', () => {
    fixture.detectChanges();
    // The form must not expose a detectionDatetime field.
    expect(component.form.get('detectionDatetime')).toBeNull();
  });

  // AC-2: no detectionDatetime input rendered in the template
  it('AC-2: template has no editable detectionDatetime field', () => {
    fixture.detectChanges();
    const inputs = fixture.nativeElement.querySelectorAll('input[formcontrolname="detectionDatetime"]');
    expect(inputs.length).toBe(0);
  });

  // AC-5: Add ICT Asset rows — add and remove
  it('AC-5: addAssetRow appends a new asset row to the FormArray', () => {
    fixture.detectChanges();
    expect(component.assetsArray.length).toBe(0);
    component.addAssetRow();
    expect(component.assetsArray.length).toBe(1);
    component.addAssetRow();
    expect(component.assetsArray.length).toBe(2);
  });

  it('AC-5: removeAssetRow removes the row at the given index', () => {
    fixture.detectChanges();
    component.addAssetRow();
    component.addAssetRow();
    component.removeAssetRow(0);
    expect(component.assetsArray.length).toBe(1);
  });

  // AC-5: Asset inputs are rendered
  it('AC-5: renders asset name + type inputs for each added row', () => {
    fixture.detectChanges();
    component.addAssetRow();
    fixture.detectChanges();
    const nameInputs = fixture.nativeElement.querySelectorAll('input[formcontrolname="name"]');
    const typeInputs = fixture.nativeElement.querySelectorAll('input[formcontrolname="type"]');
    expect(nameInputs.length).toBe(1);
    expect(typeInputs.length).toBe(1);
  });

  // AC-1: Form validation — required fields
  it('AC-1: submit is blocked when required fields are empty', () => {
    fixture.detectChanges();
    component.onSubmit();
    expect(service.createIncident).not.toHaveBeenCalled();
    expect(component.form.touched).toBeTrue();
  });

  // AC-1: Successful submit calls createIncident with correct payload and navigates
  it('AC-1: onSubmit calls createIncident and navigates to /incidents/:id on success', () => {
    service.createIncident.and.returnValue(of(MOCK_INCIDENT));
    fixture.detectChanges();
    component.form.patchValue({
      title: 'Payments Outage',
      description: 'Core payments rail down',
      impactEstimate: 'High',
    });
    component.toggleService('svc-1');
    component.addAssetRow();
    component.assetRowAt(0).patchValue({ name: 'Server A', type: 'SERVER' });

    component.onSubmit();

    expect(service.createIncident).toHaveBeenCalledOnceWith(
      jasmine.objectContaining({
        title: 'Payments Outage',
        description: 'Core payments rail down',
        impactEstimate: 'High',
        serviceIds: ['svc-1'],
        assets: [{ name: 'Server A', type: 'SERVER' }],
      }),
    );
    expect(router.navigate).toHaveBeenCalledOnceWith(['/incidents', 'uuid-inc-001']);
  });

  // AC-1: Error state on submit failure
  it('AC-1: submit error is shown when createIncident fails', () => {
    service.createIncident.and.returnValue(throwError(() => new Error('Server error')));
    fixture.detectChanges();
    component.form.patchValue({ title: 'Test', description: 'Desc' });
    component.onSubmit();
    expect(component.submitState()).toBe('error');
    expect(component.submitError()).toBe('Server error');
  });

  // AC-1: title maxLength validation
  it('AC-1: title exceeding 200 characters fails validation', () => {
    fixture.detectChanges();
    const longTitle = 'a'.repeat(201);
    component.form.get('title')!.setValue(longTitle);
    component.form.get('description')!.setValue('desc');
    component.onSubmit();
    expect(service.createIncident).not.toHaveBeenCalled();
  });

  // AC-8: PLATFORM_ADMIN guard is on the route, not the component.
  // We test the guard logic separately; here we verify the component itself
  // does not perform role-checking (the guard does).
  it('AC-8: component does not contain role-checking logic (guard responsibility)', () => {
    fixture.detectChanges();
    // The component should render normally when instantiated — no role check here.
    const heading = fixture.nativeElement.querySelector('h1');
    expect(heading).toBeTruthy();
    expect(heading.textContent).toContain('Report New Incident');
  });
});
