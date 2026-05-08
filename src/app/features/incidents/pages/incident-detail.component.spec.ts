// @smoke — LLD-05 AC-2, AC-6, AC-7
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { of, throwError } from 'rxjs';
import { IncidentDetailComponent } from './incident-detail.component';
import { IncidentsService } from '../services/incidents.service';
import { IncidentResponse } from '../models/incident.view-model';

const MOCK_INCIDENT: IncidentResponse = {
  id: 'uuid-inc-001',
  incidentId: 'INC-20260508-0001',
  title: 'Payment Rail Outage',
  description: 'Core payments rail unresponsive since 09:45 UTC.',
  impactEstimate: 'High — all payment processing halted.',
  detectionDatetime: '2026-05-08T09:45:00Z',
  status: 'DETECTED',
  tenantId: 'tenant-1',
  createdBy: 'user-123',
  createdAt: '2026-05-08T10:00:00Z',
  attachments: [
    {
      id: 'att-1',
      incidentId: 'uuid-inc-001',
      filename: 'screenshot.png',
      contentType: 'image/png',
      sizeBytes: 102400,
      s3Key: 'incidents/uuid-inc-001/screenshot.png',
      status: 'READY',
      uploadedBy: 'user-123',
      createdAt: '2026-05-08T10:05:00Z',
    },
  ],
  services: [
    { serviceId: 'svc-1', name: 'Online Banking' },
    { serviceId: 'svc-2', name: 'Payments Rail' },
  ],
  assets: [
    {
      id: 'asset-1',
      incidentId: 'uuid-inc-001',
      name: 'Payment Gateway Server',
      type: 'SERVER',
      createdAt: '2026-05-08T10:01:00Z',
    },
  ],
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

describe('AC-2, AC-6, AC-7 — IncidentDetailComponent @smoke', () => {
  let fixture: ComponentFixture<IncidentDetailComponent>;
  let component: IncidentDetailComponent;
  let service: jasmine.SpyObj<IncidentsService>;

  beforeEach(async () => {
    service = buildServiceSpy();
    service.getIncident.and.returnValue(of(MOCK_INCIDENT));

    await TestBed.configureTestingModule({
      imports: [IncidentDetailComponent],
      providers: [
        { provide: IncidentsService, useValue: service },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { paramMap: new Map([['id', 'uuid-inc-001']]) },
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(IncidentDetailComponent);
    component = fixture.componentInstance;
  });

  // AC-6: Full incident loads on init
  it('AC-6: calls getIncident with the route id on init', () => {
    fixture.detectChanges();
    expect(service.getIncident).toHaveBeenCalledOnceWith('uuid-inc-001');
    expect(component.loadState()).toBe('loaded');
    expect(component.incident()).toEqual(MOCK_INCIDENT);
  });

  // AC-6: Incident ID badge is rendered
  it('AC-6: renders the Incident ID badge', () => {
    fixture.detectChanges();
    const badge = fixture.nativeElement.querySelector('.incident-id-badge');
    expect(badge).toBeTruthy();
    expect(badge.textContent.trim()).toBe('INC-20260508-0001');
  });

  // AC-6: Title is rendered
  it('AC-6: renders the incident title as the page heading', () => {
    fixture.detectChanges();
    const heading = fixture.nativeElement.querySelector('h1');
    expect(heading.textContent).toContain('Payment Rail Outage');
  });

  // AC-2: detection datetime rendered as read-only <time> — no form control
  it('AC-2: renders detectionDatetime in a <time> element, not an input', () => {
    fixture.detectChanges();
    // Must have at least one <time> element for detection datetime.
    const timeEls = fixture.nativeElement.querySelectorAll('time');
    expect(timeEls.length).toBeGreaterThan(0);

    // Must NOT have any editable input for detection datetime.
    const inputs = fixture.nativeElement.querySelectorAll(
      'input[type="datetime-local"], input[formcontrolname="detectionDatetime"]'
    );
    expect(inputs.length).toBe(0);
  });

  // AC-6: Linked services shown in overview tab
  it('AC-6: shows linked critical services in Overview tab', () => {
    fixture.detectChanges();
    const listItems = fixture.nativeElement.querySelectorAll('li');
    const names = Array.from(listItems).map((li) => (li as Element).textContent?.trim());
    expect(names).toContain('Online Banking');
    expect(names).toContain('Payments Rail');
  });

  // AC-6: Attachments tab shows attachment rows
  it('AC-6: attachments are shown when tab is switched to Attachments', () => {
    fixture.detectChanges();
    component.setTab('attachments');
    fixture.detectChanges();
    const rows = fixture.nativeElement.querySelectorAll('.attachments-table tbody tr');
    expect(rows.length).toBe(1);
    expect(rows[0].textContent).toContain('screenshot.png');
  });

  // AC-6: Assets tab shows asset rows
  it('AC-6: assets are shown when tab is switched to Assets', () => {
    fixture.detectChanges();
    component.setTab('assets');
    fixture.detectChanges();
    const rows = fixture.nativeElement.querySelectorAll('.assets-table tbody tr');
    expect(rows.length).toBe(1);
    expect(rows[0].textContent).toContain('Payment Gateway Server');
    expect(rows[0].textContent).toContain('SERVER');
  });

  // AC-7: Non-major incidents — no special "major" flag UI element
  it('AC-7: no major-incident flag or badge rendered for a standard incident', () => {
    fixture.detectChanges();
    // There is no "major incident" concept in LLD-05 UI — verify no element
    // with a "major" class or text exists.
    const major = fixture.nativeElement.querySelectorAll('[class*="major"]');
    expect(major.length).toBe(0);
    const majorText = fixture.nativeElement.textContent as string;
    expect(majorText).not.toMatch(/\bMAJOR\b/i);
  });

  // AC-6: Error state when getIncident fails
  it('AC-6: shows error state when getIncident fails', () => {
    service.getIncident.and.returnValue(throwError(() => new Error('Incident not found.')));
    fixture.detectChanges();
    expect(component.loadState()).toBe('error');
    expect(component.errorMessage()).toBe('Incident not found.');
    const alert = fixture.nativeElement.querySelector('[role="alert"]');
    expect(alert.textContent).toContain('Incident not found.');
  });

  // AC-6: Loading state before HTTP responds
  it('AC-6: starts in loading state before HTTP responds', () => {
    // Before detectChanges, ngOnInit hasn't fired yet.
    expect(component.loadState()).toBe('loading');
  });

  // Tab switching
  it('switches tabs correctly via setTab()', () => {
    fixture.detectChanges();
    expect(component.activeTab()).toBe('overview');
    component.setTab('attachments');
    expect(component.activeTab()).toBe('attachments');
    component.setTab('assets');
    expect(component.activeTab()).toBe('assets');
  });

  // onAttachmentUploaded — triggers reload
  it('AC-6: onAttachmentUploaded reloads the incident', () => {
    fixture.detectChanges();
    service.getIncident.calls.reset();
    component.onAttachmentUploaded();
    expect(service.getIncident).toHaveBeenCalledTimes(1);
  });
});

// Separate describe for the missing-id branch to avoid polluting the main suite.
describe('IncidentDetailComponent — missing route id branch @smoke', () => {
  it('AC-6: shows error when route id param is missing', async () => {
    const svcSpy = jasmine.createSpyObj<IncidentsService>('IncidentsService', [
      'createIncident', 'getIncident', 'listIncidents', 'requestPresignedUrl',
      'uploadToPresignedUrl', 'completeUpload', 'listCriticalServices', 'linkAsset',
    ]);

    await TestBed.configureTestingModule({
      imports: [IncidentDetailComponent],
      providers: [
        { provide: IncidentsService, useValue: svcSpy },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { paramMap: new Map() }, // no 'id' key
          },
        },
      ],
    }).compileComponents();

    const fixture2 = TestBed.createComponent(IncidentDetailComponent);
    const cmp2 = fixture2.componentInstance;
    fixture2.detectChanges();

    expect(cmp2.loadState()).toBe('error');
    expect(cmp2.errorMessage()).toBe('Missing incident ID in route.');
    expect(svcSpy.getIncident).not.toHaveBeenCalled();
  });
});
