import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";

// Sync projects from external source (upsert array)
export const syncProjects = internalMutation({
  args: {
    projects: v.array(v.object({
      projectId: v.string(),
      name: v.string(),
      description: v.optional(v.string()),
      objectiveId: v.optional(v.string()),
      status: v.union(v.literal("active"), v.literal("complete"), v.literal("archived")),
      tenantId: v.optional(v.string()),
    })),
  },
  handler: async (ctx, args) => {
    const results = {
      created: 0,
      updated: 0,
      projects: [] as string[],
    };

    for (const proj of args.projects) {
      // Find existing by projectId
      const existing = await ctx.db
        .query("projects")
        .withIndex("by_projectId", (q) => q.eq("projectId", proj.projectId))
        .first();

      if (existing) {
        await ctx.db.patch(existing._id, {
          name: proj.name,
          description: proj.description,
          objectiveId: proj.objectiveId,
          status: proj.status,
          tenantId: proj.tenantId,
        });
        results.updated++;
      } else {
        await ctx.db.insert("projects", proj);
        results.created++;
      }
      results.projects.push(proj.projectId);
    }

    return results;
  },
});

// Get all projects
export const list = query({
  args: {
    status: v.optional(v.union(v.literal("active"), v.literal("complete"), v.literal("archived"))),
    objectiveId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let projects;
    if (args.status) {
      projects = await ctx.db
        .query("projects")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .collect();
    } else {
      projects = await ctx.db.query("projects").collect();
    }

    if (args.objectiveId) {
      projects = projects.filter(p => p.objectiveId === args.objectiveId);
    }

    return projects;
  },
});

// Get single project by projectId
export const get = query({
  args: { projectId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("projects")
      .withIndex("by_projectId", (q) => q.eq("projectId", args.projectId))
      .first();
  },
});

// Create project
export const create = mutation({
  args: {
    projectId: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    objectiveId: v.optional(v.string()),
    status: v.union(v.literal("active"), v.literal("complete"), v.literal("archived")),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("projects", {
      ...args,
      tenantId: undefined,
    });
  },
});

// Update project
export const update = mutation({
  args: {
    projectId: v.string(),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    objectiveId: v.optional(v.string()),
    status: v.optional(v.union(v.literal("active"), v.literal("complete"), v.literal("archived"))),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("projects")
      .withIndex("by_projectId", (q) => q.eq("projectId", args.projectId))
      .first();

    if (!existing) {
      throw new Error(`Project not found: ${args.projectId}`);
    }

    const updates: any = {};
    if (args.name !== undefined) updates.name = args.name;
    if (args.description !== undefined) updates.description = args.description;
    if (args.objectiveId !== undefined) updates.objectiveId = args.objectiveId;
    if (args.status !== undefined) updates.status = args.status;

    await ctx.db.patch(existing._id, updates);
    return { success: true, projectId: args.projectId };
  },
});

// Get tasks for a project
export const getTasks = query({
  args: { projectId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("tasks")
      .withIndex("by_projectId", (q) => q.eq("projectId", args.projectId))
      .collect();
  },
});
