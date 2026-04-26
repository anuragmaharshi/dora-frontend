import { inject, Injectable } from '@angular/core';
import { Observable, catchError, map, throwError } from 'rxjs';

import { AuditService as GeneratedAuditService } from '../../../generated/api/api/audit.service';
import { AuditEntry as GeneratedAuditEntry } from '../../../generated/api/model/auditEntry';
import { AuditEntryPage } from '../../../generated/api/model/auditEntryPage';
import { AuditEntry, Page } from './audit.model';

/**
 * Application-layer wrapper around the OpenAPI-generated AuditService.
 *
 * Responsibilities:
 *  - Map generated DTO types (all-optional fields) to required view-model types.
 *  - Translate HTTP errors into user-friendly messages so components never
 *    inspect raw HttpErrorResponse objects.
 *  - Centralise pagination defaults (page=0, size=20) per LLD-03 §3.
 */
@Injectable({ providedIn: 'root' })
export class AuditTrailService {
  // Use inject() per project convention (LLD-02 established; avoids constructor
  // injection boilerplate in standalone components and services).
  private readonly generated = inject(GeneratedAuditService);

  /**
   * Fetch one page of audit history for a given entity, newest first.
   *
   * @param entityType  Entity type discriminator, e.g. 'INCIDENT'
   * @param entityId    UUID of the entity
   * @param page        0-based page index (default 0)
   * @param size        Rows per page, 1-100 (default 20)
   */
  list(entityType: string, entityId: string, page = 0, size = 20): Observable<Page<AuditEntry>> {
    return this.generated.getAuditHistory(entityType, entityId, page, size).pipe(
      map((raw: AuditEntryPage) => this.mapPage(raw)),
      catchError((err: unknown) => throwError(() => this.toUserMessage(err))),
    );
  }

  // ---------------------------------------------------------------------------
  // Private mapping helpers
  // ---------------------------------------------------------------------------

  private mapPage(raw: AuditEntryPage): Page<AuditEntry> {
    return {
      content: (raw.content ?? []).map((e) => this.mapEntry(e)),
      totalElements: raw.totalElements ?? 0,
      totalPages: raw.totalPages ?? 0,
      size: raw.size ?? 0,
      number: raw.number ?? 0,
    };
  }

  private mapEntry(e: GeneratedAuditEntry): AuditEntry {
    return {
      id: e.id ?? '',
      tenantId: e.tenantId ?? '',
      actorId: e.actorId ?? null,
      actorUsername: e.actorUsername ?? '',
      action: e.action ?? '',
      entityType: e.entityType ?? '',
      entityId: e.entityId ?? null,
      beforeState: e.beforeState ?? null,
      afterState: e.afterState ?? null,
      context: e.context
        ? {
            request_id: e.context.request_id ?? null,
            remote_ip: e.context.remote_ip ?? null,
            user_agent: e.context.user_agent ?? null,
          }
        : null,
      createdAt: e.createdAt ?? '',
    };
  }

  /**
   * Convert an unknown HTTP error into a plain string suitable for display.
   * Components receive a string error so they can use it in template
   * interpolation without importing HttpErrorResponse.
   */
  private toUserMessage(err: unknown): string {
    if (err != null && typeof err === 'object' && 'status' in err) {
      const status = (err as { status: number }).status;
      if (status === 403) {
        return 'You do not have permission to view the audit trail for this entity.';
      }
      if (status === 400) {
        return 'Invalid request: entity type or ID is missing.';
      }
      if (status === 0) {
        return 'Network error — the API could not be reached.';
      }
    }
    return 'An unexpected error occurred while loading the audit trail.';
  }
}
