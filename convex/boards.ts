// convex/boards.ts
import { query, mutation } from './_generated/server'
import { v } from 'convex/values'
import type { Id } from './_generated/dataModel'
import { authComponent } from './auth'
import { components } from './_generated/api'

// Helper to get current user ID
async function getCurrentUserId(ctx: any) {
  const user = await authComponent.safeGetAuthUser(ctx)
  if (!user) {
    throw new Error('Not authenticated')
  }
  // Use _id as the primary identifier, fallback to userId field for compatibility
  return String((user as any)._id || (user as any).userId || user._id)
}

// Helper to check if user is board member
async function isBoardMember(
  ctx: any,
  boardId: Id<'boards'>,
  userId?: string,
): Promise<boolean> {
  const currentUserId = userId || (await getCurrentUserId(ctx))

  const membership = await ctx.db
    .query('boardMembers')
    .filter((q: any) =>
      q.and(
        q.eq(q.field('boardId'), boardId),
        q.eq(q.field('userId'), currentUserId),
      ),
    )
    .first()

  return !!membership
}

// Helper to check if user is board owner
async function isBoardOwner(
  ctx: any,
  boardId: Id<'boards'>,
  userId?: string,
): Promise<boolean> {
  const currentUserId = userId || (await getCurrentUserId(ctx))
  const board = await ctx.db.get(boardId)
  return board?.ownerId === currentUserId
}

// Get all boards the current user is a member of
export const getBoards = query({
  handler: async (ctx) => {
    // Check if user is authenticated, return empty array if not
    const user = await authComponent.safeGetAuthUser(ctx)
    if (!user) {
      return []
    }

    const userId = String((user as any)._id || (user as any).userId || user._id)

    // Get all board memberships for this user
    const memberships = await ctx.db
      .query('boardMembers')
      .filter((q: any) => q.eq(q.field('userId'), userId))
      .collect()

    const boardIds = memberships.map((m) => m.boardId)

    if (boardIds.length === 0) {
      return []
    }

    // Fetch board details
    const boards = await Promise.all(
      boardIds.map(async (boardId) => {
        const board = await ctx.db.get(boardId)
        if (!board) return null
        const membership = memberships.find((m) => m.boardId === boardId)
        return {
          ...board,
          role: membership?.role || 'member',
        }
      }),
    )

    return boards
      .filter((board): board is NonNullable<typeof board> => board !== null)
      .sort((a, b) => {
        const dateA = new Date(a.createdAt || 0).getTime()
        const dateB = new Date(b.createdAt || 0).getTime()
        return dateB - dateA
      })
  },
})

// Get a specific board with members
export const getBoard = query({
  args: {
    id: v.id('boards'),
  },
  handler: async (ctx, args) => {
    // Check if user is authenticated
    const user = await authComponent.safeGetAuthUser(ctx)
    if (!user) {
      throw new Error('Not authenticated')
    }

    // Check if user is a member
    const isMember = await isBoardMember(ctx, args.id)
    if (!isMember) {
      throw new Error('Not authorized to view this board')
    }

    const board = await ctx.db.get(args.id)
    if (!board) {
      throw new Error('Board not found')
    }

    // Get all board members
    const memberships = await ctx.db
      .query('boardMembers')
      .filter((q: any) => q.eq(q.field('boardId'), args.id))
      .collect()

    // Get user details for each member
    const members = await Promise.all(
      memberships.map(async (membership) => {
        try {
          // Try to get user by ID using authComponent
          const user = await authComponent.getAnyUserById(
            ctx,
            membership.userId,
          )

          return {
            userId: membership.userId,
            role: membership.role,
            joinedAt: membership.joinedAt,
            email: user?.email,
            name: user?.name,
            image: user?.image,
          }
        } catch (error) {
          // Fallback if we can't get user details
          return {
            userId: membership.userId,
            role: membership.role,
            joinedAt: membership.joinedAt,
            email: null,
            name: null,
            image: null,
          }
        }
      }),
    )

    const userId = await getCurrentUserId(ctx)
    const isOwner = board.ownerId === userId

    return {
      ...board,
      members,
      isOwner,
      userRole: memberships.find((m) => m.userId === userId)?.role || 'member',
    }
  },
})

// Create a new board
export const createBoard = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    color: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx)

    // Create the board
    const boardId = await ctx.db.insert('boards', {
      title: args.title,
      description: args.description,
      color: args.color,
      ownerId: userId,
      createdAt: new Date().toISOString(),
    })

    // Add creator as owner
    await ctx.db.insert('boardMembers', {
      boardId,
      userId,
      role: 'owner',
      joinedAt: new Date().toISOString(),
    })

    return boardId
  },
})

// Update board
export const updateBoard = mutation({
  args: {
    id: v.id('boards'),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    color: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args
    const board = await ctx.db.get(id)
    if (!board) throw new Error('Board not found')

    // Check if user is a member
    const isMember = await isBoardMember(ctx, id)
    if (!isMember) {
      throw new Error('Not authorized to update this board')
    }

    await ctx.db.patch(id, updates)
    return id
  },
})

// Delete board
export const deleteBoard = mutation({
  args: {
    id: v.id('boards'),
  },
  handler: async (ctx, args) => {
    const board = await ctx.db.get(args.id)
    if (!board) throw new Error('Board not found')

    // Only owner can delete
    const isOwner = await isBoardOwner(ctx, args.id)
    if (!isOwner) {
      throw new Error('Only board owner can delete the board')
    }

    // Delete all tasks
    const tasks = await ctx.db
      .query('tasks')
      .filter((q) => q.eq(q.field('boardId'), args.id))
      .collect()

    for (const task of tasks) {
      await ctx.db.delete(task._id)
    }

    // Delete all board members
    const memberships = await ctx.db
      .query('boardMembers')
      .filter((q: any) => q.eq(q.field('boardId'), args.id))
      .collect()

    for (const membership of memberships) {
      await ctx.db.delete(membership._id)
    }

    // Delete the board
    await ctx.db.delete(args.id)
    return args.id
  },
})

// Add a member to a board by email
export const addBoardMember = mutation({
  args: {
    boardId: v.id('boards'),
    email: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if current user is owner
    const isOwner = await isBoardOwner(ctx, args.boardId)
    if (!isOwner) {
      throw new Error('Only board owner can add members')
    }

    // Find user by email - query better-auth user table directly
    // The better-auth component creates a 'user' table
    let user = null
    let userId = null

    try {
      // Try to query the user table directly
      // better-auth typically creates a table called 'user'
      const users = await (ctx.db as any)
        .query('user')
        .filter((q: any) => q.eq(q.field('email'), args.email))
        .collect()

      if (users && users.length > 0) {
        user = users[0]
      }
    } catch (error) {
      // Table might not exist or query failed
      // This is expected if the user table hasn't been created yet
    }

    if (!user) {
      throw new Error(
        'User not found with this email. Make sure they have signed up first.',
      )
    }

    // Get user ID - better-auth uses _id as the primary identifier
    // The _id is a Convex Id, convert to string
    userId = String(
      (user as any)._id || (user as any).userId || (user as any).id,
    )
    if (!userId) {
      throw new Error('Could not determine user ID')
    }

    // Check if user is already a member
    const existingMembership = await ctx.db
      .query('boardMembers')
      .filter((q: any) =>
        q.and(
          q.eq(q.field('boardId'), args.boardId),
          q.eq(q.field('userId'), userId),
        ),
      )
      .first()

    if (existingMembership) {
      throw new Error('User is already a board member')
    }

    // Add member
    await ctx.db.insert('boardMembers', {
      boardId: args.boardId,
      userId: userId,
      role: 'member',
      joinedAt: new Date().toISOString(),
    })

    return { success: true }
  },
})

// Remove a member from a board
export const removeBoardMember = mutation({
  args: {
    boardId: v.id('boards'),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const currentUserId = await getCurrentUserId(ctx)

    // Check if current user is owner
    const isOwner = await isBoardOwner(ctx, args.boardId)
    if (!isOwner) {
      throw new Error('Only board owner can remove members')
    }

    // Don't allow removing the owner
    const board = await ctx.db.get(args.boardId)
    if (board?.ownerId === args.userId) {
      throw new Error('Cannot remove board owner')
    }

    // Find and delete membership
    const membership = await ctx.db
      .query('boardMembers')
      .filter((q: any) =>
        q.and(
          q.eq(q.field('boardId'), args.boardId),
          q.eq(q.field('userId'), args.userId),
        ),
      )
      .first()

    if (membership) {
      await ctx.db.delete(membership._id)
    }

    return { success: true }
  },
})

// Get board members
export const getBoardMembers = query({
  args: {
    boardId: v.id('boards'),
  },
  handler: async (ctx, args) => {
    // Check if user is a member
    const isMember = await isBoardMember(ctx, args.boardId)
    if (!isMember) {
      throw new Error('Not authorized to view board members')
    }

    const memberships = await ctx.db
      .query('boardMembers')
      .filter((q: any) => q.eq(q.field('boardId'), args.boardId))
      .collect()

    // Get user details
    const members = await Promise.all(
      memberships.map(async (membership) => {
        try {
          const user = await authComponent.getAnyUserById(
            ctx,
            membership.userId,
          )

          return {
            userId: membership.userId,
            role: membership.role,
            joinedAt: membership.joinedAt,
            email: user?.email,
            name: user?.name,
            image: user?.image,
          }
        } catch (error) {
          return {
            userId: membership.userId,
            role: membership.role,
            joinedAt: membership.joinedAt,
            email: null,
            name: null,
            image: null,
          }
        }
      }),
    )

    return members
  },
})
