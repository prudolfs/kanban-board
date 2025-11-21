'use client'

import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { BoardCard } from '@/components/board-card'
import { CreateBoardDialog } from '@/components/create-board-dialog'
import { AuthForm } from '@/components/auth-form'
import { UserMenu } from '@/components/user-menu'
import { Trello, Bell, Mail, Check, X } from 'lucide-react'
import { useMutation } from 'convex/react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import type { Id } from '@/convex/_generated/dataModel'
import Link from 'next/link'

// Type for invitation from getMyInvitations
type Invitation = {
  _id: Id<'boardInvitations'>
  boardId: Id<'boards'>
  boardTitle: string
  boardColor?: string
  invitedBy: string
  inviterName: string
  createdAt: string
  expiresAt: string
}

export default function Home() {
  const router = useRouter()
  const currentUser = useQuery(api.auth.getCurrentUser)
  const boards = useQuery(api.boards.getBoards)
  const invitations = useQuery(api.boards.getMyInvitations)
  const acceptInvitationMutation = useMutation(api.boards.acceptBoardInvitation)

  const handleCreateBoard = (boardId: Id<'boards'>) => {
    router.push(`/boards/${boardId}`)
  }

  const handleAcceptInvitation = async (
    invitationId: Id<'boardInvitations'>,
  ) => {
    try {
      const result = await acceptInvitationMutation({ invitationId })
      if (result.success && result.boardId) {
        toast.success('Invitation accepted!')
        router.push(`/boards/${result.boardId}`)
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to accept invitation'
      toast.error(message)
    }
  }

  const isLoading = currentUser === undefined || boards === undefined

  // Show loading state while checking authentication
  if (currentUser === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="space-y-4 text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // Show auth form if not logged in
  if (!currentUser) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="w-full max-w-md space-y-6 rounded-lg bg-white p-8 shadow-lg">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-blue-600">
              <Trello className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">TaskBoard</h1>
            <p className="mt-2 text-gray-600">
              Sign in to manage your boards and tasks
            </p>
          </div>
          <AuthForm />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white px-6 py-4 shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="flex items-center gap-2 transition-opacity hover:opacity-80"
            >
              <div className="rounded-lg bg-blue-600 p-2">
                <Trello className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-xl font-bold text-gray-900">TaskBoard</h1>
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <button className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700">
              <Bell className="h-5 w-5" />
            </button>
            <UserMenu />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-6 py-8">
        {/* Pending Invitations */}
        {invitations && invitations.length > 0 && (
          <div className="mb-8 rounded-lg border border-blue-200 bg-blue-50 p-6">
            <div className="mb-4 flex items-center gap-2">
              <Mail className="h-5 w-5 text-blue-600" />
              <h2 className="text-lg font-semibold text-gray-900">
                Pending Invitations ({invitations.length})
              </h2>
            </div>
            <div className="space-y-2">
              {invitations.map((invitation: Invitation) => (
                <div
                  key={invitation._id}
                  className="flex items-center justify-between rounded-lg border border-blue-100 bg-white p-4"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-lg font-semibold text-white"
                      style={{
                        backgroundColor: invitation.boardColor || '#3b82f6',
                      }}
                    >
                      {invitation.boardTitle?.[0]?.toUpperCase() || 'B'}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {invitation.boardTitle}
                      </p>
                      <p className="text-sm text-gray-500">
                        Invited by {invitation.inviterName}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleAcceptInvitation(invitation._id)}
                      className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
                    >
                      <Check className="h-4 w-4" />
                      Accept
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mb-8 flex items-center justify-between">
          <div>
            <h2 className="mb-2 text-2xl font-bold text-gray-900">
              Your Boards
            </h2>
            <p className="text-gray-600">
              Select a board to manage your tasks or create a new one
            </p>
          </div>
          <CreateBoardDialog onCreateBoard={handleCreateBoard} />
        </div>

        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="space-y-4 text-center">
              <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600"></div>
              <p className="text-gray-600">Loading boards...</p>
            </div>
          </div>
        ) : boards && boards.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {boards.map((board) => (
              <BoardCard
                key={board._id}
                id={board._id}
                title={board.title}
                description={board.description}
                color={board.color}
              />
            ))}
          </div>
        ) : (
          <div className="flex h-64 items-center justify-center">
            <div className="space-y-4 text-center">
              <div className="text-gray-400">
                <svg
                  className="mx-auto h-24 w-24"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900">
                No boards yet
              </h3>
              <p className="max-w-md text-gray-600">
                Get started by creating your first board to organize your tasks.
              </p>
              <CreateBoardDialog onCreateBoard={handleCreateBoard} />
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
