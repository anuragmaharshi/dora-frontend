import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import {
  TenantConfig,
  TenantConfigUpdate,
  CriticalService,
  CreateCriticalService,
  UpdateCriticalService,
  ClientBaseEntry,
  ClientBaseHistory,
  SetClientBase,
  NcaEmailConfig,
  NcaEmailConfigUpdate,
} from '../models/admin.view-model';

/**
 * AdminService wraps all /api/v1/admin/** HTTP calls.
 *
 * Why we use HttpClient directly here rather than a generated typed client:
 * the LLD-04 backend endpoints are being implemented in parallel (W2 wave).
 * The generated client in src/generated/api/ does not yet include admin
 * paths.  Once the Java PR merges and codegen reruns, replace HttpClient
 * calls with the generated AdminService.
 * OPEN-Q: swap to generated client after codegen update.
 */
@Injectable({ providedIn: 'root' })
export class AdminService {
  // Injected via inject() — preferred over constructor injection in
  // standalone components / services (Angular 14+ best practice).
  private readonly http = inject(HttpClient);

  private readonly base = '/api/v1/admin';

  // ---------------------------------------------------------------------------
  // Tenant config
  // ---------------------------------------------------------------------------

  getTenant(): Observable<TenantConfig> {
    return this.http
      .get<TenantConfig>(`${this.base}/tenant`)
      .pipe(catchError(this.handleError));
  }

  updateTenant(update: TenantConfigUpdate): Observable<TenantConfig> {
    return this.http
      .put<TenantConfig>(`${this.base}/tenant`, update)
      .pipe(catchError(this.handleError));
  }

  // ---------------------------------------------------------------------------
  // Critical services
  // ---------------------------------------------------------------------------

  listCriticalServices(): Observable<CriticalService[]> {
    return this.http
      .get<CriticalService[]>(`${this.base}/critical-services`)
      .pipe(catchError(this.handleError));
  }

  createCriticalService(payload: CreateCriticalService): Observable<CriticalService> {
    return this.http
      .post<CriticalService>(`${this.base}/critical-services`, payload)
      .pipe(catchError(this.handleError));
  }

  updateCriticalService(id: string, payload: UpdateCriticalService): Observable<CriticalService> {
    return this.http
      .put<CriticalService>(`${this.base}/critical-services/${id}`, payload)
      .pipe(catchError(this.handleError));
  }

  archiveCriticalService(id: string): Observable<void> {
    return this.http
      .post<void>(`${this.base}/critical-services/${id}/archive`, null)
      .pipe(catchError(this.handleError));
  }

  // ---------------------------------------------------------------------------
  // Client base history
  // ---------------------------------------------------------------------------

  getClientBaseHistory(): Observable<ClientBaseHistory> {
    return this.http
      .get<ClientBaseHistory>(`${this.base}/client-base`)
      .pipe(catchError(this.handleError));
  }

  setClientBase(payload: SetClientBase): Observable<ClientBaseEntry> {
    return this.http
      .post<ClientBaseEntry>(`${this.base}/client-base`, payload)
      .pipe(catchError(this.handleError));
  }

  // ---------------------------------------------------------------------------
  // NCA email config
  // ---------------------------------------------------------------------------

  getNcaEmailConfig(): Observable<NcaEmailConfig> {
    return this.http
      .get<NcaEmailConfig>(`${this.base}/nca-email`)
      .pipe(catchError(this.handleError));
  }

  updateNcaEmailConfig(update: NcaEmailConfigUpdate): Observable<NcaEmailConfig> {
    return this.http
      .put<NcaEmailConfig>(`${this.base}/nca-email`, update)
      .pipe(catchError(this.handleError));
  }

  // ---------------------------------------------------------------------------
  // Error mapping — converts raw HTTP errors to user-friendly Error instances
  // so components only need to handle one error type.
  // ---------------------------------------------------------------------------

  private handleError(err: HttpErrorResponse): Observable<never> {
    let message: string;
    if (err.status === 0) {
      message = 'Network error — please check your connection.';
    } else if (err.status === 403) {
      message = 'You do not have permission to perform this action.';
    } else if (err.status === 404) {
      message = 'Resource not found.';
    } else if (err.status >= 500) {
      message = 'Server error — please try again later.';
    } else {
      message = err.error?.message ?? 'An unexpected error occurred.';
    }
    return throwError(() => new Error(message));
  }
}
