/**
 * Audit Hooks – Convex backend
 */

"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export type AuditFilters = {
  userId?: string;
  resourceType?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
};

export type AuditLog = {
  id: string;
  userId?: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  changes?: unknown;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: string;
  user?: { id: string; email: string; fullName: string | null };
};

export function useAuditLogs(filters?: AuditFilters) {
  const logs = useQuery(api.audit.list, {
    limit: filters?.limit,
    resourceType: filters?.resourceType,
    userId: filters?.userId,
  });
  const data: AuditLog[] = Array.isArray(logs) ? logs : [];
  return {
    data,
    isLoading: logs === undefined,
    error: null,
  };
}

export function useResourceAuditLogs(_resourceType: string, _resourceId: string) {
  return useAuditLogs({ limit: 50 });
}
