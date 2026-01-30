/**
 * KPI Hooks
 * TanStack Query hooks for KPI entry operations
 */

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as kpiApi from '../api/kpi';
import type { KPIEntry, CreateKPIEntryDTO, UpdateKPIEntryDTO } from '../api/kpi';

/**
 * Hook to fetch KPI entries with optional filters
 */
export function useKPIEntries(
  restaurantId?: string,
  startDate?: string,
  endDate?: string
) {
  return useQuery({
    queryKey: ['kpi', 'entries', restaurantId, startDate, endDate],
    queryFn: () => kpiApi.getKPIEntries(restaurantId, startDate, endDate),
    refetchOnMount: true,
    staleTime: 30000, // 30 seconds
  });
}

/**
 * Hook to fetch single KPI entry
 */
export function useKPIEntry(id: string | undefined) {
  return useQuery({
    queryKey: ['kpi', 'entries', id],
    queryFn: () => kpiApi.getKPIEntry(id!),
    enabled: !!id,
  });
}

/**
 * Hook to create KPI entry
 */
export function useCreateKPIEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateKPIEntryDTO) => kpiApi.createKPIEntry(data),
    onSuccess: () => {
      // Invalidate all KPI entries queries to refetch
      queryClient.invalidateQueries({ queryKey: ['kpi', 'entries'] });
    },
  });
}

/**
 * Hook to update KPI entry
 */
export function useUpdateKPIEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateKPIEntryDTO }) =>
      kpiApi.updateKPIEntry(id, data),
    onSuccess: (_, variables) => {
      // Invalidate specific entry and list queries
      queryClient.invalidateQueries({ queryKey: ['kpi', 'entries', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['kpi', 'entries'] });
    },
  });
}

/**
 * Hook to delete KPI entry
 */
export function useDeleteKPIEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => kpiApi.deleteKPIEntry(id),
    onSuccess: () => {
      // Invalidate all KPI entries queries
      queryClient.invalidateQueries({ queryKey: ['kpi', 'entries'] });
    },
  });
}

/**
 * Hook to fetch dashboard summary
 */
export function useDashboardSummary(
  restaurantId?: string,
  startDate?: string,
  endDate?: string
) {
  return useQuery({
    queryKey: ['kpi', 'dashboard', restaurantId, startDate, endDate],
    queryFn: () => kpiApi.getDashboardSummary(restaurantId, startDate, endDate),
    enabled: !!startDate && !!endDate,
    staleTime: 60000, // 1 minute
  });
}

/**
 * Hook to fetch aggregated KPI data
 */
export function useAggregatedKPIData(
  restaurantId?: string,
  startDate?: string,
  endDate?: string,
  groupBy: 'day' | 'week' | 'month' = 'day'
) {
  return useQuery({
    queryKey: ['kpi', 'aggregated', restaurantId, startDate, endDate, groupBy],
    queryFn: () => kpiApi.getAggregatedKPIData(restaurantId, startDate, endDate, groupBy),
    enabled: !!startDate && !!endDate,
    staleTime: 60000, // 1 minute
  });
}
