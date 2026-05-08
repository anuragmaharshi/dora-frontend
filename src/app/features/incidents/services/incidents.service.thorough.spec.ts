// @thorough — LLD-05 AC-1, AC-3, AC-4, AC-5, AC-6
// Supplements smoke specs with: 422 without body, Authorization header
// cleared on presigned PUT, custom pagination, linkAsset error mapping,
// 500+ edge (501, 503), and default error branch for unknown HTTP codes.
import { TestBed } from '@angular/core/testing';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { IncidentsService } from './incidents.service';
import {
  CreateIncidentRequest,
  IncidentSummaryPage,
  IctAssetResponse,
} from '../models/incident.view-model';
import { CriticalService } from '../../admin/models/admin.view-model';

// ────────────────────────────────────────────────────────────────────────────
// Fixtures
// ────────────────────────────────────────────────────────────────────────────

const BASE_INCIDENT_SUMMARY: IncidentSummaryPage = {
  content: [],
  totalElements: 0,
  totalPages: 0,
  number: 0,
  size: 20,
};

// ────────────────────────────────────────────────────────────────────────────
// Suite
// ────────────────────────────────────────────────────────────────────────────

describe('IncidentsService — thorough', () => {
  let service: IncidentsService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [IncidentsService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(IncidentsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  // ──────────────────────────────────────────────────────────────────────────
  // AC-3 — Authorization header cleared on presigned PUT
  // ──────────────────────────────────────────────────────────────────────────

  describe('AC-3 — uploadToPresignedUrl does not forward auth token to MinIO', () => {
    it('Authorization header is set to empty string on the presigned PUT request', () => {
      const file = new File(['bytes'], 'test.pdf', { type: 'application/pdf' });
      service.uploadToPresignedUrl('http://minio.local/bucket/key?sig=abc', file).subscribe();

      const req = httpMock.expectOne('http://minio.local/bucket/key?sig=abc');
      expect(req.request.method).toBe('PUT');
      // The Authorization header must be explicitly cleared so interceptors
      // do not forward the JWT to the MinIO presigned URL.
      expect(req.request.headers.get('Authorization')).toBe('');
      req.flush(null);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // AC-1 — handleError: 422 without a message body falls back to default
  // ──────────────────────────────────────────────────────────────────────────

  describe('AC-1 — 422 without message body falls back to default validation message', () => {
    it('returns default validation message when 422 body has no message field', () => {
      let errorMessage = '';
      service
        .createIncident({ title: 'X', description: 'Y' })
        .subscribe({ error: (err: Error) => { errorMessage = err.message; } });

      const req = httpMock.expectOne('/api/v1/incidents');
      // Flush with a body that has no "message" key
      req.flush({}, { status: 422, statusText: 'Unprocessable Entity' });

      expect(errorMessage).toBe('Validation error — please check your inputs.');
    });

    it('AC-1: 422 with message body uses the body message', () => {
      let errorMessage = '';
      service
        .createIncident({ title: 'X', description: 'Y' })
        .subscribe({ error: (err: Error) => { errorMessage = err.message; } });

      const req = httpMock.expectOne('/api/v1/incidents');
      req.flush(
        { message: 'title must not be blank' },
        { status: 422, statusText: 'Unprocessable Entity' },
      );

      expect(errorMessage).toBe('title must not be blank');
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // AC-6 — handleError: 5xx beyond 500 still maps to server-error message
  // ──────────────────────────────────────────────────────────────────────────

  describe('AC-6 — 5xx error mapping', () => {
    const fiveXxCodes = [500, 501, 502, 503, 504];

    fiveXxCodes.forEach((code) => {
      it(`maps HTTP ${code} to "Server error — please try again later."`, () => {
        let errorMessage = '';
        service
          .getIncident('inc-1')
          .subscribe({ error: (err: Error) => { errorMessage = err.message; } });

        const req = httpMock.expectOne('/api/v1/incidents/inc-1');
        req.flush({}, { status: code, statusText: 'Server Error' });

        expect(errorMessage).toBe('Server error — please try again later.');
      });
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // handleError — other HTTP error without message defaults to fallback
  // ──────────────────────────────────────────────────────────────────────────

  describe('handleError — unknown HTTP code without message body', () => {
    it('returns "An unexpected error occurred." when body has no message field', () => {
      let errorMessage = '';
      service
        .getIncident('inc-1')
        .subscribe({ error: (err: Error) => { errorMessage = err.message; } });

      const req = httpMock.expectOne('/api/v1/incidents/inc-1');
      req.flush({}, { status: 409, statusText: 'Conflict' });

      expect(errorMessage).toBe('An unexpected error occurred.');
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // AC-6 — listIncidents pagination
  // ──────────────────────────────────────────────────────────────────────────

  describe('AC-6 — listIncidents pagination params', () => {
    it('defaults to page=0, size=20', () => {
      service.listIncidents().subscribe();
      const req = httpMock.expectOne((r) => r.url === '/api/v1/incidents');
      expect(req.request.params.get('page')).toBe('0');
      expect(req.request.params.get('size')).toBe('20');
      req.flush(BASE_INCIDENT_SUMMARY);
    });

    it('passes custom page and size values', () => {
      service.listIncidents(3, 50).subscribe();
      const req = httpMock.expectOne((r) => r.url === '/api/v1/incidents');
      expect(req.request.params.get('page')).toBe('3');
      expect(req.request.params.get('size')).toBe('50');
      req.flush({ ...BASE_INCIDENT_SUMMARY, number: 3, size: 50 });
    });

    it('passes page=0, size=5 (small page size)', () => {
      service.listIncidents(0, 5).subscribe();
      const req = httpMock.expectOne((r) => r.url === '/api/v1/incidents');
      expect(req.request.params.get('page')).toBe('0');
      expect(req.request.params.get('size')).toBe('5');
      req.flush({ ...BASE_INCIDENT_SUMMARY, size: 5 });
    });

    it('listIncidents maps network error to user-friendly message', () => {
      let errorMessage = '';
      service.listIncidents().subscribe({
        error: (err: Error) => { errorMessage = err.message; },
      });

      const req = httpMock.expectOne((r) => r.url === '/api/v1/incidents');
      req.error(new ProgressEvent('error'));

      expect(errorMessage).toBe('Network error — please check your connection.');
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // AC-5 — linkAsset error mapping
  // ──────────────────────────────────────────────────────────────────────────

  describe('AC-5 — linkAsset error paths', () => {
    it('linkAsset maps 403 to permission-error message', () => {
      let errorMessage = '';
      service
        .linkAsset('inc-1', { name: 'Server', type: 'SERVER' })
        .subscribe({ error: (err: Error) => { errorMessage = err.message; } });

      const req = httpMock.expectOne('/api/v1/incidents/inc-1/assets');
      req.flush({}, { status: 403, statusText: 'Forbidden' });

      expect(errorMessage).toBe('You do not have permission to perform this action.');
    });

    it('linkAsset maps 404 to "Incident not found."', () => {
      let errorMessage = '';
      service
        .linkAsset('bad-inc', { name: 'Server', type: 'SERVER' })
        .subscribe({ error: (err: Error) => { errorMessage = err.message; } });

      const req = httpMock.expectOne('/api/v1/incidents/bad-inc/assets');
      req.flush({}, { status: 404, statusText: 'Not Found' });

      expect(errorMessage).toBe('Incident not found.');
    });

    it('linkAsset returns IctAssetResponse on success', () => {
      const expected: IctAssetResponse = {
        id: 'asset-uuid',
        incidentId: 'inc-1',
        name: 'DB Server',
        type: 'DATABASE',
        createdAt: '2026-05-08T11:00:00Z',
      };

      let result: IctAssetResponse | undefined;
      service
        .linkAsset('inc-1', { name: 'DB Server', type: 'DATABASE' })
        .subscribe((r) => { result = r; });

      const req = httpMock.expectOne('/api/v1/incidents/inc-1/assets');
      expect(req.request.method).toBe('POST');
      req.flush(expected);

      expect(result).toEqual(expected);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // AC-4 — listCriticalServices error paths
  // ──────────────────────────────────────────────────────────────────────────

  describe('AC-4 — listCriticalServices error paths', () => {
    it('maps 500 to server-error message', () => {
      let errorMessage = '';
      service.listCriticalServices().subscribe({
        error: (err: Error) => { errorMessage = err.message; },
      });

      const req = httpMock.expectOne('/api/v1/admin/critical-services');
      req.flush({}, { status: 500, statusText: 'Internal Server Error' });

      expect(errorMessage).toBe('Server error — please try again later.');
    });

    it('maps network error to user-friendly message', () => {
      let errorMessage = '';
      service.listCriticalServices().subscribe({
        error: (err: Error) => { errorMessage = err.message; },
      });

      const req = httpMock.expectOne('/api/v1/admin/critical-services');
      req.error(new ProgressEvent('error'));

      expect(errorMessage).toBe('Network error — please check your connection.');
    });

    it('returns the full list on success', () => {
      const svcs: CriticalService[] = [
        {
          id: 'svc-1',
          tenantId: 'tenant-1',
          name: 'Online Banking',
          description: null,
          active: true,
          createdAt: '2026-01-01T00:00:00Z',
        },
        {
          id: 'svc-2',
          tenantId: 'tenant-1',
          name: 'Payments Rail',
          description: null,
          active: false,
          createdAt: '2026-01-02T00:00:00Z',
        },
      ];

      let result: CriticalService[] | undefined;
      service.listCriticalServices().subscribe((r) => { result = r; });

      const req = httpMock.expectOne('/api/v1/admin/critical-services');
      req.flush(svcs);

      // Service returns ALL entries; filtering to active-only is the component's job.
      expect(result).toEqual(svcs);
      expect(result?.length).toBe(2);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // AC-3 — requestPresignedUrl and completeUpload error paths
  // ──────────────────────────────────────────────────────────────────────────

  describe('AC-3 — presigned URL and complete error paths', () => {
    it('requestPresignedUrl maps 403 to permission-error message', () => {
      let errorMessage = '';
      service
        .requestPresignedUrl('inc-1', { filename: 'f.pdf', contentType: 'application/pdf', sizeBytes: 100 })
        .subscribe({ error: (err: Error) => { errorMessage = err.message; } });

      const req = httpMock.expectOne('/api/v1/incidents/inc-1/attachments');
      req.flush({}, { status: 403, statusText: 'Forbidden' });

      expect(errorMessage).toBe('You do not have permission to perform this action.');
    });

    it('completeUpload maps 500 to server-error message', () => {
      let errorMessage = '';
      service.completeUpload('inc-1', 'att-1').subscribe({
        error: (err: Error) => { errorMessage = err.message; },
      });

      const req = httpMock.expectOne('/api/v1/incidents/inc-1/attachments/att-1/complete');
      req.flush({}, { status: 500, statusText: 'Internal Server Error' });

      expect(errorMessage).toBe('Server error — please try again later.');
    });

    it('completeUpload maps 404 to "Incident not found."', () => {
      let errorMessage = '';
      service.completeUpload('bad-inc', 'att-1').subscribe({
        error: (err: Error) => { errorMessage = err.message; },
      });

      const req = httpMock.expectOne('/api/v1/incidents/bad-inc/attachments/att-1/complete');
      req.flush({}, { status: 404, statusText: 'Not Found' });

      expect(errorMessage).toBe('Incident not found.');
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // AC-1 — createIncident request body shape
  // ──────────────────────────────────────────────────────────────────────────

  describe('AC-1 — createIncident request body completeness', () => {
    it('sends serviceIds as an array even when empty', () => {
      const payload: CreateIncidentRequest = {
        title: 'Test',
        description: 'Desc',
        serviceIds: [],
        assets: [],
      };

      service.createIncident(payload).subscribe();
      const req = httpMock.expectOne('/api/v1/incidents');
      expect(req.request.body.serviceIds).toEqual([]);
      req.flush({});
    });

    it('sends full payload including assets array', () => {
      const payload: CreateIncidentRequest = {
        title: 'Test',
        description: 'Desc',
        serviceIds: ['svc-1'],
        assets: [{ name: 'Server', type: 'SERVER' }],
        impactEstimate: 'High',
      };

      service.createIncident(payload).subscribe();
      const req = httpMock.expectOne('/api/v1/incidents');
      expect(req.request.body).toEqual(payload);
      req.flush({});
    });
  });
});
