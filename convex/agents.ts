import { v } from "convex/values";
import { mutation, internalMutation } from "./_generated/server";

// Internal mutation for HTTP endpoint - update agent status by name
export const updateStatusByName = internalMutation({
  args: {
    agentName: v.string(),
    status: v.union(v.literal("idle"), v.literal("active"), v.literal("blocked")),
    currentTask: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Find agent by name (case-insensitive)
    const agents = await ctx.db.query("agents").collect();
    const agent = agents.find(a => 
      a.name.toLowerCase() === args.agentName.toLowerCase() ||
      a.role.toLowerCase() === args.agentName.toLowerCase()
    );

    if (!agent) {
      return { success: false, error: `Agent not found: ${args.agentName}` };
    }

    const updates: any = { status: args.status };

    // If currentTask provided, find the task and link it
    if (args.currentTask) {
      const tasks = await ctx.db.query("tasks").collect();
      const task = tasks.find(t => t.title.includes(args.currentTask!));
      if (task) {
        updates.currentTaskId = task._id;
      }
    } else if (args.status === "idle") {
      // Clear current task when idle
      updates.currentTaskId = undefined;
    }

    await ctx.db.patch(agent._id, updates);

    // Log activity
    await ctx.db.insert("activities", {
      type: "agent_status",
      agentId: agent._id,
      message: `[API] ${agent.name} status changed to ${args.status}`,
    });

    return { 
      success: true, 
      agentName: agent.name,
      status: args.status 
    };
  },
});

export const updateStatus = mutation({
  args: {
    id: v.id("agents"),
    status: v.union(
      v.literal("idle"),
      v.literal("active"),
      v.literal("blocked"),
    ),
  },
  handler: async (ctx, args) => {
    const agent = await ctx.db.get(args.id);
    if (!agent) throw new Error("Agent not found");

    await ctx.db.patch(args.id, { status: args.status });
  },
});

export const createAgent = mutation({
  args: {
    name: v.string(),
    email: v.optional(v.string()),
    role: v.string(),
    level: v.union(v.literal("LEAD"), v.literal("INT"), v.literal("SPC")),
    avatar: v.string(),
    status: v.union(v.literal("idle"), v.literal("active"), v.literal("blocked")),
    systemPrompt: v.optional(v.string()),
    character: v.optional(v.string()),
    lore: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("agents", {
      name: args.name,
      email: args.email,
      role: args.role,
      level: args.level,
      avatar: args.avatar,
      status: args.status,
      systemPrompt: args.systemPrompt,
      character: args.character,
      lore: args.lore,
    });
  },
});

export const updateAgent = mutation({
  args: {
    id: v.id("agents"),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    role: v.optional(v.string()),
    level: v.optional(v.union(v.literal("LEAD"), v.literal("INT"), v.literal("SPC"))),
    avatar: v.optional(v.string()),
    status: v.optional(v.union(v.literal("idle"), v.literal("active"), v.literal("blocked"))),
    systemPrompt: v.optional(v.string()),
    character: v.optional(v.string()),
    lore: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const agent = await ctx.db.get(args.id);
    if (!agent) throw new Error("Agent not found");

    const { id, ...updates } = args;
    const filteredUpdates: Record<string, any> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        filteredUpdates[key] = value;
      }
    }

    await ctx.db.patch(id, filteredUpdates);
  },
});

export const deleteAgent = mutation({
  args: { id: v.id("agents") },
  handler: async (ctx, args) => {
    const agent = await ctx.db.get(args.id);
    if (!agent) throw new Error("Agent not found");
    await ctx.db.delete(args.id);
  },
});
