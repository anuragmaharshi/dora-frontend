import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import {
  CreateIncidentRequest,
  IncidentResponse,
  IncidentSummaryPage,
  RequestAttachmentUpload,
  PresignedUploadResponse,
  AttachmentResponse,
  LinkAssetRequest,
  IctAssetResponse,
} from '../models/incident.view-model';
import { CriticalService } from '../../admin/models/admin.view-model';

/**
 * IncidentsService — wraps all /api/v1/incidents/** HTTP calls for LLD-05.
 *
 * Why HttpClient directly rather than the generated typed client:
 * The full LLD-05 incident endpoints are implemented in dora-api PR #17
 * which has not yet been merged. The generated client in src/generated/api/
 * only exposes the RBAC probe endpoint, not the create/detail/attachment paths.
 * Once PR #17 merges and `npm run codegen` runs, replace these HttpClient
 * calls with the generated IncidentsService from src/generated/api/.
 * OPEN-Q: swap to generated client after codegen update (post PR #17 merge).
 *
 * The /admin/critical-services call is reused from the admin domain because
 * the generated client still does not expose it under incidents; AdminService
 * already has this method but we call HttpClient directly here to keep the
 * incidents service self-contained.
 */
@Injectable({ providedIn: 'root' })
export class IncidentsService {
  // inject() preferred over constructor injection for Angular 14+ best practice.
  private readonly http = inject(HttpClient);

  private readonly base = '/api/v1/incidents';
  private readonly adminBase = '/api/v1/admin';

  // ---------------------------------------------------------------------------
  // Incidents
  // ---------------------------------------------------------------------------

  /** AC-1: Create a new incident. Returns the created IncidentResponse. */
  createIncident(payload: CreateIncidentRequest): Observable<IncidentResponse> {
    return this.http
      .post<IncidentResponse>(this.base, payload)
      .pipe(catchError(this.handleError));
  }

  /** AC-6: Get full incident detail including attachments and linked entities. */
  getIncident(id: string): Observable<IncidentResponse> {
    return this.http
      .get<IncidentResponse>(`${this.base}/${id}`)
      .pipe(catchError(this.handleError));
  }

  /** AC-6: List incidents (paginated). */
  listIncidents(page = 0, size = 20): Observable<IncidentSummaryPage> {
    return this.http
      .get<IncidentSummaryPage>(this.base, { params: { page: String(page), size: String(size) } })
      .pipe(catchError(this.handleError));
  }

  // ---------------------------------------------------------------------------
  // Attachments — 3-step flow (AC-3)
  // ---------------------------------------------------------------------------

  /**
   * Step 1: Request a presigned upload URL.
   * POST /api/v1/incidents/{id}/attachments
   */
  requestPresignedUrl(
    incidentId: string,
    payload: RequestAttachmentUpload,
  ): Observable<PresignedUploadResponse> {
    return this.http
      .post<PresignedUploadResponse>(`${this.base}/${incidentId}/attachments`, payload)
      .pipe(catchError(this.handleError));
  }

  /**
   * Step 2: PUT the file directly to MinIO via the presigned URL.
   * This call bypasses the Angular HTTP interceptors (Bearer token must NOT
   * be sent to the presigned URL — MinIO uses the query-string signature).
   * We return a plain Observable<void> wrapping the raw XHR to allow progress
   * events without including the auth token in the presigned request.
   */
  uploadToPresignedUrl(uploadUrl: string, file: File): Observable<void> {
    // The presigned URL is an absolute MinIO URL — we use HttpClient with the
    // full URL and explicitly clear the Authorization header so the auth
    // interceptor's token is not forwarded to MinIO.
    return this.http
      .put<void>(uploadUrl, file, {
        headers: { Authorization: '' },
      })
      .pipe(catchError(this.handleError));
  }

  /**
   * Step 3: Confirm upload completion.
   * POST /api/v1/incidents/{id}/attachments/{attachmentId}/complete
   */
  completeUpload(
    incidentId: string,
    attachmentId: string,
  ): Observable<AttachmentResponse> {
    return this.http
      .post<AttachmentResponse>(
        `${this.base}/${incidentId}/attachments/${attachmentId}/complete`,
        null,
      )
      .pipe(catchError(this.handleError));
  }

  // ---------------------------------------------------------------------------
  // Services (AC-4)
  // ---------------------------------------------------------------------------

  /** AC-4: Fetch active critical services for the multiselect picklist. */
  listCriticalServices(): Observable<CriticalService[]> {
    return this.http
      .get<CriticalService[]>(`${this.adminBase}/critical-services`)
      .pipe(catchError(this.handleError));
  }

  // ---------------------------------------------------------------------------
  // Assets (AC-5)
  // ---------------------------------------------------------------------------

  /** AC-5: Link a single ICT asset to an incident post-creation. */
  linkAsset(incidentId: string, payload: LinkAssetRequest): Observable<IctAssetResponse> {
    return this.http
      .post<IctAssetResponse>(`${this.base}/${incidentId}/assets`, payload)
      .pipe(catchError(this.handleError));
  }

  // ---------------------------------------------------------------------------
  // Error mapping — raw HTTP errors → user-friendly Error instances.
  // Components only need to handle one error type.
  // ---------------------------------------------------------------------------

  private handleError(err: HttpErrorResponse): Observable<never> {
    let message: string;
    if (err.status === 0) {
      message = 'Network error — please check your connection.';
    } else if (err.status === 403) {
      message = 'You do not have permission to perform this action.';
    } else if (err.status === 404) {
      message = 'Incident not found.';
    } else if (err.status === 422) {
      message = err.error?.message ?? 'Validation error — please check your inputs.';
    } else if (err.status >= 500) {
      message = 'Server error — please try again later.';
    } else {
      message = err.error?.message ?? 'An unexpected error occurred.';
    }
    return throwError(() => new Error(message));
  }
}
