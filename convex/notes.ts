import { query, mutation } from './_generated/server'
import { v } from 'convex/values'
import type { Id } from './_generated/dataModel'

export const getNotes = query({
  args: {
    taskId: v.id('tasks'),
  },
  handler: async (ctx, args) => {
    const notes = await ctx.db
      .query('notes')
      .filter((q) => q.eq(q.field('taskId'), args.taskId))
      .collect()

    // Sort by createdAt descending (newest first)
    return notes.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
  },
})

export const addNote = mutation({
  args: {
    taskId: v.id('tasks'),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    // Verify task exists
    const task = await ctx.db.get(args.taskId)
    if (!task) {
      throw new Error('Task not found')
    }

    const noteId = await ctx.db.insert('notes', {
      taskId: args.taskId,
      content: args.content.trim(),
      createdAt: new Date().toISOString(),
    })

    return noteId
  },
})

export const deleteNote = mutation({
  args: {
    noteId: v.id('notes'),
  },
  handler: async (ctx, args) => {
    const note = await ctx.db.get(args.noteId)
    if (!note) {
      throw new Error('Note not found')
    }

    await ctx.db.delete(args.noteId)
    return args.noteId
  },
})

