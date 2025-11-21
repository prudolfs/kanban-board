'use client'

import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { BoardCard } from '@/components/board-card'
import { CreateBoardDialog } from '@/components/create-board-dialog'
import { AuthForm } from '@/components/auth-form'
import { UserMenu } from '@/components/user-menu'
import { Trello, Bell } from 'lucide-react'
import { useRouter } from 'next/navigation'
import type { Id } from '@/convex/_generated/dataModel'
import Link from 'next/link'

export default function Home() {
  const router = useRouter()
  const currentUser = useQuery(api.auth.getCurrentUser)
  const boards = useQuery(api.boards.getBoards)

  const handleCreateBoard = (boardId: Id<'boards'>) => {
    router.push(`/boards/${boardId}`)
  }

  const isLoading = currentUser === undefined || boards === undefined

  // Show auth form if not logged in (null or undefined)
  if (!currentUser && !isLoading) {
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
