import { Request, Response, NextFunction } from 'express';
import { authService, UserResponse } from '../services/auth.service';
import { hashPassword, validatePasswordStrength } from '../utils/crypto';
import { generateToken } from '../utils/jwt';
import { logger } from '../config/logger';

/**
 * Request body types for validation
 */
interface LoginRequest {
  email: string;
  password: string;
}

interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  passwordConfirm: string;
  restaurantId?: string;
}

/**
 * Authentication Controller
 * Handles HTTP requests for user authentication
 */
class AuthController {
  /**
   * POST /api/auth/login
   * Authenticate user with email and password
   *
   * Body: { email: string, password: string }
   * Response: { user: UserResponse, message: string }
   * Status: 200 (success), 400 (validation), 401 (invalid), 500 (error)
   */
  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password } = req.body as LoginRequest;

      // ========== Validation ==========
      if (!email || !password) {
        res.status(400).json({
          error: 'Validation failed',
          message: 'Email and password are required',
          code: 'MISSING_FIELDS',
        });
        return;
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        res.status(400).json({
          error: 'Validation failed',
          message: 'Invalid email format',
          code: 'INVALID_EMAIL',
        });
        return;
      }

      // ========== Authentication ==========
      const user = await authService.login(email, password);

      // ========== Token Generation ==========
      const token = generateToken({
        userId: user.id,
        email: user.email,
        role: user.role,
        restaurantId: user.restaurantId,
      });

      // ========== Set Cookie ==========
      // IMPORTANT: sameSite must be 'lax' (not 'strict') for cross-origin requests
      // 'strict' blocks cookies on cross-origin requests entirely
      const isProduction = process.env.NODE_ENV === 'production';
      res.cookie('auth_token', token, {
        httpOnly: true,
        secure: isProduction, // false for localhost, true for HTTPS in production
        sameSite: 'lax', // 'lax' allows cross-origin GET requests and form submissions
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
        path: '/',
      });

      logger.info('Cookie set for auth_token', { httpOnly: true, secure: isProduction, sameSite: 'lax' });
      logger.info('User logged in successfully', {
        userId: user.id,
        email: user.email,
        role: user.role,
      });

      // ========== Response ==========
      res.status(200).json({
        message: 'Login successful',
        user,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Login error', {
        email: (req.body as LoginRequest).email,
        error: message,
      });

      // ========== Error Handling ==========
      if (message === 'Invalid credentials') {
        res.status(401).json({
          error: 'Authentication failed',
          message: 'Invalid email or password',
          code: 'INVALID_CREDENTIALS',
        });
        return;
      }

      if (message === 'Account disabled') {
        res.status(403).json({
          error: 'Account inactive',
          message: 'This account has been disabled',
          code: 'ACCOUNT_DISABLED',
        });
        return;
      }

      res.status(500).json({
        error: 'Server error',
        message: 'Failed to log in',
        code: 'LOGIN_ERROR',
      });
    }
  }

  /**
   * POST /api/auth/register
   * Create new user account
   *
   * Body: { username: string, email: string, password: string, passwordConfirm: string, restaurantId?: string }
   * Response: { user: UserResponse, message: string }
   * Status: 201 (created), 400 (validation), 409 (conflict), 500 (error)
   */
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { username, email, password, passwordConfirm, restaurantId } = req.body as RegisterRequest;

      // ========== Validation ==========
      if (!username || !email || !password || !passwordConfirm) {
        res.status(400).json({
          error: 'Validation failed',
          message: 'Username, email, password, and passwordConfirm are required',
          code: 'MISSING_FIELDS',
        });
        return;
      }

      // Validate username length
      if (username.length < 3) {
        res.status(400).json({
          error: 'Validation failed',
          message: 'Username must be at least 3 characters long',
          code: 'INVALID_USERNAME',
        });
        return;
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        res.status(400).json({
          error: 'Validation failed',
          message: 'Invalid email format',
          code: 'INVALID_EMAIL',
        });
        return;
      }

      // Check passwords match
      if (password !== passwordConfirm) {
        res.status(400).json({
          error: 'Validation failed',
          message: 'Passwords do not match',
          code: 'PASSWORD_MISMATCH',
        });
        return;
      }

      // Validate password strength
      const strengthResult = validatePasswordStrength(password);
      if (!strengthResult.isValid) {
        res.status(400).json({
          error: 'Validation failed',
          message: 'Password does not meet strength requirements',
          code: 'WEAK_PASSWORD',
          details: {
            strength: strengthResult.strength,
            message: strengthResult.message,
          },
        });
        return;
      }

      // Check email availability
      const emailExists = await authService.emailExists(email);
      if (emailExists) {
        res.status(409).json({
          error: 'Conflict',
          message: 'Email is already registered',
          code: 'EMAIL_EXISTS',
        });
        return;
      }

      // ========== User Creation ==========
      const passwordHash = await hashPassword(password);
      const user = await authService.createUser(
        email.toLowerCase(),
        passwordHash,
        'viewer', // Default role for new users
        restaurantId || null,
        username
      );

      logger.info('User registered successfully', {
        userId: user.id,
        email: user.email,
        role: user.role,
        username: user.fullName,
      });

      // ========== Response ==========
      res.status(201).json({
        message: 'Registration successful. Please log in.',
        user,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Registration error', {
        email: (req.body as RegisterRequest).email,
        error: message,
      });

      // ========== Error Handling ==========
      if (message === 'Email already registered') {
        res.status(409).json({
          error: 'Conflict',
          message: 'Email is already registered',
          code: 'EMAIL_EXISTS',
        });
        return;
      }

      res.status(500).json({
        error: 'Server error',
        message: 'Failed to register',
        code: 'REGISTRATION_ERROR',
      });
    }
  }

  /**
   * POST /api/auth/logout
   * Clear authentication cookie
   *
   * Requires: authenticate middleware
   * Response: { message: string }
   * Status: 200 (success), 500 (error)
   */
  async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;

      // Clear auth token cookie (must match same options as when it was set)
      res.clearCookie('auth_token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
      });

      logger.info('User logged out', { userId });

      // ========== Response ==========
      res.status(200).json({
        message: 'Logged out successfully',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Logout error', { userId: req.user?.userId, error: message });

      res.status(500).json({
        error: 'Server error',
        message: 'Failed to log out',
        code: 'LOGOUT_ERROR',
      });
    }
  }

  /**
   * GET /api/auth/me
   * Get current authenticated user's profile
   *
   * Requires: authenticate middleware
   * Response: { user: UserResponse }
   * Status: 200 (success), 401 (unauthorized), 404 (not found), 500 (error)
   */
  async me(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Check user exists in request (set by authenticate middleware)
      if (!req.user || !req.user.userId) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'Authentication required',
          code: 'MISSING_AUTH',
        });
        return;
      }

      // ========== Fetch User ==========
      const user = await authService.getUserById(req.user.userId);

      // User not found (shouldn't happen but check)
      if (!user) {
        res.status(404).json({
          error: 'Not found',
          message: 'User not found',
          code: 'USER_NOT_FOUND',
        });
        return;
      }

      logger.debug('Profile fetched', { userId: user.id });

      // ========== Response ==========
      res.status(200).json({
        user,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Get profile error', {
        userId: req.user?.userId,
        error: message,
      });

      res.status(500).json({
        error: 'Server error',
        message: 'Failed to fetch profile',
        code: 'PROFILE_ERROR',
      });
    }
  }

  /**
   * GET /api/auth/verify
   * Verify if user is authenticated
   *
   * Requires: authenticate middleware
   * Response: { authenticated: boolean, user?: UserResponse }
   * Status: 200 (always)
   */
  async verify(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // If authenticate middleware passed, user is authenticated
      if (!req.user || !req.user.userId) {
        res.status(200).json({
          authenticated: false,
        });
        return;
      }

      // Fetch full user info
      const user = await authService.getUserById(req.user.userId);

      if (!user) {
        res.status(200).json({
          authenticated: false,
        });
        return;
      }

      res.status(200).json({
        authenticated: true,
        user,
      });
    } catch (error) {
      logger.error('Verify error', { userId: req.user?.userId, error });

      res.status(200).json({
        authenticated: false,
      });
    }
  }

  /**
   * GET /api/auth/profile
   * Alias for /me - Get current user's profile
   * Same as me() handler
   */
  async profile(req: Request, res: Response, next: NextFunction): Promise<void> {
    return this.me(req, res, next);
  }
}

// Export singleton instance
export const authController = new AuthController();
