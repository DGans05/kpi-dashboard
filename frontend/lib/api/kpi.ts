/**
 * KPI API Client
 * Functions for interacting with the KPI entries API
 */

import { apiRequest } from './client';

export interface Restaurant {
  id: string;
  name: string;
  city: string;
}

export interface KPIEntry {
  id: string;
  restaurantId: string;
  entryDate: string;
  revenue: number;
  labourCost: number;
  labourCostPercent: number;
  foodCost: number;
  foodCostPercent: number;
  orders: number;
  avgTicket: number;
  createdAt: string;
  updatedAt?: string;
  restaurant?: Restaurant;
}

export interface CreateKPIEntryDTO {
  restaurantId: string;
  entryDate: string;
  revenue: number;
  labourCost: number;
  foodCost: number;
  orders: number;
}

export interface UpdateKPIEntryDTO {
  revenue?: number;
  labourCost?: number;
  foodCost?: number;
  orders?: number;
}

/**
 * Get KPI entries with optional filters
 */
export async function getKPIEntries(
  restaurantId?: string,
  startDate?: string,
  endDate?: string
): Promise<KPIEntry[]> {
  const params = new URLSearchParams();
  if (restaurantId) params.append('restaurantId', restaurantId);
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);

  const query = params.toString();
  const url = `/api/kpi/entries${query ? `?${query}` : ''}`;
  const response = await apiRequest<{ entries: KPIEntry[] }>(url);
  return response.entries;
}

/**
 * Get single KPI entry by ID
 */
export async function getKPIEntry(id: string): Promise<KPIEntry> {
  const response = await apiRequest<{ entry: KPIEntry }>(`/api/kpi/entries/${id}`);
  return response.entry;
}

/**
 * Create new KPI entry
 */
export async function createKPIEntry(data: CreateKPIEntryDTO): Promise<KPIEntry> {
  const response = await apiRequest<{ entry: KPIEntry }>('/api/kpi/entries', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return response.entry;
}

/**
 * Update existing KPI entry
 */
export async function updateKPIEntry(
  id: string,
  data: UpdateKPIEntryDTO
): Promise<KPIEntry> {
  const response = await apiRequest<{ entry: KPIEntry }>(`/api/kpi/entries/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  return response.entry;
}

/**
 * Delete KPI entry
 */
export async function deleteKPIEntry(id: string): Promise<void> {
  await apiRequest(`/api/kpi/entries/${id}`, { method: 'DELETE' });
}

/**
 * Dashboard Summary Types
 */
export interface DashboardSummary {
  restaurantId: string;
  restaurantName: string;
  dateRange: {
    startDate: string;
    endDate: string;
  };
  current: {
    totalRevenue: number;
    totalOrders: number;
    avgTicket: number;
    labourCostPercent: number;
    foodCostPercent: number;
  };
  trends: {
    revenue: number;
    orders: number;
    labourCost: number;
    foodCost: number;
  };
  alerts: {
    labourCost: 'good' | 'warning' | 'critical';
    foodCost: 'good' | 'warning' | 'critical';
  };
  targets: {
    labourCost: number;
    foodCost: number;
  };
  chartData: Array<{
    date: string;
    revenue: number;
    labourCost: number;
    foodCost: number;
    orders: number;
    labourCostPercent: number;
    foodCostPercent: number;
  }>;
}

export interface KPIAggregation {
  period: string;
  restaurantId: string;
  restaurantName: string;
  totalRevenue: number;
  totalLabourCost: number;
  totalFoodCost: number;
  totalOrders: number;
  avgTicket: number;
  labourCostPercent: number;
  foodCostPercent: number;
  labourCostTarget?: number;
  foodCostTarget?: number;
  labourCostStatus: 'good' | 'warning' | 'critical';
  foodCostStatus: 'good' | 'warning' | 'critical';
  labourCostTrend: number;
  foodCostTrend: number;
  revenueTrend: number;
}

/**
 * Get dashboard summary
 */
export async function getDashboardSummary(
  restaurantId?: string,
  startDate?: string,
  endDate?: string
): Promise<DashboardSummary> {
  const params = new URLSearchParams();
  if (restaurantId) params.append('restaurantId', restaurantId);
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);

  const query = params.toString();
  const url = `/api/kpi/dashboard${query ? `?${query}` : ''}`;
  const response = await apiRequest<{ summary: DashboardSummary }>(url);
  return response.summary;
}

/**
 * Get aggregated KPI data
 */
export async function getAggregatedKPIData(
  restaurantId?: string,
  startDate?: string,
  endDate?: string,
  groupBy: 'day' | 'week' | 'month' = 'day'
): Promise<KPIAggregation[]> {
  const params = new URLSearchParams({ groupBy });
  if (restaurantId) params.append('restaurantId', restaurantId);
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);

  const response = await apiRequest<{ data: KPIAggregation[] }>(`/api/kpi/aggregated?${params}`);
  return response.data;
}
