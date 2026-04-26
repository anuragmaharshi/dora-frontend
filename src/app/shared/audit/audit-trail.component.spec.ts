/**
 * @smoke
 * AuditTrailComponent smoke specs — LLD-03 W3 acceptance criteria:
 *
 *  AC-1  Renders empty-state message when service returns an empty page.
 *  AC-2  Renders N rows when service returns N audit entries.
 *  AC-3  Clicking <summary> toggles the diff details panel open/closed.
 *  AC-4  Error state: renders error message when service call fails.
 *  AC-5  AuditTrailService: maps generated DTO fields to view-model correctly.
 *
 * Thorough edge-case specs (pagination controls, context-field display,
 * 403/400/network message mapping variants, etc.) are owned by the
 * angular-unit-test agent (W4) and live in *.thorough.spec.ts siblings.
 */
import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Observable, of, throwError } from 'rxjs';
import { ComponentRef } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { AuditTrailComponent } from './audit-trail.component';
import { AuditTrailService } from './audit.service';
import { AuditEntry, Page } from './audit.model';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function makePage(entries: AuditEntry[]): Page<AuditEntry> {
  return {
    content: entries,
    totalElements: entries.length,
    totalPages: entries.length === 0 ? 0 : 1,
    size: 20,
    number: 0,
  };
}

function makeEntry(overrides: Partial<AuditEntry> = {}): AuditEntry {
  return {
    id: 'aaaaaaaa-0000-0000-0000-000000000001',
    tenantId: '00000000-0000-0000-0000-000000000001',
    actorId: '00000000-0000-0000-0001-000000000002',
    actorUsername: 'ops@dora.local',
    action: 'INCIDENT_CREATED',
    entityType: 'INCIDENT',
    entityId: '00000000-0000-0000-0000-000000000099',
    beforeState: null,
    afterState: { status: 'OPEN', severity: 'HIGH' },
    context: null,
    createdAt: '2026-04-25T10:00:00Z',
    ...overrides,
  };
}

// Spy factory — creates a jasmine.SpyObj<AuditTrailService> with list() configured.
function createServiceSpy(
  returnValue: Observable<Page<AuditEntry>>,
): jasmine.SpyObj<AuditTrailService> {
  const spy = jasmine.createSpyObj<AuditTrailService>('AuditTrailService', ['list']);
  spy.list.and.returnValue(returnValue);
  return spy;
}

// ---------------------------------------------------------------------------
// AC-1: empty state
// ---------------------------------------------------------------------------

describe('AC-1 — AuditTrailComponent: renders empty state when service returns empty page', () => {
  let serviceSpy: jasmine.SpyObj<AuditTrailService>;

  beforeEach(async () => {
    serviceSpy = createServiceSpy(of(makePage([])));

    await TestBed.configureTestingModule({
      imports: [AuditTrailComponent],
      providers: [{ provide: AuditTrailService, useValue: serviceSpy }],
    }).compileComponents();
  });

  it('shows the empty-state message', fakeAsync(() => {
    const fixture = TestBed.createComponent(AuditTrailComponent);
    const compRef: ComponentRef<AuditTrailComponent> = fixture.componentRef;
    compRef.setInput('entityType', 'INCIDENT');
    compRef.setInput('entityId', '00000000-0000-0000-0000-000000000099');

    fixture.detectChanges();
    tick(); // flush microtasks / async pipe
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const emptyEl = el.querySelector('[data-testid="empty-state"]');
    expect(emptyEl).toBeTruthy();
    expect(emptyEl?.textContent).toContain('No audit history found');
  }));

  it('does NOT render any list items', fakeAsync(() => {
    const fixture = TestBed.createComponent(AuditTrailComponent);
    fixture.componentRef.setInput('entityType', 'INCIDENT');
    fixture.componentRef.setInput('entityId', '00000000-0000-0000-0000-000000000099');

    fixture.detectChanges();
    tick();
    fixture.detectChanges();

    const items = fixture.debugElement.queryAll(By.css('.audit-trail__entry'));
    expect(items.length).toBe(0);
  }));
});

// ---------------------------------------------------------------------------
// AC-2: N rows rendered
// ---------------------------------------------------------------------------

describe('AC-2 — AuditTrailComponent: renders N rows when service returns N entries', () => {
  let serviceSpy: jasmine.SpyObj<AuditTrailService>;

  const entries = [
    makeEntry({ id: 'id-1', action: 'INCIDENT_CREATED', actorUsername: 'ops@dora.local' }),
    makeEntry({ id: 'id-2', action: 'INCIDENT_UPDATED', actorUsername: 'mgr@dora.local' }),
    makeEntry({ id: 'id-3', action: 'INCIDENT_CLOSED', actorUsername: 'ciso@dora.local' }),
  ];

  beforeEach(async () => {
    serviceSpy = createServiceSpy(of(makePage(entries)));

    await TestBed.configureTestingModule({
      imports: [AuditTrailComponent],
      providers: [{ provide: AuditTrailService, useValue: serviceSpy }],
    }).compileComponents();
  });

  it('renders exactly 3 list items', fakeAsync(() => {
    const fixture = TestBed.createComponent(AuditTrailComponent);
    fixture.componentRef.setInput('entityType', 'INCIDENT');
    fixture.componentRef.setInput('entityId', '00000000-0000-0000-0000-000000000099');

    fixture.detectChanges();
    tick();
    fixture.detectChanges();

    const items = fixture.debugElement.queryAll(By.css('.audit-trail__entry'));
    expect(items.length).toBe(3);
  }));

  it('renders the action badge text for each entry', fakeAsync(() => {
    const fixture = TestBed.createComponent(AuditTrailComponent);
    fixture.componentRef.setInput('entityType', 'INCIDENT');
    fixture.componentRef.setInput('entityId', '00000000-0000-0000-0000-000000000099');

    fixture.detectChanges();
    tick();
    fixture.detectChanges();

    const badges = fixture.debugElement.queryAll(By.css('[data-testid="action-badge"]'));
    expect(badges.length).toBe(3);
    expect(badges[0].nativeElement.textContent.trim()).toBe('INCIDENT_CREATED');
    expect(badges[1].nativeElement.textContent.trim()).toBe('INCIDENT_UPDATED');
    expect(badges[2].nativeElement.textContent.trim()).toBe('INCIDENT_CLOSED');
  }));

  it('calls AuditTrailService.list with the correct entityType and entityId', fakeAsync(() => {
    const fixture = TestBed.createComponent(AuditTrailComponent);
    fixture.componentRef.setInput('entityType', 'INCIDENT');
    fixture.componentRef.setInput('entityId', '00000000-0000-0000-0000-000000000099');

    fixture.detectChanges();
    tick();

    expect(serviceSpy.list).toHaveBeenCalledWith(
      'INCIDENT',
      '00000000-0000-0000-0000-000000000099',
      0,
    );
  }));
});

// ---------------------------------------------------------------------------
// AC-3: expand/collapse diff
// ---------------------------------------------------------------------------

describe('AC-3 — AuditTrailComponent: clicking <summary> toggles diff visibility', () => {
  let serviceSpy: jasmine.SpyObj<AuditTrailService>;

  // Entry with both beforeState and afterState so the <details> block renders.
  const entry = makeEntry({
    beforeState: { status: 'DRAFT' },
    afterState: { status: 'OPEN' },
  });

  beforeEach(async () => {
    serviceSpy = createServiceSpy(of(makePage([entry])));

    await TestBed.configureTestingModule({
      imports: [AuditTrailComponent],
      providers: [{ provide: AuditTrailService, useValue: serviceSpy }],
    }).compileComponents();
  });

  it('renders the <details> element when entry has state diff', fakeAsync(() => {
    const fixture = TestBed.createComponent(AuditTrailComponent);
    fixture.componentRef.setInput('entityType', 'INCIDENT');
    fixture.componentRef.setInput('entityId', '00000000-0000-0000-0000-000000000099');

    fixture.detectChanges();
    tick();
    fixture.detectChanges();

    const details: HTMLDetailsElement | null =
      fixture.nativeElement.querySelector('.audit-trail__diff');
    expect(details).toBeTruthy();
  }));

  it('details element is collapsed by default', fakeAsync(() => {
    const fixture = TestBed.createComponent(AuditTrailComponent);
    fixture.componentRef.setInput('entityType', 'INCIDENT');
    fixture.componentRef.setInput('entityId', '00000000-0000-0000-0000-000000000099');

    fixture.detectChanges();
    tick();
    fixture.detectChanges();

    const details: HTMLDetailsElement = fixture.nativeElement.querySelector('.audit-trail__diff');
    // Native <details> is collapsed (open=false) by default.
    expect(details.open).toBeFalse();
  }));

  it('details element opens when <summary> is clicked', fakeAsync(() => {
    const fixture = TestBed.createComponent(AuditTrailComponent);
    fixture.componentRef.setInput('entityType', 'INCIDENT');
    fixture.componentRef.setInput('entityId', '00000000-0000-0000-0000-000000000099');

    fixture.detectChanges();
    tick();
    fixture.detectChanges();

    const details: HTMLDetailsElement = fixture.nativeElement.querySelector('.audit-trail__diff');
    const summary: HTMLElement = fixture.nativeElement.querySelector('.audit-trail__diff-toggle');

    summary.click();
    fixture.detectChanges();

    expect(details.open).toBeTrue();
  }));

  it('details element closes when <summary> is clicked again', fakeAsync(() => {
    const fixture = TestBed.createComponent(AuditTrailComponent);
    fixture.componentRef.setInput('entityType', 'INCIDENT');
    fixture.componentRef.setInput('entityId', '00000000-0000-0000-0000-000000000099');

    fixture.detectChanges();
    tick();
    fixture.detectChanges();

    const details: HTMLDetailsElement = fixture.nativeElement.querySelector('.audit-trail__diff');
    const summary: HTMLElement = fixture.nativeElement.querySelector('.audit-trail__diff-toggle');

    summary.click(); // open
    fixture.detectChanges();
    expect(details.open).toBeTrue();

    summary.click(); // close
    fixture.detectChanges();
    expect(details.open).toBeFalse();
  }));

  it('<details> has an aria-label attribute describing the entry', fakeAsync(() => {
    const fixture = TestBed.createComponent(AuditTrailComponent);
    fixture.componentRef.setInput('entityType', 'INCIDENT');
    fixture.componentRef.setInput('entityId', '00000000-0000-0000-0000-000000000099');

    fixture.detectChanges();
    tick();
    fixture.detectChanges();

    const details: HTMLDetailsElement = fixture.nativeElement.querySelector('.audit-trail__diff');
    expect(details.getAttribute('aria-label')).toContain('INCIDENT_CREATED');
  }));

  it('renders <pre> content with JSON of afterState when expanded', fakeAsync(() => {
    const fixture = TestBed.createComponent(AuditTrailComponent);
    fixture.componentRef.setInput('entityType', 'INCIDENT');
    fixture.componentRef.setInput('entityId', '00000000-0000-0000-0000-000000000099');

    fixture.detectChanges();
    tick();
    fixture.detectChanges();

    const summary: HTMLElement = fixture.nativeElement.querySelector('.audit-trail__diff-toggle');
    summary.click();
    fixture.detectChanges();

    const pres: NodeListOf<HTMLPreElement> =
      fixture.nativeElement.querySelectorAll('.audit-trail__pre');
    // beforeState and afterState are both present.
    expect(pres.length).toBe(2);
    expect(pres[0].textContent).toContain('DRAFT');
    expect(pres[1].textContent).toContain('OPEN');
  }));
});

// ---------------------------------------------------------------------------
// AC-4: Error state rendering
// ---------------------------------------------------------------------------

describe('AC-4 — AuditTrailComponent: renders error message when service call fails', () => {
  let serviceSpy: jasmine.SpyObj<AuditTrailService>;

  beforeEach(async () => {
    serviceSpy = createServiceSpy(throwError(() => 'You do not have permission to view the audit trail for this entity.'));

    await TestBed.configureTestingModule({
      imports: [AuditTrailComponent],
      providers: [{ provide: AuditTrailService, useValue: serviceSpy }],
    }).compileComponents();
  });

  it('shows the error message element', fakeAsync(() => {
    const fixture = TestBed.createComponent(AuditTrailComponent);
    fixture.componentRef.setInput('entityType', 'INCIDENT');
    fixture.componentRef.setInput('entityId', '00000000-0000-0000-0000-000000000099');

    fixture.detectChanges();
    tick();
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const errorEl = el.querySelector('.audit-trail__error');
    expect(errorEl).toBeTruthy();
    expect(errorEl?.textContent).toContain('permission');
  }));

  it('does NOT show the empty-state message on error', fakeAsync(() => {
    const fixture = TestBed.createComponent(AuditTrailComponent);
    fixture.componentRef.setInput('entityType', 'INCIDENT');
    fixture.componentRef.setInput('entityId', '00000000-0000-0000-0000-000000000099');

    fixture.detectChanges();
    tick();
    fixture.detectChanges();

    const emptyEl = fixture.nativeElement.querySelector('[data-testid="empty-state"]');
    expect(emptyEl).toBeNull();
  }));

  it('has role=alert on the error element for screen-reader announcement', fakeAsync(() => {
    const fixture = TestBed.createComponent(AuditTrailComponent);
    fixture.componentRef.setInput('entityType', 'INCIDENT');
    fixture.componentRef.setInput('entityId', '00000000-0000-0000-0000-000000000099');

    fixture.detectChanges();
    tick();
    fixture.detectChanges();

    const errorEl: HTMLElement = fixture.nativeElement.querySelector('.audit-trail__error');
    expect(errorEl?.getAttribute('role')).toBe('alert');
  }));
});

// ---------------------------------------------------------------------------
// AC-5: AuditTrailService — mapping and HTTP delegation
// ---------------------------------------------------------------------------

describe('AC-5 — AuditTrailService: maps API response to view-model Page<AuditEntry>', () => {
  let service: AuditTrailService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AuditTrailService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AuditTrailService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('calls GET /api/v1/audit with entity and id params', () => {
    service.list('INCIDENT', 'test-id-123').subscribe();

    const req = httpMock.expectOne(
      (r) => r.url.includes('/api/v1/audit') && r.params.get('entity') === 'INCIDENT' && r.params.get('id') === 'test-id-123',
    );
    expect(req.request.method).toBe('GET');
    req.flush({ content: [], totalElements: 0, totalPages: 0, size: 20, number: 0 });
  });

  it('maps API AuditEntry fields to view-model AuditEntry', () => {
    let result: Page<AuditEntry> | undefined;
    service.list('INCIDENT', 'entity-uuid').subscribe((p) => (result = p));

    const req = httpMock.expectOne((r) => r.url.includes('/api/v1/audit'));
    req.flush({
      content: [
        {
          id: 'aaa',
          tenantId: 'ttt',
          actorId: null,
          actorUsername: 'sys',
          action: 'INCIDENT_CREATED',
          entityType: 'INCIDENT',
          entityId: 'eee',
          beforeState: null,
          afterState: { status: 'OPEN' },
          context: { request_id: 'req-1', remote_ip: '1.2.3.4', user_agent: 'Chrome' },
          createdAt: '2026-04-25T10:00:00Z',
        },
      ],
      totalElements: 1,
      totalPages: 1,
      size: 20,
      number: 0,
    });

    expect(result).toBeDefined();
    expect(result!.totalElements).toBe(1);
    const row = result!.content[0];
    expect(row.id).toBe('aaa');
    expect(row.actorId).toBeNull();
    expect(row.actorUsername).toBe('sys');
    expect(row.context?.request_id).toBe('req-1');
    expect(row.context?.remote_ip).toBe('1.2.3.4');
  });

  it('maps null context to null in view-model', () => {
    let result: Page<AuditEntry> | undefined;
    service.list('INCIDENT', 'entity-uuid').subscribe((p) => (result = p));

    const req = httpMock.expectOne((r) => r.url.includes('/api/v1/audit'));
    req.flush({
      content: [
        {
          id: 'bbb',
          tenantId: 'ttt',
          actorId: 'u1',
          actorUsername: 'ops@dora.local',
          action: 'INCIDENT_UPDATED',
          entityType: 'INCIDENT',
          entityId: 'eee',
          beforeState: { status: 'OPEN' },
          afterState: { status: 'CLOSED' },
          context: null,
          createdAt: '2026-04-25T11:00:00Z',
        },
      ],
      totalElements: 1,
      totalPages: 1,
      size: 20,
      number: 0,
    });

    expect(result!.content[0].context).toBeNull();
  });

  it('translates a 403 HTTP error to a user-friendly permission message', () => {
    let errorMsg: string | undefined;
    service.list('INCIDENT', 'entity-uuid').subscribe({
      error: (msg: string) => (errorMsg = msg),
    });

    const req = httpMock.expectOne((r) => r.url.includes('/api/v1/audit'));
    req.flush({ message: 'Forbidden' }, { status: 403, statusText: 'Forbidden' });

    expect(errorMsg).toContain('permission');
  });

  it('translates a 400 HTTP error to an invalid-request message', () => {
    let errorMsg: string | undefined;
    service.list('INCIDENT', 'entity-uuid').subscribe({
      error: (msg: string) => (errorMsg = msg),
    });

    const req = httpMock.expectOne((r) => r.url.includes('/api/v1/audit'));
    req.flush({ message: 'Bad Request' }, { status: 400, statusText: 'Bad Request' });

    expect(errorMsg).toContain('Invalid request');
  });

  it('uses page=0 and size=20 as defaults', () => {
    service.list('INCIDENT', 'entity-uuid').subscribe();

    const req = httpMock.expectOne((r) => r.url.includes('/api/v1/audit'));
    expect(req.request.params.get('page')).toBe('0');
    expect(req.request.params.get('size')).toBe('20');
    req.flush({ content: [], totalElements: 0, totalPages: 0, size: 20, number: 0 });
  });
});
