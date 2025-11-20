'use client'

import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'
import { TaskPreview } from '@/components/task-preview'
import { Task } from '@/types'

// Convex task type
type ConvexTask = {
  _id: Id<'tasks'>
  title: string
  description?: string
  priority: 'low' | 'medium' | 'high'
  dueDate?: string
  columnId: 'todo' | 'doing' | 'done'
  order: number
  createdAt: string
}

// Transform Convex task to Task type
function transformTask(convexTask: ConvexTask | undefined): Task | null {
  if (!convexTask) return null
  return {
    id: convexTask._id,
    title: convexTask.title,
    description: convexTask.description,
    priority: convexTask.priority,
    dueDate: convexTask.dueDate,
    createdAt: convexTask.createdAt,
  }
}

export default function TaskPage() {
  const params = useParams()
  const router = useRouter()
  const taskId = params.id as string

  // Fetch task from Convex
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const convexTask = useQuery(
    (api as any).tasks?.getTask,
    taskId ? { id: taskId as Id<'tasks'> } : 'skip',
  ) as ConvexTask | undefined

  // Mutations
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateTaskMutation = useMutation((api as any).tasks?.updateTask)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const deleteTaskMutation = useMutation((api as any).tasks?.deleteTask)

  const task = transformTask(convexTask)
  const isLoading = convexTask === undefined

  const handleUpdate = async (taskId: string, updates: Partial<Task>) => {
    try {
      await updateTaskMutation({
        id: taskId as Id<'tasks'>,
        title: updates.title,
        description: updates.description,
        priority: updates.priority,
        dueDate: updates.dueDate,
      })
    } catch (error) {
      console.error('Error updating task:', error)
    }
  }

  const handleDelete = async (taskId: string) => {
    try {
      await deleteTaskMutation({
        id: taskId as Id<'tasks'>,
      })
      // Redirect to home after deletion
      router.push('/')
    } catch (error) {
      console.error('Error deleting task:', error)
    }
  }

  const handleClose = () => {
    router.push('/')
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="space-y-4 text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600"></div>
          <p className="text-gray-600">Loading task...</p>
        </div>
      </div>
    )
  }

  // Task not found
  if (!task) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="space-y-4 text-center">
          <h1 className="text-2xl font-bold text-gray-900">Task not found</h1>
          <p className="text-gray-600">
            The task you're looking for doesn't exist or has been deleted.
          </p>
          <button
            onClick={handleClose}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
          >
            Back to Board
          </button>
        </div>
      </div>
    )
  }

  return (
    <TaskPreview
      task={task}
      isOpen={true}
      onClose={handleClose}
      onUpdate={handleUpdate}
      onDelete={handleDelete}
    />
  )
}
