/**
 * Restaurant Service
 * Business logic for restaurant management
 */

import { restaurantRepository, Restaurant } from '../repositories/restaurant.repository';
import { logger } from '../config/logger';

/**
 * Custom error classes
 */
export class NotFoundError extends Error {
  constructor(message = 'Restaurant not found') {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends Error {
  constructor(message = 'Conflict') {
    super(message);
    this.name = 'ConflictError';
  }
}

/**
 * Get all restaurants
 */
export async function getAllRestaurants(): Promise<Restaurant[]> {
  return restaurantRepository.findAll();
}

/**
 * Get restaurant by ID
 */
export async function getRestaurantById(id: string): Promise<Restaurant> {
  const restaurant = await restaurantRepository.findById(id);
  if (!restaurant) {
    throw new NotFoundError('Restaurant not found');
  }
  return restaurant;
}

/**
 * Create new restaurant
 */
export async function createRestaurant(data: {
  name: string;
  city?: string;
  timezone?: string;
}): Promise<Restaurant> {
  const restaurant = await restaurantRepository.create(data);
  logger.info('Restaurant created via service', { restaurantId: restaurant.id, name: data.name });
  return restaurant;
}

/**
 * Update restaurant
 */
export async function updateRestaurant(
  id: string,
  data: Partial<{
    name: string;
    city: string;
    timezone: string;
    isActive: boolean;
  }>
): Promise<Restaurant> {
  // Verify restaurant exists
  const existing = await restaurantRepository.findById(id);
  if (!existing) {
    throw new NotFoundError('Restaurant not found');
  }

  try {
    const restaurant = await restaurantRepository.update(id, data);
    logger.info('Restaurant updated via service', { restaurantId: id, changes: Object.keys(data) });
    return restaurant;
  } catch (error) {
    if (error instanceof Error && error.message === 'NOT_FOUND') {
      throw new NotFoundError('Restaurant not found');
    }
    throw error;
  }
}

/**
 * Delete restaurant
 */
export async function deleteRestaurant(id: string): Promise<void> {
  // Verify restaurant exists
  const existing = await restaurantRepository.findById(id);
  if (!existing) {
    throw new NotFoundError('Restaurant not found');
  }

  // Check if restaurant has users
  const userCount = await restaurantRepository.getUserCount(id);
  if (userCount > 0) {
    throw new ConflictError(`Cannot delete restaurant with ${userCount} assigned user(s). Reassign users first.`);
  }

  try {
    await restaurantRepository.deleteById(id);
    logger.info('Restaurant deleted via service', { restaurantId: id });
  } catch (error) {
    if (error instanceof Error && error.message === 'NOT_FOUND') {
      throw new NotFoundError('Restaurant not found');
    }
    if (error instanceof Error && error.message === 'HAS_USERS') {
      throw new ConflictError('Cannot delete restaurant with assigned users');
    }
    throw error;
  }
}

export const restaurantService = {
  getAllRestaurants,
  getRestaurantById,
  createRestaurant,
  updateRestaurant,
  deleteRestaurant,
  NotFoundError,
  ConflictError,
};
