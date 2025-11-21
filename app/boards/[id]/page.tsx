'use client'

import { KanbanBoard } from '@/components/kaban-board'
import { Trello, Bell, Search, User, ArrowLeft } from 'lucide-react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'
import Link from 'next/link'
import { useState, useRef, useEffect } from 'react'
import { Input } from '@/components/ui/input'

export default function BoardPage() {
  const params = useParams()
  const router = useRouter()
  const boardId = params.id as string
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const searchContainerRef = useRef<HTMLDivElement>(null)

  // Fetch board details
  const board = useQuery(
    api.boards.getBoard,
    boardId ? { id: boardId as Id<'boards'> } : 'skip',
  )

  // Search tasks
  const searchResults = useQuery(
    api.tasks.searchTasks,
    boardId && searchQuery.trim().length > 0
      ? { boardId: boardId as Id<'boards'>, searchQuery }
      : 'skip',
  )

  const isLoading = board === undefined

  // Close search dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node)
      ) {
        setIsSearchOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setSearchQuery(value)
    setIsSearchOpen(value.trim().length > 0)
  }

  // Handle task selection
  const handleTaskSelect = (taskId: string) => {
    setSearchQuery('')
    setIsSearchOpen(false)
    router.push(`/tasks/${taskId}`)
  }

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setIsSearchOpen(false)
      setSearchQuery('')
    } else if (e.key === 'Enter' && searchResults && searchResults.length > 0) {
      handleTaskSelect(searchResults[0]._id)
    }
  }

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
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0 flex-1">
            <Link
              href="/"
              className="flex items-center gap-2 transition-opacity hover:opacity-80 shrink-0"
            >
              <div className="rounded-lg bg-blue-600 p-2">
                <Trello className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-xl font-bold text-gray-900">TaskBoard</h1>
            </Link>
            <div className="hidden h-6 w-px bg-gray-300 md:block shrink-0"></div>
            <div className="hidden items-center gap-2 md:flex flex-1 min-w-0 md:max-w-xl lg:max-w-3xl xl:max-w-5xl 2xl:max-w-6xl">
              <div className="relative w-full" ref={searchContainerRef}>
                <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
                <Input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search tasks by title or description..."
                  value={searchQuery}
                  onChange={handleSearchChange}
                  onKeyDown={handleKeyDown}
                  onFocus={() => searchQuery.trim().length > 0 && setIsSearchOpen(true)}
                  className="w-full rounded-lg border border-gray-300 py-2 pr-4 pl-10 text-sm focus:border-transparent focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                {/* Search Results Dropdown */}
                {isSearchOpen && (
                  <div className="absolute top-full z-50 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg">
                    {searchResults === undefined ? (
                      <div className="px-4 py-3 text-sm text-gray-500">
                        <div className="flex items-center gap-2">
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600"></div>
                          <span>Searching...</span>
                        </div>
                      </div>
                    ) : searchResults.length === 0 ? (
                      <div className="px-4 py-3 text-sm text-gray-500">
                        No tasks found
                      </div>
                    ) : (
                      <div className="max-h-64 overflow-y-auto">
                        {searchResults.map((task) => (
                          <button
                            key={task._id}
                            onClick={() => handleTaskSelect(task._id)}
                            className="w-full px-4 py-3 text-left text-sm transition-colors hover:bg-gray-50 focus:bg-gray-50 focus:outline-none"
                          >
                            <div className="font-medium text-gray-900">
                              {task.title}
                            </div>
                            {task.description && (
                              <div className="mt-1 truncate text-xs text-gray-500">
                                {task.description}
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
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
        <div className="h-[calc(100vh-200px)]">
          <KanbanBoard boardId={boardId as Id<'boards'>} />
        </div>
      </main>
    </div>
  )
}
