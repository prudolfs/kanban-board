// convex/boards.ts
import { query, mutation } from './_generated/server'
import { v } from 'convex/values'
import type { Id } from './_generated/dataModel'

export const getBoards = query({
  handler: async (ctx) => {
    // Get all boards, sorted by creation date
    const boards = await ctx.db.query('boards').collect()
    return boards.sort((a, b) => {
      const dateA = new Date(a.createdAt || 0).getTime()
      const dateB = new Date(b.createdAt || 0).getTime()
      return dateB - dateA
    })
  },
})

export const getBoard = query({
  args: {
    id: v.id('boards'),
  },
  handler: async (ctx, args) => {
    const board = await ctx.db.get(args.id)
    return board
  },
})

export const createBoard = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    color: v.string(),
  },
  handler: async (ctx, args) => {
    const boardId = await ctx.db.insert('boards', {
      title: args.title,
      description: args.description,
      color: args.color,
      createdAt: new Date().toISOString(),
    })
    return boardId
  },
})

export const updateBoard = mutation({
  args: {
    id: v.id('boards'),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    color: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args
    await ctx.db.patch(id, updates)
    return id
  },
})

export const deleteBoard = mutation({
  args: {
    id: v.id('boards'),
  },
  handler: async (ctx, args) => {
    // Delete all tasks associated with this board
    const tasks = await ctx.db
      .query('tasks')
      .filter((q) => q.eq(q.field('boardId'), args.id))
      .collect()

    for (const task of tasks) {
      await ctx.db.delete(task._id)
    }

    // Delete the board
    await ctx.db.delete(args.id)
    return args.id
  },
})
