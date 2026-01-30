/**
 * User Service
 * Business logic for user management
 */

import { userRepository, User } from '../repositories/user.repository';
import { hashPassword, comparePassword } from '../utils/crypto';
import { logger } from '../config/logger';

/**
 * Custom error classes
 */
export class NotFoundError extends Error {
  constructor(message = 'User not found') {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends Error {
  constructor(message = 'Email already exists') {
    super(message);
    this.name = 'ConflictError';
  }
}

export class ForbiddenError extends Error {
  constructor(message = 'Operation not allowed') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

export class ValidationError extends Error {
  constructor(message = 'Validation failed') {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Get all users
 */
export async function getAllUsers(): Promise<User[]> {
  return userRepository.findAll();
}

/**
 * Get user by ID
 */
export async function getUserById(id: string): Promise<User> {
  const user = await userRepository.findById(id);
  if (!user) {
    throw new NotFoundError('User not found');
  }
  return user;
}

/**
 * Create new user
 */
export async function createUser(data: {
  email: string;
  password: string;
  fullName?: string;
  role: 'admin' | 'manager' | 'viewer';
  restaurantId?: string | null;
}): Promise<User> {
  // Check if email already exists
  const existing = await userRepository.findByEmail(data.email);
  if (existing) {
    throw new ConflictError('Email already exists');
  }

  // Hash password
  const passwordHash = await hashPassword(data.password);

  try {
    const user = await userRepository.create({
      email: data.email,
      passwordHash,
      fullName: data.fullName,
      role: data.role,
      restaurantId: data.restaurantId,
    });

    logger.info('User created via service', { userId: user.id, email: data.email });
    return user;
  } catch (error) {
    if (error instanceof Error && error.message === 'EMAIL_EXISTS') {
      throw new ConflictError('Email already exists');
    }
    throw error;
  }
}

/**
 * Update user
 */
export async function updateUser(
  id: string,
  data: Partial<{
    fullName: string;
    role: 'admin' | 'manager' | 'viewer';
    restaurantId: string | null;
    isActive: boolean;
  }>
): Promise<User> {
  // Verify user exists
  const existing = await userRepository.findById(id);
  if (!existing) {
    throw new NotFoundError('User not found');
  }

  try {
    const user = await userRepository.update(id, data);
    logger.info('User updated via service', { userId: id, changes: Object.keys(data) });
    return user;
  } catch (error) {
    if (error instanceof Error && error.message === 'NOT_FOUND') {
      throw new NotFoundError('User not found');
    }
    throw error;
  }
}

/**
 * Delete user
 */
export async function deleteUser(id: string, currentUserId: string): Promise<void> {
  // Prevent self-deletion
  if (id === currentUserId) {
    throw new ForbiddenError('You cannot delete your own account');
  }

  // Verify user exists
  const existing = await userRepository.findById(id);
  if (!existing) {
    throw new NotFoundError('User not found');
  }

  try {
    await userRepository.deleteById(id);
    logger.info('User deleted via service', { userId: id });
  } catch (error) {
    if (error instanceof Error && error.message === 'NOT_FOUND') {
      throw new NotFoundError('User not found');
    }
    throw error;
  }
}

/**
 * Change user password
 */
export async function changePassword(
  id: string,
  currentPassword: string,
  newPassword: string
): Promise<void> {
  // Get user with password
  const user = await userRepository.findByEmailWithPassword(
    (await userRepository.findById(id))?.email || ''
  );

  if (!user) {
    throw new NotFoundError('User not found');
  }

  // Verify current password
  const isValid = await comparePassword(currentPassword, user.passwordHash);
  if (!isValid) {
    throw new ValidationError('Current password is incorrect');
  }

  // Hash and update new password
  const newPasswordHash = await hashPassword(newPassword);
  await userRepository.updatePassword(id, newPasswordHash);

  logger.info('User password changed via service', { userId: id });
}

/**
 * Reset user password (admin function)
 */
export async function resetPassword(id: string, newPassword: string): Promise<void> {
  // Verify user exists
  const existing = await userRepository.findById(id);
  if (!existing) {
    throw new NotFoundError('User not found');
  }

  // Hash and update new password
  const newPasswordHash = await hashPassword(newPassword);
  await userRepository.updatePassword(id, newPasswordHash);

  logger.info('User password reset by admin', { userId: id });
}

export const userService = {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  changePassword,
  resetPassword,
  NotFoundError,
  ConflictError,
  ForbiddenError,
  ValidationError,
};
