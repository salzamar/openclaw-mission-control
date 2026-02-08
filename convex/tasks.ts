import { v } from "convex/values";
import { mutation, internalMutation } from "./_generated/server";

// Internal mutation for HTTP endpoint - finds task by taskId in title
export const updateStatusByExternalId = internalMutation({
  args: {
    taskId: v.string(), // e.g. "SAAS-SPEC-001"
    status: v.union(
      v.literal("INBOX"),
      v.literal("ASSIGNED"),
      v.literal("IN_PROGRESS"),
      v.literal("DONE"),
      // Also support lowercase for compatibility
      v.literal("inbox"),
      v.literal("assigned"),
      v.literal("in_progress"),
      v.literal("review"),
      v.literal("done"),
      v.literal("archived")
    ),
    assignee: v.optional(v.string()), // agent name like "analyst"
  },
  handler: async (ctx, args) => {
    // Find task by taskId in title
    const tasks = await ctx.db.query("tasks").collect();
    const task = tasks.find(t => t.title.includes(args.taskId));
    
    if (!task) {
      return { success: false, error: `Task not found: ${args.taskId}` };
    }

    // Normalize status to lowercase
    const statusMap: Record<string, string> = {
      "INBOX": "inbox",
      "ASSIGNED": "assigned", 
      "IN_PROGRESS": "in_progress",
      "DONE": "done",
    };
    const normalizedStatus = statusMap[args.status] || args.status;

    // Build update object
    const updates: any = { 
      status: normalizedStatus as any 
    };

    // If assignee provided, find agent by name
    if (args.assignee) {
      const agents = await ctx.db.query("agents").collect();
      const agent = agents.find(a => 
        a.name.toLowerCase() === args.assignee!.toLowerCase() ||
        a.role.toLowerCase() === args.assignee!.toLowerCase()
      );
      if (agent) {
        updates.assigneeIds = [agent._id];
      }
    }

    await ctx.db.patch(task._id, updates);

    // Log activity (find a system agent or use first agent)
    const agents = await ctx.db.query("agents").collect();
    const systemAgent = agents.find(a => a.name.toLowerCase().includes("theeb")) || agents[0];
    
    if (systemAgent) {
      await ctx.db.insert("activities", {
        type: "status_update",
        agentId: systemAgent._id,
        message: `[API] Updated "${task.title}" to ${normalizedStatus}`,
        targetId: task._id,
      });
    }

    return { 
      success: true, 
      taskId: args.taskId,
      internalId: task._id,
      status: normalizedStatus 
    };
  },
});

export const updateStatus = mutation({
  args: {
    taskId: v.id("tasks"),
    status: v.union(
      v.literal("inbox"),
      v.literal("assigned"),
      v.literal("in_progress"),
      v.literal("review"),
      v.literal("done"),
      v.literal("archived")
    ),
    agentId: v.id("agents"),
  },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.taskId);
    if (!task) throw new Error("Task not found");

    await ctx.db.patch(args.taskId, { status: args.status });

    await ctx.db.insert("activities", {
      type: "status_update",
      agentId: args.agentId,
      message: `changed status of "${task.title}" to ${args.status}`,
      targetId: args.taskId,
    });
  },
});

export const updateAssignees = mutation({
  args: {
    taskId: v.id("tasks"),
    assigneeIds: v.array(v.id("agents")),
    agentId: v.id("agents"),
  },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.taskId);
    if (!task) throw new Error("Task not found");

    await ctx.db.patch(args.taskId, { assigneeIds: args.assigneeIds });

    await ctx.db.insert("activities", {
      type: "assignees_update",
      agentId: args.agentId,
      message: `updated assignees for "${task.title}"`,
      targetId: args.taskId,
    });
  },
});

export const createTask = mutation({
  args: {
    title: v.string(),
    description: v.string(),
    status: v.string(),
    tags: v.array(v.string()),
    borderColor: v.optional(v.string()),
    priority: v.optional(
      v.union(
        v.literal("critical"),
        v.literal("high"),
        v.literal("normal"),
        v.literal("low")
      )
    ),
  },
  handler: async (ctx, args) => {
    const taskId = await ctx.db.insert("tasks", {
      title: args.title,
      description: args.description,
      status: args.status as any,
      assigneeIds: [],
      tags: args.tags,
      borderColor: args.borderColor,
      priority: args.priority || "normal",
    });
    return taskId;
  },
});

export const archiveTask = mutation({
  args: {
    taskId: v.id("tasks"),
    agentId: v.id("agents"),
  },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.taskId);
    if (!task) throw new Error("Task not found");

    await ctx.db.patch(args.taskId, { status: "archived" });

    await ctx.db.insert("activities", {
      type: "status_update",
      agentId: args.agentId,
      message: `archived "${task.title}"`,
      targetId: args.taskId,
    });
  },
});

export const linkRun = mutation({
  args: {
    taskId: v.id("tasks"),
    openclawRunId: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.taskId, {
      openclawRunId: args.openclawRunId,
      startedAt: Date.now(),
    });
  },
});

export const updateTask = mutation({
  args: {
    taskId: v.id("tasks"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    priority: v.optional(
      v.union(
        v.literal("critical"),
        v.literal("high"),
        v.literal("normal"),
        v.literal("low")
      )
    ),
    agentId: v.id("agents"),
  },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.taskId);
    if (!task) throw new Error("Task not found");

    const fields: any = {};
    const updates: string[] = [];

    if (args.title !== undefined) {
      fields.title = args.title;
      updates.push("title");
    }
    if (args.description !== undefined) {
      fields.description = args.description;
      updates.push("description");
    }
    if (args.tags !== undefined) {
      fields.tags = args.tags;
      updates.push("tags");
    }
    if (args.priority !== undefined) {
      fields.priority = args.priority;
      updates.push("priority");
    }
    
    await ctx.db.patch(args.taskId, fields);

    if (updates.length > 0) {
      await ctx.db.insert("activities", {
        type: "task_update",
        agentId: args.agentId,
        message: `updated ${updates.join(", ")} of "${task.title}"`,
        targetId: args.taskId,
      });
    }
  },
});

// Batch mutations for bulk actions
export const batchUpdateStatus = mutation({
  args: {
    taskIds: v.array(v.id("tasks")),
    status: v.union(
      v.literal("inbox"),
      v.literal("assigned"),
      v.literal("in_progress"),
      v.literal("review"),
      v.literal("done"),
      v.literal("archived")
    ),
    agentId: v.id("agents"),
  },
  handler: async (ctx, args) => {
    const tasks = await Promise.all(args.taskIds.map(id => ctx.db.get(id)));
    for (let i = 0; i < args.taskIds.length; i++) {
      const task = tasks[i];
      if (task) {
        await ctx.db.patch(args.taskIds[i], { status: args.status });
      }
    }
    await ctx.db.insert("activities", {
      type: "bulk_status_update",
      agentId: args.agentId,
      message: `updated status of ${args.taskIds.length} tasks to ${args.status}`,
      targetId: args.taskIds[0],
    });
  },
});

export const batchUpdatePriority = mutation({
  args: {
    taskIds: v.array(v.id("tasks")),
    priority: v.union(
      v.literal("critical"),
      v.literal("high"),
      v.literal("normal"),
      v.literal("low")
    ),
    agentId: v.id("agents"),
  },
  handler: async (ctx, args) => {
    for (const taskId of args.taskIds) {
      await ctx.db.patch(taskId, { priority: args.priority });
    }
    await ctx.db.insert("activities", {
      type: "bulk_priority_update",
      agentId: args.agentId,
      message: `updated priority of ${args.taskIds.length} tasks to ${args.priority}`,
      targetId: args.taskIds[0],
    });
  },
});

export const batchAssign = mutation({
  args: {
    taskIds: v.array(v.id("tasks")),
    assigneeIds: v.array(v.id("agents")),
    agentId: v.id("agents"),
  },
  handler: async (ctx, args) => {
    for (const taskId of args.taskIds) {
      await ctx.db.patch(taskId, { assigneeIds: args.assigneeIds });
    }
    await ctx.db.insert("activities", {
      type: "bulk_assign",
      agentId: args.agentId,
      message: `assigned ${args.taskIds.length} tasks`,
      targetId: args.taskIds[0],
    });
  },
});

export const batchArchive = mutation({
  args: {
    taskIds: v.array(v.id("tasks")),
    agentId: v.id("agents"),
  },
  handler: async (ctx, args) => {
    for (const taskId of args.taskIds) {
      await ctx.db.patch(taskId, { status: "archived" });
    }
    await ctx.db.insert("activities", {
      type: "bulk_archive",
      agentId: args.agentId,
      message: `archived ${args.taskIds.length} tasks`,
      targetId: args.taskIds[0],
    });
  },
});

export const batchDeleteTasks = mutation({
  args: {
    taskIds: v.array(v.id("tasks")),
    agentId: v.id("agents"),
  },
  handler: async (ctx, args) => {
    const count = args.taskIds.length;
    for (const taskId of args.taskIds) {
      await ctx.db.delete(taskId);
    }
    await ctx.db.insert("activities", {
      type: "bulk_delete",
      agentId: args.agentId,
      message: `deleted ${count} tasks`,
    });
  },
});
