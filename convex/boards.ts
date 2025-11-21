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

    // Normalize email
    const email = args.email.trim().toLowerCase()

    // Find user by email using better-auth adapter
    let user: any = null
    let userId: string | null = null

    // Try to find user by email using direct query
    // This is more reliable than using the adapter in mutations
    try {
      const users = await (ctx.db as any)
        .query('user')
        .filter((q: any) => q.eq(q.field('email'), email))
        .collect()

      if (users && users.length > 0) {
        user = users[0]
      }
    } catch (error) {
      // If direct query fails, try using better-auth's adapter as fallback
      try {
        user = await ctx.runQuery(components.betterAuth.adapter.findOne, {
          model: 'user',
          where: [{ field: 'email', value: email, operator: 'eq' }],
        })
      } catch (fallbackError) {
        // Both methods failed, user likely doesn't exist - will create invitation
      }
    }

    // If user exists, add them directly
    if (user) {
      // Get user ID - better-auth uses _id as the primary identifier
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

      return { success: true, added: true }
    }

    // User doesn't exist - check if there's already a pending invitation
    const existingInvitation = await ctx.db
      .query('boardInvitations')
      .filter((q: any) =>
        q.and(
          q.eq(q.field('boardId'), args.boardId),
          q.eq(q.field('email'), email),
          q.eq(q.field('status'), 'pending'),
        ),
      )
      .first()

    if (existingInvitation) {
      throw new Error('Invitation already sent to this email')
    }

    // Get board details for the invitation
    const board = await ctx.db.get(args.boardId)
    if (!board) {
      throw new Error('Board not found')
    }

    // Get current user for invitation sender
    const currentUserId = await getCurrentUserId(ctx)
    const currentUser = await authComponent.getAnyUserById(ctx, currentUserId)

    // Create invitation
    const invitationId = await ctx.db.insert('boardInvitations', {
      boardId: args.boardId,
      email: email,
      invitedBy: currentUserId,
      status: 'pending',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
    })

    // TODO: Send email invitation
    // For now, we'll just create the invitation record
    // In production, you would integrate with an email service like Resend, SendGrid, etc.

    return {
      success: true,
      added: false,
      invitationId,
      message: 'Invitation sent',
    }
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

// Get pending invitations for a board
export const getBoardInvitations = query({
  args: {
    boardId: v.id('boards'),
  },
  handler: async (ctx, args) => {
    // Check if user is owner
    const isOwner = await isBoardOwner(ctx, args.boardId)
    if (!isOwner) {
      throw new Error('Only board owner can view invitations')
    }

    const invitations = await ctx.db
      .query('boardInvitations')
      .filter((q: any) =>
        q.and(
          q.eq(q.field('boardId'), args.boardId),
          q.eq(q.field('status'), 'pending'),
        ),
      )
      .collect()

    // Filter out expired invitations
    const now = new Date().toISOString()
    const validInvitations = invitations.filter(
      (inv) => inv.expiresAt && inv.expiresAt > now,
    )

    return validInvitations.map((inv) => ({
      _id: inv._id,
      email: inv.email,
      invitedBy: inv.invitedBy,
      createdAt: inv.createdAt,
      expiresAt: inv.expiresAt,
    }))
  },
})

// Get invitations for the current user
export const getMyInvitations = query({
  args: {},
  handler: async (ctx) => {
    const user = await authComponent.safeGetAuthUser(ctx)
    if (!user) {
      return []
    }

    const userEmail = (user as any).email
    if (!userEmail) {
      return []
    }

    const invitations = await ctx.db
      .query('boardInvitations')
      .filter((q: any) =>
        q.and(
          q.eq(q.field('email'), userEmail.toLowerCase()),
          q.eq(q.field('status'), 'pending'),
        ),
      )
      .collect()

    // Filter out expired invitations and get board details
    const now = new Date().toISOString()
    const validInvitations = await Promise.all(
      invitations
        .filter((inv) => inv.expiresAt && inv.expiresAt > now)
        .map(async (inv) => {
          const board = await ctx.db.get(inv.boardId)
          const inviter = await authComponent
            .getAnyUserById(ctx, inv.invitedBy)
            .catch(() => null)

          return {
            _id: inv._id,
            boardId: inv.boardId,
            boardTitle: board?.title || 'Unknown Board',
            boardColor: board?.color,
            invitedBy: inv.invitedBy,
            inviterName: inviter?.name || inviter?.email || 'Unknown',
            createdAt: inv.createdAt,
            expiresAt: inv.expiresAt,
          }
        }),
    )

    return validInvitations
  },
})

// Accept a board invitation
export const acceptBoardInvitation = mutation({
  args: {
    invitationId: v.id('boardInvitations'),
  },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx)
    const user = await authComponent.getAnyUserById(ctx, userId)
    const userEmail = (user as any)?.email

    if (!userEmail) {
      throw new Error('User email not found')
    }

    // Get the invitation
    const invitation = await ctx.db.get(args.invitationId)
    if (!invitation) {
      throw new Error('Invitation not found')
    }

    // Check if invitation is for this user's email
    if (invitation.email.toLowerCase() !== userEmail.toLowerCase()) {
      throw new Error('This invitation is not for your email address')
    }

    // Check if invitation is still pending
    if (invitation.status !== 'pending') {
      throw new Error('This invitation has already been used or cancelled')
    }

    // Check if invitation is expired
    if (
      invitation.expiresAt &&
      invitation.expiresAt < new Date().toISOString()
    ) {
      throw new Error('This invitation has expired')
    }

    // Check if user is already a member
    const existingMembership = await ctx.db
      .query('boardMembers')
      .filter((q: any) =>
        q.and(
          q.eq(q.field('boardId'), invitation.boardId),
          q.eq(q.field('userId'), userId),
        ),
      )
      .first()

    if (existingMembership) {
      // User is already a member, just mark invitation as accepted
      await ctx.db.patch(args.invitationId, { status: 'accepted' })
      return { success: true, alreadyMember: true }
    }

    // Add user as member
    await ctx.db.insert('boardMembers', {
      boardId: invitation.boardId,
      userId: userId,
      role: 'member',
      joinedAt: new Date().toISOString(),
    })

    // Mark invitation as accepted
    await ctx.db.patch(args.invitationId, { status: 'accepted' })

    return { success: true, boardId: invitation.boardId }
  },
})

// Cancel/decline a board invitation
export const cancelBoardInvitation = mutation({
  args: {
    invitationId: v.id('boardInvitations'),
  },
  handler: async (ctx, args) => {
    // Check if user is owner of the board or the invitee
    const userId = await getCurrentUserId(ctx)
    const invitation = await ctx.db.get(args.invitationId)

    if (!invitation) {
      throw new Error('Invitation not found')
    }

    const isOwner = await isBoardOwner(ctx, invitation.boardId)
    const user = await authComponent
      .getAnyUserById(ctx, userId)
      .catch(() => null)
    const userEmail = (user as any)?.email
    const isInvitee =
      userEmail && invitation.email.toLowerCase() === userEmail.toLowerCase()

    if (!isOwner && !isInvitee) {
      throw new Error('Not authorized to cancel this invitation')
    }

    // Only cancel if still pending
    if (invitation.status === 'pending') {
      await ctx.db.patch(args.invitationId, { status: 'cancelled' })
    }

    return { success: true }
  },
})
