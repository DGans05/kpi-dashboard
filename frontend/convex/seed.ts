import { mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * One-time seed: creates two restaurants and KPI targets.
 * Run from Convex dashboard or CLI: npx convex run seed:run
 * After first user signs up, set their role to "admin" via usersAdmin.update.
 */
export const run = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("restaurants").first();
    if (existing) return { message: "Already seeded" };

    const r1 = await ctx.db.insert("restaurants", {
      name: "Downtown Delivery Hub",
      city: "New York",
      timezone: "America/New_York",
      isActive: true,
    });
    const r2 = await ctx.db.insert("restaurants", {
      name: "Westside Kitchen",
      city: "Los Angeles",
      timezone: "America/Los_Angeles",
      isActive: true,
    });

    await ctx.db.insert("kpi_targets", {
      restaurantId: r1,
      metric: "labour_cost_percent",
      target: 23,
      warning: 25,
      critical: 28,
    });
    await ctx.db.insert("kpi_targets", {
      restaurantId: r1,
      metric: "food_cost_percent",
      target: 32,
      warning: 35,
      critical: 38,
    });
    await ctx.db.insert("kpi_targets", {
      restaurantId: r2,
      metric: "labour_cost_percent",
      target: 23,
      warning: 25,
      critical: 28,
    });
    await ctx.db.insert("kpi_targets", {
      restaurantId: r2,
      metric: "food_cost_percent",
      target: 32,
      warning: 35,
      critical: 38,
    });

    return { message: "Seeded restaurants and targets", r1, r2 };
  },
});
