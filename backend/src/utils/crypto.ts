import bcrypt from 'bcrypt';
import { logger } from '../config/logger';

/**
 * Password hashing configuration
 */
const SALT_ROUNDS = 12;

/**
 * Hashes a password using bcrypt with 12 salt rounds
 * @param password - Plain text password to hash
 * @returns Promise resolving to the hashed password
 * @throws Error if password is empty or hashing fails
 */
export async function hashPassword(password: string): Promise<string> {
  try {
    // Validate input
    if (!password || typeof password !== 'string') {
      throw new Error('Password must be a non-empty string');
    }

    if (password.length < 8) {
      throw new Error('Password must be at least 8 characters long');
    }

    if (password.length > 128) {
      throw new Error('Password must not exceed 128 characters');
    }

    logger.debug('Hashing password', { length: password.length });

    // Hash the password
    const hash = await bcrypt.hash(password, SALT_ROUNDS);

    logger.debug('Password hashed successfully');

    return hash;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Failed to hash password', { error: errorMessage });
    throw new Error(`Password hashing failed: ${errorMessage}`);
  }
}

/**
 * Compares a plain text password with a hashed password
 * @param password - Plain text password to verify
 * @param hash - Hashed password to compare against
 * @returns Promise resolving to true if passwords match, false otherwise
 * @throws Error if comparison fails or inputs are invalid
 */
export async function comparePassword(
  password: string,
  hash: string
): Promise<boolean> {
  try {
    // Validate inputs
    if (!password || typeof password !== 'string') {
      throw new Error('Password must be a non-empty string');
    }

    if (!hash || typeof hash !== 'string') {
      throw new Error('Hash must be a non-empty string');
    }

    // Verify hash format (bcrypt hashes start with $2a$, $2b$, or $2y$)
    if (!/^\$2[aby]\$\d{2}\$/.test(hash)) {
      throw new Error('Invalid bcrypt hash format');
    }

    logger.debug('Comparing password with hash');

    // Compare password with hash
    const isMatch = await bcrypt.compare(password, hash);

    if (!isMatch) {
      logger.debug('Password comparison failed: passwords do not match');
      return false;
    }

    logger.debug('Password comparison successful: passwords match');

    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Failed to compare password', { error: errorMessage });
    throw new Error(`Password comparison failed: ${errorMessage}`);
  }
}

/**
 * Validates password strength
 * @param password - Password to validate
 * @returns Object with validation result and message
 */
export function validatePasswordStrength(password: string): {
  isValid: boolean;
  message: string;
  strength: 'weak' | 'medium' | 'strong';
} {
  if (!password || typeof password !== 'string') {
    return {
      isValid: false,
      message: 'Password must be a non-empty string',
      strength: 'weak',
    };
  }

  if (password.length < 8) {
    return {
      isValid: false,
      message: 'Password must be at least 8 characters long',
      strength: 'weak',
    };
  }

  if (password.length > 128) {
    return {
      isValid: false,
      message: 'Password must not exceed 128 characters',
      strength: 'weak',
    };
  }

  // Check password complexity
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChars = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

  const complexityScore = [
    hasUppercase,
    hasLowercase,
    hasNumbers,
    hasSpecialChars,
  ].filter(Boolean).length;

  let strength: 'weak' | 'medium' | 'strong' = 'weak';
  if (complexityScore >= 3 && password.length >= 12) {
    strength = 'strong';
  } else if (complexityScore >= 2 && password.length >= 10) {
    strength = 'medium';
  }

  return {
    isValid: true,
    message: `Password strength: ${strength}`,
    strength,
  };
}
