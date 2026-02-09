import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const roleValidator = v.union(
  v.literal("admin"),
  v.literal("manager"),
  v.literal("viewer")
);

export default defineSchema({
  ...authTables,
  users: defineTable({
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),
    role: v.optional(roleValidator),
    restaurantId: v.optional(v.id("restaurants")),
    fullName: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  })
    .index("email", ["email"])
    .index("phone", ["phone"]),

  restaurants: defineTable({
    name: v.string(),
    city: v.string(),
    timezone: v.string(),
    isActive: v.boolean(),
  }),

  kpi_entries: defineTable({
    restaurantId: v.id("restaurants"),
    entryDate: v.string(),
    revenue: v.number(),
    labourCost: v.number(),
    labourCostPercent: v.number(),
    foodCost: v.number(),
    foodCostPercent: v.number(),
    orders: v.number(),
    avgTicket: v.number(),
  })
    .index("by_restaurant_date", ["restaurantId", "entryDate"])
    .index("by_restaurant", ["restaurantId"])
    .index("by_entry_date", ["entryDate"]),

  kpi_targets: defineTable({
    restaurantId: v.id("restaurants"),
    metric: v.string(),
    target: v.number(),
    warning: v.number(),
    critical: v.number(),
  }).index("by_restaurant_metric", ["restaurantId", "metric"]),

  audit_logs: defineTable({
    userId: v.optional(v.string()),
    action: v.string(),
    resourceType: v.string(),
    resourceId: v.optional(v.string()),
    changes: v.optional(v.any()),
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
  }),
});
