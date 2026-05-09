// @smoke — LLD-05 Bug #18 — IncidentListComponent (stub list at /incidents)
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterModule } from '@angular/router';
import { of, throwError } from 'rxjs';
import { IncidentListComponent } from './incident-list.component';
import { IncidentsService } from '../services/incidents.service';
import { IncidentSummaryPage, IncidentSummary } from '../models/incident.view-model';

const MOCK_SUMMARIES: IncidentSummary[] = [
  {
    id: 'uuid-1',
    incidentId: 'INC-20260509-0001',
    title: 'Payments Outage',
    status: 'DETECTED',
    detectionDatetime: '2026-05-09T10:00:00Z',
    createdAt: '2026-05-09T10:00:00Z',
    tenantId: 'tenant-1',
    createdBy: 'user-1',
  },
  {
    id: 'uuid-2',
    incidentId: 'INC-20260509-0002',
    title: 'Database Slow',
    status: 'UNDER_ASSESSMENT',
    detectionDatetime: '2026-05-09T11:00:00Z',
    createdAt: '2026-05-09T11:00:00Z',
    tenantId: 'tenant-1',
    createdBy: 'user-2',
  },
];

const EMPTY_PAGE: IncidentSummaryPage = {
  content: [],
  totalElements: 0,
  totalPages: 0,
  number: 0,
  size: 20,
};

const MOCK_PAGE: IncidentSummaryPage = {
  content: MOCK_SUMMARIES,
  totalElements: 2,
  totalPages: 1,
  number: 0,
  size: 20,
};

describe('Bug #18 AC-8 — IncidentListComponent @smoke', () => {
  let fixture: ComponentFixture<IncidentListComponent>;
  let component: IncidentListComponent;
  let service: jasmine.SpyObj<IncidentsService>;

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

  beforeEach(async () => {
    service = buildServiceSpy();

    await TestBed.configureTestingModule({
      imports: [IncidentListComponent, RouterModule.forRoot([])],
      providers: [
        { provide: IncidentsService, useValue: service },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(IncidentListComponent);
    component = fixture.componentInstance;
  });

  it('Bug #18: shows loading state on init before data arrives', () => {
    // Do NOT call detectChanges yet — listIncidents not yet resolved.
    service.listIncidents.and.returnValue(of(MOCK_PAGE));
    expect(component.loadState()).toBe('loading');
  });

  it('Bug #18: renders incident list on successful load', () => {
    service.listIncidents.and.returnValue(of(MOCK_PAGE));
    fixture.detectChanges();

    expect(component.loadState()).toBe('loaded');
    expect(component.incidents().length).toBe(2);

    const items = fixture.nativeElement.querySelectorAll('.incident-row');
    expect(items.length).toBe(2);
  });

  it('Bug #18: shows empty state when no incidents returned', () => {
    service.listIncidents.and.returnValue(of(EMPTY_PAGE));
    fixture.detectChanges();

    expect(component.loadState()).toBe('loaded');
    expect(component.incidents().length).toBe(0);

    const emptyMsg = fixture.nativeElement.querySelector('.empty-state');
    expect(emptyMsg).toBeTruthy();
    expect(emptyMsg.textContent).toContain('No incidents reported yet.');
  });

  it('Bug #18: shows error state when listIncidents fails', () => {
    service.listIncidents.and.returnValue(throwError(() => new Error('Network error')));
    fixture.detectChanges();

    expect(component.loadState()).toBe('error');
    expect(component.errorMessage()).toBe('Network error');

    const errorEl = fixture.nativeElement.querySelector('.error-message');
    expect(errorEl).toBeTruthy();
  });

  it('Bug #18: heading is rendered for accessibility', () => {
    service.listIncidents.and.returnValue(of(MOCK_PAGE));
    fixture.detectChanges();

    const h1 = fixture.nativeElement.querySelector('h1');
    expect(h1).toBeTruthy();
    expect(h1.textContent).toContain('Incidents');
  });

  it('Bug #18: "Report Incident" link is present', () => {
    service.listIncidents.and.returnValue(of(MOCK_PAGE));
    fixture.detectChanges();

    const link = fixture.nativeElement.querySelector('a[routerlink="/incidents/new"]');
    expect(link).toBeTruthy();
  });
});
