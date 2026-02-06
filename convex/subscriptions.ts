import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Subscribe an agent to a task's thread
export const subscribe = mutation({
  args: {
    agentId: v.id("agents"),
    taskId: v.id("tasks"),
  },
  handler: async (ctx, args) => {
    // Check if already subscribed
    const existing = await ctx.db
      .query("subscriptions")
      .withIndex("by_agent_task", (q) => 
        q.eq("agentId", args.agentId).eq("taskId", args.taskId)
      )
      .first();
    
    if (existing) {
      return existing._id; // Already subscribed
    }
    
    return await ctx.db.insert("subscriptions", {
      agentId: args.agentId,
      taskId: args.taskId,
      subscribedAt: Date.now(),
    });
  },
});

// Unsubscribe an agent from a task
export const unsubscribe = mutation({
  args: {
    agentId: v.id("agents"),
    taskId: v.id("tasks"),
  },
  handler: async (ctx, args) => {
    const subscription = await ctx.db
      .query("subscriptions")
      .withIndex("by_agent_task", (q) => 
        q.eq("agentId", args.agentId).eq("taskId", args.taskId)
      )
      .first();
    
    if (subscription) {
      await ctx.db.delete(subscription._id);
    }
  },
});

// List all subscribers for a task
export const listByTask = query({
  args: {
    taskId: v.id("tasks"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("subscriptions")
      .withIndex("by_task", (q) => q.eq("taskId", args.taskId))
      .collect();
  },
});

// List all subscriptions for an agent
export const listByAgent = query({
  args: {
    agentId: v.id("agents"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("subscriptions")
      .withIndex("by_agent", (q) => q.eq("agentId", args.agentId))
      .collect();
  },
});

// Check if agent is subscribed to task
export const isSubscribed = query({
  args: {
    agentId: v.id("agents"),
    taskId: v.id("tasks"),
  },
  handler: async (ctx, args) => {
    const subscription = await ctx.db
      .query("subscriptions")
      .withIndex("by_agent_task", (q) => 
        q.eq("agentId", args.agentId).eq("taskId", args.taskId)
      )
      .first();
    
    return !!subscription;
  },
});
