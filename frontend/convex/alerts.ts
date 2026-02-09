import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { Doc, Id } from "./_generated/dataModel";

/**
 * Create a new alert rule
 */
export const createAlertRule = mutation({
  args: {
    restaurantId: v.id("restaurants"),
    metric: v.string(),
    operator: v.string(),
    threshold: v.number(),
    severity: v.string(),
    enabled: v.boolean(),
    notifyEmail: v.boolean(),
    notifySms: v.boolean(),
    recipients: v.array(v.string()),
    cooldownMinutes: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const ruleId = await ctx.db.insert("alert_rules", {
      ...args,
      createdBy: identity.subject,
    });

    return ruleId;
  },
});

/**
 * Get all alert rules for a restaurant
 */
export const getAlertRules = query({
  args: {
    restaurantId: v.optional(v.id("restaurants")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", identity.email))
      .first();

    if (!user) return [];

    // Admin sees all rules, others see only their restaurant's rules
    if (user.role === "admin" && !args.restaurantId) {
      return await ctx.db.query("alert_rules").collect();
    }

    const restaurantId = args.restaurantId || user.restaurantId;
    if (!restaurantId) return [];

    return await ctx.db
      .query("alert_rules")
      .withIndex("by_restaurant", (q) => q.eq("restaurantId", restaurantId))
      .collect();
  },
});

/**
 * Update an alert rule
 */
export const updateAlertRule = mutation({
  args: {
    ruleId: v.id("alert_rules"),
    enabled: v.optional(v.boolean()),
    threshold: v.optional(v.number()),
    recipients: v.optional(v.array(v.string())),
    notifyEmail: v.optional(v.boolean()),
    notifySms: v.optional(v.boolean()),
    cooldownMinutes: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const { ruleId, ...updates } = args;
    await ctx.db.patch(ruleId, updates);

    return ruleId;
  },
});

/**
 * Delete an alert rule
 */
export const deleteAlertRule = mutation({
  args: {
    ruleId: v.id("alert_rules"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    await ctx.db.delete(args.ruleId);
  },
});

/**
 * Get alert history
 */
export const getAlertHistory = query({
  args: {
    restaurantId: v.optional(v.id("restaurants")),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", identity.email))
      .first();

    if (!user) return [];

    const limit = args.limit || 50;
    const restaurantId = args.restaurantId || user.restaurantId;

    if (!restaurantId && user.role !== "admin") return [];

    let query = ctx.db.query("alert_history");

    if (restaurantId) {
      query = query.withIndex("by_restaurant", (q) =>
        q.eq("restaurantId", restaurantId)
      );
    }

    const alerts = await query
      .order("desc")
      .take(limit);

    // Enrich with rule details
    const enriched = await Promise.all(
      alerts.map(async (alert) => {
        const rule = await ctx.db.get(alert.ruleId);
        return {
          ...alert,
          rule,
        };
      })
    );

    return enriched;
  },
});

/**
 * Acknowledge an alert
 */
export const acknowledgeAlert = mutation({
  args: {
    alertId: v.id("alert_history"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    await ctx.db.patch(args.alertId, {
      acknowledged: true,
      acknowledgedBy: identity.email || identity.subject,
      acknowledgedAt: Date.now(),
    });
  },
});

/**
 * Internal: Check KPI values and trigger alerts
 * This will be called by a scheduled function (cron job)
 */
export const checkAndTriggerAlerts = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Get all enabled alert rules
    const rules = await ctx.db
      .query("alert_rules")
      .withIndex("by_restaurant_enabled", (q) => q.eq("enabled", true))
      .collect();

    const now = Date.now();
    const alertsTriggered: Id<"alert_history">[] = [];

    for (const rule of rules) {
      // Get the latest KPI entry for this restaurant
      const today = new Date().toISOString().split("T")[0];

      const latestEntry = await ctx.db
        .query("kpi_entries")
        .withIndex("by_restaurant_date", (q) =>
          q.eq("restaurantId", rule.restaurantId).eq("entryDate", today)
        )
        .first();

      if (!latestEntry) continue;

      // Check if the metric exceeds the threshold
      const metricValue = latestEntry[rule.metric as keyof typeof latestEntry];
      if (typeof metricValue !== "number") continue;

      let shouldAlert = false;
      switch (rule.operator) {
        case "greater_than":
          shouldAlert = metricValue > rule.threshold;
          break;
        case "less_than":
          shouldAlert = metricValue < rule.threshold;
          break;
        case "equals":
          shouldAlert = metricValue === rule.threshold;
          break;
      }

      if (!shouldAlert) continue;

      // Check cooldown - don't alert if we alerted recently
      const recentAlerts = await ctx.db
        .query("alert_history")
        .withIndex("by_rule", (q) => q.eq("ruleId", rule._id))
        .order("desc")
        .take(1);

      if (recentAlerts.length > 0) {
        const lastAlert = recentAlerts[0];
        const cooldownMs = rule.cooldownMinutes * 60 * 1000;
        if (now - lastAlert._creationTime < cooldownMs) {
          continue; // Still in cooldown period
        }
      }

      // Create alert history entry
      const message = `${rule.metric} is ${metricValue.toFixed(2)} (threshold: ${rule.threshold})`;

      const alertId = await ctx.db.insert("alert_history", {
        ruleId: rule._id,
        restaurantId: rule.restaurantId,
        metric: rule.metric,
        value: metricValue,
        threshold: rule.threshold,
        severity: rule.severity,
        message,
        acknowledged: false,
        notificationSent: false,
      });

      alertsTriggered.push(alertId);

      // Send email notifications if enabled
      if (rule.notifyEmail && rule.recipients.length > 0) {
        try {
          const restaurant = await ctx.db.get(rule.restaurantId);
          if (restaurant) {
            await ctx.scheduler.runAfter(0, internal.emails.sendAlertEmail, {
              to: rule.recipients,
              restaurantName: restaurant.name,
              metric: rule.metric,
              value: metricValue,
              threshold: rule.threshold,
              severity: rule.severity,
              message,
            });

            // Mark notification as sent
            await ctx.db.patch(alertId, {
              notificationSent: true,
            });
          }
        } catch (error) {
          console.error("Failed to send alert email:", error);
          await ctx.db.patch(alertId, {
            notificationError: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }
    }

    return { alertsTriggered: alertsTriggered.length };
  },
});
