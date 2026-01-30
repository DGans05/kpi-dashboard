/**
 * KPI Entry Types
 * TypeScript interfaces for KPI entry management
 */

export interface Restaurant {
  id: string;
  name: string;
  city: string;
}

export interface KPIEntry {
  id: string;
  restaurantId: string;
  entryDate: string; // YYYY-MM-DD format
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

export interface KPIEntryFilters {
  restaurantId?: string;
  startDate?: string;
  endDate?: string;
}

/**
 * Raw database row type (snake_case)
 */
export interface RawKPIEntry {
  id: string;
  restaurant_id: string;
  entry_date: string;
  revenue: string; // numeric comes as string from pg
  labour_cost: string;
  labour_cost_percent: string;
  food_cost: string;
  food_cost_percent: string;
  orders: number;
  avg_ticket: string;
  created_at: string;
  updated_at?: string;
  restaurant_name?: string;
  restaurant_city?: string;
}

/**
 * Aggregated KPI data for dashboard
 */
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
 * Dashboard summary with trends and alerts
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

/**
 * Raw aggregation row from database
 */
export interface RawAggregation {
  period: string;
  restaurant_id: string;
  restaurant_name: string;
  total_revenue: string;
  total_labour_cost: string;
  total_food_cost: string;
  total_orders: string;
  avg_ticket: string;
}

export type GroupBy = 'day' | 'week' | 'month';
