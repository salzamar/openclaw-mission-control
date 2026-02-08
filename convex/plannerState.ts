import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";

// Sync planner state from external source
export const syncPlannerState = internalMutation({
  args: {
    status: v.string(),
    lastRun: v.string(),
    iterationCount: v.number(),
    costToday: v.number(),
    costResetDate: v.string(),
    currentObjective: v.optional(v.string()),
    nextTask: v.optional(v.string()),
    waitingApproval: v.array(v.object({
      taskId: v.string(),
      reason: v.string(),
    })),
    tenantId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Get existing state (we only keep one record)
    const existing = await ctx.db.query("plannerState").first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        status: args.status,
        lastRun: args.lastRun,
        iterationCount: args.iterationCount,
        costToday: args.costToday,
        costResetDate: args.costResetDate,
        currentObjective: args.currentObjective,
        nextTask: args.nextTask,
        waitingApproval: args.waitingApproval,
        tenantId: args.tenantId,
      });
      return { success: true, action: "updated" };
    } else {
      await ctx.db.insert("plannerState", args);
      return { success: true, action: "created" };
    }
  },
});

// Get current planner state
export const get = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("plannerState").first();
  },
});

// Update planner status only
export const updateStatus = mutation({
  args: {
    status: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("plannerState").first();
    if (existing) {
      await ctx.db.patch(existing._id, { status: args.status });
      return { success: true };
    }
    throw new Error("Planner state not initialized");
  },
});

// Add item to waiting approval
export const addWaitingApproval = mutation({
  args: {
    taskId: v.string(),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("plannerState").first();
    if (!existing) {
      throw new Error("Planner state not initialized");
    }

    const waitingApproval = [...existing.waitingApproval, { taskId: args.taskId, reason: args.reason }];
    await ctx.db.patch(existing._id, { waitingApproval });
    return { success: true };
  },
});

// Remove item from waiting approval
export const removeWaitingApproval = mutation({
  args: {
    taskId: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("plannerState").first();
    if (!existing) {
      throw new Error("Planner state not initialized");
    }

    const waitingApproval = existing.waitingApproval.filter(w => w.taskId !== args.taskId);
    await ctx.db.patch(existing._id, { waitingApproval });
    return { success: true };
  },
});

// Update cost tracking
export const updateCost = mutation({
  args: {
    costToday: v.number(),
    costResetDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("plannerState").first();
    if (!existing) {
      throw new Error("Planner state not initialized");
    }

    const updates: any = { costToday: args.costToday };
    if (args.costResetDate) {
      updates.costResetDate = args.costResetDate;
    }

    await ctx.db.patch(existing._id, updates);
    return { success: true };
  },
});

// Initialize planner state if not exists
export const initialize = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("plannerState").first();
    if (existing) {
      return { success: true, action: "exists", id: existing._id };
    }

    const id = await ctx.db.insert("plannerState", {
      status: "paused",
      lastRun: new Date().toISOString(),
      iterationCount: 0,
      costToday: 0,
      costResetDate: new Date().toISOString().split("T")[0],
      waitingApproval: [],
    });

    return { success: true, action: "created", id };
  },
});
