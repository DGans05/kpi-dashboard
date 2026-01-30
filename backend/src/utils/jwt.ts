import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import { logger } from '../config/logger';

/**
 * JWT payload interface with user and restaurant information
 */
export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  restaurantId: string | null;
}

/**
 * Decoded JWT payload with standard JWT claims
 */
export interface DecodedToken extends JWTPayload {
  iat: number;  // Issued at
  exp: number;  // Expiration time
}

/**
 * JWT verification result with success/failure information
 */
export interface VerificationResult {
  success: boolean;
  payload?: DecodedToken;
  error?: string;
}

/**
 * Generate a JWT token with the provided payload
 * 
 * @param payload - User payload containing userId, email, role, and restaurantId
 * @returns Signed JWT token string
 * @throws Error if token generation fails
 */
export function generateToken(payload: JWTPayload): string {
  try {
    const token = jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.expiry,
      algorithm: 'HS256',
    } as jwt.SignOptions);

    logger.debug('JWT token generated', {
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
    });

    return token;
  } catch (error) {
    logger.error('Failed to generate JWT token', {
      error: error instanceof Error ? error.message : String(error),
      payload: { userId: payload.userId, email: payload.email },
    });
    throw new Error('Token generation failed');
  }
}

/**
 * Verify and decode a JWT token
 * 
 * @param token - JWT token string to verify
 * @returns Decoded payload if token is valid
 * @throws Error if token is invalid or expired
 */
export function verifyToken(token: string): DecodedToken {
  try {
    const decoded = jwt.verify(token, config.jwt.secret, {
      algorithms: ['HS256'],
    });

    logger.debug('JWT token verified successfully', {
      userId: (decoded as DecodedToken).userId,
    });

    return decoded as DecodedToken;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      logger.warn('JWT token expired', {
        expiredAt: error.expiredAt?.toISOString(),
      });
      throw new Error('Token has expired');
    }

    if (error instanceof jwt.JsonWebTokenError) {
      logger.warn('Invalid JWT token', {
        error: error.message,
      });
      throw new Error('Invalid token');
    }

    logger.error('JWT verification error', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw new Error('Token verification failed');
  }
}

/**
 * Safe verification that returns a result object instead of throwing
 * Useful for middleware or conditional logic
 * 
 * @param token - JWT token string to verify
 * @returns VerificationResult with success flag and payload or error message
 */
export function verifyTokenSafe(token: string): VerificationResult {
  try {
    const payload = verifyToken(token);
    return {
      success: true,
      payload,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Token verification failed',
    };
  }
}

/**
 * Extract token from Authorization header
 * 
 * @param authHeader - Authorization header value (e.g., "Bearer <token>")
 * @returns Token string or null if header is invalid
 */
export function extractTokenFromHeader(authHeader: string | undefined): string | null {
  if (!authHeader) {
    return null;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  return parts[1];
}

/**
 * Decode token without verification
 * Useful for inspecting token payload without validation
 * WARNING: Do not use for security-critical decisions
 * 
 * @param token - JWT token string
 * @returns Decoded payload or null if decoding fails
 */
export function decodeTokenWithoutVerification(token: string): DecodedToken | null {
  try {
    const decoded = jwt.decode(token, { complete: false });
    return decoded as DecodedToken | null;
  } catch (error) {
    logger.debug('Failed to decode token without verification', {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

/**
 * Get token expiration time
 * 
 * @param token - JWT token string
 * @returns Expiration timestamp in milliseconds, or null if token is invalid
 */
export function getTokenExpiration(token: string): number | null {
  try {
    const decoded = jwt.decode(token, { complete: false }) as DecodedToken | null;
    if (!decoded?.exp) {
      return null;
    }
    return decoded.exp * 1000; // Convert seconds to milliseconds
  } catch (error) {
    return null;
  }
}

/**
 * Check if token is expired
 * 
 * @param token - JWT token string
 * @returns True if token is expired, false otherwise
 */
export function isTokenExpired(token: string): boolean {
  try {
    const decoded = jwt.decode(token, { complete: false }) as DecodedToken | null;
    if (!decoded?.exp) {
      return true;
    }
    return decoded.exp * 1000 < Date.now();
  } catch (error) {
    return true;
  }
}

/**
 * Get time remaining until token expires (in milliseconds)
 * 
 * @param token - JWT token string
 * @returns Milliseconds until expiration, or 0 if already expired/invalid
 */
export function getTimeToTokenExpiration(token: string): number {
  try {
    const decoded = jwt.decode(token, { complete: false }) as DecodedToken | null;
    if (!decoded?.exp) {
      return 0;
    }
    const expiresAt = decoded.exp * 1000;
    const now = Date.now();
    return Math.max(0, expiresAt - now);
  } catch (error) {
    return 0;
  }
}
