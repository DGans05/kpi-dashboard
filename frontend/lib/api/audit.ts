/**
 * Audit API Client
 * Functions for audit log viewing
 */

import { apiRequest } from './client';

export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  resourceType: string;
  resourceId: string;
  changes: Record<string, unknown>;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  user?: {
    id: string;
    email: string;
    fullName: string | null;
  };
}

export interface AuditFilters {
  userId?: string;
  resourceType?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
}

/**
 * Get audit logs with optional filters (admin only)
 */
export async function getAuditLogs(filters?: AuditFilters): Promise<AuditLog[]> {
  const params = new URLSearchParams();
  if (filters?.userId) params.append('userId', filters.userId);
  if (filters?.resourceType) params.append('resourceType', filters.resourceType);
  if (filters?.startDate) params.append('startDate', filters.startDate);
  if (filters?.endDate) params.append('endDate', filters.endDate);
  if (filters?.limit) params.append('limit', filters.limit.toString());

  const query = params.toString();
  const url = `/api/audit${query ? `?${query}` : ''}`;
  const response = await apiRequest<{ logs: AuditLog[] }>(url);
  return response.logs;
}

/**
 * Get audit logs for specific resource
 */
export async function getResourceAuditLogs(
  resourceType: string,
  resourceId: string
): Promise<AuditLog[]> {
  const response = await apiRequest<{ logs: AuditLog[] }>(
    `/api/audit/${resourceType}/${resourceId}`
  );
  return response.logs;
}

/**
 * Export audit logs as CSV (opens download)
 */
export function exportAuditLogs(startDate?: string, endDate?: string): void {
  const params = new URLSearchParams();
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);

  const query = params.toString();
  const url = `${process.env.NEXT_PUBLIC_API_URL}/api/audit/export${query ? `?${query}` : ''}`;
  
  // Open in new tab to trigger download
  window.open(url, '_blank');
}
