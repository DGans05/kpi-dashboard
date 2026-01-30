/**
 * KPI Service
 * Business logic for KPI entry management
 */

import { kpiRepository } from '../repositories/kpi.repository';
import { logger } from '../config/logger';
import type {
  KPIEntry,
  CreateKPIEntryDTO,
  UpdateKPIEntryDTO,
  KPIEntryFilters,
  KPIAggregation,
  DashboardSummary,
  GroupBy,
} from '../types/kpi.types';

/**
 * Custom error classes
 */
export class NotFoundError extends Error {
  constructor(message = 'Resource not found') {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class ForbiddenError extends Error {
  constructor(message = 'Access denied') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

export class ConflictError extends Error {
  constructor(message = 'Resource already exists') {
    super(message);
    this.name = 'ConflictError';
  }
}

export class ValidationError extends Error {
  constructor(message = 'Validation failed') {
    super(message);
    this.name = 'ValidationError';
  }
}

interface UserContext {
  userId: string;
  role: 'admin' | 'manager' | 'viewer';
  restaurantId: string | null;
}

/**
 * Get KPI entries with authorization
 */
export async function getEntries(
  filters: KPIEntryFilters,
  user: UserContext
): Promise<KPIEntry[]> {
  // Managers can only see their own restaurant's entries
  if (user.role === 'manager' && user.restaurantId) {
    filters.restaurantId = user.restaurantId;
  }

  // Validate date format if provided
  if (filters.startDate && !isValidDate(filters.startDate)) {
    throw new ValidationError('Invalid startDate format. Use YYYY-MM-DD.');
  }
  if (filters.endDate && !isValidDate(filters.endDate)) {
    throw new ValidationError('Invalid endDate format. Use YYYY-MM-DD.');
  }

  logger.debug('Fetching KPI entries', { filters, userId: user.userId });
  return kpiRepository.findByRestaurantAndDateRange(filters);
}

/**
 * Get single KPI entry by ID with authorization
 */
export async function getEntryById(
  id: string,
  user: UserContext
): Promise<KPIEntry> {
  const entry = await kpiRepository.findById(id);

  if (!entry) {
    throw new NotFoundError('KPI entry not found');
  }

  // Check authorization
  if (user.role === 'manager' && entry.restaurantId !== user.restaurantId) {
    throw new ForbiddenError('You do not have access to this entry');
  }

  return entry;
}

/**
 * Create new KPI entry
 */
export async function createEntry(
  data: CreateKPIEntryDTO,
  user: UserContext
): Promise<KPIEntry> {
  // Managers can only create entries for their restaurant
  if (user.role === 'manager') {
    if (!user.restaurantId) {
      throw new ForbiddenError('No restaurant assigned to your account');
    }
    if (data.restaurantId !== user.restaurantId) {
      throw new ForbiddenError('You can only create entries for your own restaurant');
    }
  }

  // Validate numeric fields
  validateNumericFields(data);

  // Validate date is not in the future
  if (isFutureDate(data.entryDate)) {
    throw new ValidationError('Entry date cannot be in the future');
  }

  // Check for duplicate entry
  const existing = await kpiRepository.findByRestaurantAndDate(
    data.restaurantId,
    data.entryDate
  );
  if (existing) {
    throw new ConflictError('Entry already exists for this restaurant and date');
  }

  try {
    const entry = await kpiRepository.create(data);
    logger.info('KPI entry created', {
      entryId: entry.id,
      restaurantId: entry.restaurantId,
      entryDate: entry.entryDate,
      userId: user.userId,
    });
    return entry;
  } catch (error) {
    if (error instanceof Error && error.message === 'DUPLICATE_ENTRY') {
      throw new ConflictError('Entry already exists for this restaurant and date');
    }
    throw error;
  }
}

/**
 * Update existing KPI entry
 */
export async function updateEntry(
  id: string,
  data: UpdateKPIEntryDTO,
  user: UserContext
): Promise<KPIEntry> {
  // Fetch existing entry
  const existing = await kpiRepository.findById(id);
  if (!existing) {
    throw new NotFoundError('KPI entry not found');
  }

  // Check authorization
  if (user.role === 'manager' && existing.restaurantId !== user.restaurantId) {
    throw new ForbiddenError('You do not have access to this entry');
  }

  // Validate numeric fields
  validateNumericFields(data);

  try {
    const entry = await kpiRepository.update(id, data);
    logger.info('KPI entry updated', {
      entryId: id,
      userId: user.userId,
      changes: Object.keys(data),
    });
    return entry;
  } catch (error) {
    if (error instanceof Error && error.message === 'NOT_FOUND') {
      throw new NotFoundError('KPI entry not found');
    }
    throw error;
  }
}

/**
 * Delete KPI entry (admin only)
 */
export async function deleteEntry(
  id: string,
  user: UserContext
): Promise<void> {
  // Only admins can delete entries
  if (user.role !== 'admin') {
    throw new ForbiddenError('Only administrators can delete KPI entries');
  }

  // Verify entry exists
  const existing = await kpiRepository.findById(id);
  if (!existing) {
    throw new NotFoundError('KPI entry not found');
  }

  try {
    await kpiRepository.deleteById(id);
    logger.info('KPI entry deleted', {
      entryId: id,
      restaurantId: existing.restaurantId,
      userId: user.userId,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'NOT_FOUND') {
      throw new NotFoundError('KPI entry not found');
    }
    throw error;
  }
}

/**
 * Helper: Validate date format (YYYY-MM-DD)
 */
function isValidDate(dateStr: string): boolean {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateStr)) return false;
  const date = new Date(dateStr);
  return !isNaN(date.getTime());
}

/**
 * Helper: Check if date is in the future
 */
function isFutureDate(dateStr: string): boolean {
  const date = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date > today;
}

/**
 * Helper: Validate numeric fields are >= 0
 */
function validateNumericFields(data: Partial<CreateKPIEntryDTO>): void {
  const numericFields: (keyof CreateKPIEntryDTO)[] = [
    'revenue',
    'labourCost',
    'foodCost',
    'orders',
  ];

  for (const field of numericFields) {
    const value = data[field];
    if (value !== undefined && (typeof value !== 'number' || value < 0)) {
      throw new ValidationError(`${field} must be a non-negative number`);
    }
  }
}

/**
 * Get aggregated KPI data for dashboard
 */
export async function getAggregatedData(
  restaurantId: string | undefined,
  startDate: string,
  endDate: string,
  groupBy: GroupBy,
  user: UserContext
): Promise<KPIAggregation[]> {
  // Managers can only see their own restaurant
  let effectiveRestaurantId = restaurantId;
  if (user.role === 'manager') {
    if (!user.restaurantId) {
      throw new ForbiddenError('No restaurant assigned to your account');
    }
    effectiveRestaurantId = user.restaurantId;
  }

  if (!effectiveRestaurantId) {
    throw new ValidationError('Restaurant ID is required');
  }

  // Validate dates
  if (!isValidDate(startDate)) {
    throw new ValidationError('Invalid startDate format. Use YYYY-MM-DD.');
  }
  if (!isValidDate(endDate)) {
    throw new ValidationError('Invalid endDate format. Use YYYY-MM-DD.');
  }

  const rawData = await kpiRepository.getAggregatedData(
    effectiveRestaurantId,
    startDate,
    endDate,
    groupBy
  );

  const targets = await kpiRepository.getTargets(effectiveRestaurantId);

  // Calculate percentages, status, and trends
  const result: KPIAggregation[] = [];
  for (let i = 0; i < rawData.length; i++) {
    const current = rawData[i];
    const previous = rawData[i + 1]; // Previous period (sorted DESC)

    const labourCostPercent = current.totalRevenue > 0
      ? (current.totalLabourCost / current.totalRevenue) * 100
      : 0;
    const foodCostPercent = current.totalRevenue > 0
      ? (current.totalFoodCost / current.totalRevenue) * 100
      : 0;

    // Calculate trends
    const labourCostTrend = previous
      ? calculateTrend(labourCostPercent, previous.totalRevenue > 0 ? (previous.totalLabourCost / previous.totalRevenue) * 100 : 0)
      : 0;
    const foodCostTrend = previous
      ? calculateTrend(foodCostPercent, previous.totalRevenue > 0 ? (previous.totalFoodCost / previous.totalRevenue) * 100 : 0)
      : 0;
    const revenueTrend = previous
      ? calculateTrend(current.totalRevenue, previous.totalRevenue)
      : 0;

    result.push({
      period: current.period,
      restaurantId: current.restaurantId,
      restaurantName: current.restaurantName,
      totalRevenue: current.totalRevenue,
      totalLabourCost: current.totalLabourCost,
      totalFoodCost: current.totalFoodCost,
      totalOrders: current.totalOrders,
      avgTicket: current.avgTicket,
      labourCostPercent,
      foodCostPercent,
      labourCostTarget: targets.labourCostTarget,
      foodCostTarget: targets.foodCostTarget,
      labourCostStatus: getStatus(labourCostPercent, targets.labourCostTarget, targets.labourCostWarning, targets.labourCostCritical),
      foodCostStatus: getStatus(foodCostPercent, targets.foodCostTarget, targets.foodCostWarning, targets.foodCostCritical),
      labourCostTrend,
      foodCostTrend,
      revenueTrend,
    });
  }

  return result;
}

/**
 * Get dashboard summary with trends and charts
 */
export async function getDashboardSummary(
  restaurantId: string | undefined,
  startDate: string,
  endDate: string,
  user: UserContext
): Promise<DashboardSummary> {
  // Managers can only see their own restaurant
  let effectiveRestaurantId = restaurantId;
  if (user.role === 'manager') {
    if (!user.restaurantId) {
      throw new ForbiddenError('No restaurant assigned to your account');
    }
    effectiveRestaurantId = user.restaurantId;
  }

  if (!effectiveRestaurantId) {
    throw new ValidationError('Restaurant ID is required');
  }

  // Validate dates
  if (!isValidDate(startDate)) {
    throw new ValidationError('Invalid startDate format. Use YYYY-MM-DD.');
  }
  if (!isValidDate(endDate)) {
    throw new ValidationError('Invalid endDate format. Use YYYY-MM-DD.');
  }

  // Get restaurant info
  const restaurant = await kpiRepository.getRestaurantInfo(effectiveRestaurantId);
  const restaurantName = restaurant?.name || 'Unknown Restaurant';

  // Get current period totals
  const currentTotals = await kpiRepository.getPeriodTotals(effectiveRestaurantId, startDate, endDate);

  // Calculate previous period dates
  const start = new Date(startDate);
  const end = new Date(endDate);
  const periodMs = end.getTime() - start.getTime();
  const prevEnd = new Date(start.getTime() - 1);
  const prevStart = new Date(prevEnd.getTime() - periodMs);
  const prevStartStr = prevStart.toISOString().split('T')[0];
  const prevEndStr = prevEnd.toISOString().split('T')[0];

  // Get previous period totals
  const prevTotals = await kpiRepository.getPeriodTotals(effectiveRestaurantId, prevStartStr, prevEndStr);

  // Get targets
  const targets = await kpiRepository.getTargets(effectiveRestaurantId);

  // Get chart data
  const chartData = await kpiRepository.getChartData(effectiveRestaurantId, startDate, endDate);

  // Default current values
  const current = {
    totalRevenue: currentTotals?.totalRevenue || 0,
    totalOrders: currentTotals?.totalOrders || 0,
    avgTicket: currentTotals?.avgTicket || 0,
    labourCostPercent: currentTotals?.labourCostPercent || 0,
    foodCostPercent: currentTotals?.foodCostPercent || 0,
  };

  // Calculate trends
  const trends = {
    revenue: prevTotals ? calculateTrend(current.totalRevenue, prevTotals.totalRevenue) : 0,
    orders: prevTotals ? calculateTrend(current.totalOrders, prevTotals.totalOrders) : 0,
    labourCost: prevTotals ? calculateTrend(current.labourCostPercent, prevTotals.labourCostPercent) : 0,
    foodCost: prevTotals ? calculateTrend(current.foodCostPercent, prevTotals.foodCostPercent) : 0,
  };

  // Determine alert status
  const alerts = {
    labourCost: getStatus(current.labourCostPercent, targets.labourCostTarget, targets.labourCostWarning, targets.labourCostCritical),
    foodCost: getStatus(current.foodCostPercent, targets.foodCostTarget, targets.foodCostWarning, targets.foodCostCritical),
  };

  return {
    restaurantId: effectiveRestaurantId,
    restaurantName,
    dateRange: { startDate, endDate },
    current,
    trends,
    alerts,
    targets: {
      labourCost: targets.labourCostTarget,
      foodCost: targets.foodCostTarget,
    },
    chartData,
  };
}

/**
 * Helper: Calculate percentage trend
 */
function calculateTrend(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

/**
 * Helper: Determine status based on thresholds
 */
function getStatus(
  value: number,
  target: number,
  warning: number,
  critical: number
): 'good' | 'warning' | 'critical' {
  if (value >= critical) return 'critical';
  if (value >= warning) return 'warning';
  return 'good';
}

export const kpiService = {
  getEntries,
  getEntryById,
  createEntry,
  updateEntry,
  deleteEntry,
  getAggregatedData,
  getDashboardSummary,
  NotFoundError,
  ForbiddenError,
  ConflictError,
  ValidationError,
};
