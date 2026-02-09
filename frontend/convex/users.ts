import { query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

/**
 * Get the current authenticated user with role, restaurant, etc.
 * Returns null if not authenticated.
 */
export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return null;

    const user = await ctx.db.get(userId);
    if (!user) return null;

    let restaurant: { id: string; name: string; city: string } | undefined;
    if (user.restaurantId) {
      const rest = await ctx.db.get(user.restaurantId);
      if (rest) {
        restaurant = {
          id: user.restaurantId,
          name: rest.name,
          city: rest.city,
        };
      }
    }

    const role = user.role ?? "viewer";
    const isActive = user.isActive ?? true;

    return {
      id: userId,
      email: user.email ?? "",
      fullName: user.fullName ?? user.name ?? null,
      role,
      restaurantId: user.restaurantId ?? null,
      isActive,
      restaurant,
    };
  },
});
