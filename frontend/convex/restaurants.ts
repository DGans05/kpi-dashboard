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
 * List all restaurants (admin) or active only.
 */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not authenticated");

    const restaurants = await ctx.db.query("restaurants").collect();
    return restaurants.map((r) => ({
      id: r._id,
      name: r.name,
      city: r.city,
      timezone: r.timezone,
      isActive: r.isActive,
      createdAt: new Date(r._creationTime).toISOString(),
    }));
  },
});

/**
 * Get one restaurant by ID.
 */
export const get = query({
  args: { id: v.id("restaurants") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not authenticated");

    const r = await ctx.db.get(args.id);
    if (!r) return null;
    return {
      id: r._id,
      name: r.name,
      city: r.city,
      timezone: r.timezone,
      isActive: r.isActive,
      createdAt: new Date(r._creationTime).toISOString(),
    };
  },
});

/**
 * Create restaurant (admin only).
 */
export const create = mutation({
  args: {
    name: v.string(),
    city: v.optional(v.string()),
    timezone: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const id = await ctx.db.insert("restaurants", {
      name: args.name,
      city: args.city ?? "",
      timezone: args.timezone ?? "UTC",
      isActive: true,
    });
    const r = await ctx.db.get(id);
    if (!r) throw new Error("Failed to create");
    return {
      id: r._id,
      name: r.name,
      city: r.city,
      timezone: r.timezone,
      isActive: r.isActive,
      createdAt: new Date(r._creationTime).toISOString(),
    };
  },
});

/**
 * Update restaurant (admin only).
 */
export const update = mutation({
  args: {
    id: v.id("restaurants"),
    name: v.optional(v.string()),
    city: v.optional(v.string()),
    timezone: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const { id, ...rest } = args;
    const patch: Record<string, unknown> = {};
    if (rest.name !== undefined) patch.name = rest.name;
    if (rest.city !== undefined) patch.city = rest.city;
    if (rest.timezone !== undefined) patch.timezone = rest.timezone;
    if (rest.isActive !== undefined) patch.isActive = rest.isActive;
    if (Object.keys(patch).length === 0) {
      const r = await ctx.db.get(id);
      if (!r) return null;
      return {
        id: r._id,
        name: r.name,
        city: r.city,
        timezone: r.timezone,
        isActive: r.isActive,
        createdAt: new Date(r._creationTime).toISOString(),
      };
    }
    await ctx.db.patch(id, patch);
    const r = await ctx.db.get(id);
    if (!r) return null;
    return {
      id: r._id,
      name: r.name,
      city: r.city,
      timezone: r.timezone,
      isActive: r.isActive,
      createdAt: new Date(r._creationTime).toISOString(),
    };
  },
});

/**
 * Delete restaurant (admin only).
 */
export const remove = mutation({
  args: { id: v.id("restaurants") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.delete(args.id);
  },
});
