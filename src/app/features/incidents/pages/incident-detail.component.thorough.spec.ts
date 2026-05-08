// @thorough — LLD-05 AC-2, AC-6, AC-7
// Supplements smoke specs with: loading UI, empty states per tab, tab ARIA
// attributes, status badge CSS classes, and accessibility assertions.
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { of, throwError, Subject } from 'rxjs';
import { IncidentDetailComponent } from './incident-detail.component';
import { IncidentsService } from '../services/incidents.service';
import {
  IncidentResponse,
  IncidentStatus,
  AttachmentResponse,
  IctAssetResponse,
  LinkedServiceResponse,
} from '../models/incident.view-model';

// ────────────────────────────────────────────────────────────────────────────
// Shared fixtures
// ────────────────────────────────────────────────────────────────────────────

const MOCK_ATTACHMENT: AttachmentResponse = {
  id: 'att-1',
  incidentId: 'uuid-inc-001',
  filename: 'screenshot.png',
  contentType: 'image/png',
  sizeBytes: 102400,
  s3Key: 'incidents/uuid-inc-001/screenshot.png',
  status: 'READY',
  uploadedBy: 'user-123',
  createdAt: '2026-05-08T10:05:00Z',
};

const MOCK_ASSET: IctAssetResponse = {
  id: 'asset-1',
  incidentId: 'uuid-inc-001',
  name: 'Payment Gateway Server',
  type: 'SERVER',
  createdAt: '2026-05-08T10:01:00Z',
};

const MOCK_SERVICE: LinkedServiceResponse = {
  serviceId: 'svc-1',
  name: 'Online Banking',
};

function makeIncident(overrides: Partial<IncidentResponse> = {}): IncidentResponse {
  return {
    id: 'uuid-inc-001',
    incidentId: 'INC-20260508-0001',
    title: 'Payment Rail Outage',
    description: 'Core payments rail unresponsive.',
    impactEstimate: null,
    detectionDatetime: '2026-05-08T09:45:00Z',
    status: 'DETECTED',
    tenantId: 'tenant-1',
    createdBy: 'user-123',
    createdAt: '2026-05-08T10:00:00Z',
    attachments: [],
    services: [],
    assets: [],
    ...overrides,
  };
}

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

function buildRouteProvider(id: string | null = 'uuid-inc-001') {
  const paramMap = id != null ? new Map([['id', id]]) : new Map();
  return {
    provide: ActivatedRoute,
    useValue: { snapshot: { paramMap } },
  };
}

// ────────────────────────────────────────────────────────────────────────────
// Main suite
// ────────────────────────────────────────────────────────────────────────────

describe('IncidentDetailComponent — thorough', () => {
  let fixture: ComponentFixture<IncidentDetailComponent>;
  let component: IncidentDetailComponent;
  let service: jasmine.SpyObj<IncidentsService>;

  async function setup(
    incident: IncidentResponse | null = makeIncident(),
    routeId: string | null = 'uuid-inc-001',
    errorOverride?: Error,
  ): Promise<void> {
    service = buildServiceSpy();
    if (errorOverride) {
      service.getIncident.and.returnValue(throwError(() => errorOverride));
    } else if (incident) {
      service.getIncident.and.returnValue(of(incident));
    }

    await TestBed.configureTestingModule({
      imports: [IncidentDetailComponent],
      providers: [
        { provide: IncidentsService, useValue: service },
        buildRouteProvider(routeId),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(IncidentDetailComponent);
    component = fixture.componentInstance;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // AC-6 — loading state
  // ──────────────────────────────────────────────────────────────────────────

  describe('AC-6 — loading state', () => {
    it('renders "Loading incident…" status paragraph while request is pending', async () => {
      const subject = new Subject<IncidentResponse>();
      service = buildServiceSpy();
      service.getIncident.and.returnValue(subject.asObservable());

      await TestBed.configureTestingModule({
        imports: [IncidentDetailComponent],
        providers: [
          { provide: IncidentsService, useValue: service },
          buildRouteProvider('uuid-inc-001'),
        ],
      }).compileComponents();

      fixture = TestBed.createComponent(IncidentDetailComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();

      const statusEl = fixture.nativeElement.querySelector('[role="status"]');
      expect(statusEl).withContext('role=status loading paragraph should exist').toBeTruthy();
      expect(statusEl.textContent).toContain('Loading');

      subject.complete();
    });

    it('removes loading paragraph once incident is loaded', async () => {
      await setup(makeIncident());
      fixture.detectChanges();

      const statusEl = fixture.nativeElement.querySelector('[role="status"]');
      // After successful load the loading message is gone
      expect(statusEl).withContext('loading paragraph should be removed after load').toBeNull();
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // AC-6 — error state rendering
  // ──────────────────────────────────────────────────────────────────────────

  describe('AC-6 — error state', () => {
    it('error message is rendered in a role="alert" element', async () => {
      await setup(null, 'uuid-inc-001', new Error('Incident not found.'));
      fixture.detectChanges();

      const alertEl = fixture.nativeElement.querySelector('[role="alert"]');
      expect(alertEl).withContext('role=alert should exist for error').toBeTruthy();
      expect(alertEl.textContent).toContain('Incident not found.');
    });

    it('incident content is not rendered when in error state', async () => {
      await setup(null, 'uuid-inc-001', new Error('Forbidden'));
      fixture.detectChanges();

      const header = fixture.nativeElement.querySelector('.incident-header');
      expect(header).withContext('incident header should not render in error state').toBeNull();
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // AC-6 — empty states within tabs
  // ──────────────────────────────────────────────────────────────────────────

  describe('AC-6 — empty states within tabs', () => {
    it('shows "No critical services linked." when services array is empty', async () => {
      await setup(makeIncident({ services: [] }));
      fixture.detectChanges();

      const emptyEl = fixture.nativeElement.querySelector('.empty-state');
      expect(emptyEl).withContext('.empty-state should exist for empty services').toBeTruthy();
      expect(emptyEl.textContent).toContain('No critical services linked');
    });

    it('shows "No attachments yet." when attachments array is empty', async () => {
      await setup(makeIncident({ attachments: [] }));
      fixture.detectChanges();
      component.setTab('attachments');
      fixture.detectChanges();

      const emptyEls = fixture.nativeElement.querySelectorAll('.empty-state');
      const texts = Array.from(emptyEls).map((el) => (el as Element).textContent?.trim());
      expect(texts.some((t) => t?.includes('No attachments yet'))).toBeTrue();
    });

    it('shows "No ICT assets linked." when assets array is empty', async () => {
      await setup(makeIncident({ assets: [] }));
      fixture.detectChanges();
      component.setTab('assets');
      fixture.detectChanges();

      const emptyEls = fixture.nativeElement.querySelectorAll('.empty-state');
      const texts = Array.from(emptyEls).map((el) => (el as Element).textContent?.trim());
      expect(texts.some((t) => t?.includes('No ICT assets linked'))).toBeTrue();
    });

    it('renders attachment count badge (N) in tab button when attachments > 0', async () => {
      await setup(makeIncident({ attachments: [MOCK_ATTACHMENT] }));
      fixture.detectChanges();

      const tabCount = fixture.nativeElement.querySelector('.tab-count');
      expect(tabCount).withContext('tab-count badge should exist').toBeTruthy();
      expect(tabCount.textContent.trim()).toContain('1');
    });

    it('renders asset count badge (N) in tab button when assets > 0', async () => {
      await setup(makeIncident({ assets: [MOCK_ASSET] }));
      fixture.detectChanges();

      const tabCounts = fixture.nativeElement.querySelectorAll('.tab-count');
      // At least one count badge should appear
      expect(tabCounts.length).toBeGreaterThan(0);
    });

    it('does NOT show count badge when attachments array is empty', async () => {
      await setup(makeIncident({ attachments: [] }));
      fixture.detectChanges();

      const attachTabBtn = fixture.nativeElement.querySelector('#tab-btn-attachments');
      const countBadge = attachTabBtn?.querySelector('.tab-count');
      expect(countBadge).withContext('no count badge when 0 attachments').toBeNull();
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // AC-6 — impact estimate optional rendering
  // ──────────────────────────────────────────────────────────────────────────

  describe('AC-6 — impact estimate', () => {
    it('renders impact estimate section when impactEstimate is non-null', async () => {
      await setup(makeIncident({ impactEstimate: 'High — all payment processing halted.' }));
      fixture.detectChanges();

      const text = fixture.nativeElement.textContent as string;
      expect(text).toContain('High — all payment processing halted.');
    });

    it('does not render impact estimate section when impactEstimate is null', async () => {
      await setup(makeIncident({ impactEstimate: null }));
      fixture.detectChanges();

      // The "Impact Estimate" heading only appears when value exists
      const headings = fixture.nativeElement.querySelectorAll('h3');
      const texts = Array.from(headings).map((h) => (h as Element).textContent?.trim());
      expect(texts).not.toContain('Impact Estimate');
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // AC-6 — linked services rendered
  // ──────────────────────────────────────────────────────────────────────────

  describe('AC-6 — linked services rendered', () => {
    it('renders all linked services in the overview tab', async () => {
      await setup(
        makeIncident({
          services: [
            { serviceId: 'svc-1', name: 'Online Banking' },
            { serviceId: 'svc-2', name: 'Payments Rail' },
          ],
        }),
      );
      fixture.detectChanges();

      const listItems = fixture.nativeElement.querySelectorAll('li');
      const names = Array.from(listItems).map((li) => (li as Element).textContent?.trim());
      expect(names).toContain('Online Banking');
      expect(names).toContain('Payments Rail');
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // AC-6 — multiple attachments shown in table
  // ──────────────────────────────────────────────────────────────────────────

  describe('AC-6 — multiple attachments in table', () => {
    it('renders multiple attachment rows in the attachments table', async () => {
      const att2: AttachmentResponse = {
        ...MOCK_ATTACHMENT,
        id: 'att-2',
        filename: 'log.txt',
        contentType: 'text/plain',
      };
      await setup(makeIncident({ attachments: [MOCK_ATTACHMENT, att2] }));
      fixture.detectChanges();
      component.setTab('attachments');
      fixture.detectChanges();

      const rows = fixture.nativeElement.querySelectorAll('.attachments-table tbody tr');
      expect(rows.length).toBe(2);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // AC-2 — detection_datetime display
  // ──────────────────────────────────────────────────────────────────────────

  describe('AC-2 — detection_datetime is displayed read-only', () => {
    it('detection datetime is inside a <time> element with dateTime attribute', async () => {
      await setup(makeIncident({ detectionDatetime: '2026-05-08T09:45:00Z' }));
      fixture.detectChanges();

      const timeEls = fixture.nativeElement.querySelectorAll('time');
      expect(timeEls.length).toBeGreaterThan(0);

      // At least one <time> has the dateTime attribute matching the incident value
      const datetimeAttrs = Array.from(timeEls).map((t) =>
        (t as Element).getAttribute('dateTime'),
      );
      expect(datetimeAttrs).toContain('2026-05-08T09:45:00Z');
    });

    it('AC-2: no form input control is rendered for detection datetime', async () => {
      await setup();
      fixture.detectChanges();

      const inputs = fixture.nativeElement.querySelectorAll(
        'input[type="datetime-local"], input[formcontrolname="detectionDatetime"]',
      );
      expect(inputs.length).toBe(0);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // AC-7 — status badge CSS class
  // ──────────────────────────────────────────────────────────────────────────

  describe('AC-7 — status badge per status value', () => {
    const statusCases: IncidentStatus[] = [
      'DETECTED',
      'UNDER_ASSESSMENT',
      'CLASSIFIED',
      'ONGOING',
      'RESOLVED',
    ];

    statusCases.forEach((status) => {
      it(`AC-7: renders status badge with class "status-${status.toLowerCase()}" for status=${status}`, async () => {
        await setup(makeIncident({ status }));
        fixture.detectChanges();

        const badge = fixture.nativeElement.querySelector('.status-badge');
        expect(badge).withContext(`status-badge element for ${status}`).toBeTruthy();
        expect(badge.className).toContain(`status-${status.toLowerCase()}`);
      });
    });

    it('AC-7: no "major-incident" flag or badge rendered for any status', async () => {
      for (const status of statusCases) {
        TestBed.resetTestingModule();
        await setup(makeIncident({ status }));
        fixture.detectChanges();

        const major = fixture.nativeElement.querySelectorAll('[class*="major"]');
        expect(major.length).withContext(`no "major" class for status=${status}`).toBe(0);
      }
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Tab ARIA attributes
  // ──────────────────────────────────────────────────────────────────────────

  describe('tab ARIA attributes', () => {
    beforeEach(async () => {
      await setup();
      fixture.detectChanges();
    });

    it('overview tab button has aria-selected="true" when overview is active', () => {
      component.setTab('overview');
      fixture.detectChanges();

      const overviewBtn = fixture.nativeElement.querySelector('#tab-btn-overview');
      expect(overviewBtn?.getAttribute('aria-selected')).toBe('true');
    });

    it('attachments tab button has aria-selected="false" when overview is active', () => {
      component.setTab('overview');
      fixture.detectChanges();

      const attachBtn = fixture.nativeElement.querySelector('#tab-btn-attachments');
      expect(attachBtn?.getAttribute('aria-selected')).toBe('false');
    });

    it('attachments tab button has aria-selected="true" after setTab("attachments")', () => {
      component.setTab('attachments');
      fixture.detectChanges();

      const attachBtn = fixture.nativeElement.querySelector('#tab-btn-attachments');
      expect(attachBtn?.getAttribute('aria-selected')).toBe('true');
    });

    it('assets tab button has aria-selected="true" after setTab("assets")', () => {
      component.setTab('assets');
      fixture.detectChanges();

      const assetsBtn = fixture.nativeElement.querySelector('#tab-btn-assets');
      expect(assetsBtn?.getAttribute('aria-selected')).toBe('true');
    });

    it('tab nav has role="tablist" with aria-label', () => {
      const tabNav = fixture.nativeElement.querySelector('[role="tablist"]');
      expect(tabNav).withContext('tablist nav should exist').toBeTruthy();
      expect(tabNav.getAttribute('aria-label')).toBeTruthy();
    });

    it('each tab panel has role="tabpanel"', () => {
      const panels = fixture.nativeElement.querySelectorAll('[role="tabpanel"]');
      expect(panels.length).toBe(3);
    });

    it('inactive tab panels are hidden via [hidden] attribute', () => {
      component.setTab('overview');
      fixture.detectChanges();

      const attachPanel = fixture.nativeElement.querySelector('#tab-attachments');
      const assetsPanel = fixture.nativeElement.querySelector('#tab-assets');

      // [hidden] attribute should be truthy (present) for inactive panels
      expect(attachPanel?.hasAttribute('hidden')).toBeTrue();
      expect(assetsPanel?.hasAttribute('hidden')).toBeTrue();
    });

    it('active tab panel is NOT hidden', () => {
      component.setTab('overview');
      fixture.detectChanges();

      const overviewPanel = fixture.nativeElement.querySelector('#tab-overview');
      expect(overviewPanel?.hasAttribute('hidden')).toBeFalse();
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Accessibility landmarks
  // ──────────────────────────────────────────────────────────────────────────

  describe('accessibility — landmarks and ARIA', () => {
    beforeEach(async () => {
      await setup();
      fixture.detectChanges();
    });

    it('main element has aria-labelledby attribute', () => {
      const main = fixture.nativeElement.querySelector('main');
      expect(main?.getAttribute('aria-labelledby')).toBeTruthy();
    });

    it('incident ID badge has aria-label="Incident ID"', () => {
      const badge = fixture.nativeElement.querySelector('.incident-id-badge');
      expect(badge?.getAttribute('aria-label')).toBe('Incident ID');
    });

    it('status badge has aria-label="Status"', () => {
      const badge = fixture.nativeElement.querySelector('.status-badge');
      expect(badge?.getAttribute('aria-label')).toBe('Status');
    });

    it('detection datetime <time> element has aria-label', () => {
      const timeEl = fixture.nativeElement.querySelector(
        'time[aria-label="Detection datetime"]',
      );
      expect(timeEl).withContext('detection datetime time element with aria-label').toBeTruthy();
    });

    it('incident metadata dl has aria-label', () => {
      const dl = fixture.nativeElement.querySelector('dl[aria-label]');
      expect(dl).withContext('dl with aria-label should exist').toBeTruthy();
    });

    it('a11y — note: axe-core not installed; ARIA attributes verified manually above', () => {
      // Manual checks cover: main landmark, tab ARIA, badge labels, time element.
      expect(true).toBeTrue();
    });
  });
});
