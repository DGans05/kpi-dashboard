import { query, getClient } from '../config/database';
import { comparePassword } from '../utils/crypto';
import { logger } from '../config/logger';

/**
 * User interface matching database schema
 */
export interface User {
  id: string;
  email: string;
  fullName: string;
  role: 'admin' | 'manager' | 'viewer';
  restaurantId: string | null;
  isActive: boolean;
  createdAt: string;
  lastLoginAt?: string;
  restaurant?: {
    id: string;
    name: string;
    city: string;
  };
}

/**
 * User response without sensitive data
 */
export interface UserResponse extends Omit<User, 'passwordHash'> {
  passwordHash?: never;
}

/**
 * Raw database user record
 */
interface RawUser {
  id: string;
  email: string;
  password_hash: string;
  role: 'admin' | 'manager' | 'viewer';
  restaurant_id: string | null;
  created_at: string;
  last_login_at?: string | null;
  full_name?: string;
  restaurant?: {
    id: string;
    name: string;
    city: string;
  };
}

/**
 * Authentication service
 * Handles user login, password verification, and user lookups
 */
class AuthService {
  /**
   * Authenticate user with email and password
   * @param email - User email address
   * @param password - Plain text password
   * @returns User object without password_hash
   * @throws Error if credentials invalid or account disabled
   */
  async login(email: string, password: string): Promise<UserResponse> {
    try {
      // Validate input
      if (!email || !password) {
        throw new Error('Email and password are required');
      }

      // Query user by email
      const result = await query(
        `SELECT id, email, password_hash, role, restaurant_id, created_at, last_login_at
         FROM users
         WHERE email = $1`,
        [email.toLowerCase()]
      );

      // Check if user exists
      if (result.rows.length === 0) {
        logger.warn('Login failed: user not found', { email });
        throw new Error('Invalid credentials');
      }

      const user = result.rows[0] as RawUser;

      // Verify password
      const passwordMatch = await comparePassword(password, user.password_hash);
      if (!passwordMatch) {
        logger.warn('Login failed: invalid password', { email });
        throw new Error('Invalid credentials');
      }

      // Check if account is active
      // Note: current schema doesn't have is_active field, but kept in business logic for future
      // const isActive = user.is_active !== false;
      // if (!isActive) {
      //   logger.warn('Login failed: account disabled', { email });
      //   throw new Error('Account disabled');
      // }

      // Update last login timestamp
      const updateResult = await query(
        `UPDATE users
         SET last_login_at = NOW()
         WHERE id = $1
         RETURNING id, email, role, restaurant_id, created_at, last_login_at`,
        [user.id]
      );

      const updatedUser = updateResult.rows[0] as RawUser;

      logger.info('User logged in successfully', { userId: user.id, email });

      // Return user without password_hash
      return this.formatUserResponse(updatedUser);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('Login service error', { email, error: message });
      throw error;
    }
  }

  /**
   * Get user by ID with restaurant info
   * @param userId - User ID (UUID)
   * @returns User object with restaurant details, or null if not found
   */
  async getUserById(userId: string): Promise<UserResponse | null> {
    try {
      // Validate input
      if (!userId) {
        throw new Error('User ID is required');
      }

      // Query user with restaurant join
      const result = await query(
        `SELECT
          u.id,
          u.email,
          u.role,
          u.restaurant_id,
          u.created_at,
          u.last_login_at,
          r.id as restaurant_id,
          r.name as restaurant_name,
          r.city as restaurant_city
         FROM users u
         LEFT JOIN restaurants r ON u.restaurant_id = r.id
         WHERE u.id = $1`,
        [userId]
      );

      // Return null if user not found
      if (result.rows.length === 0) {
        logger.debug('User not found', { userId });
        return null;
      }

      const row = result.rows[0];
      const user: RawUser = {
        id: row.id,
        email: row.email,
        password_hash: '', // Not including in queries
        role: row.role,
        restaurant_id: row.restaurant_id,
        created_at: row.created_at,
        last_login_at: row.last_login_at,
      };

      // Add restaurant info if available
      if (row.restaurant_id) {
        user.restaurant = {
          id: row.restaurant_id,
          name: row.restaurant_name,
          city: row.restaurant_city,
        };
      }

      return this.formatUserResponse(user);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('Get user service error', { userId, error: message });
      throw error;
    }
  }

  /**
   * Get user by email (case-insensitive)
   * @param email - User email address
   * @returns User object with restaurant details, or null if not found
   */
  async getUserByEmail(email: string): Promise<UserResponse | null> {
    try {
      // Validate input
      if (!email) {
        throw new Error('Email is required');
      }

      // Query user with restaurant join
      const result = await query(
        `SELECT
          u.id,
          u.email,
          u.role,
          u.restaurant_id,
          u.created_at,
          u.last_login_at,
          r.id as restaurant_id,
          r.name as restaurant_name,
          r.city as restaurant_city
         FROM users u
         LEFT JOIN restaurants r ON u.restaurant_id = r.id
         WHERE LOWER(u.email) = LOWER($1)`,
        [email]
      );

      // Return null if user not found
      if (result.rows.length === 0) {
        logger.debug('User not found by email', { email });
        return null;
      }

      const row = result.rows[0];
      const user: RawUser = {
        id: row.id,
        email: row.email,
        password_hash: '',
        role: row.role,
        restaurant_id: row.restaurant_id,
        created_at: row.created_at,
        last_login_at: row.last_login_at,
      };

      // Add restaurant info if available
      if (row.restaurant_id) {
        user.restaurant = {
          id: row.restaurant_id,
          name: row.restaurant_name,
          city: row.restaurant_city,
        };
      }

      return this.formatUserResponse(user);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('Get user by email service error', { email, error: message });
      throw error;
    }
  }

  /**
   * Verify if email exists in database
   * @param email - Email address to check
   * @returns true if email exists, false otherwise
   */
  async emailExists(email: string): Promise<boolean> {
    try {
      if (!email) {
        return false;
      }

      const result = await query(
        `SELECT id FROM users WHERE LOWER(email) = LOWER($1)`,
        [email]
      );

      return result.rows.length > 0;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('Email exists check error', { email, error: message });
      throw error;
    }
  }

  /**
   * Create user with hashed password
   * @param email - User email
   * @param passwordHash - Already hashed password from crypto.hashPassword
   * @param role - User role (admin, manager, viewer)
   * @param restaurantId - Optional restaurant ID
   * @param fullName - Optional full name
   * @returns Created user object
   */
  async createUser(
    email: string,
    passwordHash: string,
    role: 'admin' | 'manager' | 'viewer' = 'viewer',
    restaurantId?: string | null,
    fullName?: string
  ): Promise<UserResponse> {
    try {
      // Validate inputs
      if (!email || !passwordHash) {
        throw new Error('Email and password hash are required');
      }

      if (!['admin', 'manager', 'viewer'].includes(role)) {
        throw new Error('Invalid role');
      }

      // Check if email already exists
      if (await this.emailExists(email)) {
        throw new Error('Email already registered');
      }

      // Note: validator should call this before createUser
      // Insert user
      const result = await query(
        `INSERT INTO users (email, password_hash, role, restaurant_id)
         VALUES ($1, $2, $3, $4)
         RETURNING id, email, role, restaurant_id, created_at, last_login_at`,
        [email.toLowerCase(), passwordHash, role, restaurantId || null]
      );

      const user = result.rows[0] as RawUser;
      logger.info('User created successfully', { userId: user.id, email });

      return this.formatUserResponse(user);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('Create user service error', { email, error: message });
      throw error;
    }
  }

  /**
   * Format raw database user to response user (removes sensitive data)
   * @param user - Raw user from database
   * @returns User response object without password_hash
   */
  private formatUserResponse(user: RawUser): UserResponse {
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      restaurantId: user.restaurant_id,
      createdAt: user.created_at,
      lastLoginAt: user.last_login_at || undefined,
      isActive: true, // Default for now, can be extended with database field
      fullName: user.full_name || user.email.split('@')[0],
      restaurant: user.restaurant,
    };
  }

  /**
   * Get all users (admin only)
   * @param limit - Max number of results (default 100)
   * @param offset - Pagination offset (default 0)
   * @returns Array of users with restaurant info
   */
  async getAllUsers(limit: number = 100, offset: number = 0): Promise<UserResponse[]> {
    try {
      const result = await query(
        `SELECT
          u.id,
          u.email,
          u.role,
          u.restaurant_id,
          u.created_at,
          u.last_login_at,
          r.id as restaurant_id,
          r.name as restaurant_name,
          r.city as restaurant_city
         FROM users u
         LEFT JOIN restaurants r ON u.restaurant_id = r.id
         ORDER BY u.created_at DESC
         LIMIT $1 OFFSET $2`,
        [limit, offset]
      );

      return result.rows.map(row => {
        const user: RawUser = {
          id: row.id,
          email: row.email,
          password_hash: '',
          role: row.role,
          restaurant_id: row.restaurant_id,
          created_at: row.created_at,
          last_login_at: row.last_login_at,
        };

        if (row.restaurant_id) {
          user.restaurant = {
            id: row.restaurant_id,
            name: row.restaurant_name,
            city: row.restaurant_city,
          };
        }

        return this.formatUserResponse(user);
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('Get all users service error', { error: message });
      throw error;
    }
  }

  /**
   * Update user role
   * @param userId - User ID
   * @param newRole - New role
   * @returns Updated user object
   */
  async updateUserRole(userId: string, newRole: 'admin' | 'manager' | 'viewer'): Promise<UserResponse> {
    try {
      if (!userId || !newRole) {
        throw new Error('User ID and role are required');
      }

      if (!['admin', 'manager', 'viewer'].includes(newRole)) {
        throw new Error('Invalid role');
      }

      const result = await query(
        `UPDATE users
         SET role = $1
         WHERE id = $2
         RETURNING id, email, role, restaurant_id, created_at, last_login_at`,
        [newRole, userId]
      );

      if (result.rows.length === 0) {
        throw new Error('User not found');
      }

      const user = result.rows[0] as RawUser;
      logger.info('User role updated', { userId, newRole });

      return this.formatUserResponse(user);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('Update user role service error', { userId, error: message });
      throw error;
    }
  }

  /**
   * Delete user (admin only)
   * @param userId - User ID to delete
   */
  async deleteUser(userId: string): Promise<void> {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }

      const result = await query(
        `DELETE FROM users WHERE id = $1`,
        [userId]
      );

      if (result.rowCount === 0) {
        throw new Error('User not found');
      }

      logger.info('User deleted', { userId });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('Delete user service error', { userId, error: message });
      throw error;
    }
  }
}

// Export singleton instance
export const authService = new AuthService();
