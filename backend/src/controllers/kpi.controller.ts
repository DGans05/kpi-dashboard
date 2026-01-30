/**
 * KPI Controller
 * HTTP request handlers for KPI entry endpoints
 */

import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import {
  kpiService,
  NotFoundError,
  ForbiddenError,
  ConflictError,
  ValidationError,
} from '../services/kpi.service';
import { logger } from '../config/logger';

/**
 * Zod validation schemas
 */
const createKPIEntrySchema = z.object({
  restaurantId: z.string().uuid('Invalid restaurant ID'),
  entryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  revenue: z.number().min(0, 'Revenue must be non-negative'),
  labourCost: z.number().min(0, 'Labour cost must be non-negative'),
  foodCost: z.number().min(0, 'Food cost must be non-negative'),
  orders: z.number().int().min(0, 'Orders must be a non-negative integer'),
});

const updateKPIEntrySchema = z.object({
  revenue: z.number().min(0, 'Revenue must be non-negative').optional(),
  labourCost: z.number().min(0, 'Labour cost must be non-negative').optional(),
  foodCost: z.number().min(0, 'Food cost must be non-negative').optional(),
  orders: z.number().int().min(0, 'Orders must be a non-negative integer').optional(),
});

/**
 * GET /api/kpi/entries
 * Get all KPI entries with optional filters
 */
export async function getEntries(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { restaurantId, startDate, endDate } = req.query;

    const user = {
      userId: req.user!.userId,
      role: req.user!.role as 'admin' | 'manager' | 'viewer',
      restaurantId: req.user!.restaurantId || null,
    };

    const entries = await kpiService.getEntries(
      {
        restaurantId: restaurantId as string | undefined,
        startDate: startDate as string | undefined,
        endDate: endDate as string | undefined,
      },
      user
    );

    res.status(200).json({ entries });
  } catch (error) {
    handleError(error, res);
  }
}

/**
 * GET /api/kpi/entries/:id
 * Get single KPI entry by ID
 */
export async function getEntryById(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;

    const user = {
      userId: req.user!.userId,
      role: req.user!.role as 'admin' | 'manager' | 'viewer',
      restaurantId: req.user!.restaurantId || null,
    };

    const entry = await kpiService.getEntryById(id, user);
    res.status(200).json({ entry });
  } catch (error) {
    handleError(error, res);
  }
}

/**
 * POST /api/kpi/entries
 * Create new KPI entry
 */
export async function createEntry(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Validate request body
    const validationResult = createKPIEntrySchema.safeParse(req.body);
    if (!validationResult.success) {
      const errors = validationResult.error.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      }));
      res.status(400).json({
        error: 'Validation failed',
        message: 'Invalid request data',
        details: errors,
      });
      return;
    }

    const user = {
      userId: req.user!.userId,
      role: req.user!.role as 'admin' | 'manager' | 'viewer',
      restaurantId: req.user!.restaurantId || null,
    };

    const entry = await kpiService.createEntry(validationResult.data, user);

    logger.info('KPI entry created via API', {
      entryId: entry.id,
      userId: user.userId,
    });

    res.status(201).json({
      message: 'KPI entry created successfully',
      entry,
    });
  } catch (error) {
    handleError(error, res);
  }
}

/**
 * PATCH /api/kpi/entries/:id
 * Update existing KPI entry
 */
export async function updateEntry(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;

    // Validate request body
    const validationResult = updateKPIEntrySchema.safeParse(req.body);
    if (!validationResult.success) {
      const errors = validationResult.error.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      }));
      res.status(400).json({
        error: 'Validation failed',
        message: 'Invalid request data',
        details: errors,
      });
      return;
    }

    const user = {
      userId: req.user!.userId,
      role: req.user!.role as 'admin' | 'manager' | 'viewer',
      restaurantId: req.user!.restaurantId || null,
    };

    const entry = await kpiService.updateEntry(id, validationResult.data, user);

    logger.info('KPI entry updated via API', {
      entryId: id,
      userId: user.userId,
    });

    res.status(200).json({
      message: 'KPI entry updated successfully',
      entry,
    });
  } catch (error) {
    handleError(error, res);
  }
}

/**
 * DELETE /api/kpi/entries/:id
 * Delete KPI entry (admin only)
 */
export async function deleteEntry(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;

    const user = {
      userId: req.user!.userId,
      role: req.user!.role as 'admin' | 'manager' | 'viewer',
      restaurantId: req.user!.restaurantId || null,
    };

    await kpiService.deleteEntry(id, user);

    logger.info('KPI entry deleted via API', {
      entryId: id,
      userId: user.userId,
    });

    res.status(204).send();
  } catch (error) {
    handleError(error, res);
  }
}

/**
 * GET /api/kpi/aggregated
 * Get aggregated KPI data
 */
export async function getAggregatedData(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { restaurantId, startDate, endDate, groupBy } = req.query;

    // Validate required params
    if (!startDate || !endDate) {
      res.status(400).json({
        error: 'Validation failed',
        message: 'startDate and endDate are required',
      });
      return;
    }

    // Validate groupBy
    const validGroupBy = ['day', 'week', 'month'];
    const group = (groupBy as string) || 'day';
    if (!validGroupBy.includes(group)) {
      res.status(400).json({
        error: 'Validation failed',
        message: 'groupBy must be one of: day, week, month',
      });
      return;
    }

    const user = {
      userId: req.user!.userId,
      role: req.user!.role as 'admin' | 'manager' | 'viewer',
      restaurantId: req.user!.restaurantId || null,
    };

    const data = await kpiService.getAggregatedData(
      restaurantId as string | undefined,
      startDate as string,
      endDate as string,
      group as 'day' | 'week' | 'month',
      user
    );

    res.status(200).json({ data });
  } catch (error) {
    handleError(error, res);
  }
}

/**
 * GET /api/kpi/dashboard
 * Get dashboard summary with trends and charts
 */
export async function getDashboardSummary(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { restaurantId, startDate, endDate } = req.query;

    // Validate required params
    if (!startDate || !endDate) {
      res.status(400).json({
        error: 'Validation failed',
        message: 'startDate and endDate are required',
      });
      return;
    }

    const user = {
      userId: req.user!.userId,
      role: req.user!.role as 'admin' | 'manager' | 'viewer',
      restaurantId: req.user!.restaurantId || null,
    };

    const summary = await kpiService.getDashboardSummary(
      restaurantId as string | undefined,
      startDate as string,
      endDate as string,
      user
    );

    res.status(200).json({ summary });
  } catch (error) {
    handleError(error, res);
  }
}

/**
 * Error handler helper
 */
function handleError(error: unknown, res: Response): void {
  if (error instanceof NotFoundError) {
    res.status(404).json({
      error: 'Not found',
      message: error.message,
    });
    return;
  }

  if (error instanceof ForbiddenError) {
    res.status(403).json({
      error: 'Forbidden',
      message: error.message,
    });
    return;
  }

  if (error instanceof ConflictError) {
    res.status(409).json({
      error: 'Conflict',
      message: error.message,
    });
    return;
  }

  if (error instanceof ValidationError) {
    res.status(400).json({
      error: 'Validation failed',
      message: error.message,
    });
    return;
  }

  // Log unexpected errors
  const message = error instanceof Error ? error.message : String(error);
  logger.error('Unhandled error in KPI controller', { error: message });

  res.status(500).json({
    error: 'Internal server error',
    message: 'An unexpected error occurred',
  });
}
