'use client'

import React, { useState, useMemo } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
} from '@dnd-kit/core'
import { useQuery, useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'
import { Column } from './column'
import { TaskCard } from './task-card'
import { Task, Column as ColumnType, ColumnId } from '../types'

// Convex task type
type ConvexTask = {
  _id: Id<'tasks'>
  title: string
  description?: string
  priority: 'low' | 'medium' | 'high'
  dueDate?: string
  columnId: ColumnId
  order: number
  createdAt: string
}

const columnConfig: Record<
  ColumnId,
  { title: string; color: string; bgColor: string }
> = {
  todo: { title: 'To Do', color: 'bg-blue-500', bgColor: 'bg-blue-50' },
  doing: { title: 'Doing', color: 'bg-orange-500', bgColor: 'bg-orange-50' },
  done: { title: 'Done', color: 'bg-green-500', bgColor: 'bg-green-50' },
}

// Transform Convex task to Task type
function transformTask(convexTask: ConvexTask): Task {
  return {
    id: convexTask._id,
    title: convexTask.title,
    description: convexTask.description,
    priority: convexTask.priority,
    dueDate: convexTask.dueDate,
    createdAt: convexTask.createdAt,
  }
}

export function KanbanBoard() {
  // Fetch tasks from Convex
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const convexTasks = useQuery((api as any).tasks?.getTasks) as
    | ConvexTask[]
    | undefined

  // Mutations
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const createTaskMutation = useMutation((api as any).tasks?.createTask)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateTaskMutation = useMutation((api as any).tasks?.updateTask)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const deleteTaskMutation = useMutation((api as any).tasks?.deleteTask)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const moveTaskMutation = useMutation((api as any).tasks?.moveTask)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const seedSampleDataMutation = useMutation((api as any).tasks?.seedSampleData)

  // Transform and group tasks by column
  const columns = useMemo<ColumnType[]>(() => {
    if (!convexTasks) {
      // Return empty columns while loading
      return Object.entries(columnConfig).map(([id, config]) => ({
        id: id as ColumnId,
        ...config,
        tasks: [],
      }))
    }

    // Group tasks by column
    const tasksByColumn = convexTasks.reduce(
      (acc, convexTask) => {
        const columnId = convexTask.columnId
        if (!acc[columnId]) {
          acc[columnId] = []
        }
        acc[columnId].push(transformTask(convexTask))
        return acc
      },
      {} as Record<ColumnId, Task[]>,
    )

    // Create column structure
    return Object.entries(columnConfig).map(([id, config]) => ({
      id: id as ColumnId,
      ...config,
      tasks: tasksByColumn[id as ColumnId] || [],
    }))
  }, [convexTasks])

  const [activeTask, setActiveTask] = useState<Task | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 3,
      },
    }),
  )

  const findColumnByTaskId = (taskId: string) => {
    return columns.find((column) =>
      column.tasks.some((task) => task.id === taskId),
    )
  }

  const findTaskById = (taskId: string) => {
    for (const column of columns) {
      const task = column.tasks.find((task) => task.id === taskId)
      if (task) return task
    }
    return null
  }

  const handleDragStart = (event: DragStartEvent) => {
    const task = findTaskById(event.active.id as string)
    setActiveTask(task)
  }

  const handleDragOver = (event: DragOverEvent) => {
    // Visual feedback only - actual move happens in handleDragEnd
    // This allows for smooth visual updates while dragging
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveTask(null)

    if (!over || !convexTasks) return

    const activeId = active.id as string
    const overId = over.id as string

    const activeColumn = findColumnByTaskId(activeId)

    // Determine target column (could be a column drop zone or another task)
    let targetColumn: ColumnType | undefined
    let targetOrder: number

    if (
      typeof overId === 'string' &&
      ['todo', 'doing', 'done'].includes(overId)
    ) {
      // Dropped on a column
      targetColumn = columns.find((col) => col.id === overId)
      targetOrder = targetColumn?.tasks.length || 0
    } else {
      // Dropped on another task
      const overTaskColumn = findColumnByTaskId(overId)
      if (!overTaskColumn) return

      targetColumn = overTaskColumn
      const overTaskIndex = overTaskColumn.tasks.findIndex(
        (t) => t.id === overId,
      )
      targetOrder =
        overTaskIndex >= 0 ? overTaskIndex : overTaskColumn.tasks.length

      // If moving within same column and dragging down, adjust order
      if (activeColumn === targetColumn && activeId !== overId) {
        const activeIndex = activeColumn.tasks.findIndex(
          (t) => t.id === activeId,
        )
        if (activeIndex < overTaskIndex) {
          targetOrder = overTaskIndex + 1
        }
      }
    }

    if (!activeColumn || !targetColumn) return

    // If moving within the same column and same position, do nothing
    if (activeColumn.id === targetColumn.id) {
      const activeIndex = activeColumn.tasks.findIndex((t) => t.id === activeId)
      if (activeIndex === targetOrder || activeIndex === targetOrder - 1) {
        return // No change needed
      }
    }

    // Call Convex mutation to move the task
    try {
      await moveTaskMutation({
        taskId: activeId as Id<'tasks'>,
        targetColumnId: targetColumn.id,
        targetOrder,
      })
    } catch (error) {
      console.error('Error moving task:', error)
    }
  }

  const handleAddTask = async (
    columnId: string,
    newTask: Omit<Task, 'id' | 'createdAt'>,
  ) => {
    try {
      await createTaskMutation({
        title: newTask.title,
        description: newTask.description,
        priority: newTask.priority,
        dueDate: newTask.dueDate,
        columnId: columnId as ColumnId,
      })
    } catch (error) {
      console.error('Error creating task:', error)
    }
  }

  const handleDeleteTask = async (taskId: string) => {
    try {
      await deleteTaskMutation({
        id: taskId as Id<'tasks'>,
      })
    } catch (error) {
      console.error('Error deleting task:', error)
    }
  }

  const handleUpdateTask = async (taskId: string, updates: Partial<Task>) => {
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

  const handleSeedSampleData = async () => {
    try {
      await seedSampleDataMutation()
    } catch (error) {
      console.error('Error seeding sample data:', error)
    }
  }

  // Check if there are any tasks
  const totalTasks = convexTasks?.length || 0
  const isLoading = convexTasks === undefined

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="space-y-4 text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600"></div>
          <p className="text-gray-600">Loading tasks...</p>
        </div>
      </div>
    )
  }

  // Show empty state if no tasks
  if (totalTasks === 0) {
    return (
      <div className="flex h-full items-center justify-center">
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
          <h3 className="text-xl font-semibold text-gray-900">No tasks yet</h3>
          <p className="max-w-md text-gray-600">
            Get started by seeding some sample tasks or create your first task
            in a column.
          </p>
          <button
            onClick={handleSeedSampleData}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 font-medium text-white transition-colors hover:bg-blue-700"
          >
            <span>Seed Sample Data</span>
          </button>
        </div>
      </div>
    )
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      autoScroll={{
        enabled: true,
        threshold: {
          x: 0.2,
          y: 0.2,
        },
        acceleration: 0.01,
      }}
    >
      <div className="flex h-full gap-6 overflow-x-auto">
        {columns.map((column) => (
          <Column
            key={column.id}
            column={column}
            onAddTask={handleAddTask}
            onDeleteTask={handleDeleteTask}
            onUpdateTask={handleUpdateTask}
          />
        ))}
      </div>

      <DragOverlay>
        {activeTask ? (
          <TaskCard task={activeTask} onDelete={() => {}} onUpdate={() => {}} />
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
