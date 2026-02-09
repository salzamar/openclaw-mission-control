import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Sami's agent ID - the owner/user
const SAMI_AGENT_ID = "kh72vevx3cztr7nhq6b9vy9prx80trs4";

export const send = mutation({
  args: {
    taskId: v.id("tasks"),
    agentId: v.id("agents"),
    content: v.string(),
    attachments: v.optional(v.array(v.id("documents"))),
  },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.taskId);
    if (!task) throw new Error("Task not found");

    await ctx.db.insert("messages", {
      taskId: args.taskId,
      fromAgentId: args.agentId,
      content: args.content,
      attachments: args.attachments || [],
    });

    await ctx.db.insert("activities", {
      type: "message",
      agentId: args.agentId,
      message: `commented on "${task.title}"`,
      targetId: args.taskId,
    });

    // Auto-subscribe sender to this task's thread
    const existingSub = await ctx.db
      .query("subscriptions")
      .filter((q) => 
        q.and(
          q.eq(q.field("agentId"), args.agentId),
          q.eq(q.field("taskId"), args.taskId)
        )
      )
      .first();
    
    if (!existingSub) {
      await ctx.db.insert("subscriptions", {
        agentId: args.agentId,
        taskId: args.taskId,
        subscribedAt: Date.now(),
      });
    }

    const agents = await ctx.db.query("agents").collect();
    const sender = await ctx.db.get(args.agentId);
    const senderIdStr = args.agentId.toString();
    
    // Check if this is Sami (owner) commenting - notify all assigned agents
    if (senderIdStr.includes(SAMI_AGENT_ID) || sender?.name === "Sami") {
      // Sami commented - notify all assignees who aren't the sender
      for (const assigneeId of task.assigneeIds) {
        if (assigneeId !== args.agentId) {
          await ctx.db.insert("notifications", {
            mentionedAgentId: assigneeId,
            content: `Sami commented on "${task.title}", awaiting your response`,
            delivered: false,
          });
        }
      }
    }
    const notifiedAgentIds = new Set<string>();
    
    // Create notifications for @mentions
    const mentionRegex = /@(\w+(?:[\/\s]\w+)?)/g;
    const mentions = args.content.match(mentionRegex) || [];
    
    for (const mention of mentions) {
      const name = mention.slice(1).trim(); // Remove @
      
      // Handle @all
      if (name.toLowerCase() === "all") {
        for (const agent of agents) {
          if (agent._id !== args.agentId) { // Don't notify sender
            await ctx.db.insert("notifications", {
              mentionedAgentId: agent._id,
              content: `${sender?.name || "Someone"} mentioned you in "${task.title}": ${args.content}`,
              delivered: false,
            });
            notifiedAgentIds.add(agent._id);
            
            // Auto-subscribe mentioned agents
            const hasSub = await ctx.db
              .query("subscriptions")
              .filter((q) => 
                q.and(
                  q.eq(q.field("agentId"), agent._id),
                  q.eq(q.field("taskId"), args.taskId)
                )
              )
              .first();
            if (!hasSub) {
              await ctx.db.insert("subscriptions", {
                agentId: agent._id,
                taskId: args.taskId,
                subscribedAt: Date.now(),
              });
            }
          }
        }
        continue;
      }
      
      // Find matching agent (case-insensitive, handle "UI/UX Expert" etc)
      const agent = agents.find(a => 
        a.name.toLowerCase() === name.toLowerCase() ||
        a.name.toLowerCase().replace(/[\s\/]+/g, '') === name.toLowerCase().replace(/[\s\/]+/g, '')
      );
      
      if (agent && agent._id !== args.agentId) { // Don't notify sender
        await ctx.db.insert("notifications", {
          mentionedAgentId: agent._id,
          content: `${sender?.name || "Someone"} mentioned you in "${task.title}": ${args.content}`,
          delivered: false,
        });
        notifiedAgentIds.add(agent._id);
        
        // Auto-subscribe mentioned agents
        const hasSub = await ctx.db
          .query("subscriptions")
          .filter((q) => 
            q.and(
              q.eq(q.field("agentId"), agent._id),
              q.eq(q.field("taskId"), args.taskId)
            )
          )
          .first();
        if (!hasSub) {
          await ctx.db.insert("subscriptions", {
            agentId: agent._id,
            taskId: args.taskId,
            subscribedAt: Date.now(),
          });
        }
      }
    }
    
    // Notify all other subscribers (who weren't already notified via @mention)
    const subscribers = await ctx.db
      .query("subscriptions")
      .filter((q) => q.eq(q.field("taskId"), args.taskId))
      .collect();
    
    for (const sub of subscribers) {
      if (sub.agentId !== args.agentId && !notifiedAgentIds.has(sub.agentId)) {
        await ctx.db.insert("notifications", {
          mentionedAgentId: sub.agentId,
          content: `${sender?.name || "Someone"} posted in "${task.title}" (subscribed): ${args.content}`,
          delivered: false,
        });
      }
    }
  },
});

// Query for tasks with pending comments from Sami (owner) that need agent response
export const getPendingComments = query({
  args: {
    agentId: v.optional(v.id("agents")),
  },
  handler: async (ctx, args) => {
    // Get all tasks that are not done
    const tasks = await ctx.db.query("tasks").collect();
    const activeTasks = tasks.filter(t => t.status !== "done");
    
    // Find Sami's agent record
    const agents = await ctx.db.query("agents").collect();
    const sami = agents.find(a => a.name === "Sami");
    
    if (!sami) return [];
    
    const pendingTasks = [];
    
    for (const task of activeTasks) {
      // If agentId filter provided, only check tasks assigned to that agent
      if (args.agentId && !task.assigneeIds.includes(args.agentId)) {
        continue;
      }
      
      // Get all messages for this task, ordered by creation time
      const messages = await ctx.db
        .query("messages")
        .withIndex("by_task", (q) => q.eq("taskId", task._id))
        .collect();
      
      if (messages.length === 0) continue;
      
      // Find the last message from Sami
      const samiMessages = messages.filter(m => m.fromAgentId === sami._id);
      if (samiMessages.length === 0) continue;
      
      const lastSamiMessage = samiMessages.reduce((latest, m) => 
        (m._creationTime > latest._creationTime) ? m : latest
      );
      
      // Check if any assignee has replied after Sami's last message
      const assigneeReplies = messages.filter(m => 
        task.assigneeIds.includes(m.fromAgentId) &&
        m._creationTime > lastSamiMessage._creationTime
      );
      
      // If no assignee replied after Sami's comment, it's pending
      if (assigneeReplies.length === 0) {
        const assignees = await Promise.all(
          task.assigneeIds.map(id => ctx.db.get(id))
        );
        
        pendingTasks.push({
          taskId: task._id,
          taskTitle: task.title,
          taskStatus: task.status,
          lastSamiComment: lastSamiMessage.content,
          commentTime: lastSamiMessage._creationTime,
          assignees: assignees.map(a => ({ 
            id: a?._id, 
            name: a?.name 
          })).filter(a => a.id),
        });
      }
    }
    
    // Sort by most recent comment first
    return pendingTasks.sort((a, b) => b.commentTime - a.commentTime);
  },
});
