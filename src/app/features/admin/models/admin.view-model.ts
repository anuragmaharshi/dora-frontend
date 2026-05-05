/**
 * UI-shape types for the Admin feature.
 *
 * These are mapped from API DTOs returned by the backend.
 * No generated types exist in src/generated/api/ for LLD-04 endpoints
 * (the Java developer is implementing those in parallel) so we define
 * them here and will align with the generated types once codegen runs.
 *
 * OPEN-Q: once dora-api PR merges and openapi.yaml is updated, run
 * `npm run codegen` and replace these with the generated equivalents.
 */

export interface TenantConfig {
  id: string;
  legalName: string;
  lei: string | null;
  ncaName: string | null;
  ncaEmail: string | null;
  jurisdictionIso: string | null;
  primaryComplianceContactId: string | null;
}

export interface TenantConfigUpdate {
  legalName: string;
  lei: string | null;
  ncaName: string | null;
  ncaEmail: string | null;
  jurisdictionIso: string | null;
  primaryComplianceContactId: string | null;
}

export interface CriticalService {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  active: boolean;
  createdAt: string;
}

export interface CreateCriticalService {
  name: string;
  description: string | null;
}

export interface UpdateCriticalService {
  name: string;
  description: string | null;
}

export interface ClientBaseEntry {
  id: string;
  tenantId: string;
  clientCount: number;
  effectiveFrom: string;
  setBy: string;
  createdAt: string;
}

export interface ClientBaseHistory {
  entries: ClientBaseEntry[];
}

export interface SetClientBase {
  clientCount: number;
  effectiveFrom: string;
}

export interface NcaEmailConfig {
  tenantId: string;
  sender: string;
  recipient: string;
  subjectTemplate: string;
  updatedAt: string | null;
}

export interface NcaEmailConfigUpdate {
  sender: string;
  recipient: string;
  subjectTemplate: string;
}
