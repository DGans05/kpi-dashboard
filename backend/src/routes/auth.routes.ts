import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';

/**
 * Authentication Routes
 * 
 * Base path: /api/auth
 * 
 * Routes:
 * - POST /login         - User login
 * - POST /logout        - User logout (requires auth)
 * - GET /me             - Get current user profile (requires auth)
 * - POST /register      - User registration
 * - GET /verify         - Verify authentication status (requires auth)
 * - GET /profile        - Alias for /me (requires auth)
 */
export const router = Router();

/**
 * POST /api/auth/login
 * Authenticate user with email and password
 * 
 * Body: { email: string, password: string }
 * Response: { message: string, user: UserResponse }
 * Status: 200, 400, 401, 500
 */
router.post('/login', (req, res, next) => authController.login(req, res, next));

/**
 * POST /api/auth/logout
 * Clear authentication cookie and logout user
 * 
 * Requires: Authentication via cookie
 * Response: { message: string }
 * Status: 200, 500
 */
router.post('/logout', authenticate, (req, res, next) => authController.logout(req, res, next));

/**
 * GET /api/auth/me
 * Get current authenticated user's profile with restaurant info
 * 
 * Requires: Authentication via cookie
 * Response: { user: UserResponse }
 * Status: 200, 401, 404, 500
 */
router.get('/me', authenticate, (req, res, next) => authController.me(req, res, next));

/**
 * POST /api/auth/register
 * Create new user account
 * 
 * Body: { email: string, password: string, passwordConfirm: string, restaurantId?: string }
 * Response: { message: string, user: UserResponse }
 * Status: 201, 400, 409, 500
 */
router.post('/register', (req, res, next) => authController.register(req, res, next));

/**
 * GET /api/auth/verify
 * Verify if user is authenticated
 * 
 * Requires: Authentication via cookie (optional)
 * Response: { authenticated: boolean, user?: UserResponse }
 * Status: 200
 */
router.get('/verify', authenticate, (req, res, next) => authController.verify(req, res, next));

/**
 * GET /api/auth/profile
 * Alias for /me - Get current user's profile
 * 
 * Requires: Authentication via cookie
 * Response: { user: UserResponse }
 * Status: 200, 401, 404, 500
 */
router.get('/profile', authenticate, (req, res, next) => authController.profile(req, res, next));
