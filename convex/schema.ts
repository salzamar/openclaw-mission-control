import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
	...authTables,
	agents: defineTable({
		name: v.string(),
		email: v.optional(v.string()),
		role: v.string(),
		status: v.union(
			v.literal("idle"),
			v.literal("active"),
			v.literal("blocked"),
		),
		level: v.union(v.literal("LEAD"), v.literal("INT"), v.literal("SPC")),
		avatar: v.string(),
		currentTaskId: v.optional(v.id("tasks")),
		sessionKey: v.optional(v.string()),
		systemPrompt: v.optional(v.string()),
		character: v.optional(v.string()),
		lore: v.optional(v.string()),
		workspaceId: v.optional(v.string()),
		tenantId: v.optional(v.string()),
	}),
	tasks: defineTable({
		title: v.string(),
		description: v.string(),
		status: v.union(
			v.literal("inbox"),
			v.literal("assigned"),
			v.literal("in_progress"),
			v.literal("review"),
			v.literal("done"),
			v.literal("archived"),
		),
		priority: v.optional(
			v.union(
				v.literal("critical"),
				v.literal("high"),
				v.literal("normal"),
				v.literal("low"),
			)
		),
		assigneeIds: v.array(v.id("agents")),
		tags: v.array(v.string()),
		borderColor: v.optional(v.string()),
		sessionKey: v.optional(v.string()),
		openclawRunId: v.optional(v.string()),
		startedAt: v.optional(v.number()),
		usedCodingTools: v.optional(v.boolean()),
		lastMessageTime: v.optional(v.number()),
		workspaceId: v.optional(v.string()),
		tenantId: v.optional(v.string()),
		projectId: v.optional(v.string()),
		objectiveId: v.optional(v.string()),
	})
		.index("by_status", ["status"])
		.index("by_status_priority", ["status", "priority"])
		.index("by_projectId", ["projectId"])
		.index("by_objectiveId", ["objectiveId"]),
	messages: defineTable({
		taskId: v.id("tasks"),
		fromAgentId: v.id("agents"),
		content: v.string(),
		attachments: v.array(v.id("documents")),
		workspaceId: v.optional(v.string()),
		tenantId: v.optional(v.string()),
	})
		.index("by_task", ["taskId"]),
	activities: defineTable({
		type: v.string(),
		agentId: v.id("agents"),
		message: v.string(),
		targetId: v.optional(v.id("tasks")),
		workspaceId: v.optional(v.string()),
		tenantId: v.optional(v.string()),
	})
		.index("by_agent", ["agentId"])
		.index("by_target", ["targetId"])
		.index("by_type", ["type"]),
	documents: defineTable({
		title: v.string(),
		content: v.string(),
		type: v.string(),
		path: v.optional(v.string()),
		taskId: v.optional(v.id("tasks")),
		createdByAgentId: v.optional(v.id("agents")),
		messageId: v.optional(v.id("messages")),
		workspaceId: v.optional(v.string()),
		tenantId: v.optional(v.string()),
	})
		.index("by_task", ["taskId"]),
	notifications: defineTable({
		mentionedAgentId: v.id("agents"),
		content: v.string(),
		delivered: v.boolean(),
		workspaceId: v.optional(v.string()),
		tenantId: v.optional(v.string()),
	}),
	// Thread subscriptions - auto-notify on task activity
	subscriptions: defineTable({
		agentId: v.id("agents"),
		taskId: v.id("tasks"),
		subscribedAt: v.number(),
	})
		.index("by_agent", ["agentId"])
		.index("by_task", ["taskId"])
		.index("by_agent_task", ["agentId", "taskId"]),
	apiTokens: defineTable({
		tokenHash: v.string(),
		tokenPrefix: v.string(),
		tenantId: v.string(),
		name: v.optional(v.string()),
		createdAt: v.number(),
		lastUsedAt: v.optional(v.number()),
		revokedAt: v.optional(v.number()),
	})
		.index("by_tokenHash", ["tokenHash"])
		.index("by_tenant", ["tenantId"]),
	tenantSettings: defineTable({
		tenantId: v.string(),
		retentionDays: v.number(),
		onboardingCompletedAt: v.optional(v.number()),
		createdAt: v.number(),
		updatedAt: v.number(),
	}).index("by_tenant", ["tenantId"]),
	rateLimits: defineTable({
		tenantId: v.string(),
		windowStartMs: v.number(),
		count: v.number(),
	}).index("by_tenant", ["tenantId"]),

	// Objectives - synced from OBJECTIVES.md
	objectives: defineTable({
		objectiveId: v.string(),  // e.g., "OBJ-001"
		title: v.string(),
		description: v.string(),
		status: v.union(v.literal("active"), v.literal("complete"), v.literal("backlog")),
		progress: v.number(),  // 0-100
		priority: v.union(v.literal("P0"), v.literal("P1"), v.literal("P2")),
		targetDate: v.optional(v.string()),
		completedDate: v.optional(v.string()),
		blockers: v.optional(v.string()),
		tenantId: v.optional(v.string()),
	})
		.index("by_status", ["status"])
		.index("by_objectiveId", ["objectiveId"]),

	// Projects - group tasks
	projects: defineTable({
		projectId: v.string(),
		name: v.string(),
		description: v.optional(v.string()),
		objectiveId: v.optional(v.string()),  // link to objective
		status: v.union(v.literal("active"), v.literal("complete"), v.literal("archived")),
		tenantId: v.optional(v.string()),
	})
		.index("by_status", ["status"])
		.index("by_projectId", ["projectId"]),

	// Planner State - runtime status
	plannerState: defineTable({
		status: v.string(),  // running, paused, completed
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
	}),
});
