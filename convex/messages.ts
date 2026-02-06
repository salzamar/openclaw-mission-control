import { v } from "convex/values";
import { mutation } from "./_generated/server";

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
