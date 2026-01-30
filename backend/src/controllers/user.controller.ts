/**
 * User Controller
 * HTTP handlers for user management
 */

import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import {
  userService,
  NotFoundError,
  ConflictError,
  ForbiddenError,
  ValidationError,
} from '../services/user.service';
import { logAudit } from '../repositories/audit.repository';
import { logger } from '../config/logger';

/**
 * Validation schemas
 */
const createUserSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  fullName: z.string().min(1).optional(),
  role: z.enum(['admin', 'manager', 'viewer']),
  restaurantId: z.string().uuid().nullable().optional(),
});

const updateUserSchema = z.object({
  fullName: z.string().min(1).optional(),
  role: z.enum(['admin', 'manager', 'viewer']).optional(),
  restaurantId: z.string().uuid().nullable().optional(),
  isActive: z.boolean().optional(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
});

/**
 * GET /api/users
 * Get all users (admin only)
 */
export async function getAllUsers(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const users = await userService.getAllUsers();
    res.status(200).json({ users });
  } catch (error) {
    handleError(error, res);
  }
}

/**
 * GET /api/users/:id
 * Get user by ID (admin only)
 */
export async function getUserById(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const user = await userService.getUserById(id);
    res.status(200).json({ user });
  } catch (error) {
    handleError(error, res);
  }
}

/**
 * POST /api/users
 * Create new user (admin only)
 */
export async function createUser(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Validate request body
    const validationResult = createUserSchema.safeParse(req.body);
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

    const user = await userService.createUser(validationResult.data);

    // Log audit
    await logAudit(
      req.user!.userId,
      'CREATE',
      'user',
      user.id,
      { created: { email: user.email, role: user.role } },
      req
    );

    logger.info('User created via API', { userId: user.id, adminId: req.user!.userId });

    res.status(201).json({
      message: 'User created successfully',
      user,
    });
  } catch (error) {
    handleError(error, res);
  }
}

/**
 * PATCH /api/users/:id
 * Update user (admin only)
 */
export async function updateUser(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;

    // Validate request body
    const validationResult = updateUserSchema.safeParse(req.body);
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
    const oldUser = await userService.getUserById(id);

    const user = await userService.updateUser(id, validationResult.data);

    // Log audit
    await logAudit(
      req.user!.userId,
      'UPDATE',
      'user',
      id,
      { before: oldUser, after: user, changes: validationResult.data },
      req
    );

    logger.info('User updated via API', { userId: id, adminId: req.user!.userId });

    res.status(200).json({
      message: 'User updated successfully',
      user,
    });
  } catch (error) {
    handleError(error, res);
  }
}

/**
 * DELETE /api/users/:id
 * Delete user (admin only)
 */
export async function deleteUser(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;

    // Get user info before deletion for audit
    const user = await userService.getUserById(id);

    await userService.deleteUser(id, req.user!.userId);

    // Log audit
    await logAudit(
      req.user!.userId,
      'DELETE',
      'user',
      id,
      { deleted: { email: user.email, role: user.role } },
      req
    );

    logger.info('User deleted via API', { userId: id, adminId: req.user!.userId });

    res.status(204).send();
  } catch (error) {
    handleError(error, res);
  }
}

/**
 * POST /api/users/change-password
 * Change own password (any authenticated user)
 */
export async function changePassword(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Validate request body
    const validationResult = changePasswordSchema.safeParse(req.body);
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

    const { currentPassword, newPassword } = validationResult.data;

    await userService.changePassword(req.user!.userId, currentPassword, newPassword);

    // Log audit
    await logAudit(
      req.user!.userId,
      'UPDATE',
      'user',
      req.user!.userId,
      { action: 'password_changed' },
      req
    );

    res.status(200).json({
      message: 'Password changed successfully',
    });
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

  if (error instanceof ForbiddenError) {
    res.status(403).json({
      error: 'Forbidden',
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
  logger.error('Unhandled error in user controller', { error: message });

  res.status(500).json({
    error: 'Internal server error',
    message: 'An unexpected error occurred',
  });
}
