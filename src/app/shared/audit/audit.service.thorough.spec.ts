/**
 * @thorough
 * AuditTrailService thorough specs — LLD-03 W4b.
 *
 * Covers edge cases NOT addressed in the smoke spec:
 *  - AC-5a  list() forwards entityType, entityId, page, and size as query params
 *  - AC-5b  Maps Page<AuditEntry> response fields correctly
 *  - AC-5c  Propagates HTTP 4xx/5xx as RxJS errors (non-empty string messages)
 *  - AC-5d  toUserMessage() with HTTP status 0 (network error)
 *  - AC-5e  toUserMessage() with unrecognised status code returns non-empty fallback
 *  - AC-5f  mapEntry() edge cases: missing/undefined beforeState/afterState do not throw
 */
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { AuditTrailService } from './audit.service';
import { AuditEntry, Page } from './audit.model';

// ---------------------------------------------------------------------------
// Helper — flush a request with a minimal valid AuditEntryPage response.
// ---------------------------------------------------------------------------
function flushEmpty(ctrl: HttpTestingController): void {
  const req = ctrl.expectOne((r) => r.url.includes('/api/v1/audit'));
  req.flush({ content: [], totalElements: 0, totalPages: 0, size: 20, number: 0 });
}

// ---------------------------------------------------------------------------
// AC-5a — list() query-param forwarding
// ---------------------------------------------------------------------------

describe('AC-5a — AuditTrailService.list(): forwards all four query params correctly', () => {
  let service: AuditTrailService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AuditTrailService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AuditTrailService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('sends entityType as the "entity" query param', () => {
    service.list('CLASSIFICATION', 'entity-123').subscribe();

    const req = httpMock.expectOne((r) => r.url.includes('/api/v1/audit'));
    expect(req.request.params.get('entity')).toBe('CLASSIFICATION');
    req.flush({ content: [], totalElements: 0, totalPages: 0, size: 20, number: 0 });
  });

  it('sends entityId as the "id" query param', () => {
    service.list('INCIDENT', 'uuid-abc-999').subscribe();

    const req = httpMock.expectOne((r) => r.url.includes('/api/v1/audit'));
    expect(req.request.params.get('id')).toBe('uuid-abc-999');
    req.flush({ content: [], totalElements: 0, totalPages: 0, size: 20, number: 0 });
  });

  it('sends a non-default page index as the "page" query param', () => {
    service.list('INCIDENT', 'some-id', 3).subscribe();

    const req = httpMock.expectOne((r) => r.url.includes('/api/v1/audit'));
    expect(req.request.params.get('page')).toBe('3');
    req.flush({ content: [], totalElements: 0, totalPages: 0, size: 20, number: 0 });
  });

  it('sends a non-default size as the "size" query param', () => {
    service.list('INCIDENT', 'some-id', 0, 50).subscribe();

    const req = httpMock.expectOne((r) => r.url.includes('/api/v1/audit'));
    expect(req.request.params.get('size')).toBe('50');
    req.flush({ content: [], totalElements: 0, totalPages: 0, size: 50, number: 0 });
  });

  it('sends all four params simultaneously when all are explicitly supplied', () => {
    service.list('NCA_REPORT', 'report-uuid', 2, 10).subscribe();

    const req = httpMock.expectOne((r) => r.url.includes('/api/v1/audit'));
    expect(req.request.params.get('entity')).toBe('NCA_REPORT');
    expect(req.request.params.get('id')).toBe('report-uuid');
    expect(req.request.params.get('page')).toBe('2');
    expect(req.request.params.get('size')).toBe('10');
    req.flush({ content: [], totalElements: 0, totalPages: 0, size: 10, number: 0 });
  });
});

// ---------------------------------------------------------------------------
// AC-5b — Page<AuditEntry> response field mapping
// ---------------------------------------------------------------------------

describe('AC-5b — AuditTrailService.list(): maps Page<AuditEntry> response fields', () => {
  let service: AuditTrailService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AuditTrailService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AuditTrailService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('maps totalElements from the API response', () => {
    let result: Page<AuditEntry> | undefined;
    service.list('INCIDENT', 'id').subscribe((p) => (result = p));

    const req = httpMock.expectOne((r) => r.url.includes('/api/v1/audit'));
    req.flush({ content: [], totalElements: 42, totalPages: 3, size: 20, number: 0 });

    expect(result!.totalElements).toBe(42);
  });

  it('maps totalPages from the API response', () => {
    let result: Page<AuditEntry> | undefined;
    service.list('INCIDENT', 'id').subscribe((p) => (result = p));

    const req = httpMock.expectOne((r) => r.url.includes('/api/v1/audit'));
    req.flush({ content: [], totalElements: 42, totalPages: 3, size: 20, number: 0 });

    expect(result!.totalPages).toBe(3);
  });

  it('maps the content array and preserves entry count', () => {
    let result: Page<AuditEntry> | undefined;
    service.list('INCIDENT', 'id').subscribe((p) => (result = p));

    const req = httpMock.expectOne((r) => r.url.includes('/api/v1/audit'));
    req.flush({
      content: [
        {
          id: 'e1',
          tenantId: 't1',
          actorId: 'u1',
          actorUsername: 'ops@dora.local',
          action: 'INCIDENT_CREATED',
          entityType: 'INCIDENT',
          entityId: 'ent-1',
          beforeState: null,
          afterState: { status: 'OPEN' },
          context: null,
          createdAt: '2026-01-01T00:00:00Z',
        },
        {
          id: 'e2',
          tenantId: 't1',
          actorId: 'u2',
          actorUsername: 'mgr@dora.local',
          action: 'INCIDENT_UPDATED',
          entityType: 'INCIDENT',
          entityId: 'ent-1',
          beforeState: { status: 'OPEN' },
          afterState: { status: 'CLOSED' },
          context: null,
          createdAt: '2026-01-02T00:00:00Z',
        },
      ],
      totalElements: 2,
      totalPages: 1,
      size: 20,
      number: 0,
    });

    expect(result!.content.length).toBe(2);
    expect(result!.content[0].id).toBe('e1');
    expect(result!.content[1].id).toBe('e2');
  });

  it('treats missing totalElements in response as 0', () => {
    let result: Page<AuditEntry> | undefined;
    service.list('INCIDENT', 'id').subscribe((p) => (result = p));

    const req = httpMock.expectOne((r) => r.url.includes('/api/v1/audit'));
    // Deliberately omit totalElements to test null-coalescing in mapPage.
    req.flush({ content: [], totalPages: 0, size: 20, number: 0 });

    expect(result!.totalElements).toBe(0);
  });

  it('treats a null content array in response as empty array', () => {
    let result: Page<AuditEntry> | undefined;
    service.list('INCIDENT', 'id').subscribe((p) => (result = p));

    const req = httpMock.expectOne((r) => r.url.includes('/api/v1/audit'));
    req.flush({ content: null, totalElements: 0, totalPages: 0, size: 20, number: 0 });

    expect(result!.content).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// AC-5c — HTTP 4xx/5xx propagated as RxJS errors
// ---------------------------------------------------------------------------

describe('AC-5c — AuditTrailService.list(): propagates 4xx/5xx errors as non-empty strings', () => {
  let service: AuditTrailService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AuditTrailService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AuditTrailService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('propagates a 401 error as a non-empty error string', () => {
    let errorMsg: string | undefined;
    service.list('INCIDENT', 'id').subscribe({ error: (msg: string) => (errorMsg = msg) });

    const req = httpMock.expectOne((r) => r.url.includes('/api/v1/audit'));
    req.flush({ message: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });

    expect(typeof errorMsg).toBe('string');
    expect(errorMsg!.length).toBeGreaterThan(0);
  });

  it('propagates a 404 error as a non-empty error string', () => {
    let errorMsg: string | undefined;
    service.list('INCIDENT', 'not-found').subscribe({ error: (msg: string) => (errorMsg = msg) });

    const req = httpMock.expectOne((r) => r.url.includes('/api/v1/audit'));
    req.flush({ message: 'Not Found' }, { status: 404, statusText: 'Not Found' });

    expect(typeof errorMsg).toBe('string');
    expect(errorMsg!.length).toBeGreaterThan(0);
  });

  it('propagates a 500 error as a non-empty error string', () => {
    let errorMsg: string | undefined;
    service.list('INCIDENT', 'id').subscribe({ error: (msg: string) => (errorMsg = msg) });

    const req = httpMock.expectOne((r) => r.url.includes('/api/v1/audit'));
    req.flush({ message: 'Internal Server Error' }, { status: 500, statusText: 'Internal Server Error' });

    expect(typeof errorMsg).toBe('string');
    expect(errorMsg!.length).toBeGreaterThan(0);
  });

  it('propagates a 503 error as a non-empty error string', () => {
    let errorMsg: string | undefined;
    service.list('INCIDENT', 'id').subscribe({ error: (msg: string) => (errorMsg = msg) });

    const req = httpMock.expectOne((r) => r.url.includes('/api/v1/audit'));
    req.flush({ message: 'Service Unavailable' }, { status: 503, statusText: 'Service Unavailable' });

    expect(typeof errorMsg).toBe('string');
    expect(errorMsg!.length).toBeGreaterThan(0);
  });

  it('does NOT emit on the success channel when HTTP error occurs', () => {
    let successCalled = false;
    service.list('INCIDENT', 'id').subscribe({
      next: () => (successCalled = true),
      error: () => {},
    });

    const req = httpMock.expectOne((r) => r.url.includes('/api/v1/audit'));
    req.flush({}, { status: 500, statusText: 'Server Error' });

    expect(successCalled).toBeFalse();
  });
});

// ---------------------------------------------------------------------------
// AC-5d — toUserMessage() with HTTP status 0 (network unreachable)
// ---------------------------------------------------------------------------

describe('AC-5d — AuditTrailService.list(): status 0 (network error) returns user-friendly string', () => {
  let service: AuditTrailService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AuditTrailService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AuditTrailService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('returns a non-empty string when status is 0', () => {
    let errorMsg: string | undefined;
    service.list('INCIDENT', 'id').subscribe({ error: (msg: string) => (errorMsg = msg) });

    const req = httpMock.expectOne((r) => r.url.includes('/api/v1/audit'));
    // status: 0 simulates a network-level failure (CORS block, offline, DNS)
    req.flush(null, { status: 0, statusText: 'Unknown Error' });

    expect(typeof errorMsg).toBe('string');
    expect(errorMsg!.length).toBeGreaterThan(0);
  });

  it('status 0 message does not equal the generic fallback message', () => {
    // The network-error message should be specific, not a blank fallback.
    let errorMsg: string | undefined;
    service.list('INCIDENT', 'id').subscribe({ error: (msg: string) => (errorMsg = msg) });

    const req = httpMock.expectOne((r) => r.url.includes('/api/v1/audit'));
    req.flush(null, { status: 0, statusText: 'Unknown Error' });

    // The production code returns 'Network error — the API could not be reached.'
    // for status 0. It must be distinct from the generic fallback.
    expect(errorMsg).not.toBe('An unexpected error occurred while loading the audit trail.');
  });

  it('status 0 message contains a network-related term', () => {
    let errorMsg: string | undefined;
    service.list('INCIDENT', 'id').subscribe({ error: (msg: string) => (errorMsg = msg) });

    const req = httpMock.expectOne((r) => r.url.includes('/api/v1/audit'));
    req.flush(null, { status: 0, statusText: 'Unknown Error' });

    // Case-insensitive check: message should communicate the network nature of the failure.
    expect(errorMsg!.toLowerCase()).toMatch(/network|reach|connect/);
  });
});

// ---------------------------------------------------------------------------
// AC-5e — toUserMessage() with unrecognised status codes
// ---------------------------------------------------------------------------

describe('AC-5e — AuditTrailService.list(): unrecognised status codes return non-empty fallback', () => {
  let service: AuditTrailService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AuditTrailService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AuditTrailService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('returns a non-empty string for an unusual 4xx status (e.g. 422)', () => {
    let errorMsg: string | undefined;
    service.list('INCIDENT', 'id').subscribe({ error: (msg: string) => (errorMsg = msg) });

    const req = httpMock.expectOne((r) => r.url.includes('/api/v1/audit'));
    req.flush({}, { status: 422, statusText: 'Unprocessable Entity' });

    expect(typeof errorMsg).toBe('string');
    expect(errorMsg!.length).toBeGreaterThan(0);
  });

  it('returns a non-empty string for status 418 (unrecognised / easter egg)', () => {
    let errorMsg: string | undefined;
    service.list('INCIDENT', 'id').subscribe({ error: (msg: string) => (errorMsg = msg) });

    const req = httpMock.expectOne((r) => r.url.includes('/api/v1/audit'));
    req.flush({}, { status: 418, statusText: "I'm a teapot" });

    expect(typeof errorMsg).toBe('string');
    expect(errorMsg!.length).toBeGreaterThan(0);
  });

  it('returns a non-empty string for status 502 (bad gateway)', () => {
    let errorMsg: string | undefined;
    service.list('INCIDENT', 'id').subscribe({ error: (msg: string) => (errorMsg = msg) });

    const req = httpMock.expectOne((r) => r.url.includes('/api/v1/audit'));
    req.flush({}, { status: 502, statusText: 'Bad Gateway' });

    expect(typeof errorMsg).toBe('string');
    expect(errorMsg!.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// AC-5f — mapEntry() edge cases: missing/undefined beforeState/afterState
// ---------------------------------------------------------------------------

describe('AC-5f — AuditTrailService.list(): mapEntry() handles missing state fields without throwing', () => {
  let service: AuditTrailService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AuditTrailService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AuditTrailService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('does not throw when beforeState is undefined in the API response', () => {
    let result: Page<AuditEntry> | undefined;
    expect(() => {
      service.list('INCIDENT', 'id').subscribe((p) => (result = p));

      const req = httpMock.expectOne((r) => r.url.includes('/api/v1/audit'));
      // beforeState deliberately absent (undefined after JSON parse)
      req.flush({
        content: [
          {
            id: 'e1',
            tenantId: 't1',
            actorUsername: 'ops@dora.local',
            action: 'INCIDENT_CREATED',
            entityType: 'INCIDENT',
            entityId: null,
            afterState: { status: 'OPEN' },
            context: null,
            createdAt: '2026-01-01T00:00:00Z',
          },
        ],
        totalElements: 1,
        totalPages: 1,
        size: 20,
        number: 0,
      });
    }).not.toThrow();

    expect(result!.content[0].beforeState).toBeNull();
  });

  it('does not throw when afterState is undefined in the API response', () => {
    let result: Page<AuditEntry> | undefined;
    expect(() => {
      service.list('INCIDENT', 'id').subscribe((p) => (result = p));

      const req = httpMock.expectOne((r) => r.url.includes('/api/v1/audit'));
      req.flush({
        content: [
          {
            id: 'e2',
            tenantId: 't1',
            actorUsername: 'ops@dora.local',
            action: 'INCIDENT_DELETED',
            entityType: 'INCIDENT',
            entityId: null,
            beforeState: { status: 'CLOSED' },
            // afterState deliberately absent
            context: null,
            createdAt: '2026-01-01T00:00:00Z',
          },
        ],
        totalElements: 1,
        totalPages: 1,
        size: 20,
        number: 0,
      });
    }).not.toThrow();

    expect(result!.content[0].afterState).toBeNull();
  });

  it('does not throw when both beforeState and afterState are undefined', () => {
    let result: Page<AuditEntry> | undefined;
    expect(() => {
      service.list('INCIDENT', 'id').subscribe((p) => (result = p));

      const req = httpMock.expectOne((r) => r.url.includes('/api/v1/audit'));
      req.flush({
        content: [
          {
            id: 'e3',
            tenantId: 't1',
            actorUsername: 'sys',
            action: 'SYSTEM_EVENT',
            entityType: 'INCIDENT',
            entityId: null,
            context: null,
            createdAt: '2026-01-01T00:00:00Z',
          },
        ],
        totalElements: 1,
        totalPages: 1,
        size: 20,
        number: 0,
      });
    }).not.toThrow();

    expect(result!.content[0].beforeState).toBeNull();
    expect(result!.content[0].afterState).toBeNull();
  });

  it('maps actorId to null when it is missing from the API response', () => {
    let result: Page<AuditEntry> | undefined;
    service.list('INCIDENT', 'id').subscribe((p) => (result = p));

    const req = httpMock.expectOne((r) => r.url.includes('/api/v1/audit'));
    req.flush({
      content: [
        {
          id: 'e4',
          tenantId: 't1',
          // actorId deliberately omitted — system actor
          actorUsername: 'SYSTEM',
          action: 'BACKGROUND_TASK',
          entityType: 'INCIDENT',
          entityId: null,
          context: null,
          createdAt: '2026-01-01T00:00:00Z',
        },
      ],
      totalElements: 1,
      totalPages: 1,
      size: 20,
      number: 0,
    });

    expect(result!.content[0].actorId).toBeNull();
  });

  it('maps all string fields to empty string when omitted from the API response', () => {
    let result: Page<AuditEntry> | undefined;
    service.list('INCIDENT', 'id').subscribe((p) => (result = p));

    const req = httpMock.expectOne((r) => r.url.includes('/api/v1/audit'));
    // Only mandatory structural fields; all string fields absent.
    req.flush({
      content: [{}],
      totalElements: 1,
      totalPages: 1,
      size: 20,
      number: 0,
    });

    const entry = result!.content[0];
    expect(entry.id).toBe('');
    expect(entry.tenantId).toBe('');
    expect(entry.actorUsername).toBe('');
    expect(entry.action).toBe('');
    expect(entry.entityType).toBe('');
    expect(entry.createdAt).toBe('');
  });
});
