/**
 * View-model types for the Audit Trail widget (LLD-03 §3 W3).
 *
 * These are UI-layer types derived from the OpenAPI AuditEntry schema.
 * They are intentionally NOT re-exported from src/generated/api/ — the
 * generated types have all properties optional (TypeScript generator
 * limitation), whereas these view-model types use required fields
 * appropriate for rendering decisions.
 */

export interface AuditEntryContext {
  request_id: string | null;
  remote_ip: string | null;
  user_agent: string | null;
}

/**
 * Single row from the append-only audit_log table.
 * Maps to the OpenAPI AuditEntry schema (dora-api openapi.yaml §components/schemas/AuditEntry).
 */
export interface AuditEntry {
  id: string;
  tenantId: string;
  /** Null for SYSTEM-initiated actions. */
  actorId: string | null;
  actorUsername: string;
  action: string;
  entityType: string;
  /** Null for non-entity events. */
  entityId: string | null;
  /** JSON snapshot before the change; null on creation events. */
  beforeState: unknown | null;
  /** JSON snapshot after the change; null on deletion events. */
  afterState: unknown | null;
  /** Forensic context per Q-2 ruling: request_id, remote_ip, user_agent only. */
  context: AuditEntryContext | null;
  /** ISO-8601 timestamp string as returned by the API. */
  createdAt: string;
}

/**
 * Spring Page<T> wrapper shape.
 * Mirrors the AuditEntryPage schema — used generically so later LLDs can
 * reuse it for other paginated entities without introducing a dependency on
 * the generated models.
 */
export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  /** 0-based page index. */
  number: number;
}
