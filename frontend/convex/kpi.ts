import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

type Role = "admin" | "manager" | "viewer";

async function getAppUser(ctx: { db: any; auth: any }) {
  const userId = await getAuthUserId(ctx);
  if (userId === null) throw new Error("Not authenticated");
  const user = await ctx.db.get(userId);
  if (!user) throw new Error("User not found");
  const role = (user.role ?? "viewer") as Role;
  return { userId, role, restaurantId: user.restaurantId ?? null };
}

function computeDerived(revenue: number, labourCost: number, foodCost: number, orders: number) {
  const labourCostPercent = revenue > 0 ? (labourCost / revenue) * 100 : 0;
  const foodCostPercent = revenue > 0 ? (foodCost / revenue) * 100 : 0;
  const avgTicket = orders > 0 ? revenue / orders : 0;
  return { labourCostPercent, foodCostPercent, avgTicket };
}

/**
 * List KPI entries with optional filters.
 */
export const listEntries = query({
  args: {
    restaurantId: v.optional(v.id("restaurants")),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { role, restaurantId: userRestaurantId } = await getAppUser(ctx);
    let restaurantId = args.restaurantId;
    if (role === "manager") {
      if (!userRestaurantId) throw new Error("No restaurant assigned");
      restaurantId = userRestaurantId;
    }

    const entries = restaurantId
      ? await ctx.db
          .query("kpi_entries")
          .withIndex("by_restaurant", (p) => p.eq("restaurantId", restaurantId))
          .collect()
      : await ctx.db.query("kpi_entries").collect();

    let list = entries.map((e) => ({
      id: e._id,
      restaurantId: e.restaurantId,
      entryDate: e.entryDate,
      revenue: e.revenue,
      labourCost: e.labourCost,
      labourCostPercent: e.labourCostPercent,
      foodCost: e.foodCost,
      foodCostPercent: e.foodCostPercent,
      orders: e.orders,
      avgTicket: e.avgTicket,
      createdAt: new Date(e._creationTime).toISOString(),
    }));

    if (args.startDate) list = list.filter((e) => e.entryDate >= args.startDate!);
    if (args.endDate) list = list.filter((e) => e.entryDate <= args.endDate!);
    list.sort((a, b) => b.entryDate.localeCompare(a.entryDate));

    const restaurantIds = [...new Set(list.map((e) => e.restaurantId))];
    const restaurants = await Promise.all(restaurantIds.map((id) => ctx.db.get(id)));
    const restMap = Object.fromEntries(restaurantIds.map((id, i) => [id, restaurants[i]]));

    return list.map((e) => ({
      ...e,
      restaurant: restMap[e.restaurantId]
        ? {
            id: e.restaurantId,
            name: restMap[e.restaurantId]!.name,
            city: restMap[e.restaurantId]!.city,
          }
        : undefined,
    }));
  },
});

/**
 * Get single KPI entry by ID.
 */
export const getEntry = query({
  args: { id: v.id("kpi_entries") },
  handler: async (ctx, args) => {
    const { role, restaurantId: userRestaurantId } = await getAppUser(ctx);
    const entry = await ctx.db.get(args.id);
    if (!entry) return null;
    if (role === "manager" && entry.restaurantId !== userRestaurantId) throw new Error("Forbidden");
    const rest = await ctx.db.get(entry.restaurantId);
    return {
      id: entry._id,
      restaurantId: entry.restaurantId,
      entryDate: entry.entryDate,
      revenue: entry.revenue,
      labourCost: entry.labourCost,
      labourCostPercent: entry.labourCostPercent,
      foodCost: entry.foodCost,
      foodCostPercent: entry.foodCostPercent,
      orders: entry.orders,
      avgTicket: entry.avgTicket,
      createdAt: new Date(entry._creationTime).toISOString(),
      restaurant: rest ? { id: rest._id, name: rest.name, city: rest.city } : undefined,
    };
  },
});

/**
 * Create KPI entry.
 */
export const createEntry = mutation({
  args: {
    restaurantId: v.id("restaurants"),
    entryDate: v.string(),
    revenue: v.number(),
    labourCost: v.number(),
    foodCost: v.number(),
    orders: v.number(),
  },
  handler: async (ctx, args) => {
    const { role, restaurantId: userRestaurantId } = await getAppUser(ctx);
    if (role === "manager") {
      if (!userRestaurantId) throw new Error("No restaurant assigned");
      if (args.restaurantId !== userRestaurantId) throw new Error("Can only create for your restaurant");
    }
    if (args.revenue < 0 || args.labourCost < 0 || args.foodCost < 0 || args.orders < 0) {
      throw new Error("Values must be non-negative");
    }
    const existing = await ctx.db
      .query("kpi_entries")
      .withIndex("by_restaurant", (p) => p.eq("restaurantId", args.restaurantId))
      .filter((q) => q.eq(q.field("entryDate"), args.entryDate))
      .first();
    if (existing) throw new Error("Entry already exists for this restaurant and date");

    const { labourCostPercent, foodCostPercent, avgTicket } = computeDerived(
      args.revenue,
      args.labourCost,
      args.foodCost,
      args.orders
    );
    const id = await ctx.db.insert("kpi_entries", {
      restaurantId: args.restaurantId,
      entryDate: args.entryDate,
      revenue: args.revenue,
      labourCost: args.labourCost,
      labourCostPercent,
      foodCost: args.foodCost,
      foodCostPercent,
      orders: args.orders,
      avgTicket,
    });
    const entry = await ctx.db.get(id);
    const rest = entry ? await ctx.db.get(entry.restaurantId) : null;
    if (!entry) throw new Error("Failed to create");
    return {
      id: entry._id,
      restaurantId: entry.restaurantId,
      entryDate: entry.entryDate,
      revenue: entry.revenue,
      labourCost: entry.labourCost,
      labourCostPercent: entry.labourCostPercent,
      foodCost: entry.foodCost,
      foodCostPercent: entry.foodCostPercent,
      orders: entry.orders,
      avgTicket: entry.avgTicket,
      createdAt: new Date(entry._creationTime).toISOString(),
      restaurant: rest ? { id: rest._id, name: rest.name, city: rest.city } : undefined,
    };
  },
});

/**
 * Update KPI entry.
 */
export const updateEntry = mutation({
  args: {
    id: v.id("kpi_entries"),
    revenue: v.optional(v.number()),
    labourCost: v.optional(v.number()),
    foodCost: v.optional(v.number()),
    orders: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { role, restaurantId: userRestaurantId } = await getAppUser(ctx);
    const existing = await ctx.db.get(args.id);
    if (!existing) throw new Error("KPI entry not found");
    if (role === "manager" && existing.restaurantId !== userRestaurantId) throw new Error("Forbidden");

    const revenue = args.revenue ?? existing.revenue;
    const labourCost = args.labourCost ?? existing.labourCost;
    const foodCost = args.foodCost ?? existing.foodCost;
    const orders = args.orders ?? existing.orders;
    const { labourCostPercent, foodCostPercent, avgTicket } = computeDerived(
      revenue,
      labourCost,
      foodCost,
      orders
    );
    await ctx.db.patch(args.id, {
      revenue,
      labourCost,
      labourCostPercent,
      foodCost,
      foodCostPercent,
      orders,
      avgTicket,
    });
    const entry = await ctx.db.get(args.id);
    const rest = entry ? await ctx.db.get(entry.restaurantId) : null;
    if (!entry) throw new Error("Not found");
    return {
      id: entry._id,
      restaurantId: entry.restaurantId,
      entryDate: entry.entryDate,
      revenue: entry.revenue,
      labourCost: entry.labourCost,
      labourCostPercent: entry.labourCostPercent,
      foodCost: entry.foodCost,
      foodCostPercent: entry.foodCostPercent,
      orders: entry.orders,
      avgTicket: entry.avgTicket,
      createdAt: new Date(entry._creationTime).toISOString(),
      restaurant: rest ? { id: rest._id, name: rest.name, city: rest.city } : undefined,
    };
  },
});

/**
 * Delete KPI entry (admin only).
 */
export const deleteEntry = mutation({
  args: { id: v.id("kpi_entries") },
  handler: async (ctx, args) => {
    const { role, restaurantId: userRestaurantId } = await getAppUser(ctx);
    if (role !== "admin") throw new Error("Admin only");
    const existing = await ctx.db.get(args.id);
    if (!existing) throw new Error("KPI entry not found");
    await ctx.db.delete(args.id);
  },
});

/**
 * Dashboard summary for a restaurant and date range.
 */
export const getDashboard = query({
  args: {
    restaurantId: v.id("restaurants"),
    startDate: v.string(),
    endDate: v.string(),
  },
  handler: async (ctx, args) => {
    const { role, restaurantId: userRestaurantId } = await getAppUser(ctx);
    if (role === "manager" && args.restaurantId !== userRestaurantId) throw new Error("Forbidden");

    const entries = await ctx.db
      .query("kpi_entries")
      .withIndex("by_restaurant", (p) => p.eq("restaurantId", args.restaurantId))
      .collect();
    const inRange = entries.filter(
      (e) => e.entryDate >= args.startDate && e.entryDate <= args.endDate
    );
    const rest = await ctx.db.get(args.restaurantId);
    const restaurantName = rest?.name ?? "Unknown";

    const totalRevenue = inRange.reduce((s, e) => s + e.revenue, 0);
    const totalOrders = inRange.reduce((s, e) => s + e.orders, 0);
    const totalLabour = inRange.reduce((s, e) => s + e.labourCost, 0);
    const totalFood = inRange.reduce((s, e) => s + e.foodCost, 0);
    const labourCostPercent = totalRevenue > 0 ? (totalLabour / totalRevenue) * 100 : 0;
    const foodCostPercent = totalRevenue > 0 ? (totalFood / totalRevenue) * 100 : 0;
    const avgTicket = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    const targets = await ctx.db
      .query("kpi_targets")
      .withIndex("by_restaurant_metric", (p) => p.eq("restaurantId", args.restaurantId))
      .collect();
    const labourTarget = targets.find((t) => t.metric === "labour_cost_percent");
    const foodTarget = targets.find((t) => t.metric === "food_cost_percent");

    const chartData = inRange
      .slice()
      .sort((a, b) => a.entryDate.localeCompare(b.entryDate))
      .map((e) => ({
        date: e.entryDate,
        revenue: e.revenue,
        labourCost: e.labourCost,
        foodCost: e.foodCost,
        orders: e.orders,
        labourCostPercent: e.labourCostPercent,
        foodCostPercent: e.foodCostPercent,
      }));

    const toTarget = (t: typeof labourTarget) =>
      t ? { target: t.target, warning: t.warning, critical: t.critical } : undefined;
    const getStatus = (value: number, t: { target: number; warning: number; critical: number } | undefined) => {
      if (!t) return "good" as const;
      if (value >= t.critical) return "critical" as const;
      if (value >= t.warning) return "warning" as const;
      return "good" as const;
    };

    return {
      restaurantId: args.restaurantId,
      restaurantName,
      dateRange: { startDate: args.startDate, endDate: args.endDate },
      current: {
        totalRevenue,
        totalOrders,
        avgTicket,
        labourCostPercent,
        foodCostPercent,
      },
      trends: { revenue: 0, orders: 0, labourCost: 0, foodCost: 0 },
      alerts: {
        labourCost: getStatus(labourCostPercent, toTarget(labourTarget)),
        foodCost: getStatus(foodCostPercent, toTarget(foodTarget)),
      },
      targets: {
        labourCost: labourTarget?.target ?? 0,
        foodCost: foodTarget?.target ?? 0,
      },
      chartData,
    };
  },
});

/**
 * Aggregated KPI data (by day for the date range).
 */
export const getAggregated = query({
  args: {
    restaurantId: v.optional(v.id("restaurants")),
    startDate: v.string(),
    endDate: v.string(),
    groupBy: v.optional(v.union(v.literal("day"), v.literal("week"), v.literal("month"))),
  },
  handler: async (ctx, args) => {
    const { role, restaurantId: userRestaurantId } = await getAppUser(ctx);
    const restaurantId = role === "manager" ? userRestaurantId : args.restaurantId;
    if (!restaurantId) throw new Error("Restaurant required");

    const entries = await ctx.db
      .query("kpi_entries")
      .withIndex("by_restaurant", (p) => p.eq("restaurantId", restaurantId))
      .collect();
    const inRange = entries.filter(
      (e) => e.entryDate >= args.startDate && e.entryDate <= args.endDate
    );
    const rest = await ctx.db.get(restaurantId);
    const restaurantName = rest && "name" in rest ? rest.name ?? "Unknown" : "Unknown";

    const targets = await ctx.db
      .query("kpi_targets")
      .withIndex("by_restaurant_metric", (p) => p.eq("restaurantId", restaurantId))
      .collect();
    const labourTarget = targets.find((t) => t.metric === "labour_cost_percent")?.target ?? 0;
    const foodTarget = targets.find((t) => t.metric === "food_cost_percent")?.target ?? 0;

    const sorted = inRange.slice().sort((a, b) => b.entryDate.localeCompare(a.entryDate));
    return sorted.map((e, i) => {
      const prev = sorted[i + 1];
      const labourPct = e.revenue > 0 ? (e.labourCost / e.revenue) * 100 : 0;
      const foodPct = e.revenue > 0 ? (e.foodCost / e.revenue) * 100 : 0;
      const labourStatus = labourPct >= 28 ? "critical" : labourPct >= 25 ? "warning" : "good";
      const foodStatus = foodPct >= 38 ? "critical" : foodPct >= 35 ? "warning" : "good";
      const labourTrend = prev && prev.revenue > 0
        ? ((labourPct - (prev.labourCost / prev.revenue) * 100) / ((prev.labourCost / prev.revenue) * 100)) * 100
        : 0;
      const foodTrend = prev && prev.revenue > 0
        ? ((foodPct - (prev.foodCost / prev.revenue) * 100) / ((prev.foodCost / prev.revenue) * 100)) * 100
        : 0;
      const revenueTrend = prev ? ((e.revenue - prev.revenue) / prev.revenue) * 100 : 0;
      return {
        period: e.entryDate,
        restaurantId,
        restaurantName,
        totalRevenue: e.revenue,
        totalLabourCost: e.labourCost,
        totalFoodCost: e.foodCost,
        totalOrders: e.orders,
        avgTicket: e.avgTicket,
        labourCostPercent: labourPct,
        foodCostPercent: foodPct,
        labourCostTarget: labourTarget,
        foodCostTarget: foodTarget,
        labourCostStatus: labourStatus as "good" | "warning" | "critical",
        foodCostStatus: foodStatus as "good" | "warning" | "critical",
        labourCostTrend: labourTrend,
        foodCostTrend: foodTrend,
        revenueTrend,
      };
    });
  },
});
