import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";

// Sync objectives from external source (upsert array)
export const syncObjectives = internalMutation({
  args: {
    objectives: v.array(v.object({
      objectiveId: v.string(),
      title: v.string(),
      description: v.string(),
      status: v.union(v.literal("active"), v.literal("complete"), v.literal("backlog")),
      progress: v.number(),
      priority: v.union(v.literal("P0"), v.literal("P1"), v.literal("P2")),
      targetDate: v.optional(v.string()),
      completedDate: v.optional(v.string()),
      blockers: v.optional(v.string()),
      tenantId: v.optional(v.string()),
    })),
  },
  handler: async (ctx, args) => {
    const results = {
      created: 0,
      updated: 0,
      objectives: [] as string[],
    };

    for (const obj of args.objectives) {
      // Find existing by objectiveId
      const existing = await ctx.db
        .query("objectives")
        .withIndex("by_objectiveId", (q) => q.eq("objectiveId", obj.objectiveId))
        .first();

      if (existing) {
        await ctx.db.patch(existing._id, {
          title: obj.title,
          description: obj.description,
          status: obj.status,
          progress: obj.progress,
          priority: obj.priority,
          targetDate: obj.targetDate,
          completedDate: obj.completedDate,
          blockers: obj.blockers,
          tenantId: obj.tenantId,
        });
        results.updated++;
      } else {
        await ctx.db.insert("objectives", obj);
        results.created++;
      }
      results.objectives.push(obj.objectiveId);
    }

    return results;
  },
});

// Get all objectives
export const list = query({
  args: {
    status: v.optional(v.union(v.literal("active"), v.literal("complete"), v.literal("backlog"))),
  },
  handler: async (ctx, args) => {
    if (args.status) {
      return await ctx.db
        .query("objectives")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .collect();
    }
    return await ctx.db.query("objectives").collect();
  },
});

// Get single objective by objectiveId
export const get = query({
  args: { objectiveId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("objectives")
      .withIndex("by_objectiveId", (q) => q.eq("objectiveId", args.objectiveId))
      .first();
  },
});

// Create objective
export const create = mutation({
  args: {
    objectiveId: v.string(),
    title: v.string(),
    description: v.string(),
    status: v.union(v.literal("active"), v.literal("complete"), v.literal("backlog")),
    progress: v.number(),
    priority: v.union(v.literal("P0"), v.literal("P1"), v.literal("P2")),
    targetDate: v.optional(v.string()),
    blockers: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("objectives", {
      ...args,
      completedDate: undefined,
      tenantId: undefined,
    });
  },
});

// Update objective
export const update = mutation({
  args: {
    objectiveId: v.string(),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    status: v.optional(v.union(v.literal("active"), v.literal("complete"), v.literal("backlog"))),
    progress: v.optional(v.number()),
    priority: v.optional(v.union(v.literal("P0"), v.literal("P1"), v.literal("P2"))),
    targetDate: v.optional(v.string()),
    completedDate: v.optional(v.string()),
    blockers: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("objectives")
      .withIndex("by_objectiveId", (q) => q.eq("objectiveId", args.objectiveId))
      .first();

    if (!existing) {
      throw new Error(`Objective not found: ${args.objectiveId}`);
    }

    const updates: any = {};
    if (args.title !== undefined) updates.title = args.title;
    if (args.description !== undefined) updates.description = args.description;
    if (args.status !== undefined) updates.status = args.status;
    if (args.progress !== undefined) updates.progress = args.progress;
    if (args.priority !== undefined) updates.priority = args.priority;
    if (args.targetDate !== undefined) updates.targetDate = args.targetDate;
    if (args.completedDate !== undefined) updates.completedDate = args.completedDate;
    if (args.blockers !== undefined) updates.blockers = args.blockers;

    await ctx.db.patch(existing._id, updates);
    return { success: true, objectiveId: args.objectiveId };
  },
});
