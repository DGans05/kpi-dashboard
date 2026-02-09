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
 * List audit logs (admin only).
 */
export const list = query({
  args: {
    limit: v.optional(v.number()),
    resourceType: v.optional(v.string()),
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    let q = ctx.db.query("audit_logs").order("desc");
    const logs = await (args.limit ? q.take(args.limit) : q.collect());
    let filtered = logs;
    if (args.resourceType) filtered = filtered.filter((l) => l.resourceType === args.resourceType);
    if (args.userId) filtered = filtered.filter((l) => l.userId === args.userId);
    return filtered.map((l) => ({
      id: l._id,
      userId: l.userId,
      action: l.action,
      resourceType: l.resourceType,
      resourceId: l.resourceId,
      changes: l.changes,
      ipAddress: l.ipAddress ?? null,
      userAgent: l.userAgent ?? null,
      createdAt: new Date(l._creationTime).toISOString(),
    }));
  },
});

/**
 * Log an audit entry (internal use; call from other mutations if needed).
 */
export const log = mutation({
  args: {
    userId: v.optional(v.string()),
    action: v.string(),
    resourceType: v.string(),
    resourceId: v.optional(v.string()),
    changes: v.optional(v.any()),
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("audit_logs", {
      userId: args.userId,
      action: args.action,
      resourceType: args.resourceType,
      resourceId: args.resourceId,
      changes: args.changes,
      ipAddress: args.ipAddress,
      userAgent: args.userAgent,
    });
  },
});
