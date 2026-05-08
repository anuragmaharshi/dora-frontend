// @smoke — LLD-05 AC-1, AC-3, AC-4, AC-6
import { TestBed } from '@angular/core/testing';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { IncidentsService } from './incidents.service';
import {
  CreateIncidentRequest,
  IncidentResponse,
  PresignedUploadResponse,
  AttachmentResponse,
} from '../models/incident.view-model';
import { CriticalService } from '../../admin/models/admin.view-model';

const MOCK_INCIDENT: IncidentResponse = {
  id: 'uuid-inc-001',
  incidentId: 'INC-20260508-0001',
  title: 'Test Incident',
  description: 'Something broke',
  impactEstimate: null,
  detectionDatetime: '2026-05-08T09:45:00Z',
  status: 'DETECTED',
  tenantId: 'tenant-1',
  createdBy: 'user-1',
  createdAt: '2026-05-08T10:00:00Z',
  attachments: [],
  services: [],
  assets: [],
};

const MOCK_PRESIGNED: PresignedUploadResponse = {
  attachmentId: 'att-001',
  uploadUrl: 'http://minio.local/bucket/key?sig=abc',
  expiresAt: '2026-05-08T10:15:00Z',
};

const MOCK_CRITICAL_SERVICES: CriticalService[] = [
  {
    id: 'svc-1',
    tenantId: 'tenant-1',
    name: 'Online Banking',
    description: null,
    active: true,
    createdAt: '2026-01-01T00:00:00Z',
  },
];

describe('AC-1, AC-3, AC-4, AC-6 — IncidentsService @smoke', () => {
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

  // AC-1: createIncident sends POST to /api/v1/incidents
  it('AC-1: createIncident POSTs to /api/v1/incidents', () => {
    const payload: CreateIncidentRequest = {
      title: 'Outage',
      description: 'Systems down',
      serviceIds: ['svc-1'],
      assets: [],
    };

    let result: IncidentResponse | undefined;
    service.createIncident(payload).subscribe((r) => { result = r; });

    const req = httpMock.expectOne('/api/v1/incidents');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush(MOCK_INCIDENT);

    expect(result).toEqual(MOCK_INCIDENT);
  });

  // AC-6: getIncident sends GET to /api/v1/incidents/{id}
  it('AC-6: getIncident GETs /api/v1/incidents/{id}', () => {
    let result: IncidentResponse | undefined;
    service.getIncident('uuid-inc-001').subscribe((r) => { result = r; });

    const req = httpMock.expectOne('/api/v1/incidents/uuid-inc-001');
    expect(req.request.method).toBe('GET');
    req.flush(MOCK_INCIDENT);

    expect(result).toEqual(MOCK_INCIDENT);
  });

  // AC-3: requestPresignedUrl sends POST to /api/v1/incidents/{id}/attachments
  it('AC-3: requestPresignedUrl POSTs to /api/v1/incidents/{id}/attachments', () => {
    let result: PresignedUploadResponse | undefined;
    service
      .requestPresignedUrl('uuid-inc-001', {
        filename: 'test.pdf',
        contentType: 'application/pdf',
        sizeBytes: 1024,
      })
      .subscribe((r) => { result = r; });

    const req = httpMock.expectOne('/api/v1/incidents/uuid-inc-001/attachments');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      filename: 'test.pdf',
      contentType: 'application/pdf',
      sizeBytes: 1024,
    });
    req.flush(MOCK_PRESIGNED);

    expect(result).toEqual(MOCK_PRESIGNED);
  });

  // AC-3: completeUpload sends POST to /api/v1/incidents/{id}/attachments/{attachmentId}/complete
  it('AC-3: completeUpload POSTs to /complete endpoint', () => {
    const mockCompleted: AttachmentResponse = {
      id: 'att-001',
      incidentId: 'uuid-inc-001',
      filename: 'test.pdf',
      contentType: 'application/pdf',
      sizeBytes: 1024,
      s3Key: 'key',
      status: 'READY',
      uploadedBy: 'user-1',
      createdAt: '2026-05-08T10:05:00Z',
    };

    let result: AttachmentResponse | undefined;
    service.completeUpload('uuid-inc-001', 'att-001').subscribe((r) => { result = r; });

    const req = httpMock.expectOne(
      '/api/v1/incidents/uuid-inc-001/attachments/att-001/complete',
    );
    expect(req.request.method).toBe('POST');
    req.flush(mockCompleted);

    expect(result).toEqual(mockCompleted);
  });

  // AC-4: listCriticalServices GETs /api/v1/admin/critical-services
  it('AC-4: listCriticalServices GETs /api/v1/admin/critical-services', () => {
    let result: CriticalService[] | undefined;
    service.listCriticalServices().subscribe((r) => { result = r; });

    const req = httpMock.expectOne('/api/v1/admin/critical-services');
    expect(req.request.method).toBe('GET');
    req.flush(MOCK_CRITICAL_SERVICES);

    expect(result).toEqual(MOCK_CRITICAL_SERVICES);
  });

  // Error handling — 404 maps to user-friendly message
  it('AC-6: getIncident maps 404 to "Incident not found."', () => {
    let errorMessage = '';
    service.getIncident('bad-id').subscribe({
      error: (err: Error) => { errorMessage = err.message; },
    });

    const req = httpMock.expectOne('/api/v1/incidents/bad-id');
    req.flush({ message: 'Not found' }, { status: 404, statusText: 'Not Found' });

    expect(errorMessage).toBe('Incident not found.');
  });

  // Error handling — network error
  it('AC-1: createIncident maps network error to user-friendly message', () => {
    let errorMessage = '';
    service.createIncident({ title: 'X', description: 'Y' }).subscribe({
      error: (err: Error) => { errorMessage = err.message; },
    });

    const req = httpMock.expectOne('/api/v1/incidents');
    req.error(new ProgressEvent('error'));

    expect(errorMessage).toBe('Network error — please check your connection.');
  });

  // Additional method coverage
  it('listIncidents GETs /api/v1/incidents with page+size params', () => {
    service.listIncidents(0, 20).subscribe();
    const req = httpMock.expectOne((r) => r.url === '/api/v1/incidents');
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('page')).toBe('0');
    expect(req.request.params.get('size')).toBe('20');
    req.flush({ content: [], totalElements: 0, totalPages: 0, number: 0, size: 20 });
  });

  it('linkAsset POSTs to /api/v1/incidents/{id}/assets', () => {
    service.linkAsset('inc-1', { name: 'Server', type: 'SERVER' }).subscribe();
    const req = httpMock.expectOne('/api/v1/incidents/inc-1/assets');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ name: 'Server', type: 'SERVER' });
    req.flush({
      id: 'asset-1',
      incidentId: 'inc-1',
      name: 'Server',
      type: 'SERVER',
      createdAt: '2026-05-08T10:00:00Z',
    });
  });

  it('uploadToPresignedUrl PUTs to the presigned URL', () => {
    const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
    service.uploadToPresignedUrl('http://minio.local/bucket/key?sig=abc', file).subscribe();
    const req = httpMock.expectOne('http://minio.local/bucket/key?sig=abc');
    expect(req.request.method).toBe('PUT');
    req.flush(null);
  });

  // Error branch: 403 Forbidden
  it('handleError maps 403 to permission error message', () => {
    let errorMessage = '';
    service.getIncident('inc-1').subscribe({
      error: (err: Error) => { errorMessage = err.message; },
    });
    const req = httpMock.expectOne('/api/v1/incidents/inc-1');
    req.flush({}, { status: 403, statusText: 'Forbidden' });
    expect(errorMessage).toBe('You do not have permission to perform this action.');
  });

  // Error branch: 422 Unprocessable
  it('handleError maps 422 to validation error message', () => {
    let errorMessage = '';
    service.createIncident({ title: 'X', description: 'Y' }).subscribe({
      error: (err: Error) => { errorMessage = err.message; },
    });
    const req = httpMock.expectOne('/api/v1/incidents');
    req.flush({ message: 'Invalid service IDs' }, { status: 422, statusText: 'Unprocessable' });
    expect(errorMessage).toBe('Invalid service IDs');
  });

  // Error branch: 500 Server error
  it('handleError maps 500 to server error message', () => {
    let errorMessage = '';
    service.getIncident('inc-1').subscribe({
      error: (err: Error) => { errorMessage = err.message; },
    });
    const req = httpMock.expectOne('/api/v1/incidents/inc-1');
    req.flush({}, { status: 500, statusText: 'Internal Server Error' });
    expect(errorMessage).toBe('Server error — please try again later.');
  });

  // Error branch: other HTTP error with message
  it('handleError maps other HTTP errors to error.message', () => {
    let errorMessage = '';
    service.getIncident('inc-1').subscribe({
      error: (err: Error) => { errorMessage = err.message; },
    });
    const req = httpMock.expectOne('/api/v1/incidents/inc-1');
    req.flush({ message: 'Bad request' }, { status: 400, statusText: 'Bad Request' });
    expect(errorMessage).toBe('Bad request');
  });
});
