export interface AuditLogResponse {
  publicId: string;
  userId?: string | null;
  userName?: string | null;
  action: string;
  entityName?: string | null;
  entityPublicId?: string | null;
  description?: string | null;
  createdAtUtc: string;
}