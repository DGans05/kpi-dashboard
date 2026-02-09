import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

async function requireAdmin(ctx: { db: any; auth: any }) {
  const userId = await getAuthUserId(ctx);
  if (userId === null) throw new Error("Not authenticated");
  const user = await ctx.db.get(userId);
  if (!user || user.role !== "admin") throw new Error("Admin only");
  return userId;
}

/**
 * List all users (admin only).
 */
export const list = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const users = await ctx.db.query("users").collect();
    const result = await Promise.all(
      users.map(async (u) => {
        let restaurant: { id: string; name: string; city: string } | undefined;
        if (u.restaurantId) {
          const r = await ctx.db.get(u.restaurantId);
          if (r) restaurant = { id: u.restaurantId, name: r.name, city: r.city };
        }
        return {
          id: u._id,
          email: u.email ?? "",
          fullName: u.fullName ?? u.name ?? null,
          role: u.role ?? "viewer",
          restaurantId: u.restaurantId ?? null,
          isActive: u.isActive ?? true,
          createdAt: new Date(u._creationTime).toISOString(),
          restaurant,
        };
      })
    );
    return result;
  },
});

/**
 * Get one user by ID (admin only).
 */
export const get = query({
  args: { id: v.id("users") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const u = await ctx.db.get(args.id);
    if (!u) return null;
    let restaurant: { id: string; name: string; city: string } | undefined;
    if (u.restaurantId) {
      const r = await ctx.db.get(u.restaurantId);
      if (r) restaurant = { id: u.restaurantId, name: r.name, city: r.city };
    }
    return {
      id: u._id,
      email: u.email ?? "",
      fullName: u.fullName ?? u.name ?? null,
      role: u.role ?? "viewer",
      restaurantId: u.restaurantId ?? null,
      isActive: u.isActive ?? true,
      createdAt: new Date(u._creationTime).toISOString(),
      restaurant,
    };
  },
});

/**
 * Update user profile (admin only). Does not change password; use Convex Auth for that.
 */
export const update = mutation({
  args: {
    id: v.id("users"),
    fullName: v.optional(v.string()),
    role: v.optional(v.union(v.literal("admin"), v.literal("manager"), v.literal("viewer"))),
    restaurantId: v.optional(v.union(v.id("restaurants"), v.null())),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const { id, ...rest } = args;
    const patch: Record<string, unknown> = {};
    if (rest.fullName !== undefined) patch.fullName = rest.fullName;
    if (rest.role !== undefined) patch.role = rest.role;
    if (rest.restaurantId !== undefined) patch.restaurantId = rest.restaurantId;
    if (rest.isActive !== undefined) patch.isActive = rest.isActive;
    if (Object.keys(patch).length > 0) await ctx.db.patch(id, patch);
    const u = await ctx.db.get(id);
    if (!u) return null;
    let restaurant: { id: string; name: string; city: string } | undefined;
    if (u.restaurantId) {
      const r = await ctx.db.get(u.restaurantId);
      if (r) restaurant = { id: u.restaurantId, name: r.name, city: r.city };
    }
    return {
      id: u._id,
      email: u.email ?? "",
      fullName: u.fullName ?? u.name ?? null,
      role: u.role ?? "viewer",
      restaurantId: u.restaurantId ?? null,
      isActive: u.isActive ?? true,
      createdAt: new Date(u._creationTime).toISOString(),
      restaurant,
    };
  },
});
