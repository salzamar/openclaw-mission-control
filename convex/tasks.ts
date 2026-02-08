import { v } from "convex/values";
import { mutation, internalMutation } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";

// Agent assignment patterns based on task type
// Order matters! More specific patterns first, generic last
const AGENT_PATTERNS: { patterns: RegExp[]; agentName: string }[] = [
  // UI/UX - check early since "design" is generic
  {
    patterns: [/\bui\b/i, /\bux\b/i, /wireframe/i, /mockup/i, /usability/i, /user.*flow/i, /\binterface\b/i, /prototype/i],
    agentName: "UI/UX Expert",
  },
  // Analyst - research/requirements
  {
    patterns: [/requirement/i, /research/i, /\banalysis\b/i, /user stor/i, /\bspec\b/i, /discovery/i, /market.*study/i],
    agentName: "Analyst",
  },
  // Architect - system design
  {
    patterns: [/architect/i, /system.*design/i, /\bschema\b/i, /api.*design/i, /database/i, /infrastructure/i, /tech.*stack/i],
    agentName: "Architect",
  },
  // Marketing - content/campaigns
  {
    patterns: [/marketing/i, /\bcontent\b/i, /\bseo\b/i, /campaign/i, /\bbrand/i, /social.*media/i, /\bblog\b/i, /newsletter/i],
    agentName: "Marketing",
  },
  // Sales - GTM/pricing
  {
    patterns: [/\bsales\b/i, /pricing/i, /proposal/i, /\bgtm\b/i, /go.*to.*market/i, /revenue/i, /\bicp\b/i],
    agentName: "Sales Expert",
  },
  // Tester - QA (more specific patterns to avoid matching "[TEST]")
  {
    patterns: [/\bqa\b/i, /quality.*assurance/i, /test.*plan/i, /test.*case/i, /bug.*report/i, /security.*audit/i, /validation/i, /\btesting\b/i],
    agentName: "Tester",
  },
  // Coder - implementation (generic, comes last)
  {
    patterns: [/implement/i, /\bcode\b/i, /develop/i, /\bbuild\b/i, /\bfix\b/i, /deploy/i, /devops/i, /\bbug\b/i, /feature/i, /refactor/i],
    agentName: "Coder",
  },
];

// Helper to find agent by name (case-insensitive)
async function findAgentByName(ctx: any, name: string): Promise<Doc<"agents"> | null> {
  const agents = await ctx.db.query("agents").collect();
  return agents.find((a: Doc<"agents">) =>
    a.name.toLowerCase() === name.toLowerCase() ||
    a.role.toLowerCase() === name.toLowerCase()
  ) || null;
}

// Auto-assign agent based on task title, description, and tags
async function autoAssignAgent(
  ctx: any,
  title: string,
  description: string,
  tags: string[]
): Promise<Id<"agents"> | null> {
  const searchText = `${title} ${description} ${tags.join(" ")}`.toLowerCase();

  for (const { patterns, agentName } of AGENT_PATTERNS) {
    for (const pattern of patterns) {
      if (pattern.test(searchText)) {
        const agent = await findAgentByName(ctx, agentName);
        if (agent) return agent._id;
      }
    }
  }

  // Default to Theeb if no pattern matches
  const theeb = await findAgentByName(ctx, "Theeb");
  return theeb?._id || null;
}

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
    assignee: v.optional(v.string()), // Agent name to assign
    autoAssign: v.optional(v.boolean()), // Auto-assign based on task type
  },
  handler: async (ctx, args) => {
    let assigneeIds: Id<"agents">[] = [];

    // If explicit assignee provided, resolve to agent ID
    if (args.assignee) {
      const agent = await findAgentByName(ctx, args.assignee);
      if (agent) {
        assigneeIds = [agent._id];
      }
    }
    // Auto-assign if no explicit assignee and autoAssign is true (default: true)
    else if (args.autoAssign !== false) {
      const agentId = await autoAssignAgent(ctx, args.title, args.description, args.tags);
      if (agentId) {
        assigneeIds = [agentId];
      }
    }

    const taskId = await ctx.db.insert("tasks", {
      title: args.title,
      description: args.description,
      status: args.status as any,
      assigneeIds,
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

// Fix unassigned tasks - assigns agents based on task type
export const fixUnassignedTasks = internalMutation({
  args: {},
  handler: async (ctx) => {
    const tasks = await ctx.db.query("tasks").collect();
    const unassignedTasks = tasks.filter(
      (t) => !t.assigneeIds || t.assigneeIds.length === 0
    );

    const results: { taskId: string; title: string; assignedTo: string | null }[] = [];

    for (const task of unassignedTasks) {
      const agentId = await autoAssignAgent(
        ctx,
        task.title,
        task.description,
        task.tags
      );

      if (agentId) {
        await ctx.db.patch(task._id, { assigneeIds: [agentId] });
        const agent = await ctx.db.get(agentId);
        results.push({
          taskId: task._id,
          title: task.title,
          assignedTo: agent?.name || null,
        });
      } else {
        results.push({
          taskId: task._id,
          title: task.title,
          assignedTo: null,
        });
      }
    }

    return {
      totalUnassigned: unassignedTasks.length,
      fixed: results.filter((r) => r.assignedTo).length,
      results,
    };
  },
});

// Create task from HTTP endpoint with agent name resolution
export const createTaskWithAgent = internalMutation({
  args: {
    title: v.string(),
    description: v.string(),
    status: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    priority: v.optional(v.string()),
    assignee: v.optional(v.string()),
    projectId: v.optional(v.string()),
    objectiveId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const tags = args.tags || [];
    let assigneeIds: Id<"agents">[] = [];

    // Resolve assignee name to ID
    if (args.assignee) {
      const agent = await findAgentByName(ctx, args.assignee);
      if (agent) {
        assigneeIds = [agent._id];
      }
    }
    // Auto-assign if no explicit assignee
    if (assigneeIds.length === 0) {
      const agentId = await autoAssignAgent(ctx, args.title, args.description, tags);
      if (agentId) {
        assigneeIds = [agentId];
      }
    }

    const taskId = await ctx.db.insert("tasks", {
      title: args.title,
      description: args.description,
      status: (args.status as any) || "inbox",
      assigneeIds,
      tags,
      priority: (args.priority as any) || "normal",
      projectId: args.projectId,
      objectiveId: args.objectiveId,
    });

    // Get assignee name for response
    let assigneeName: string | null = null;
    if (assigneeIds.length > 0) {
      const agent = await ctx.db.get(assigneeIds[0]);
      assigneeName = agent?.name || null;
    }

    return {
      success: true,
      taskId,
      assignee: assigneeName,
    };
  },
});
