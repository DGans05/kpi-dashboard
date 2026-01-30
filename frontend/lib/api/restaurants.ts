/**
 * Restaurant API Client
 * Functions for restaurant management
 */

import { apiRequest } from './client';

export interface Restaurant {
  id: string;
  name: string;
  city: string;
  timezone: string;
  isActive: boolean;
  createdAt: string;
  managerCount?: number;
}

export interface CreateRestaurantDTO {
  name: string;
  city?: string;
  timezone?: string;
}

export interface UpdateRestaurantDTO {
  name?: string;
  city?: string;
  timezone?: string;
  isActive?: boolean;
}

/**
 * Get all restaurants (admin only)
 */
export async function getRestaurants(): Promise<Restaurant[]> {
  const response = await apiRequest<{ restaurants: Restaurant[] }>('/api/restaurants');
  return response.restaurants;
}

/**
 * Get single restaurant by ID
 */
export async function getRestaurant(id: string): Promise<Restaurant> {
  const response = await apiRequest<{ restaurant: Restaurant }>(`/api/restaurants/${id}`);
  return response.restaurant;
}

/**
 * Create new restaurant (admin only)
 */
export async function createRestaurant(data: CreateRestaurantDTO): Promise<Restaurant> {
  const response = await apiRequest<{ restaurant: Restaurant }>('/api/restaurants', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return response.restaurant;
}

/**
 * Update restaurant (admin only)
 */
export async function updateRestaurant(
  id: string,
  data: UpdateRestaurantDTO
): Promise<Restaurant> {
  const response = await apiRequest<{ restaurant: Restaurant }>(`/api/restaurants/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  return response.restaurant;
}

/**
 * Delete restaurant (admin only)
 */
export async function deleteRestaurant(id: string): Promise<void> {
  await apiRequest(`/api/restaurants/${id}`, { method: 'DELETE' });
}
