// convex/tasks.ts (Self-Managed by 'bunx convex dev')
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const getTasks = query({
  handler: async (ctx) => {
    // This connects to the Convex database and returns all documents from the 'tasks' table
    return await ctx.db.query("tasks").collect();
  },
});

export const createTask = mutation({
  args: {
    text: v.string(),
    isCompleted: v.boolean(),
  },
  handler: async (ctx, args) => {
    const taskId = await ctx.db.insert("tasks", {
      text: args.text,
      isCompleted: args.isCompleted,
    });
    return taskId;
  },
});

export const seedSampleData = mutation({
  handler: async (ctx) => {
    // Check if tasks already exist
    const existingTasks = await ctx.db.query("tasks").collect();
    if (existingTasks.length > 0) {
      return { message: "Tasks already exist. Skipping seed." };
    }

    // Seed the sample data
    const sampleTasks = [
      { text: "Buy groceries", isCompleted: true },
      { text: "Go for a swim", isCompleted: true },
      { text: "Integrate Convex", isCompleted: false },
    ];

    const taskIds = [];
    for (const task of sampleTasks) {
      const taskId = await ctx.db.insert("tasks", task);
      taskIds.push(taskId);
    }

    return { message: `Seeded ${taskIds.length} tasks`, taskIds };
  },
});