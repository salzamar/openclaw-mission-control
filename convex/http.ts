import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { auth } from "./auth";

const http = httpRouter();

auth.addHttpRoutes(http);

// OpenClaw webhook endpoint
http.route({
	path: "/openclaw/event",
	method: "POST",
	handler: httpAction(async (ctx, request) => {
		const body = await request.json();
		await ctx.runMutation(api.openclaw.receiveAgentEvent, body);
		return new Response(JSON.stringify({ ok: true }), {
			status: 200,
			headers: { "Content-Type": "application/json" },
		});
	}),
});

// Task status update endpoint for Planner integration
http.route({
	path: "/tasks/update",
	method: "POST",
	handler: httpAction(async (ctx, request) => {
		try {
			const body = await request.json();
			
			// Validate required fields
			if (!body.taskId || !body.status) {
				return new Response(
					JSON.stringify({ 
						success: false, 
						error: "Missing required fields: taskId and status" 
					}),
					{ status: 400, headers: { "Content-Type": "application/json" } }
				);
			}

			// Validate status
			const validStatuses = ["INBOX", "ASSIGNED", "IN_PROGRESS", "DONE", 
			                       "inbox", "assigned", "in_progress", "review", "done", "archived"];
			if (!validStatuses.includes(body.status)) {
				return new Response(
					JSON.stringify({ 
						success: false, 
						error: `Invalid status. Valid values: ${validStatuses.join(", ")}` 
					}),
					{ status: 400, headers: { "Content-Type": "application/json" } }
				);
			}

			const result = await ctx.runMutation(internal.tasks.updateStatusByExternalId, {
				taskId: body.taskId,
				status: body.status,
				assignee: body.assignee,
			});

			if (!result.success) {
				return new Response(
					JSON.stringify(result),
					{ status: 404, headers: { "Content-Type": "application/json" } }
				);
			}

			return new Response(
				JSON.stringify(result),
				{ status: 200, headers: { "Content-Type": "application/json" } }
			);
		} catch (error) {
			return new Response(
				JSON.stringify({ 
					success: false, 
					error: error instanceof Error ? error.message : "Unknown error" 
				}),
				{ status: 500, headers: { "Content-Type": "application/json" } }
			);
		}
	}),
});

// Objectives sync endpoint - upsert objectives array
http.route({
	path: "/objectives/sync",
	method: "POST",
	handler: httpAction(async (ctx, request) => {
		try {
			const body = await request.json();
			
			if (!body.objectives || !Array.isArray(body.objectives)) {
				return new Response(
					JSON.stringify({ 
						success: false, 
						error: "Missing required field: objectives (array)" 
					}),
					{ status: 400, headers: { "Content-Type": "application/json" } }
				);
			}

			const result = await ctx.runMutation(internal.objectives.syncObjectives, {
				objectives: body.objectives,
			});

			return new Response(
				JSON.stringify({ ...result, success: true }),
				{ status: 200, headers: { "Content-Type": "application/json" } }
			);
		} catch (error) {
			return new Response(
				JSON.stringify({ 
					success: false, 
					error: error instanceof Error ? error.message : "Unknown error" 
				}),
				{ status: 500, headers: { "Content-Type": "application/json" } }
			);
		}
	}),
});

// Projects sync endpoint - upsert projects array
http.route({
	path: "/projects/sync",
	method: "POST",
	handler: httpAction(async (ctx, request) => {
		try {
			const body = await request.json();
			
			if (!body.projects || !Array.isArray(body.projects)) {
				return new Response(
					JSON.stringify({ 
						success: false, 
						error: "Missing required field: projects (array)" 
					}),
					{ status: 400, headers: { "Content-Type": "application/json" } }
				);
			}

			const result = await ctx.runMutation(internal.projects.syncProjects, {
				projects: body.projects,
			});

			return new Response(
				JSON.stringify({ ...result, success: true }),
				{ status: 200, headers: { "Content-Type": "application/json" } }
			);
		} catch (error) {
			return new Response(
				JSON.stringify({ 
					success: false, 
					error: error instanceof Error ? error.message : "Unknown error" 
				}),
				{ status: 500, headers: { "Content-Type": "application/json" } }
			);
		}
	}),
});

// Planner state sync endpoint
http.route({
	path: "/planner/sync",
	method: "POST",
	handler: httpAction(async (ctx, request) => {
		try {
			const body = await request.json();
			
			// Validate required fields
			const required = ["status", "lastRun", "iterationCount", "costToday", "costResetDate"];
			for (const field of required) {
				if (body[field] === undefined) {
					return new Response(
						JSON.stringify({ 
							success: false, 
							error: `Missing required field: ${field}` 
						}),
						{ status: 400, headers: { "Content-Type": "application/json" } }
					);
				}
			}

			const result = await ctx.runMutation(internal.plannerState.syncPlannerState, {
				status: body.status,
				lastRun: body.lastRun,
				iterationCount: body.iterationCount,
				costToday: body.costToday,
				costResetDate: body.costResetDate,
				currentObjective: body.currentObjective,
				nextTask: body.nextTask,
				waitingApproval: body.waitingApproval || [],
				tenantId: body.tenantId,
			});

			return new Response(
				JSON.stringify({ ...result, success: true }),
				{ status: 200, headers: { "Content-Type": "application/json" } }
			);
		} catch (error) {
			return new Response(
				JSON.stringify({ 
					success: false, 
					error: error instanceof Error ? error.message : "Unknown error" 
				}),
				{ status: 500, headers: { "Content-Type": "application/json" } }
			);
		}
	}),
});

// Agent status update endpoint
http.route({
	path: "/agents/status",
	method: "POST",
	handler: httpAction(async (ctx, request) => {
		try {
			const body = await request.json();
			
			if (!body.agentName || !body.status) {
				return new Response(
					JSON.stringify({ 
						success: false, 
						error: "Missing required fields: agentName and status" 
					}),
					{ status: 400, headers: { "Content-Type": "application/json" } }
				);
			}

			const validStatuses = ["idle", "active", "blocked"];
			if (!validStatuses.includes(body.status)) {
				return new Response(
					JSON.stringify({ 
						success: false, 
						error: `Invalid status. Valid values: ${validStatuses.join(", ")}` 
					}),
					{ status: 400, headers: { "Content-Type": "application/json" } }
				);
			}

			const result = await ctx.runMutation(internal.agents.updateStatusByName, {
				agentName: body.agentName,
				status: body.status,
				currentTask: body.currentTask,
			});

			if (!result.success) {
				return new Response(
					JSON.stringify(result),
					{ status: 404, headers: { "Content-Type": "application/json" } }
				);
			}

			return new Response(
				JSON.stringify(result),
				{ status: 200, headers: { "Content-Type": "application/json" } }
			);
		} catch (error) {
			return new Response(
				JSON.stringify({ 
					success: false, 
					error: error instanceof Error ? error.message : "Unknown error" 
				}),
				{ status: 500, headers: { "Content-Type": "application/json" } }
			);
		}
	}),
});



// Create task with auto-assignment endpoint
http.route({
	path: "/tasks/create",
	method: "POST",
	handler: httpAction(async (ctx, request) => {
		try {
			const body = await request.json();
			
			if (!body.title) {
				return new Response(
					JSON.stringify({ 
						success: false, 
						error: "Missing required field: title" 
					}),
					{ status: 400, headers: { "Content-Type": "application/json" } }
				);
			}

			const result = await ctx.runMutation(internal.tasks.createTaskWithAgent, {
				title: body.title,
				description: body.description || "",
				status: body.status,
				tags: body.tags,
				priority: body.priority,
				assignee: body.assignee,
				projectId: body.projectId,
				objectiveId: body.objectiveId,
			});

			return new Response(
				JSON.stringify(result),
				{ status: 200, headers: { "Content-Type": "application/json" } }
			);
		} catch (error) {
			return new Response(
				JSON.stringify({ 
					success: false, 
					error: error instanceof Error ? error.message : "Unknown error" 
				}),
				{ status: 500, headers: { "Content-Type": "application/json" } }
			);
		}
	}),
});

// Fix unassigned tasks endpoint (maintenance)
http.route({
	path: "/tasks/fix-unassigned",
	method: "POST",
	handler: httpAction(async (ctx, request) => {
		try {
			const result = await ctx.runMutation(internal.tasks.fixUnassignedTasks, {});

			return new Response(
				JSON.stringify({ success: true, ...result }),
				{ status: 200, headers: { "Content-Type": "application/json" } }
			);
		} catch (error) {
			return new Response(
				JSON.stringify({ 
					success: false, 
					error: error instanceof Error ? error.message : "Unknown error" 
				}),
				{ status: 500, headers: { "Content-Type": "application/json" } }
			);
		}
	}),
});

// Upload document endpoint
http.route({
  path: "/documents/upload",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.json();
      const { title, content, type, path, taskId, agentName } = body;

      if (!title || !content || !type) {
        return new Response(JSON.stringify({ error: "Missing required fields: title, content, type" }), { 
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
      }

      // Find agent by name (default to first agent if not specified)
      const agents = await ctx.runQuery(api.queries.listAgents);
      let agent = agents.find((a: any) => a.name?.toLowerCase() === agentName?.toLowerCase());
      if (!agent) agent = agents[0];
      if (!agent) {
        return new Response(JSON.stringify({ error: "No agents found" }), { 
          status: 404,
          headers: { "Content-Type": "application/json" }
        });
      }

      // Find task by title if taskId is a string like "SAAS-SPEC-001"
      let resolvedTaskId = undefined;
      if (taskId) {
        const tasks = await ctx.runQuery(api.queries.listTasks, {});
        const task = tasks.find((t: any) => t.title?.includes(taskId));
        if (task) resolvedTaskId = task._id;
      }

      const docId = await ctx.runMutation(api.documents.create, {
        title,
        content,
        type,
        path,
        taskId: resolvedTaskId,
        agentId: agent._id,
      });

      return new Response(JSON.stringify({ success: true, documentId: docId, taskId: resolvedTaskId }), { 
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    } catch (error: any) {
      return new Response(JSON.stringify({ error: error.message }), { 
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
  }),
});

export default http;
