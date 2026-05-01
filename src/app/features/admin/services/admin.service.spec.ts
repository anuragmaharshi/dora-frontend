// @smoke — AC-5, AC-6, AC-7: roleGuard enforces PLATFORM_ADMIN on admin routes;
//          AC-8: AdminService methods are the only channel for mutations.
import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { Component } from '@angular/core';
import { AdminService } from './admin.service';
import { roleGuard } from '../../../../core/auth/role.guard';
import { AuthService } from '../../../../core/auth/auth.service';

// ---------------------------------------------------------------------------
// Minimal stub components for router testing
// ---------------------------------------------------------------------------

@Component({ standalone: true, template: '<p>admin</p>' })
class MockAdminComponent {}

@Component({ standalone: true, template: '<p>login</p>' })
class MockLoginComponent {}

@Component({ standalone: true, template: '<p>403</p>' })
class Mock403Component {}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildAuthServiceSpy(
  authenticated: boolean,
  roles: string[],
): jasmine.SpyObj<AuthService> {
  const spy = jasmine.createSpyObj<AuthService>('AuthService', ['isAuthenticated', 'hasRole', 'token', 'logout']);
  spy.isAuthenticated.and.returnValue(authenticated);
  spy.hasRole.and.callFake((role: string) => roles.includes(role));
  spy.token.and.returnValue(authenticated ? 'mock-jwt' : null);
  return spy;
}

// ---------------------------------------------------------------------------
// AC-8: AdminService HTTP methods
// ---------------------------------------------------------------------------

describe('AC-8 — AdminService @smoke', () => {
  let service: AdminService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [AdminService],
    });
    service = TestBed.inject(AdminService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('getTenant: GET /api/v1/admin/tenant', () => {
    service.getTenant().subscribe();
    const req = httpMock.expectOne('/api/v1/admin/tenant');
    expect(req.request.method).toBe('GET');
    req.flush({ id: 't1', legalName: 'Test', lei: null, ncaName: null, ncaEmail: null, jurisdictionIso: null, primaryComplianceContactId: null });
  });

  it('updateTenant: PUT /api/v1/admin/tenant', () => {
    service.updateTenant({ legalName: 'Test', lei: null, ncaName: null, ncaEmail: null, jurisdictionIso: null, primaryComplianceContactId: null }).subscribe();
    const req = httpMock.expectOne('/api/v1/admin/tenant');
    expect(req.request.method).toBe('PUT');
    req.flush({ id: 't1', legalName: 'Test', lei: null, ncaName: null, ncaEmail: null, jurisdictionIso: null, primaryComplianceContactId: null });
  });

  it('listCriticalServices: GET /api/v1/admin/critical-services', () => {
    service.listCriticalServices().subscribe();
    const req = httpMock.expectOne('/api/v1/admin/critical-services');
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('createCriticalService: POST /api/v1/admin/critical-services', () => {
    service.createCriticalService({ name: 'Online Banking', description: null }).subscribe();
    const req = httpMock.expectOne('/api/v1/admin/critical-services');
    expect(req.request.method).toBe('POST');
    req.flush({ id: 's1', tenantId: 't1', name: 'Online Banking', description: null, active: true, createdAt: '2026-01-01T00:00:00Z' });
  });

  it('archiveCriticalService: POST /api/v1/admin/critical-services/svc-1/archive', () => {
    service.archiveCriticalService('svc-1').subscribe();
    const req = httpMock.expectOne('/api/v1/admin/critical-services/svc-1/archive');
    expect(req.request.method).toBe('POST');
    req.flush(null, { status: 204, statusText: 'No Content' });
  });

  it('getClientBaseHistory: GET /api/v1/admin/client-base', () => {
    service.getClientBaseHistory().subscribe();
    const req = httpMock.expectOne('/api/v1/admin/client-base');
    expect(req.request.method).toBe('GET');
    req.flush({ entries: [] });
  });

  it('setClientBase: POST /api/v1/admin/client-base', () => {
    service.setClientBase({ clientCount: 1000, effectiveFrom: '2026-01-01' }).subscribe();
    const req = httpMock.expectOne('/api/v1/admin/client-base');
    expect(req.request.method).toBe('POST');
    req.flush({ id: 'e1', tenantId: 't1', clientCount: 1000, effectiveFrom: '2026-01-01T00:00:00Z', setBy: 'u1', createdAt: '2026-01-01T00:00:00Z' });
  });

  it('getNcaEmailConfig: GET /api/v1/admin/nca-email', () => {
    service.getNcaEmailConfig().subscribe();
    const req = httpMock.expectOne('/api/v1/admin/nca-email');
    expect(req.request.method).toBe('GET');
    req.flush({ tenantId: 't1', sender: 'a@b.com', recipient: 'c@d.com', subjectTemplate: 'Sub', updatedAt: null });
  });

  it('updateNcaEmailConfig: PUT /api/v1/admin/nca-email', () => {
    service.updateNcaEmailConfig({ sender: 'a@b.com', recipient: 'c@d.com', subjectTemplate: 'Sub' }).subscribe();
    const req = httpMock.expectOne('/api/v1/admin/nca-email');
    expect(req.request.method).toBe('PUT');
    req.flush({ tenantId: 't1', sender: 'a@b.com', recipient: 'c@d.com', subjectTemplate: 'Sub', updatedAt: null });
  });

  it('maps HTTP 403 to a friendly error message', (done) => {
    service.getTenant().subscribe({
      error: (err: Error) => {
        expect(err.message).toBe('You do not have permission to perform this action.');
        done();
      },
    });
    httpMock.expectOne('/api/v1/admin/tenant').flush(null, { status: 403, statusText: 'Forbidden' });
  });

  it('maps network error (status 0) to a friendly error message', (done) => {
    service.getTenant().subscribe({
      error: (err: Error) => {
        expect(err.message).toBe('Network error — please check your connection.');
        done();
      },
    });
    httpMock.expectOne('/api/v1/admin/tenant').error(new ErrorEvent('network error'));
  });

  it('maps HTTP 404 to resource not found message', (done) => {
    service.getTenant().subscribe({
      error: (err: Error) => {
        expect(err.message).toBe('Resource not found.');
        done();
      },
    });
    httpMock.expectOne('/api/v1/admin/tenant').flush(null, { status: 404, statusText: 'Not Found' });
  });

  it('maps HTTP 500 to server error message', (done) => {
    service.getTenant().subscribe({
      error: (err: Error) => {
        expect(err.message).toBe('Server error — please try again later.');
        done();
      },
    });
    httpMock.expectOne('/api/v1/admin/tenant').flush(null, { status: 500, statusText: 'Internal Server Error' });
  });

  it('maps HTTP 400 to error message from response body', (done) => {
    service.getTenant().subscribe({
      error: (err: Error) => {
        expect(err.message).toBe('Validation failed');
        done();
      },
    });
    httpMock.expectOne('/api/v1/admin/tenant').flush(
      { message: 'Validation failed' },
      { status: 400, statusText: 'Bad Request' },
    );
  });

  it('updateCriticalService: PUT /api/v1/admin/critical-services/svc-1', () => {
    service.updateCriticalService('svc-1', { name: 'Renamed', description: null }).subscribe();
    const req = httpMock.expectOne('/api/v1/admin/critical-services/svc-1');
    expect(req.request.method).toBe('PUT');
    req.flush({ id: 'svc-1', tenantId: 't1', name: 'Renamed', description: null, active: true, createdAt: '2026-01-01T00:00:00Z' });
  });

  it('updateNcaEmailConfig success path', () => {
    const payload = { sender: 'a@b.com', recipient: 'c@d.com', subjectTemplate: 'Subj' };
    service.updateNcaEmailConfig(payload).subscribe((result) => {
      expect(result.sender).toBe('a@b.com');
    });
    httpMock.expectOne('/api/v1/admin/nca-email').flush({ tenantId: 't1', ...payload, updatedAt: null });
  });
});

// ---------------------------------------------------------------------------
// AC-5 / AC-7: roleGuard integration — admin routes require PLATFORM_ADMIN
// ---------------------------------------------------------------------------

describe('AC-5 / AC-7 — roleGuard on admin routes @smoke', () => {
  let router: Router;

  afterEach(() => sessionStorage.clear());

  it('AC-5/AC-7: PLATFORM_ADMIN is allowed through the admin route guard', () => {
    const spy = buildAuthServiceSpy(true, ['PLATFORM_ADMIN']);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'login', component: MockLoginComponent },
          { path: '403', component: Mock403Component },
        ]),
        { provide: AuthService, useValue: spy },
      ],
    });
    const result = TestBed.runInInjectionContext(() =>
      roleGuard(['PLATFORM_ADMIN'])({} as never, {} as never),
    );
    expect(result).toBeTrue();
  });

  it('AC-7: OPS_ANALYST accessing admin route is redirected to /403', () => {
    const spy = buildAuthServiceSpy(true, ['OPS_ANALYST']);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'login', component: MockLoginComponent },
          { path: '403', component: Mock403Component },
          {
            path: 'admin',
            component: MockAdminComponent,
            canActivate: [roleGuard(['PLATFORM_ADMIN'])],
          },
        ]),
        { provide: AuthService, useValue: spy },
      ],
    });
    router = TestBed.inject(Router);
    const navigateSpy = spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));
    TestBed.runInInjectionContext(() =>
      roleGuard(['PLATFORM_ADMIN'])({} as never, {} as never),
    );
    expect(navigateSpy).toHaveBeenCalledWith(['/403']);
  });

  it('AC-5: PLATFORM_ADMIN accessing a bank-role-only route is redirected to /403', () => {
    // Simulate a route that only allows INCIDENT_MANAGER (not PLATFORM_ADMIN).
    const spy = buildAuthServiceSpy(true, ['PLATFORM_ADMIN']);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'login', component: MockLoginComponent },
          { path: '403', component: Mock403Component },
        ]),
        { provide: AuthService, useValue: spy },
      ],
    });
    const navigateSpy = spyOn(TestBed.inject(Router), 'navigate').and.returnValue(
      Promise.resolve(true),
    );
    TestBed.runInInjectionContext(() =>
      roleGuard(['INCIDENT_MANAGER'])({} as never, {} as never),
    );
    expect(navigateSpy).toHaveBeenCalledWith(['/403']);
  });

  it('AC-7: INCIDENT_MANAGER accessing admin route returns false from guard', () => {
    const spy = buildAuthServiceSpy(true, ['INCIDENT_MANAGER']);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'login', component: MockLoginComponent },
          { path: '403', component: Mock403Component },
        ]),
        { provide: AuthService, useValue: spy },
      ],
    });
    spyOn(TestBed.inject(Router), 'navigate').and.returnValue(Promise.resolve(true));
    const result = TestBed.runInInjectionContext(() =>
      roleGuard(['PLATFORM_ADMIN'])({} as never, {} as never),
    );
    expect(result).toBeFalse();
  });

  it('AC-5: unauthenticated user on admin route is redirected to /login', () => {
    const spy = buildAuthServiceSpy(false, []);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'login', component: MockLoginComponent },
          { path: '403', component: Mock403Component },
        ]),
        { provide: AuthService, useValue: spy },
      ],
    });
    const navigateSpy = spyOn(TestBed.inject(Router), 'navigate').and.returnValue(
      Promise.resolve(true),
    );
    TestBed.runInInjectionContext(() =>
      roleGuard(['PLATFORM_ADMIN'])({} as never, {} as never),
    );
    expect(navigateSpy).toHaveBeenCalledWith(['/login']);
  });
});
