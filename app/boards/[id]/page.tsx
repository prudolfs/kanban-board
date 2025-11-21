'use client'

import { KanbanBoard } from '@/components/kaban-board'
import { Trello, Bell, Search, User, ArrowLeft } from 'lucide-react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'
import Link from 'next/link'

export default function BoardPage() {
  const params = useParams()
  const router = useRouter()
  const boardId = params.id as string

  // Fetch board details
  const board = useQuery(
    api.boards.getBoard,
    boardId ? { id: boardId as Id<'boards'> } : 'skip',
  )

  const isLoading = board === undefined

  // Loading state
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="space-y-4 text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600"></div>
          <p className="text-gray-600">Loading board...</p>
        </div>
      </div>
    )
  }

  // Board not found
  if (!board) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="space-y-4 text-center">
          <h1 className="text-2xl font-bold text-gray-900">Board not found</h1>
          <p className="text-gray-600">
            The board you're looking for doesn't exist or has been deleted.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Boards
          </Link>
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
            <div className="hidden h-6 w-px bg-gray-300 md:block"></div>
            <div className="hidden items-center gap-2 md:flex">
              <div className="relative">
                <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
                <input
                  type="text"
                  placeholder="Search tasks..."
                  className="rounded-lg border border-gray-300 py-2 pr-4 pl-10 text-sm focus:border-transparent focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700">
              <Bell className="h-5 w-5" />
            </button>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-300">
              <User className="h-4 w-4 text-gray-600" />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-6">
          <div className="mb-2 flex items-center gap-3">
            <Link
              href="/"
              className="text-gray-600 transition-colors hover:text-gray-900"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h2 className="text-2xl font-bold text-gray-900">{board.title}</h2>
          </div>
          {board.description && (
            <p className="ml-8 text-gray-600">{board.description}</p>
          )}
        </div>

        <div className="h-[calc(100vh-200px)]">
          <KanbanBoard boardId={boardId as Id<'boards'>} />
        </div>
      </main>
    </div>
  )
}
