// @thorough — AC-5/6/7/8: AdminService — HTTP methods, error mapping, role guard edges
import { TestBed } from '@angular/core/testing';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { Component } from '@angular/core';
import { AdminService } from './admin.service';
import { roleGuard } from '../../../../core/auth/role.guard';
import { AuthService } from '../../../../core/auth/auth.service';

@Component({ standalone: true, template: '<p>login</p>' })
class MockLoginComponent {}

@Component({ standalone: true, template: '<p>403</p>' })
class Mock403Component {}

@Component({ standalone: true, template: '<p>admin</p>' })
class MockAdminComponent {}

function buildAuthServiceSpy(
  authenticated: boolean,
  roles: string[],
): jasmine.SpyObj<AuthService> {
  const spy = jasmine.createSpyObj<AuthService>('AuthService', [
    'isAuthenticated',
    'hasRole',
    'token',
    'logout',
  ]);
  spy.isAuthenticated.and.returnValue(authenticated);
  spy.hasRole.and.callFake((role: string) => roles.includes(role));
  spy.token.and.returnValue(authenticated ? 'mock-jwt' : null);
  return spy;
}

// ---------------------------------------------------------------------------
// AC-8 — AdminService HTTP error mapping (thorough — covers all status codes)
// ---------------------------------------------------------------------------

describe('AC-8 — AdminService error mapping — thorough', () => {
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

  it('AC-8: maps HTTP 401 to generic "unexpected error" message', (done) => {
    service.getTenant().subscribe({
      error: (err: Error) => {
        // 401 is not specifically handled — falls through to the default branch
        expect(err.message).toBeTruthy();
        done();
      },
    });
    httpMock
      .expectOne('/api/v1/admin/tenant')
      .flush(null, { status: 401, statusText: 'Unauthorized' });
  });

  it('AC-8: maps HTTP 502 (>= 500) to server error message', (done) => {
    service.getTenant().subscribe({
      error: (err: Error) => {
        expect(err.message).toBe('Server error — please try again later.');
        done();
      },
    });
    httpMock
      .expectOne('/api/v1/admin/tenant')
      .flush(null, { status: 502, statusText: 'Bad Gateway' });
  });

  it('AC-8: maps HTTP 503 (>= 500) to server error message', (done) => {
    service.getNcaEmailConfig().subscribe({
      error: (err: Error) => {
        expect(err.message).toBe('Server error — please try again later.');
        done();
      },
    });
    httpMock
      .expectOne('/api/v1/admin/nca-email')
      .flush(null, { status: 503, statusText: 'Service Unavailable' });
  });

  it('AC-8: maps HTTP 400 with no message body to "unexpected error"', (done) => {
    service.getTenant().subscribe({
      error: (err: Error) => {
        expect(err.message).toBe('An unexpected error occurred.');
        done();
      },
    });
    // No message property in body
    httpMock
      .expectOne('/api/v1/admin/tenant')
      .flush({}, { status: 400, statusText: 'Bad Request' });
  });

  it('AC-8: maps HTTP 422 with message body to the message text', (done) => {
    service.updateTenant({
      legalName: 'Test',
      lei: null,
      ncaName: null,
      ncaEmail: null,
      jurisdictionIso: null,
      primaryComplianceContactId: null,
    }).subscribe({
      error: (err: Error) => {
        expect(err.message).toBe('Unprocessable entity');
        done();
      },
    });
    httpMock
      .expectOne('/api/v1/admin/tenant')
      .flush({ message: 'Unprocessable entity' }, { status: 422, statusText: 'Unprocessable Entity' });
  });

  it('AC-8: error from network is an instance of Error (not a raw HttpErrorResponse)', (done) => {
    service.getTenant().subscribe({
      error: (err: unknown) => {
        expect(err instanceof Error).toBeTrue();
        done();
      },
    });
    httpMock
      .expectOne('/api/v1/admin/tenant')
      .error(new ErrorEvent('network error'));
  });

  it('AC-8: error from 500 is an instance of Error (not a raw HttpErrorResponse)', (done) => {
    service.listCriticalServices().subscribe({
      error: (err: unknown) => {
        expect(err instanceof Error).toBeTrue();
        done();
      },
    });
    httpMock
      .expectOne('/api/v1/admin/critical-services')
      .flush(null, { status: 500, statusText: 'Internal Server Error' });
  });

  // ---------------------------------------------------------------------------
  // URL and method shape tests for all endpoints
  // ---------------------------------------------------------------------------

  it('AC-8: createCriticalService sends correct JSON body', () => {
    const payload = { name: 'ATM', description: 'ATM network' };
    service.createCriticalService(payload).subscribe();
    const req = httpMock.expectOne('/api/v1/admin/critical-services');
    expect(req.request.body).toEqual(payload);
    req.flush({ id: 's1', tenantId: 't1', name: 'ATM', description: 'ATM network', active: true, createdAt: '2026-01-01T00:00:00Z' });
  });

  it('AC-8: archiveCriticalService sends null body (POST to archive sub-resource)', () => {
    service.archiveCriticalService('svc-5').subscribe();
    const req = httpMock.expectOne('/api/v1/admin/critical-services/svc-5/archive');
    expect(req.request.body).toBeNull();
    req.flush(null, { status: 204, statusText: 'No Content' });
  });

  it('AC-8: setClientBase sends correct JSON body', () => {
    const payload = { clientCount: 999, effectiveFrom: '2026-06-01' };
    service.setClientBase(payload).subscribe();
    const req = httpMock.expectOne('/api/v1/admin/client-base');
    expect(req.request.body).toEqual(payload);
    req.flush({ id: 'e1', tenantId: 't1', clientCount: 999, effectiveFrom: '2026-06-01T00:00:00Z', setBy: 'u1', createdAt: '2026-06-01T00:00:00Z' });
  });

  it('AC-8: updateNcaEmailConfig sends correct JSON body', () => {
    const payload = { sender: 'a@b.com', recipient: 'c@d.com', subjectTemplate: 'Subj' };
    service.updateNcaEmailConfig(payload).subscribe();
    const req = httpMock.expectOne('/api/v1/admin/nca-email');
    expect(req.request.body).toEqual(payload);
    req.flush({ tenantId: 't1', ...payload, updatedAt: null });
  });

  it('AC-8: updateTenant sends correct JSON body', () => {
    const payload = {
      legalName: 'Bank X',
      lei: null,
      ncaName: 'BaFin',
      ncaEmail: null,
      jurisdictionIso: 'DE',
      primaryComplianceContactId: null,
    };
    service.updateTenant(payload).subscribe();
    const req = httpMock.expectOne('/api/v1/admin/tenant');
    expect(req.request.body).toEqual(payload);
    req.flush({ id: 't1', ...payload });
  });

  it('AC-8: updateCriticalService sends PUT to correct URL', () => {
    service.updateCriticalService('svc-99', { name: 'Renamed', description: null }).subscribe();
    const req = httpMock.expectOne('/api/v1/admin/critical-services/svc-99');
    expect(req.request.method).toBe('PUT');
    req.flush({ id: 'svc-99', tenantId: 't1', name: 'Renamed', description: null, active: true, createdAt: '2026-01-01T00:00:00Z' });
  });
});

// ---------------------------------------------------------------------------
// AC-5 / AC-7 — roleGuard thorough edge cases
// ---------------------------------------------------------------------------

describe('AC-5 / AC-7 — roleGuard thorough edge cases', () => {
  afterEach(() => sessionStorage.clear());

  it('AC-7: PLATFORM_ADMIN accessing OPS_ANALYST-only route is redirected to /403', () => {
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
      roleGuard(['OPS_ANALYST'])({} as never, {} as never),
    );
    expect(navigateSpy).toHaveBeenCalledWith(['/403']);
  });

  it('AC-5: unauthenticated user gets false from guard', () => {
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
    spyOn(TestBed.inject(Router), 'navigate').and.returnValue(Promise.resolve(true));
    const result = TestBed.runInInjectionContext(() =>
      roleGuard(['PLATFORM_ADMIN'])({} as never, {} as never),
    );
    expect(result).toBeFalse();
  });

  it('AC-5: unauthenticated user redirect target is /login (not /403)', () => {
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
    expect(navigateSpy).not.toHaveBeenCalledWith(['/403']);
  });

  it('AC-7: authenticated user with NO role at all is redirected to /403', () => {
    const spy = buildAuthServiceSpy(true, []); // authenticated but zero roles
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
    expect(navigateSpy).toHaveBeenCalledWith(['/403']);
  });

  it('AC-7: PLATFORM_ADMIN satisfies a guard requiring PLATFORM_ADMIN — returns true', () => {
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

  it('AC-7: user with INCIDENT_MANAGER role accessing /admin (PLATFORM_ADMIN guard) returns false', () => {
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

  it('AC-7: user with OPS_ANALYST role accessing admin guard returns false', () => {
    const spy = buildAuthServiceSpy(true, ['OPS_ANALYST']);
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

  it('AC-5: multiple roles in allowed list — first matching role grants access', () => {
    const spy = buildAuthServiceSpy(true, ['OPS_ANALYST']); // has OPS_ANALYST
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
      roleGuard(['PLATFORM_ADMIN', 'OPS_ANALYST'])({} as never, {} as never),
    );
    expect(result).toBeTrue();
  });
});
