/**
 * User Repository
 * Database operations for user management
 */

import { query } from '../config/database';
import { logger } from '../config/logger';

export interface User {
  id: string;
  email: string;
  fullName: string | null;
  role: 'admin' | 'manager' | 'viewer';
  restaurantId: string | null;
  isActive: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  restaurant?: {
    id: string;
    name: string;
    city: string;
  };
}

interface RawUser {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  restaurant_id: string | null;
  is_active: boolean;
  created_at: string;
  last_login_at: string | null;
  password_hash?: string;
  restaurant_name?: string;
  restaurant_city?: string;
}

function mapToUser(row: RawUser): User {
  const user: User = {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    role: row.role as 'admin' | 'manager' | 'viewer',
    restaurantId: row.restaurant_id,
    isActive: row.is_active ?? true,
    createdAt: row.created_at,
    lastLoginAt: row.last_login_at,
  };

  if (row.restaurant_name) {
    user.restaurant = {
      id: row.restaurant_id!,
      name: row.restaurant_name,
      city: row.restaurant_city || '',
    };
  }

  return user;
}

/**
 * Get all users with restaurant info
 */
export async function findAll(): Promise<User[]> {
  const sql = `
    SELECT
      u.id,
      u.email,
      u.full_name,
      u.role,
      u.restaurant_id,
      COALESCE(u.is_active, true) as is_active,
      u.created_at,
      u.last_login_at,
      r.name as restaurant_name,
      r.city as restaurant_city
    FROM users u
    LEFT JOIN restaurants r ON u.restaurant_id = r.id
    ORDER BY u.created_at DESC
  `;

  try {
    const result = await query(sql);
    return result.rows.map(mapToUser);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error('UserRepository: findAll failed', { error: message });
    throw error;
  }
}

/**
 * Find user by ID
 */
export async function findById(id: string): Promise<User | null> {
  const sql = `
    SELECT
      u.id,
      u.email,
      u.full_name,
      u.role,
      u.restaurant_id,
      COALESCE(u.is_active, true) as is_active,
      u.created_at,
      u.last_login_at,
      r.name as restaurant_name,
      r.city as restaurant_city
    FROM users u
    LEFT JOIN restaurants r ON u.restaurant_id = r.id
    WHERE u.id = $1
  `;

  try {
    const result = await query(sql, [id]);
    if (result.rows.length === 0) {
      return null;
    }
    return mapToUser(result.rows[0]);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error('UserRepository: findById failed', { error: message, id });
    throw error;
  }
}

/**
 * Find user by email
 */
export async function findByEmail(email: string): Promise<User | null> {
  const sql = `
    SELECT
      u.id,
      u.email,
      u.full_name,
      u.role,
      u.restaurant_id,
      COALESCE(u.is_active, true) as is_active,
      u.created_at,
      u.last_login_at
    FROM users u
    WHERE LOWER(u.email) = LOWER($1)
  `;

  try {
    const result = await query(sql, [email]);
    if (result.rows.length === 0) {
      return null;
    }
    return mapToUser(result.rows[0]);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error('UserRepository: findByEmail failed', { error: message, email });
    throw error;
  }
}

/**
 * Find user by email with password hash (for authentication)
 */
export async function findByEmailWithPassword(email: string): Promise<(User & { passwordHash: string }) | null> {
  const sql = `
    SELECT
      u.id,
      u.email,
      u.full_name,
      u.role,
      u.restaurant_id,
      COALESCE(u.is_active, true) as is_active,
      u.created_at,
      u.last_login_at,
      u.password_hash
    FROM users u
    WHERE LOWER(u.email) = LOWER($1)
  `;

  try {
    const result = await query(sql, [email]);
    if (result.rows.length === 0) {
      return null;
    }
    const row = result.rows[0];
    return {
      ...mapToUser(row),
      passwordHash: row.password_hash,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error('UserRepository: findByEmailWithPassword failed', { error: message, email });
    throw error;
  }
}

/**
 * Create new user
 */
export async function create(data: {
  email: string;
  passwordHash: string;
  fullName?: string;
  role: 'admin' | 'manager' | 'viewer';
  restaurantId?: string | null;
}): Promise<User> {
  const sql = `
    INSERT INTO users (email, password_hash, full_name, role, restaurant_id)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id, email, full_name, role, restaurant_id, COALESCE(is_active, true) as is_active, created_at, last_login_at
  `;

  const params = [
    data.email,
    data.passwordHash,
    data.fullName || null,
    data.role,
    data.restaurantId || null,
  ];

  try {
    const result = await query(sql, params);
    logger.info('User created', { userId: result.rows[0].id, email: data.email });
    return mapToUser(result.rows[0]);
  } catch (error: unknown) {
    const pgError = error as { code?: string };
    if (pgError.code === '23505') {
      throw new Error('EMAIL_EXISTS');
    }
    const message = error instanceof Error ? error.message : String(error);
    logger.error('UserRepository: create failed', { error: message, email: data.email });
    throw error;
  }
}

/**
 * Update user
 */
export async function update(
  id: string,
  data: Partial<{
    fullName: string;
    role: 'admin' | 'manager' | 'viewer';
    restaurantId: string | null;
    isActive: boolean;
  }>
): Promise<User> {
  const updates: string[] = [];
  const params: (string | boolean | null)[] = [];
  let paramIndex = 1;

  if (data.fullName !== undefined) {
    updates.push(`full_name = $${paramIndex}`);
    params.push(data.fullName);
    paramIndex++;
  }

  if (data.role !== undefined) {
    updates.push(`role = $${paramIndex}`);
    params.push(data.role);
    paramIndex++;
  }

  if (data.restaurantId !== undefined) {
    updates.push(`restaurant_id = $${paramIndex}`);
    params.push(data.restaurantId);
    paramIndex++;
  }

  if (data.isActive !== undefined) {
    updates.push(`is_active = $${paramIndex}`);
    params.push(data.isActive);
    paramIndex++;
  }

  if (updates.length === 0) {
    const existing = await findById(id);
    if (!existing) throw new Error('NOT_FOUND');
    return existing;
  }

  params.push(id);

  const sql = `
    UPDATE users
    SET ${updates.join(', ')}
    WHERE id = $${paramIndex}
    RETURNING id, email, full_name, role, restaurant_id, COALESCE(is_active, true) as is_active, created_at, last_login_at
  `;

  try {
    const result = await query(sql, params);
    if (result.rows.length === 0) {
      throw new Error('NOT_FOUND');
    }
    logger.info('User updated', { userId: id, changes: Object.keys(data) });
    return mapToUser(result.rows[0]);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error('UserRepository: update failed', { error: message, id });
    throw error;
  }
}

/**
 * Update user password
 */
export async function updatePassword(id: string, passwordHash: string): Promise<void> {
  const sql = `UPDATE users SET password_hash = $1 WHERE id = $2`;

  try {
    const result = await query(sql, [passwordHash, id]);
    if (result.rowCount === 0) {
      throw new Error('NOT_FOUND');
    }
    logger.info('User password updated', { userId: id });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error('UserRepository: updatePassword failed', { error: message, id });
    throw error;
  }
}

/**
 * Delete user
 */
export async function deleteById(id: string): Promise<void> {
  const sql = `DELETE FROM users WHERE id = $1`;

  try {
    const result = await query(sql, [id]);
    if (result.rowCount === 0) {
      throw new Error('NOT_FOUND');
    }
    logger.info('User deleted', { userId: id });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error('UserRepository: deleteById failed', { error: message, id });
    throw error;
  }
}

export const userRepository = {
  findAll,
  findById,
  findByEmail,
  findByEmailWithPassword,
  create,
  update,
  updatePassword,
  deleteById,
};
