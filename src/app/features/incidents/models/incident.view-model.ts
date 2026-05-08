/**
 * UI-shape types for the Incidents feature (LLD-05).
 *
 * Mapped from the API DTOs defined in dora-api openapi.yaml.
 * The generated client in src/generated/api/ does not yet include the full
 * LLD-05 incident paths (Java PR #17 not yet merged + codegen not rerun).
 * These types mirror the OpenAPI schemas exactly so the swap to generated
 * types is a rename-import-only change once codegen runs.
 *
 * OPEN-Q: after dora-api PR #17 merges and `npm run codegen` runs, replace
 * these with generated equivalents from src/generated/api/model/.
 */

// ──────────────────────────────────────────────────────────────────────────────
// Request shapes
// ──────────────────────────────────────────────────────────────────────────────

/** Inline ICT asset to link at incident creation time (AC-5). */
export interface AssetRequest {
  name: string;  // maxLength 200
  type: string;  // maxLength 100
}

/** POST /api/v1/incidents — create a new incident (AC-1). */
export interface CreateIncidentRequest {
  title: string;          // required, maxLength 200
  description: string;    // required
  impactEstimate?: string | null;
  serviceIds?: string[];  // UUID array — active critical-service IDs (AC-4)
  assets?: AssetRequest[]; // inline ICT assets (AC-5)
}

/** POST /api/v1/incidents/{id}/attachments — request presigned URL (AC-3). */
export interface RequestAttachmentUpload {
  filename: string;
  contentType: string;
  sizeBytes: number;
}

/** POST /api/v1/incidents/{id}/services — link services to incident (AC-4). */
export interface LinkServicesRequest {
  serviceIds: string[];  // minItems 1
}

/** POST /api/v1/incidents/{id}/assets — link a single ICT asset (AC-5). */
export interface LinkAssetRequest {
  name: string;
  type: string;
}

// ──────────────────────────────────────────────────────────────────────────────
// Response shapes
// ──────────────────────────────────────────────────────────────────────────────

/** Status values as returned by the backend enum. */
export type IncidentStatus =
  | 'DETECTED'
  | 'UNDER_ASSESSMENT'
  | 'CLASSIFIED'
  | 'ONGOING'
  | 'RESOLVED';

/** Status values for attachment objects. */
export type AttachmentStatus = 'PENDING' | 'READY' | 'FAILED';

export interface AttachmentResponse {
  id: string;
  incidentId: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
  s3Key: string;
  status: AttachmentStatus;
  uploadedBy: string;
  createdAt: string;
}

export interface LinkedServiceResponse {
  serviceId: string;
  name: string;
}

export interface IctAssetResponse {
  id: string;
  incidentId: string;
  name: string;
  type: string;
  createdAt: string;
}

/** Full incident detail — GET /api/v1/incidents/{id} (AC-6). */
export interface IncidentResponse {
  id: string;
  incidentId: string;          // INC-YYYYMMDD-NNNN badge (AC-2)
  title: string;
  description: string;
  impactEstimate: string | null;
  detectionDatetime: string;   // ISO 8601; server-stamped, immutable (FR-002)
  status: IncidentStatus;
  tenantId: string;
  createdBy: string;
  createdAt: string;
  attachments: AttachmentResponse[];
  services: LinkedServiceResponse[];
  assets: IctAssetResponse[];
}

/** Compact projection — paginated list endpoint. */
export interface IncidentSummary {
  id: string;
  incidentId: string;
  title: string;
  status: IncidentStatus;
  detectionDatetime: string;
  createdAt: string;
  tenantId: string;
  createdBy: string;
}

/** Spring Page wrapper for IncidentSummary. */
export interface IncidentSummaryPage {
  content: IncidentSummary[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

/** Step 1 of attachment flow — presigned upload URL (AC-3). */
export interface PresignedUploadResponse {
  attachmentId: string;
  uploadUrl: string;    // presigned PUT URL; valid 15 min (D-LLD05-2)
  expiresAt: string;
}

// ──────────────────────────────────────────────────────────────────────────────
// UI-only types (not from API)
// ──────────────────────────────────────────────────────────────────────────────

/** Represents a pending or uploaded attachment in the uploader UI. */
export interface UploadSlot {
  file: File;
  state: 'pending' | 'uploading' | 'done' | 'error';
  progress: number;     // 0-100; XHR upload progress
  errorMessage: string | null;
  attachmentId: string | null;
}

/** An add-as-you-go ICT asset row in the create form (AC-5). */
export interface AssetRow {
  name: string;
  type: string;
}
