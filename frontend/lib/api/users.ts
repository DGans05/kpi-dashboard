/**
 * User API Client
 * Functions for user management
 */

import { apiRequest } from './client';

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

export interface CreateUserDTO {
  email: string;
  password: string;
  fullName?: string;
  role: 'admin' | 'manager' | 'viewer';
  restaurantId?: string | null;
}

export interface UpdateUserDTO {
  fullName?: string;
  role?: 'admin' | 'manager' | 'viewer';
  restaurantId?: string | null;
  isActive?: boolean;
}

/**
 * Get all users (admin only)
 */
export async function getUsers(): Promise<User[]> {
  const response = await apiRequest<{ users: User[] }>('/api/users');
  return response.users;
}

/**
 * Get single user by ID
 */
export async function getUser(id: string): Promise<User> {
  const response = await apiRequest<{ user: User }>(`/api/users/${id}`);
  return response.user;
}

/**
 * Create new user (admin only)
 */
export async function createUser(data: CreateUserDTO): Promise<User> {
  const response = await apiRequest<{ user: User }>('/api/users', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return response.user;
}

/**
 * Update user (admin only)
 */
export async function updateUser(id: string, data: UpdateUserDTO): Promise<User> {
  const response = await apiRequest<{ user: User }>(`/api/users/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  return response.user;
}

/**
 * Delete user (admin only)
 */
export async function deleteUser(id: string): Promise<void> {
  await apiRequest(`/api/users/${id}`, { method: 'DELETE' });
}

/**
 * Change own password
 */
export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<void> {
  await apiRequest('/api/users/change-password', {
    method: 'POST',
    body: JSON.stringify({ currentPassword, newPassword }),
  });
}
