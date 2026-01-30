/**
 * Restaurant Repository
 * Database operations for restaurant management
 */

import { query } from '../config/database';
import { logger } from '../config/logger';

export interface Restaurant {
  id: string;
  name: string;
  city: string;
  timezone: string;
  isActive: boolean;
  createdAt: string;
  managerCount?: number;
}

interface RawRestaurant {
  id: string;
  name: string;
  city: string;
  timezone: string;
  is_active: boolean;
  created_at: string;
  manager_count?: string;
}

function mapToRestaurant(row: RawRestaurant): Restaurant {
  return {
    id: row.id,
    name: row.name,
    city: row.city || '',
    timezone: row.timezone || 'UTC',
    isActive: row.is_active ?? true,
    createdAt: row.created_at,
    managerCount: row.manager_count ? parseInt(row.manager_count) : undefined,
  };
}

/**
 * Get all restaurants with manager count
 */
export async function findAll(): Promise<Restaurant[]> {
  const sql = `
    SELECT
      r.id,
      r.name,
      r.city,
      r.timezone,
      COALESCE(r.is_active, true) as is_active,
      r.created_at,
      COUNT(u.id)::text as manager_count
    FROM restaurants r
    LEFT JOIN users u ON r.id = u.restaurant_id
    GROUP BY r.id
    ORDER BY r.name ASC
  `;

  try {
    const result = await query(sql);
    return result.rows.map(mapToRestaurant);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error('RestaurantRepository: findAll failed', { error: message });
    throw error;
  }
}

/**
 * Find restaurant by ID
 */
export async function findById(id: string): Promise<Restaurant | null> {
  const sql = `
    SELECT
      r.id,
      r.name,
      r.city,
      r.timezone,
      COALESCE(r.is_active, true) as is_active,
      r.created_at,
      COUNT(u.id)::text as manager_count
    FROM restaurants r
    LEFT JOIN users u ON r.id = u.restaurant_id
    WHERE r.id = $1
    GROUP BY r.id
  `;

  try {
    const result = await query(sql, [id]);
    if (result.rows.length === 0) {
      return null;
    }
    return mapToRestaurant(result.rows[0]);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error('RestaurantRepository: findById failed', { error: message, id });
    throw error;
  }
}

/**
 * Create new restaurant
 */
export async function create(data: {
  name: string;
  city?: string;
  timezone?: string;
}): Promise<Restaurant> {
  const sql = `
    INSERT INTO restaurants (name, city, timezone)
    VALUES ($1, $2, $3)
    RETURNING id, name, city, timezone, COALESCE(is_active, true) as is_active, created_at
  `;

  const params = [
    data.name,
    data.city || '',
    data.timezone || 'UTC',
  ];

  try {
    const result = await query(sql, params);
    logger.info('Restaurant created', { restaurantId: result.rows[0].id, name: data.name });
    return mapToRestaurant(result.rows[0]);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error('RestaurantRepository: create failed', { error: message, name: data.name });
    throw error;
  }
}

/**
 * Update restaurant
 */
export async function update(
  id: string,
  data: Partial<{
    name: string;
    city: string;
    timezone: string;
    isActive: boolean;
  }>
): Promise<Restaurant> {
  const updates: string[] = [];
  const params: (string | boolean)[] = [];
  let paramIndex = 1;

  if (data.name !== undefined) {
    updates.push(`name = $${paramIndex}`);
    params.push(data.name);
    paramIndex++;
  }

  if (data.city !== undefined) {
    updates.push(`city = $${paramIndex}`);
    params.push(data.city);
    paramIndex++;
  }

  if (data.timezone !== undefined) {
    updates.push(`timezone = $${paramIndex}`);
    params.push(data.timezone);
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
    UPDATE restaurants
    SET ${updates.join(', ')}
    WHERE id = $${paramIndex}
    RETURNING id, name, city, timezone, COALESCE(is_active, true) as is_active, created_at
  `;

  try {
    const result = await query(sql, params);
    if (result.rows.length === 0) {
      throw new Error('NOT_FOUND');
    }
    logger.info('Restaurant updated', { restaurantId: id, changes: Object.keys(data) });
    return mapToRestaurant(result.rows[0]);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error('RestaurantRepository: update failed', { error: message, id });
    throw error;
  }
}

/**
 * Delete restaurant
 */
export async function deleteById(id: string): Promise<void> {
  // First check if restaurant has assigned users
  const checkSql = `SELECT COUNT(*) as count FROM users WHERE restaurant_id = $1`;
  const checkResult = await query(checkSql, [id]);
  
  if (parseInt(checkResult.rows[0].count) > 0) {
    throw new Error('HAS_USERS');
  }

  const sql = `DELETE FROM restaurants WHERE id = $1`;

  try {
    const result = await query(sql, [id]);
    if (result.rowCount === 0) {
      throw new Error('NOT_FOUND');
    }
    logger.info('Restaurant deleted', { restaurantId: id });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error('RestaurantRepository: deleteById failed', { error: message, id });
    throw error;
  }
}

/**
 * Get count of users assigned to restaurant
 */
export async function getUserCount(id: string): Promise<number> {
  const sql = `SELECT COUNT(*) as count FROM users WHERE restaurant_id = $1`;
  
  try {
    const result = await query(sql, [id]);
    return parseInt(result.rows[0].count);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error('RestaurantRepository: getUserCount failed', { error: message, id });
    throw error;
  }
}

export const restaurantRepository = {
  findAll,
  findById,
  create,
  update,
  deleteById,
  getUserCount,
};
