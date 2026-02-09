import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// List all notifications (optionally filter by delivered status)
export const list = query({
  args: {
    delivered: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    let notifications = await ctx.db.query("notifications").collect();
    
    if (args.delivered !== undefined) {
      notifications = notifications.filter(n => n.delivered === args.delivered);
    }
    
    return notifications;
  },
});

// List undelivered notifications
export const listUndelivered = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("notifications")
      .filter((q) => q.eq(q.field("delivered"), false))
      .collect();
  },
});

// Create a notification (usually when @mentioning an agent)
export const create = mutation({
  args: {
    mentionedAgentId: v.id("agents"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("notifications", {
      mentionedAgentId: args.mentionedAgentId,
      content: args.content,
      delivered: false,
    });
  },
});

// Mark a notification as delivered
export const markDelivered = mutation({
  args: {
    id: v.id("notifications"),
  },
  handler: async (ctx, args) => {
    const notification = await ctx.db.get(args.id);
    if (!notification) throw new Error("Notification not found");
    
    await ctx.db.patch(args.id, { delivered: true });
  },
});

// Create notifications for @mentions in a message
export const createFromMentions = mutation({
  args: {
    content: v.string(),
    taskId: v.optional(v.id("tasks")),
  },
  handler: async (ctx, args) => {
    // Find @mentions in content
    const mentionRegex = /@(\w+(?:\s+\w+)?)/g;
    const mentions = args.content.match(mentionRegex) || [];
    
    // Get all agents to match names
    const agents = await ctx.db.query("agents").collect();
    
    const createdNotifications = [];
    
    for (const mention of mentions) {
      const name = mention.slice(1); // Remove @
      
      // Handle @all
      if (name.toLowerCase() === "all") {
        for (const agent of agents) {
          const id = await ctx.db.insert("notifications", {
            mentionedAgentId: agent._id,
            content: args.content,
            delivered: false,
          });
          createdNotifications.push(id);
        }
        continue;
      }
      
      // Find matching agent (case-insensitive)
      const agent = agents.find(a => 
        a.name.toLowerCase() === name.toLowerCase() ||
        a.name.toLowerCase().replace(/\s+/g, '') === name.toLowerCase().replace(/\s+/g, '')
      );
      
      if (agent) {
        const id = await ctx.db.insert("notifications", {
          mentionedAgentId: agent._id,
          content: args.content,
          delivered: false,
        });
        createdNotifications.push(id);
      }
    }
    
    return createdNotifications;
  },
});

// Delete a notification
export const remove = mutation({
  args: {
    id: v.id("notifications"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

// List notifications for a specific agent (with unread count)
export const listForAgent = query({
  args: {
    agentId: v.id("agents"),
    unreadOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    let notifications = await ctx.db
      .query("notifications")
      .filter((q) => q.eq(q.field("mentionedAgentId"), args.agentId))
      .order("desc")
      .collect();
    
    if (args.unreadOnly) {
      notifications = notifications.filter(n => !n.delivered);
    }
    
    return notifications;
  },
});

// Get unread notification count for an agent
export const getUnreadCount = query({
  args: {
    agentId: v.id("agents"),
  },
  handler: async (ctx, args) => {
    const notifications = await ctx.db
      .query("notifications")
      .filter((q) => 
        q.and(
          q.eq(q.field("mentionedAgentId"), args.agentId),
          q.eq(q.field("delivered"), false)
        )
      )
      .collect();
    
    return notifications.length;
  },
});

// Mark all notifications as read for an agent
export const markAllRead = mutation({
  args: {
    agentId: v.id("agents"),
  },
  handler: async (ctx, args) => {
    const notifications = await ctx.db
      .query("notifications")
      .filter((q) => 
        q.and(
          q.eq(q.field("mentionedAgentId"), args.agentId),
          q.eq(q.field("delivered"), false)
        )
      )
      .collect();
    
    for (const notification of notifications) {
      await ctx.db.patch(notification._id, { delivered: true });
    }
    
    return { marked: notifications.length };
  },
});
