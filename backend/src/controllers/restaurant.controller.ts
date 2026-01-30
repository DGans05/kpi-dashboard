/**
 * Restaurant Controller
 * HTTP handlers for restaurant management
 */

import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import {
  restaurantService,
  NotFoundError,
  ConflictError,
} from '../services/restaurant.service';
import { logAudit } from '../repositories/audit.repository';
import { logger } from '../config/logger';

/**
 * Validation schemas
 */
const createRestaurantSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  city: z.string().max(100).optional(),
  timezone: z.string().max(50).optional(),
});

const updateRestaurantSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  city: z.string().max(100).optional(),
  timezone: z.string().max(50).optional(),
  isActive: z.boolean().optional(),
});

/**
 * GET /api/restaurants
 * Get all restaurants
 */
export async function getAllRestaurants(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const restaurants = await restaurantService.getAllRestaurants();
    res.status(200).json({ restaurants });
  } catch (error) {
    handleError(error, res);
  }
}

/**
 * GET /api/restaurants/:id
 * Get restaurant by ID
 */
export async function getRestaurantById(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;

    // For managers, only allow viewing their own restaurant
    if (req.user!.role === 'manager' && req.user!.restaurantId !== id) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'You can only view your own restaurant',
      });
      return;
    }

    const restaurant = await restaurantService.getRestaurantById(id);
    res.status(200).json({ restaurant });
  } catch (error) {
    handleError(error, res);
  }
}

/**
 * POST /api/restaurants
 * Create new restaurant (admin only)
 */
export async function createRestaurant(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Validate request body
    const validationResult = createRestaurantSchema.safeParse(req.body);
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

    const restaurant = await restaurantService.createRestaurant(validationResult.data);

    // Log audit
    await logAudit(
      req.user!.userId,
      'CREATE',
      'restaurant',
      restaurant.id,
      { created: { name: restaurant.name, city: restaurant.city } },
      req
    );

    logger.info('Restaurant created via API', { restaurantId: restaurant.id, adminId: req.user!.userId });

    res.status(201).json({
      message: 'Restaurant created successfully',
      restaurant,
    });
  } catch (error) {
    handleError(error, res);
  }
}

/**
 * PATCH /api/restaurants/:id
 * Update restaurant (admin only)
 */
export async function updateRestaurant(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;

    // Validate request body
    const validationResult = updateRestaurantSchema.safeParse(req.body);
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

    // Get old values for audit
    const oldRestaurant = await restaurantService.getRestaurantById(id);

    const restaurant = await restaurantService.updateRestaurant(id, validationResult.data);

    // Log audit
    await logAudit(
      req.user!.userId,
      'UPDATE',
      'restaurant',
      id,
      { before: oldRestaurant, after: restaurant, changes: validationResult.data },
      req
    );

    logger.info('Restaurant updated via API', { restaurantId: id, adminId: req.user!.userId });

    res.status(200).json({
      message: 'Restaurant updated successfully',
      restaurant,
    });
  } catch (error) {
    handleError(error, res);
  }
}

/**
 * DELETE /api/restaurants/:id
 * Delete restaurant (admin only)
 */
export async function deleteRestaurant(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;

    // Get restaurant info before deletion for audit
    const restaurant = await restaurantService.getRestaurantById(id);

    await restaurantService.deleteRestaurant(id);

    // Log audit
    await logAudit(
      req.user!.userId,
      'DELETE',
      'restaurant',
      id,
      { deleted: { name: restaurant.name } },
      req
    );

    logger.info('Restaurant deleted via API', { restaurantId: id, adminId: req.user!.userId });

    res.status(204).send();
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

  if (error instanceof ConflictError) {
    res.status(409).json({
      error: 'Conflict',
      message: error.message,
    });
    return;
  }

  // Log unexpected errors
  const message = error instanceof Error ? error.message : String(error);
  logger.error('Unhandled error in restaurant controller', { error: message });

  res.status(500).json({
    error: 'Internal server error',
    message: 'An unexpected error occurred',
  });
}
