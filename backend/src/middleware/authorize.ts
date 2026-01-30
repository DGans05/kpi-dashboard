import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger';

/**
 * Role-Based Authorization Middleware
 *
 * Ensures authenticated user has one of the required roles.
 * Must be used AFTER authenticate middleware (requires req.user to exist).
 *
 * Usage:
 *   app.post('/admin/users', authenticate, authorize(['admin']), handler)
 *   app.post('/kpi', authenticate, authorize(['admin', 'manager']), handler)
 *
 * Returns:
 *   - 401: User not authenticated (shouldn't happen if authenticate runs first)
 *   - 403: User lacks required role(s)
 *   - Calls next() if authorized
 */
export function authorize(allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      // Validate middleware order - authenticate should run first
      if (!req.user) {
        logger.warn('Authorization check failed: User not authenticated', {
          path: req.path,
          method: req.method,
          reason: 'authenticate middleware likely not applied',
        });
        res.status(401).json({
          error: 'Authentication required',
          message: 'authenticate middleware must run before authorize',
        });
        return;
      }

      // Validate allowedRoles parameter
      if (!allowedRoles || allowedRoles.length === 0) {
        logger.error('Authorization check failed: Invalid allowedRoles', {
          path: req.path,
          allowedRoles,
        });
        res.status(500).json({
          error: 'Server error',
          message: 'Authorization configuration error',
        });
        return;
      }

      const userRole = req.user.role;

      // Check if user's role is in allowed roles
      if (!allowedRoles.includes(userRole)) {
        logger.warn('Authorization denied: Insufficient permissions', {
          userId: req.user.userId,
          email: req.user.email,
          userRole,
          allowedRoles,
          path: req.path,
          method: req.method,
          restaurantId: req.user.restaurantId,
        });

        res.status(403).json({
          error: 'Access denied',
          message: `This action requires one of these roles: ${allowedRoles.join(', ')}`,
        });
        return;
      }

      // User is authorized
      logger.debug('Authorization successful: User has required role', {
        userId: req.user.userId,
        userRole,
        path: req.path,
        method: req.method,
      });

      next();
    } catch (error) {
      logger.error('Authorization check error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        path: req.path,
        method: req.method,
      });

      res.status(403).json({
        error: 'Authorization failed',
        message: 'An error occurred during authorization',
      });
    }
  };
}

/**
 * Admin-Only Authorization
 *
 * Shorthand for authorize(['admin'])
 * Restricts endpoint to admin users only
 *
 * Usage:
 *   app.delete('/api/users/:id', authenticate, requireAdmin, handler)
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  return authorize(['admin'])(req, res, next);
}

/**
 * Manager or Admin Authorization
 *
 * Shorthand for authorize(['admin', 'manager'])
 * Allows both admin and manager users
 *
 * Usage:
 *   app.put('/api/restaurant/:id/config', authenticate, requireManagerOrAdmin, handler)
 */
export function requireManagerOrAdmin(req: Request, res: Response, next: NextFunction): void {
  return authorize(['admin', 'manager'])(req, res, next);
}

/**
 * Multiple Roles Authorization (Higher Order Function)
 *
 * Create custom authorization checks without writing middleware
 *
 * Usage:
 *   const viewerOrAbove = authorize(['admin', 'manager', 'viewer']);
 *   app.get('/api/reports', authenticate, viewerOrAbove, handler);
 *
 *   const dataEditors = authorize(['admin', 'manager']);
 *   app.post('/api/data', authenticate, dataEditors, handler);
 */
export function createRoleCheck(roles: string[]) {
  return authorize(roles);
}

/**
 * Utility function to check if user has ANY of the allowed roles
 *
 * Useful for conditional logic inside route handlers
 *
 * Usage:
 *   app.get('/api/dashboard', authenticate, (req, res) => {
 *     if (userHasRole(req, ['admin', 'manager'])) {
 *       // Show management dashboard
 *     } else {
 *       // Show viewer dashboard
 *     }
 *   });
 */
export function userHasRole(req: Request, roles: string[]): boolean {
  if (!req.user) {
    return false;
  }

  return roles.includes(req.user.role);
}

/**
 * Utility function to check if user has a specific role
 *
 * Usage:
 *   app.get('/api/profile', authenticate, (req, res) => {
 *     if (userIsAdmin(req)) {
 *       // Admin-specific actions
 *     }
 *   });
 */
export function userIsAdmin(req: Request): boolean {
  return req.user?.role === 'admin';
}

/**
 * Utility function to check if user is admin or manager
 *
 * Usage:
 *   app.post('/api/data', authenticate, (req, res) => {
 *     if (userIsManagerOrAdmin(req)) {
 *       // Allow action
 *     }
 *   });
 */
export function userIsManagerOrAdmin(req: Request): boolean {
  return ['admin', 'manager'].includes(req.user?.role ?? '');
}

/**
 * Utility function to check if user is any elevated role (not viewer)
 *
 * Usage:
 *   app.post('/api/comments', authenticate, (req, res) => {
 *     if (userIsElevated(req)) {
 *       // Allow editing own comments
 *     }
 *   });
 */
export function userIsElevated(req: Request): boolean {
  return ['admin', 'manager'].includes(req.user?.role ?? '');
}

/**
 * Dynamic Authorization - Check role at runtime
 *
 * Useful when allowed roles depend on dynamic conditions
 *
 * Usage:
 *   const isOwnerOrAdmin = (req: Request, res: Response, next: NextFunction) => {
 *     const allowedRoles = req.params.ownId === req.user?.userId
 *       ? ['admin', 'manager', 'viewer']
 *       : ['admin'];
 *     authorize(allowedRoles)(req, res, next);
 *   };
 *   app.get('/api/user/:userId', authenticate, isOwnerOrAdmin, handler);
 */
export function createDynamicRoleCheck(
  roleResolver: (req: Request) => string[]
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const allowedRoles = roleResolver(req);
    authorize(allowedRoles)(req, res, next);
  };
}
