import React, { useState } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Column as ColumnType, Task } from '../types'
import { TaskCard } from './task-card'
import { Plus, MoreHorizontal } from 'lucide-react'

interface ColumnProps {
  column: ColumnType
  onAddTask: (columnId: string, task: Omit<Task, 'id' | 'createdAt'>) => void
  onDeleteTask: (taskId: string) => void
  onUpdateTask: (taskId: string, updates: Partial<Task>) => void
}

export function Column({
  column,
  onAddTask,
  onDeleteTask,
  onUpdateTask,
}: ColumnProps) {
  const [isAddingTask, setIsAddingTask] = useState(false)
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [newTaskDescription, setNewTaskDescription] = useState('')
  const [newTaskPriority, setNewTaskPriority] =
    useState<Task['priority']>('medium')
  const [newTaskDueDate, setNewTaskDueDate] = useState('')

  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
  })

  const handleAddTask = () => {
    if (newTaskTitle.trim()) {
      const newTask: Omit<Task, 'id' | 'createdAt'> = {
        title: newTaskTitle.trim(),
        description: newTaskDescription.trim() || undefined,
        priority: newTaskPriority,
        dueDate: newTaskDueDate || undefined,
      }

      onAddTask(column.id, newTask)
      setNewTaskTitle('')
      setNewTaskDescription('')
      setNewTaskPriority('medium')
      setNewTaskDueDate('')
      setIsAddingTask(false)
    }
  }

  const handleCancelAdd = () => {
    setNewTaskTitle('')
    setNewTaskDescription('')
    setNewTaskPriority('medium')
    setNewTaskDueDate('')
    setIsAddingTask(false)
  }

  return (
    <div className="max-w-sm min-w-80 flex-1">
      <div
        className={`rounded-xl ${column.bgColor} flex h-[calc(100vh-200px)] flex-col border border-gray-200 shadow-sm`}
      >
        <div className="border-b border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`h-3 w-3 rounded-full ${column.color}`}></div>
              <h2 className="font-semibold text-gray-900">{column.title}</h2>
              <span className="rounded-full bg-gray-200 px-2 py-1 text-xs font-medium text-gray-600">
                {column.tasks.length}
              </span>
            </div>
            <button className="p-1 text-gray-400 transition-colors hover:text-gray-600">
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div
          ref={setNodeRef}
          className={`min-h-32 flex-1 overflow-y-auto p-4 transition-colors ${
            isOver ? 'bg-opacity-50 bg-blue-50' : ''
          } scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent hover:scrollbar-thumb-gray-400`}
        >
          <SortableContext
            items={column.tasks.map((task) => task.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="group space-y-3">
              {column.tasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onDelete={onDeleteTask}
                  onUpdate={onUpdateTask}
                />
              ))}
            </div>
          </SortableContext>
        </div>

        <div className="shrink-0 rounded-b-xl border-t border-gray-200 bg-white p-4">
          {isAddingTask ? (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 shadow-sm">
              <div className="space-y-3">
                <input
                  type="text"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="Task title..."
                  className="w-full border-0 text-sm font-medium placeholder-gray-400 outline-none"
                  autoFocus
                />
                <textarea
                  value={newTaskDescription}
                  onChange={(e) => setNewTaskDescription(e.target.value)}
                  placeholder="Add description..."
                  className="w-full resize-none border-0 text-sm text-gray-600 placeholder-gray-400 outline-none"
                  rows={2}
                />
                <div className="flex flex-wrap gap-2">
                  <select
                    value={newTaskPriority}
                    onChange={(e) =>
                      setNewTaskPriority(e.target.value as Task['priority'])
                    }
                    className="rounded border border-gray-300 px-2 py-1 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="low">Low Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="high">High Priority</option>
                  </select>
                  <input
                    type="date"
                    value={newTaskDueDate}
                    onChange={(e) => setNewTaskDueDate(e.target.value)}
                    className="rounded border border-gray-300 px-2 py-1 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    onClick={handleCancelAdd}
                    className="px-3 py-1.5 text-xs text-gray-600 transition-colors hover:text-gray-800"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddTask}
                    className="rounded bg-blue-600 px-3 py-1.5 text-xs text-white transition-colors hover:bg-blue-700"
                  >
                    Add Task
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setIsAddingTask(true)}
              className="group flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 p-3 text-gray-500 transition-all duration-200 hover:border-gray-400 hover:text-gray-600"
            >
              <Plus className="h-4 w-4 transition-transform group-hover:scale-110" />
              <span className="text-sm font-medium">Add a task</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
