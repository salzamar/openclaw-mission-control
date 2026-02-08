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

export default http;
