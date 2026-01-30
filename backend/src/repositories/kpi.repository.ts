/**
 * KPI Repository
 * Database layer for KPI entry operations
 */

import { query } from '../config/database';
import { logger } from '../config/logger';
import type {
  KPIEntry,
  CreateKPIEntryDTO,
  UpdateKPIEntryDTO,
  RawKPIEntry,
  KPIEntryFilters,
} from '../types/kpi.types';

/**
 * Map raw database row to KPIEntry
 */
function mapToKPIEntry(row: RawKPIEntry): KPIEntry {
  const entry: KPIEntry = {
    id: row.id,
    restaurantId: row.restaurant_id,
    entryDate: row.entry_date,
    revenue: parseFloat(row.revenue),
    labourCost: parseFloat(row.labour_cost),
    labourCostPercent: parseFloat(row.labour_cost_percent),
    foodCost: parseFloat(row.food_cost),
    foodCostPercent: parseFloat(row.food_cost_percent),
    orders: row.orders,
    avgTicket: parseFloat(row.avg_ticket),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };

  if (row.restaurant_name) {
    entry.restaurant = {
      id: row.restaurant_id,
      name: row.restaurant_name,
      city: row.restaurant_city || '',
    };
  }

  return entry;
}

/**
 * Find KPI entries by restaurant and optional date range
 */
export async function findByRestaurantAndDateRange(
  filters: KPIEntryFilters
): Promise<KPIEntry[]> {
  const { restaurantId, startDate, endDate } = filters;
  const params: (string | undefined)[] = [];
  const conditions: string[] = [];

  let paramIndex = 1;

  if (restaurantId) {
    conditions.push(`k.restaurant_id = $${paramIndex}`);
    params.push(restaurantId);
    paramIndex++;
  }

  if (startDate) {
    conditions.push(`k.entry_date >= $${paramIndex}`);
    params.push(startDate);
    paramIndex++;
  }

  if (endDate) {
    conditions.push(`k.entry_date <= $${paramIndex}`);
    params.push(endDate);
    paramIndex++;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const sql = `
    SELECT
      k.id,
      k.restaurant_id,
      k.entry_date::text,
      k.revenue,
      k.labour_cost,
      k.labour_cost_percent,
      k.food_cost,
      k.food_cost_percent,
      k.orders,
      k.avg_ticket,
      k.created_at,
      r.name as restaurant_name,
      r.city as restaurant_city
    FROM kpi_entries k
    LEFT JOIN restaurants r ON k.restaurant_id = r.id
    ${whereClause}
    ORDER BY k.entry_date DESC
  `;

  try {
    const result = await query(sql, params);
    return result.rows.map(mapToKPIEntry);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error('Repository: findByRestaurantAndDateRange failed', { error: message, filters });
    throw error;
  }
}

/**
 * Find KPI entry by ID
 */
export async function findById(id: string): Promise<KPIEntry | null> {
  const sql = `
    SELECT
      k.id,
      k.restaurant_id,
      k.entry_date::text,
      k.revenue,
      k.labour_cost,
      k.labour_cost_percent,
      k.food_cost,
      k.food_cost_percent,
      k.orders,
      k.avg_ticket,
      k.created_at,
      r.name as restaurant_name,
      r.city as restaurant_city
    FROM kpi_entries k
    LEFT JOIN restaurants r ON k.restaurant_id = r.id
    WHERE k.id = $1
  `;

  try {
    const result = await query(sql, [id]);
    if (result.rows.length === 0) {
      return null;
    }
    return mapToKPIEntry(result.rows[0]);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error('Repository: findById failed', { error: message, id });
    throw error;
  }
}

/**
 * Find KPI entry by restaurant and date (for duplicate check)
 */
export async function findByRestaurantAndDate(
  restaurantId: string,
  entryDate: string
): Promise<KPIEntry | null> {
  const sql = `
    SELECT
      k.id,
      k.restaurant_id,
      k.entry_date::text,
      k.revenue,
      k.labour_cost,
      k.labour_cost_percent,
      k.food_cost,
      k.food_cost_percent,
      k.orders,
      k.avg_ticket,
      k.created_at,
      r.name as restaurant_name,
      r.city as restaurant_city
    FROM kpi_entries k
    LEFT JOIN restaurants r ON k.restaurant_id = r.id
    WHERE k.restaurant_id = $1 AND k.entry_date = $2
  `;

  try {
    const result = await query(sql, [restaurantId, entryDate]);
    if (result.rows.length === 0) {
      return null;
    }
    return mapToKPIEntry(result.rows[0]);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error('Repository: findByRestaurantAndDate failed', { error: message, restaurantId, entryDate });
    throw error;
  }
}

/**
 * Create new KPI entry
 */
export async function create(data: CreateKPIEntryDTO): Promise<KPIEntry> {
  // Calculate derived fields
  const labourCostPercent = data.revenue > 0 ? (data.labourCost / data.revenue) * 100 : 0;
  const foodCostPercent = data.revenue > 0 ? (data.foodCost / data.revenue) * 100 : 0;
  const avgTicket = data.orders > 0 ? data.revenue / data.orders : 0;

  const sql = `
    INSERT INTO kpi_entries (
      restaurant_id,
      entry_date,
      revenue,
      labour_cost,
      labour_cost_percent,
      food_cost,
      food_cost_percent,
      orders,
      avg_ticket
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING
      id,
      restaurant_id,
      entry_date::text,
      revenue,
      labour_cost,
      labour_cost_percent,
      food_cost,
      food_cost_percent,
      orders,
      avg_ticket,
      created_at
  `;

  const params = [
    data.restaurantId,
    data.entryDate,
    data.revenue,
    data.labourCost,
    labourCostPercent.toFixed(2),
    data.foodCost,
    foodCostPercent.toFixed(2),
    data.orders,
    avgTicket.toFixed(2),
  ];

  try {
    const result = await query(sql, params);
    const row = result.rows[0];

    // Fetch with restaurant info
    return findById(row.id) as Promise<KPIEntry>;
  } catch (error: unknown) {
    const pgError = error as { code?: string; constraint?: string };
    if (pgError.code === '23505') {
      // Unique constraint violation
      throw new Error('DUPLICATE_ENTRY');
    }
    const message = error instanceof Error ? error.message : String(error);
    logger.error('Repository: create failed', { error: message, data });
    throw error;
  }
}

/**
 * Update existing KPI entry
 */
export async function update(id: string, data: UpdateKPIEntryDTO): Promise<KPIEntry> {
  // First get existing entry to calculate new percentages
  const existing = await findById(id);
  if (!existing) {
    throw new Error('NOT_FOUND');
  }

  // Merge with existing data
  const revenue = data.revenue ?? existing.revenue;
  const labourCost = data.labourCost ?? existing.labourCost;
  const foodCost = data.foodCost ?? existing.foodCost;
  const orders = data.orders ?? existing.orders;

  // Recalculate derived fields
  const labourCostPercent = revenue > 0 ? (labourCost / revenue) * 100 : 0;
  const foodCostPercent = revenue > 0 ? (foodCost / revenue) * 100 : 0;
  const avgTicket = orders > 0 ? revenue / orders : 0;

  const sql = `
    UPDATE kpi_entries
    SET
      revenue = $1,
      labour_cost = $2,
      labour_cost_percent = $3,
      food_cost = $4,
      food_cost_percent = $5,
      orders = $6,
      avg_ticket = $7
    WHERE id = $8
    RETURNING
      id,
      restaurant_id,
      entry_date::text,
      revenue,
      labour_cost,
      labour_cost_percent,
      food_cost,
      food_cost_percent,
      orders,
      avg_ticket,
      created_at
  `;

  const params = [
    revenue,
    labourCost,
    labourCostPercent.toFixed(2),
    foodCost,
    foodCostPercent.toFixed(2),
    orders,
    avgTicket.toFixed(2),
    id,
  ];

  try {
    const result = await query(sql, params);
    if (result.rows.length === 0) {
      throw new Error('NOT_FOUND');
    }

    // Fetch with restaurant info
    return findById(id) as Promise<KPIEntry>;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error('Repository: update failed', { error: message, id, data });
    throw error;
  }
}

/**
 * Delete KPI entry by ID
 */
export async function deleteById(id: string): Promise<void> {
  const sql = `DELETE FROM kpi_entries WHERE id = $1`;

  try {
    const result = await query(sql, [id]);
    if (result.rowCount === 0) {
      throw new Error('NOT_FOUND');
    }
    logger.info('KPI entry deleted', { id });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error('Repository: deleteById failed', { error: message, id });
    throw error;
  }
}

/**
 * Get aggregated KPI data grouped by period
 */
export async function getAggregatedData(
  restaurantId: string,
  startDate: string,
  endDate: string,
  groupBy: 'day' | 'week' | 'month' = 'day'
): Promise<Array<{
  period: string;
  restaurantId: string;
  restaurantName: string;
  totalRevenue: number;
  totalLabourCost: number;
  totalFoodCost: number;
  totalOrders: number;
  avgTicket: number;
}>> {
  let groupExpression: string;
  switch (groupBy) {
    case 'week':
      groupExpression = "date_trunc('week', k.entry_date)::date::text";
      break;
    case 'month':
      groupExpression = "date_trunc('month', k.entry_date)::date::text";
      break;
    default:
      groupExpression = 'k.entry_date::text';
  }

  const sql = `
    SELECT
      ${groupExpression} as period,
      k.restaurant_id,
      r.name as restaurant_name,
      SUM(k.revenue)::numeric as total_revenue,
      SUM(k.labour_cost)::numeric as total_labour_cost,
      SUM(k.food_cost)::numeric as total_food_cost,
      SUM(k.orders)::integer as total_orders,
      CASE WHEN SUM(k.orders) > 0 
        THEN (SUM(k.revenue) / SUM(k.orders))::numeric 
        ELSE 0 
      END as avg_ticket
    FROM kpi_entries k
    LEFT JOIN restaurants r ON k.restaurant_id = r.id
    WHERE k.restaurant_id = $1
      AND k.entry_date >= $2
      AND k.entry_date <= $3
    GROUP BY ${groupExpression}, k.restaurant_id, r.name
    ORDER BY period DESC
  `;

  try {
    const result = await query(sql, [restaurantId, startDate, endDate]);
    return result.rows.map((row) => ({
      period: row.period,
      restaurantId: row.restaurant_id,
      restaurantName: row.restaurant_name || 'Unknown',
      totalRevenue: parseFloat(row.total_revenue) || 0,
      totalLabourCost: parseFloat(row.total_labour_cost) || 0,
      totalFoodCost: parseFloat(row.total_food_cost) || 0,
      totalOrders: parseInt(row.total_orders) || 0,
      avgTicket: parseFloat(row.avg_ticket) || 0,
    }));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error('Repository: getAggregatedData failed', { error: message, restaurantId, startDate, endDate, groupBy });
    throw error;
  }
}

/**
 * Get KPI targets for a restaurant
 */
export async function getTargets(restaurantId: string): Promise<{
  labourCostTarget: number;
  labourCostWarning: number;
  labourCostCritical: number;
  foodCostTarget: number;
  foodCostWarning: number;
  foodCostCritical: number;
}> {
  const sql = `
    SELECT metric, target, warning, critical
    FROM kpi_targets
    WHERE restaurant_id = $1
  `;

  try {
    const result = await query(sql, [restaurantId]);
    
    // Default targets
    const targets = {
      labourCostTarget: 25,
      labourCostWarning: 28,
      labourCostCritical: 30,
      foodCostTarget: 32,
      foodCostWarning: 35,
      foodCostCritical: 38,
    };

    for (const row of result.rows) {
      if (row.metric === 'labour_cost_percent') {
        targets.labourCostTarget = parseFloat(row.target);
        targets.labourCostWarning = parseFloat(row.warning);
        targets.labourCostCritical = parseFloat(row.critical);
      } else if (row.metric === 'food_cost_percent') {
        targets.foodCostTarget = parseFloat(row.target);
        targets.foodCostWarning = parseFloat(row.warning);
        targets.foodCostCritical = parseFloat(row.critical);
      }
    }

    return targets;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error('Repository: getTargets failed', { error: message, restaurantId });
    // Return defaults on error
    return {
      labourCostTarget: 25,
      labourCostWarning: 28,
      labourCostCritical: 30,
      foodCostTarget: 32,
      foodCostWarning: 35,
      foodCostCritical: 38,
    };
  }
}

/**
 * Get daily chart data for a date range
 */
export async function getChartData(
  restaurantId: string,
  startDate: string,
  endDate: string
): Promise<Array<{
  date: string;
  revenue: number;
  labourCost: number;
  foodCost: number;
  orders: number;
  labourCostPercent: number;
  foodCostPercent: number;
}>> {
  const sql = `
    SELECT
      k.entry_date::text as date,
      k.revenue,
      k.labour_cost,
      k.food_cost,
      k.orders,
      k.labour_cost_percent,
      k.food_cost_percent
    FROM kpi_entries k
    WHERE k.restaurant_id = $1
      AND k.entry_date >= $2
      AND k.entry_date <= $3
    ORDER BY k.entry_date ASC
  `;

  try {
    const result = await query(sql, [restaurantId, startDate, endDate]);
    return result.rows.map((row) => ({
      date: row.date,
      revenue: parseFloat(row.revenue) || 0,
      labourCost: parseFloat(row.labour_cost) || 0,
      foodCost: parseFloat(row.food_cost) || 0,
      orders: parseInt(row.orders) || 0,
      labourCostPercent: parseFloat(row.labour_cost_percent) || 0,
      foodCostPercent: parseFloat(row.food_cost_percent) || 0,
    }));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error('Repository: getChartData failed', { error: message, restaurantId, startDate, endDate });
    throw error;
  }
}

/**
 * Get period totals for summary calculation
 */
export async function getPeriodTotals(
  restaurantId: string,
  startDate: string,
  endDate: string
): Promise<{
  totalRevenue: number;
  totalLabourCost: number;
  totalFoodCost: number;
  totalOrders: number;
  avgTicket: number;
  labourCostPercent: number;
  foodCostPercent: number;
} | null> {
  const sql = `
    SELECT
      SUM(k.revenue)::numeric as total_revenue,
      SUM(k.labour_cost)::numeric as total_labour_cost,
      SUM(k.food_cost)::numeric as total_food_cost,
      SUM(k.orders)::integer as total_orders,
      CASE WHEN SUM(k.orders) > 0 
        THEN (SUM(k.revenue) / SUM(k.orders))::numeric 
        ELSE 0 
      END as avg_ticket,
      CASE WHEN SUM(k.revenue) > 0 
        THEN (SUM(k.labour_cost) / SUM(k.revenue) * 100)::numeric 
        ELSE 0 
      END as labour_cost_percent,
      CASE WHEN SUM(k.revenue) > 0 
        THEN (SUM(k.food_cost) / SUM(k.revenue) * 100)::numeric 
        ELSE 0 
      END as food_cost_percent
    FROM kpi_entries k
    WHERE k.restaurant_id = $1
      AND k.entry_date >= $2
      AND k.entry_date <= $3
  `;

  try {
    const result = await query(sql, [restaurantId, startDate, endDate]);
    const row = result.rows[0];
    
    if (!row || row.total_revenue === null) {
      return null;
    }

    return {
      totalRevenue: parseFloat(row.total_revenue) || 0,
      totalLabourCost: parseFloat(row.total_labour_cost) || 0,
      totalFoodCost: parseFloat(row.total_food_cost) || 0,
      totalOrders: parseInt(row.total_orders) || 0,
      avgTicket: parseFloat(row.avg_ticket) || 0,
      labourCostPercent: parseFloat(row.labour_cost_percent) || 0,
      foodCostPercent: parseFloat(row.food_cost_percent) || 0,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error('Repository: getPeriodTotals failed', { error: message, restaurantId, startDate, endDate });
    throw error;
  }
}

/**
 * Get restaurant info
 */
export async function getRestaurantInfo(restaurantId: string): Promise<{ id: string; name: string; city: string } | null> {
  const sql = `SELECT id, name, city FROM restaurants WHERE id = $1`;
  
  try {
    const result = await query(sql, [restaurantId]);
    if (result.rows.length === 0) {
      return null;
    }
    return result.rows[0];
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error('Repository: getRestaurantInfo failed', { error: message, restaurantId });
    return null;
  }
}

export const kpiRepository = {
  findByRestaurantAndDateRange,
  findById,
  findByRestaurantAndDate,
  create,
  update,
  deleteById,
  getAggregatedData,
  getTargets,
  getChartData,
  getPeriodTotals,
  getRestaurantInfo,
};
