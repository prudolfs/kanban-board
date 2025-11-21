// convex/tasks.ts (Self-Managed by 'bunx convex dev')
import { query, mutation } from './_generated/server'
import { v } from 'convex/values'
import type { Id } from './_generated/dataModel'
import { authComponent } from './auth'

// Helper to get current user ID
async function getCurrentUserId(ctx: any) {
  const user = await authComponent.safeGetAuthUser(ctx)
  if (!user) throw new Error('Not authenticated')
  return String((user as any)._id || (user as any).userId || user._id)
}

// Helper to check if user is board member
async function isBoardMember(
  ctx: any,
  boardId: Id<'boards'>,
  userId: string,
): Promise<boolean> {
  const membership = await ctx.db
    .query('boardMembers')
    .filter((q: any) =>
      q.and(q.eq(q.field('boardId'), boardId), q.eq(q.field('userId'), userId)),
    )
    .first()
  return !!membership
}

export const getTasks = query({
  args: {
    boardId: v.id('boards'),
  },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx)

    // Check if user is a board member
    const isMember = await isBoardMember(ctx, args.boardId, userId)
    if (!isMember) {
      throw new Error('Not authorized to view tasks in this board')
    }

    // Get all tasks for the specified board
    const tasks = await ctx.db
      .query('tasks')
      .filter((q: any) => q.eq(q.field('boardId'), args.boardId))
      .collect()

    // Sort by columnId first, then by order
    return tasks.sort((a, b) => {
      if (a.columnId !== b.columnId) {
        const columnOrder = { todo: 0, doing: 1, done: 2 }
        return (
          (columnOrder[a.columnId as keyof typeof columnOrder] || 0) -
          (columnOrder[b.columnId as keyof typeof columnOrder] || 0)
        )
      }
      return (a.order || 0) - (b.order || 0)
    })
  },
})

export const getTask = query({
  args: {
    id: v.id('tasks'),
  },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.id)
    if (!task) return null

    // Check if user is a board member
    const userId = await getCurrentUserId(ctx)
    const isMember = await isBoardMember(ctx, task.boardId, userId)
    if (!isMember) {
      throw new Error('Not authorized to view this task')
    }

    return task
  },
})

export const searchTasks = query({
  args: {
    boardId: v.id('boards'),
    searchQuery: v.string(),
  },
  handler: async (ctx, args) => {
    if (!args.searchQuery || args.searchQuery.trim().length === 0) {
      return []
    }

    // Check if user is a board member
    const userId = await getCurrentUserId(ctx)
    const isMember = await isBoardMember(ctx, args.boardId, userId)
    if (!isMember) {
      throw new Error('Not authorized to search tasks in this board')
    }

    // Get all tasks for the specified board
    const tasks = await ctx.db
      .query('tasks')
      .filter((q: any) => q.eq(q.field('boardId'), args.boardId))
      .collect()

    // Filter tasks by title or description (case-insensitive)
    const searchLower = args.searchQuery.toLowerCase().trim()
    const matchingTasks = tasks.filter((task) => {
      const titleMatch = task.title?.toLowerCase().includes(searchLower)
      const descriptionMatch = task.description
        ?.toLowerCase()
        .includes(searchLower)
      return titleMatch || descriptionMatch
    })

    // Return limited results sorted by relevance (title matches first, then description)
    return matchingTasks
      .sort((a, b) => {
        const aTitleMatch = a.title?.toLowerCase().startsWith(searchLower)
        const bTitleMatch = b.title?.toLowerCase().startsWith(searchLower)
        if (aTitleMatch && !bTitleMatch) return -1
        if (!aTitleMatch && bTitleMatch) return 1
        return 0
      })
      .slice(0, 10) // Limit to 10 results
  },
})

export const createTask = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    priority: v.union(v.literal('low'), v.literal('medium'), v.literal('high')),
    dueDate: v.optional(v.string()),
    columnId: v.union(v.literal('todo'), v.literal('doing'), v.literal('done')),
    boardId: v.id('boards'),
  },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx)

    // Check if user is a board member
    const isMember = await isBoardMember(ctx, args.boardId, userId)
    if (!isMember) {
      throw new Error('Not authorized to create tasks in this board')
    }

    // Get the count of tasks in the target column for this board to set the order
    const existingTasks = await ctx.db
      .query('tasks')
      .filter((q: any) =>
        q.and(
          q.eq(q.field('columnId'), args.columnId),
          q.eq(q.field('boardId'), args.boardId),
        ),
      )
      .collect()

    const order = existingTasks.length

    const taskId = await ctx.db.insert('tasks', {
      title: args.title,
      description: args.description,
      priority: args.priority,
      dueDate: args.dueDate,
      columnId: args.columnId,
      boardId: args.boardId,
      order,
      createdAt: new Date().toISOString(),
    })

    return taskId
  },
})

export const updateTask = mutation({
  args: {
    id: v.id('tasks'),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    priority: v.optional(
      v.union(v.literal('low'), v.literal('medium'), v.literal('high')),
    ),
    dueDate: v.optional(v.string()),
    columnId: v.optional(
      v.union(v.literal('todo'), v.literal('doing'), v.literal('done')),
    ),
    order: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args
    const task = await ctx.db.get(id)
    if (!task) throw new Error('Task not found')

    // Check if user is a board member
    const userId = await getCurrentUserId(ctx)
    const isMember = await isBoardMember(ctx, task.boardId, userId)
    if (!isMember) {
      throw new Error('Not authorized to update this task')
    }

    // If columnId is changing, we need to reorder tasks
    if (updates.columnId !== undefined) {
      // If moving to a different column, set order to end of new column for this board
      if (task.columnId !== updates.columnId) {
        const newColumnTasks = await ctx.db
          .query('tasks')
          .filter((q: any) =>
            q.and(
              q.eq(q.field('columnId'), updates.columnId),
              q.eq(q.field('boardId'), task.boardId),
            ),
          )
          .collect()
        updates.order = newColumnTasks.length
      }
    }

    await ctx.db.patch(id, updates)
    return id
  },
})

export const moveTask = mutation({
  args: {
    taskId: v.id('tasks'),
    targetColumnId: v.union(
      v.literal('todo'),
      v.literal('doing'),
      v.literal('done'),
    ),
    targetOrder: v.number(),
  },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.taskId)
    if (!task) throw new Error('Task not found')

    // Check if user is a board member
    const userId = await getCurrentUserId(ctx)
    const isMember = await isBoardMember(ctx, task.boardId, userId)
    if (!isMember) {
      throw new Error('Not authorized to move this task')
    }

    const sourceColumnId = task.columnId
    const boardId = task.boardId

    // If moving within the same column, just reorder
    if (sourceColumnId === args.targetColumnId) {
      // Get all tasks in the column for this board
      const columnTasks = await ctx.db
        .query('tasks')
        .filter((q: any) =>
          q.and(
            q.eq(q.field('columnId'), args.targetColumnId),
            q.eq(q.field('boardId'), boardId),
          ),
        )
        .collect()
        .then((tasks) => tasks.sort((a, b) => (a.order || 0) - (b.order || 0)))

      const currentIndex = columnTasks.findIndex((t) => t._id === args.taskId)

      // Remove task from array
      const reorderedTasks = [...columnTasks]
      reorderedTasks.splice(currentIndex, 1)
      reorderedTasks.splice(args.targetOrder, 0, task)

      // Update order for all affected tasks
      for (let i = 0; i < reorderedTasks.length; i++) {
        await ctx.db.patch(reorderedTasks[i]._id, { order: i })
      }
    } else {
      // Moving to a different column
      // Remove from source column and reorder
      const sourceTasks = await ctx.db
        .query('tasks')
        .filter((q: any) =>
          q.and(
            q.eq(q.field('columnId'), sourceColumnId),
            q.eq(q.field('boardId'), boardId),
          ),
        )
        .collect()
        .then((tasks) => tasks.sort((a, b) => (a.order || 0) - (b.order || 0)))

      const currentIndex = sourceTasks.findIndex((t) => t._id === args.taskId)
      sourceTasks.splice(currentIndex, 1)

      // Update source column orders
      for (let i = 0; i < sourceTasks.length; i++) {
        await ctx.db.patch(sourceTasks[i]._id, { order: i })
      }

      // Add to target column
      const targetTasks = await ctx.db
        .query('tasks')
        .filter((q: any) =>
          q.and(
            q.eq(q.field('columnId'), args.targetColumnId),
            q.eq(q.field('boardId'), boardId),
          ),
        )
        .collect()
        .then((tasks) => tasks.sort((a, b) => (a.order || 0) - (b.order || 0)))

      targetTasks.splice(args.targetOrder, 0, task)

      // Update target column orders
      for (let i = 0; i < targetTasks.length; i++) {
        await ctx.db.patch(targetTasks[i]._id, {
          order: i,
          ...(targetTasks[i]._id === args.taskId
            ? { columnId: args.targetColumnId }
            : {}),
        })
      }
    }

    return args.taskId
  },
})

export const deleteTask = mutation({
  args: {
    id: v.id('tasks'),
  },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.id)
    if (!task) throw new Error('Task not found')

    // Check if user is a board member
    const userId = await getCurrentUserId(ctx)
    const isMember = await isBoardMember(ctx, task.boardId, userId)
    if (!isMember) {
      throw new Error('Not authorized to delete this task')
    }

    // Delete the task
    await ctx.db.delete(args.id)

    // Reorder remaining tasks in the same column and board
    const remainingTasks = await ctx.db
      .query('tasks')
      .filter((q: any) =>
        q.and(
          q.eq(q.field('columnId'), task.columnId),
          q.eq(q.field('boardId'), task.boardId),
        ),
      )
      .collect()
      .then((tasks) => tasks.sort((a, b) => (a.order || 0) - (b.order || 0)))

    for (let i = 0; i < remainingTasks.length; i++) {
      await ctx.db.patch(remainingTasks[i]._id, { order: i })
    }

    return args.id
  },
})

export const seedSampleData = mutation({
  args: {
    boardId: v.id('boards'),
  },
  handler: async (ctx, args) => {
    // Check if user is a board member
    const userId = await getCurrentUserId(ctx)
    const isMember = await isBoardMember(ctx, args.boardId, userId)
    if (!isMember) {
      throw new Error('Not authorized to seed data for this board')
    }

    // Check if tasks already exist for this board
    const existingTasks = await ctx.db
      .query('tasks')
      .filter((q: any) => q.eq(q.field('boardId'), args.boardId))
      .collect()
    if (existingTasks.length > 0) {
      return { message: 'Tasks already exist for this board. Skipping seed.' }
    }

    // Seed the sample data
    const sampleTasks = [
      {
        title: 'Design user interface mockups',
        description:
          'Create high-fidelity mockups for the dashboard and user profile pages',
        priority: 'high' as const,
        dueDate: '2025-01-20',
        columnId: 'todo' as const,
        order: 0,
        createdAt: new Date().toISOString(),
      },
      {
        title: 'Research competitor features',
        description: 'Analyze top 5 competitors and document key features',
        priority: 'medium' as const,
        columnId: 'todo' as const,
        order: 1,
        createdAt: new Date().toISOString(),
      },
      {
        title: 'Implement authentication system',
        description: 'Set up JWT-based authentication with refresh tokens',
        priority: 'high' as const,
        dueDate: '2025-01-18',
        columnId: 'doing' as const,
        order: 0,
        createdAt: new Date().toISOString(),
      },
      {
        title: 'Set up development environment',
        description: 'Configure React, TypeScript, and Tailwind CSS',
        priority: 'medium' as const,
        columnId: 'done' as const,
        order: 0,
        createdAt: new Date().toISOString(),
      },
    ]

    const taskIds = []
    for (const task of sampleTasks) {
      const taskId = await ctx.db.insert('tasks', {
        ...task,
        boardId: args.boardId,
      })
      taskIds.push(taskId)
    }

    return { message: `Seeded ${taskIds.length} tasks`, taskIds }
  },
})
