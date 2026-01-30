import { Request, Response, NextFunction } from 'express';
import { verifyTokenSafe, isTokenExpired, getTimeToTokenExpiration } from '../utils/jwt';
import { logger } from '../config/logger';

/**
 * JWT Authentication Middleware
 *
 * Extracts JWT from httpOnly cookie, verifies it, and attaches decoded user info to request.
 *
 * Usage:
 *   app.get('/protected', authenticate, handler)
 *
 * Errors:
 *   - 401: Token missing, invalid, or malformed
 *   - 403: Token expired
 *
 * Success:
 *   - req.user will contain: { userId, email, role, restaurantId }
 */
export function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  try {
    // Extract token from httpOnly cookie
    const token = req.cookies?.auth_token;

    if (!token) {
      logger.warn('Authentication failed: No token provided', {
        path: req.path,
        method: req.method,
        ip: req.ip,
      });
      res.status(401).json({
        error: 'Authentication required',
        message: 'No authorization token provided',
      });
      return;
    }

    logger.debug('Verifying authentication token', {
      path: req.path,
      method: req.method,
    });

    // Verify token safely (returns result object instead of throwing)
    const result = verifyTokenSafe(token);

    // Check if token is invalid
    if (!result.success) {
      logger.warn('Authentication failed: Invalid token', {
        path: req.path,
        method: req.method,
        error: result.error,
      });
      res.status(401).json({
        error: 'Invalid authentication token',
        message: 'Token verification failed',
      });
      return;
    }

    const decoded = result.payload!;

    // Check if token is expired
    if (isTokenExpired(token)) {
      const timeToExp = getTimeToTokenExpiration(token);
      logger.warn('Authentication failed: Token expired', {
        path: req.path,
        method: req.method,
        userId: decoded.userId,
        expiredSeconds: Math.floor(timeToExp / 1000),
      });
      res.status(403).json({
        error: 'Token expired',
        message: 'Your session has expired. Please login again.',
      });
      return;
    }

    // Validate required user fields
    if (!decoded.userId || !decoded.email) {
      logger.error('Authentication failed: Invalid token payload', {
        path: req.path,
        method: req.method,
        payload: {
          userId: decoded.userId,
          email: decoded.email,
          role: decoded.role,
        },
      });
      res.status(401).json({
        error: 'Invalid authentication token',
        message: 'Token payload is malformed',
      });
      return;
    }

    // Attach user to request
    const role = (decoded.role === 'admin' || decoded.role === 'manager' || decoded.role === 'viewer')
      ? decoded.role
      : 'viewer';
    
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      role,
      restaurantId: decoded.restaurantId || null,
    };

    // Log successful authentication
    logger.debug('Authentication successful', {
      userId: req.user.userId,
      email: req.user.email,
      role: req.user.role,
      restaurantId: req.user.restaurantId,
      path: req.path,
      method: req.method,
    });

    next();
  } catch (error) {
    logger.error('Authentication error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      path: req.path,
      method: req.method,
    });
    res.status(401).json({
      error: 'Authentication failed',
      message: 'An error occurred during authentication',
    });
  }
}

/**
 * Optional Authentication Middleware
 *
 * Attempts to verify JWT but doesn't require it. Useful for:
 * - Public endpoints that can show different content for authenticated users
 * - Optional authentication without 401 errors
 *
 * Usage:
 *   app.get('/public', optionalAuth, handler)
 *
 * Result:
 *   - req.user will be set if valid token present
 *   - req.user will be undefined if no/invalid token
 *   - Always calls next()
 */
export function optionalAuth(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  try {
    const token = req.cookies?.auth_token;

    if (!token) {
      logger.debug('Optional auth: No token provided', {
        path: req.path,
      });
      next();
      return;
    }

    // Verify token safely
    const result = verifyTokenSafe(token);

    if (!result.success) {
      logger.debug('Optional auth: Invalid token', {
        path: req.path,
        error: result.error,
      });
      next();
      return;
    }

    const decoded = result.payload!;

    // Check expiration
    if (isTokenExpired(token)) {
      logger.debug('Optional auth: Token expired', {
        path: req.path,
        userId: decoded.userId,
      });
      next();
      return;
    }

    // Validate fields
    if (!decoded.userId || !decoded.email) {
      logger.debug('Optional auth: Invalid token payload', {
        path: req.path,
      });
      next();
      return;
    }

    // Attach user
    const optionalRole = (decoded.role === 'admin' || decoded.role === 'manager' || decoded.role === 'viewer')
      ? decoded.role
      : 'viewer';
    
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      role: optionalRole,
      restaurantId: decoded.restaurantId || null,
    };

    logger.debug('Optional auth: User authenticated', {
      userId: req.user.userId,
      path: req.path,
    });

    next();
  } catch (error) {
    logger.error('Optional auth error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      path: req.path,
    });
    // Continue anyway for optional auth
    next();
  }
}

/**
 * Role-Based Authorization Middleware
 *
 * Ensures authenticated user has one of the required roles.
 * Must be used after authenticate middleware.
 *
 * Usage:
 *   app.post('/admin-only', authenticate, authorize('admin'), handler)
 *   app.put('/edit', authenticate, authorize('admin', 'manager'), handler)
 *
 * Returns 403 if user doesn't have required role
 */
export function authorize(...allowedRoles: Array<'admin' | 'manager' | 'viewer'>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      // Check if user is authenticated (should be set by authenticate middleware)
      if (!req.user) {
        logger.warn('Authorization failed: User not authenticated', {
          path: req.path,
          method: req.method,
        });
        res.status(401).json({
          error: 'Authentication required',
          message: 'Please authenticate first',
        });
        return;
      }

      // Check if user has required role
      if (!allowedRoles.includes(req.user.role)) {
        logger.warn('Authorization failed: Insufficient permissions', {
          path: req.path,
          method: req.method,
          userId: req.user.userId,
          userRole: req.user.role,
          requiredRoles: allowedRoles,
        });
        res.status(403).json({
          error: 'Access denied',
          message: `This action requires one of these roles: ${allowedRoles.join(', ')}`,
        });
        return;
      }

      logger.debug('Authorization successful', {
        userId: req.user.userId,
        role: req.user.role,
        path: req.path,
        method: req.method,
      });

      next();
    } catch (error) {
      logger.error('Authorization error', {
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
 * Restaurant Access Middleware
 *
 * Ensures user has access to the requested restaurant.
 * Admins (restaurantId === null) have access to all restaurants.
 * Other users can only access their assigned restaurant.
 *
 * Must be used after authenticate middleware.
 *
 * Usage:
 *   app.get('/restaurants/:restaurantId/data', authenticate, requireRestaurantAccess, handler)
 *
 * Returns 403 if user doesn't have access to the restaurant
 */
export function requireRestaurantAccess(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  try {
    // Check if user is authenticated
    if (!req.user) {
      logger.warn('Restaurant access check failed: User not authenticated', {
        path: req.path,
      });
      res.status(401).json({
        error: 'Authentication required',
      });
      return;
    }

    // Get restaurant ID from route params
    const requestedRestaurantId = req.params.restaurantId;

    if (!requestedRestaurantId) {
      logger.error('Restaurant access check failed: No restaurantId in params', {
        path: req.path,
        params: req.params,
      });
      res.status(400).json({
        error: 'Invalid request',
        message: 'Restaurant ID is required',
      });
      return;
    }

    // Admins (restaurantId === null) have access to all restaurants
    if (req.user.restaurantId === null) {
      logger.debug('Restaurant access granted: Admin user', {
        userId: req.user.userId,
        requestedRestaurantId,
      });
      next();
      return;
    }

    // Regular users can only access their assigned restaurant
    if (req.user.restaurantId !== requestedRestaurantId) {
      logger.warn('Restaurant access denied: User not assigned to restaurant', {
        userId: req.user.userId,
        assignedRestaurant: req.user.restaurantId,
        requestedRestaurant: requestedRestaurantId,
        path: req.path,
      });
      res.status(403).json({
        error: 'Access denied',
        message: 'You do not have access to this restaurant',
      });
      return;
    }

    logger.debug('Restaurant access granted: User assigned to restaurant', {
      userId: req.user.userId,
      restaurantId: req.user.restaurantId,
    });

    next();
  } catch (error) {
    logger.error('Restaurant access check error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      path: req.path,
    });
    res.status(403).json({
      error: 'Access denied',
    });
  }
}

/**
 * Admin Only Middleware
 *
 * Shorthand for authenticate + authorize('admin')
 * Only allows admin users (role === 'admin')
 *
 * Usage:
 *   app.delete('/users/:id', adminOnly, handler)
 */
export function adminOnly(req: Request, res: Response, next: NextFunction): void {
  return authenticate(req, res, () => {
    return authorize('admin')(req, res, next);
  });
}

/**
 * Manager Or Admin Middleware
 *
 * Shorthand for authenticate + authorize('admin', 'manager')
 * Allows managers and admins
 *
 * Usage:
 *   app.put('/restaurant/:id/config', managerOrAdmin, handler)
 */
export function managerOrAdmin(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  return authenticate(req, res, () => {
    return authorize('admin', 'manager')(req, res, next);
  });
}
