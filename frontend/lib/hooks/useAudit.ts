/**
 * Audit Hooks
 * TanStack Query hooks for audit logs
 */

'use client';

import { useQuery } from '@tanstack/react-query';
import * as auditApi from '../api/audit';
import type { AuditFilters } from '../api/audit';

/**
 * Hook to fetch audit logs
 */
export function useAuditLogs(filters?: AuditFilters) {
  return useQuery({
    queryKey: ['audit', filters],
    queryFn: () => auditApi.getAuditLogs(filters),
    staleTime: 30000, // 30 seconds
  });
}

/**
 * Hook to fetch audit logs for specific resource
 */
export function useResourceAuditLogs(resourceType: string, resourceId: string) {
  return useQuery({
    queryKey: ['audit', resourceType, resourceId],
    queryFn: () => auditApi.getResourceAuditLogs(resourceType, resourceId),
    enabled: !!resourceType && !!resourceId,
  });
}
