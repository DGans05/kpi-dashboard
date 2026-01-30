/**
 * Extend Express Request interface with authenticated user data
 * This allows type-safe access to user info in protected routes
 */

declare namespace Express {
  export interface Request {
    /**
     * Authenticated user information attached by auth middleware
     * Undefined if request is not authenticated
     */
    user?: {
      /**
       * User's unique identifier
       * @example "user_123abc"
       */
      userId: string;

      /**
       * User's email address
       * @example "user@example.com"
       */
      email: string;

      /**
       * User's role for authorization
       * - admin: Full access
       * - manager: Can manage assigned restaurant
       * - viewer: Read-only access
       */
      role: 'admin' | 'manager' | 'viewer';

      /**
       * Restaurant ID user has access to
       * - null: System admin (access to all restaurants)
       * - string: Specific restaurant ID
       * @example "restaurant_456xyz" or null for admins
       */
      restaurantId: string | null;
    };
  }
}
