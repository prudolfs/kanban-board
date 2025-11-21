'use client'

import React, { useState, useMemo, useCallback, useRef } from 'react'
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
  boardId: Id<'boards'>
  order: number
  createdAt: string
}

// Optimistic update state
type OptimisticUpdate = {
  taskId: Id<'tasks'>
  targetColumnId: ColumnId
  targetOrder: number
  previousColumnId: ColumnId
  previousOrder: number
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

interface KanbanBoardProps {
  boardId: Id<'boards'>
}

export function KanbanBoard({ boardId }: KanbanBoardProps) {
  // Fetch tasks from Convex
  const convexTasks = useQuery(
    api.tasks.getTasks,
    boardId ? { boardId } : 'skip',
  )

  // Mutations
  const createTaskMutation = useMutation(api.tasks.createTask)
  const updateTaskMutation = useMutation(api.tasks.updateTask)
  const deleteTaskMutation = useMutation(api.tasks.deleteTask)
  const moveTaskMutation = useMutation(api.tasks.moveTask)
  const seedSampleDataMutation = useMutation(api.tasks.seedSampleData)

  // Optimistic update state
  const [optimisticUpdates, setOptimisticUpdates] = useState<
    Map<Id<'tasks'>, OptimisticUpdate>
  >(new Map())

  // Ref to track optimistic updates for reading in callbacks
  const optimisticUpdatesRef = useRef(optimisticUpdates)
  optimisticUpdatesRef.current = optimisticUpdates

  // Apply optimistic updates to tasks
  const tasksWithOptimisticUpdates = useMemo<ConvexTask[] | undefined>(() => {
    if (!convexTasks) return undefined
    if (optimisticUpdates.size === 0) return convexTasks

    // Start with tasks from server, applying optimistic updates
    let tasks = convexTasks.map((task) => ({ ...task }))

    // Apply each optimistic update
    optimisticUpdates.forEach((update) => {
      // Find the task being moved
      const taskToMove = tasks.find((t) => t._id === update.taskId)
      if (!taskToMove) return

      // Group tasks by column, excluding the task being moved
      const tasksByColumn = new Map<ColumnId, ConvexTask[]>()
      const columnIds: ColumnId[] = ['todo', 'doing', 'done']

      columnIds.forEach((colId) => {
        const columnTasks = tasks
          .filter((t) => t._id !== update.taskId && t.columnId === colId)
          .sort((a, b) => a.order - b.order)
        tasksByColumn.set(colId, columnTasks)
      })

      // Insert the moved task at the target position
      const targetColumnTasks = tasksByColumn.get(update.targetColumnId) || []
      const movedTask = { ...taskToMove, columnId: update.targetColumnId }
      targetColumnTasks.splice(update.targetOrder, 0, movedTask)
      tasksByColumn.set(update.targetColumnId, targetColumnTasks)

      // Rebuild the tasks array with recalculated orders
      const newTasks: ConvexTask[] = []
      columnIds.forEach((colId) => {
        const columnTasks = tasksByColumn.get(colId) || []
        columnTasks.forEach((task, index) => {
          newTasks.push({ ...task, order: index })
        })
      })

      tasks = newTasks
    })

    return tasks
  }, [convexTasks, optimisticUpdates])

  // Transform and group tasks by column
  const columns = useMemo<ColumnType[]>(() => {
    const tasks = tasksWithOptimisticUpdates

    if (!tasks) {
      // Return empty columns while loading
      return Object.entries(columnConfig).map(([id, config]) => ({
        id: id as ColumnId,
        ...config,
        tasks: [],
      }))
    }

    // Group tasks by column
    const tasksByColumn = tasks.reduce(
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

    // Sort tasks within each column by order
    Object.keys(tasksByColumn).forEach((columnId) => {
      tasksByColumn[columnId as ColumnId].sort((a, b) => {
        const taskA = tasks.find((t) => t._id === a.id)
        const taskB = tasks.find((t) => t._id === b.id)
        return (taskA?.order || 0) - (taskB?.order || 0)
      })
    })

    // Create column structure
    return Object.entries(columnConfig).map(([id, config]) => ({
      id: id as ColumnId,
      ...config,
      tasks: tasksByColumn[id as ColumnId] || [],
    }))
  }, [tasksWithOptimisticUpdates])

  const [activeTask, setActiveTask] = useState<Task | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 3,
      },
    }),
  )

  const findColumnByTaskId = useCallback(
    (taskId: string) => {
      return columns.find((column) =>
        column.tasks.some((task) => task.id === taskId),
      )
    },
    [columns],
  )

  const findTaskById = useCallback(
    (taskId: string) => {
      for (const column of columns) {
        const task = column.tasks.find((task) => task.id === taskId)
        if (task) return task
      }
      return null
    },
    [columns],
  )

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const task = findTaskById(event.active.id as string)
      setActiveTask(task)
    },
    [findTaskById],
  )

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const { active, over } = event

      if (!over || !convexTasks) return

      const activeId = active.id as string
      const overId = over.id as string
      const taskId = activeId as Id<'tasks'>

      const activeColumn = findColumnByTaskId(activeId)

      // Determine target column (could be a column drop zone or another task)
      let targetColumn: ColumnType | undefined
      let targetOrder: number

      if (
        typeof overId === 'string' &&
        ['todo', 'doing', 'done'].includes(overId)
      ) {
        // Dragging over a column
        targetColumn = columns.find((col) => col.id === overId)
        targetOrder = targetColumn?.tasks.length || 0
      } else {
        // Dragging over another task
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
        const activeIndex = activeColumn.tasks.findIndex(
          (t) => t.id === activeId,
        )
        if (activeIndex === targetOrder || activeIndex === targetOrder - 1) {
          return // No change needed
        }
      }

      // Find the current task from server data to get previous state
      const currentTask = convexTasks.find((t) => t._id === taskId)
      if (!currentTask) return

      const previousColumnId = currentTask.columnId
      const targetColumnId = targetColumn.id as ColumnId

      // Skip if no actual change
      if (
        previousColumnId === targetColumnId &&
        currentTask.order === targetOrder
      ) {
        return
      }

      // Apply optimistic update immediately for visual feedback
      // Use functional update to avoid stale closure issues
      setOptimisticUpdates((prev) => {
        // Check if we already have this exact update
        const existingUpdate = prev.get(taskId)
        if (
          existingUpdate &&
          existingUpdate.targetColumnId === targetColumnId &&
          existingUpdate.targetOrder === targetOrder
        ) {
          return prev // No change needed
        }

        const optimisticUpdate: OptimisticUpdate = {
          taskId,
          targetColumnId,
          targetOrder,
          previousColumnId,
          previousOrder: currentTask.order,
        }

        const next = new Map(prev)
        next.set(taskId, optimisticUpdate)
        return next
      })
    },
    [convexTasks, columns, findColumnByTaskId],
  )

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event
      setActiveTask(null)

      // Only clear optimistic updates if drag was truly cancelled (no over target)
      if (!over || !convexTasks) {
        setOptimisticUpdates(new Map())
        return
      }

      const activeId = active.id as string
      const overId = over.id as string
      const taskId = activeId as Id<'tasks'>

      // First, check if we have an existing optimistic update from handleDragOver
      // Use it if it exists, as it represents where the user actually dragged to
      const existingOptimisticUpdate = optimisticUpdatesRef.current.get(taskId)

      let targetColumnId: ColumnId
      let targetOrder: number
      let previousColumnId: ColumnId
      let previousOrder: number

      if (existingOptimisticUpdate) {
        // Use the optimistic update that was set during drag
        // This represents where the user actually dragged to
        targetColumnId = existingOptimisticUpdate.targetColumnId
        targetOrder = existingOptimisticUpdate.targetOrder
        previousColumnId = existingOptimisticUpdate.previousColumnId
        previousOrder = existingOptimisticUpdate.previousOrder
      } else {
        // Fallback: calculate from server data if no optimistic update exists
        const currentTask = convexTasks.find((t) => t._id === taskId)
        if (!currentTask) {
          setOptimisticUpdates(new Map())
          return
        }

        previousColumnId = currentTask.columnId
        previousOrder = currentTask.order

        // Determine target column and order based on drop target
        if (
          typeof overId === 'string' &&
          ['todo', 'doing', 'done'].includes(overId)
        ) {
          // Dropped directly on a column - append to end
          targetColumnId = overId as ColumnId
          const serverTasksInColumn = convexTasks.filter(
            (t) => t.columnId === targetColumnId && t._id !== taskId,
          )
          targetOrder = serverTasksInColumn.length
        } else {
          // Dropped on another task
          const overTask = convexTasks.find((t) => t._id === overId)
          if (!overTask) {
            setOptimisticUpdates(new Map())
            return
          }

          targetColumnId = overTask.columnId
          const serverTasksInTargetColumn = convexTasks
            .filter((t) => t.columnId === targetColumnId && t._id !== taskId)
            .sort((a, b) => a.order - b.order)

          const overTaskIndex = serverTasksInTargetColumn.findIndex(
            (t) => t._id === overId,
          )

          targetOrder =
            overTaskIndex >= 0
              ? overTaskIndex
              : serverTasksInTargetColumn.length

          // If moving within same column, adjust order based on direction
          if (previousColumnId === targetColumnId && activeId !== overId) {
            const allTasksInColumn = convexTasks
              .filter((t) => t.columnId === targetColumnId)
              .sort((a, b) => a.order - b.order)

            const currentIndex = allTasksInColumn.findIndex(
              (t) => t._id === taskId,
            )
            const overTaskIndexInAll = allTasksInColumn.findIndex(
              (t) => t._id === overId,
            )

            if (
              currentIndex >= 0 &&
              overTaskIndexInAll >= 0 &&
              currentIndex < overTaskIndexInAll
            ) {
              const tasksWithoutCurrent = allTasksInColumn.filter(
                (t) => t._id !== taskId,
              )
              const newOverTaskIndex = tasksWithoutCurrent.findIndex(
                (t) => t._id === overId,
              )
              targetOrder =
                newOverTaskIndex >= 0
                  ? newOverTaskIndex + 1
                  : tasksWithoutCurrent.length
            }
          }
        }
      }

      // Skip if no actual change
      // Only check this if we don't have an optimistic update (fallback case)
      // If we have an optimistic update, it means handleDragOver already determined there's a change
      if (
        !existingOptimisticUpdate &&
        previousColumnId === targetColumnId &&
        previousOrder === targetOrder
      ) {
        setOptimisticUpdates(new Map())
        return
      }

      // Ensure optimistic update is set (in case it wasn't set in handleDragOver)
      setOptimisticUpdates((prev) => {
        const existingUpdate = prev.get(taskId)
        if (
          existingUpdate &&
          existingUpdate.targetColumnId === targetColumnId &&
          existingUpdate.targetOrder === targetOrder
        ) {
          return prev
        }

        const optimisticUpdate: OptimisticUpdate = {
          taskId,
          targetColumnId,
          targetOrder,
          previousColumnId,
          previousOrder,
        }

        const next = new Map(prev)
        next.set(taskId, optimisticUpdate)
        return next
      })

      // Call Convex mutation to move the task
      // This should always be called if we reach here with valid target values
      try {
        await moveTaskMutation({
          taskId,
          targetColumnId,
          targetOrder,
        })
        // Remove optimistic update on success - the query will update automatically
        setOptimisticUpdates((prev) => {
          const next = new Map(prev)
          next.delete(taskId)
          return next
        })
      } catch (error) {
        console.error('Error moving task:', error)
        // Revert optimistic update on error
        setOptimisticUpdates((prev) => {
          const next = new Map(prev)
          next.delete(taskId)
          return next
        })
      }
    },
    [convexTasks, moveTaskMutation],
  )

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
        boardId,
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
      await seedSampleDataMutation({ boardId })
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
