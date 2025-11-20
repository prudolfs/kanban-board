import React, { useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Task } from '../types'
import { Calendar, Flag, Trash2, Edit3, Check, X } from 'lucide-react'

interface TaskCardProps {
  task: Task
  onDelete: (taskId: string) => void
  onUpdate: (taskId: string, updates: Partial<Task>) => void
}

export function TaskCard({ task, onDelete, onUpdate }: TaskCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(task.title)
  const [editDescription, setEditDescription] = useState(task.description || '')

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const handleSaveEdit = () => {
    onUpdate(task.id, {
      title: editTitle.trim() || 'Untitled',
      description: editDescription.trim(),
    })
    setIsEditing(false)
  }

  const handleCancelEdit = () => {
    setEditTitle(task.title)
    setEditDescription(task.description || '')
    setIsEditing(false)
  }

  const getPriorityColor = (priority: Task['priority']) => {
    switch (priority) {
      case 'high':
        return 'text-red-600 bg-red-50'
      case 'medium':
        return 'text-yellow-600 bg-yellow-50'
      case 'low':
        return 'text-green-600 bg-green-50'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    })
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`mb-3 cursor-grab rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition-all duration-200 hover:shadow-md active:cursor-grabbing ${
        isDragging ? 'scale-105 rotate-3 opacity-50' : ''
      }`}
    >
      {isEditing ? (
        <div className="space-y-3">
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            className="w-full rounded border border-gray-300 px-2 py-1 text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
            autoFocus
          />
          <textarea
            value={editDescription}
            onChange={(e) => setEditDescription(e.target.value)}
            placeholder="Add description..."
            className="w-full resize-none rounded border border-gray-300 px-2 py-1 text-sm text-gray-600 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            rows={2}
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={handleCancelEdit}
              className="p-1 text-gray-400 transition-colors hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
            <button
              onClick={handleSaveEdit}
              className="p-1 text-green-600 transition-colors hover:text-green-700"
            >
              <Check className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="mb-2 flex items-start justify-between">
            <h3 className="flex-1 text-sm font-medium text-gray-900">
              {task.title}
            </h3>
            <div className="ml-2 flex gap-1">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setIsEditing(true)
                }}
                className="p-1 text-gray-400 opacity-0 transition-colors group-hover:opacity-100 hover:text-blue-600"
              >
                <Edit3 className="h-3 w-3" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete(task.id)
                }}
                className="p-1 text-gray-400 opacity-0 transition-colors group-hover:opacity-100 hover:text-red-600"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          </div>

          {task.description && (
            <p className="mb-3 text-xs leading-relaxed text-gray-600">
              {task.description}
            </p>
          )}

          <div className="flex items-center justify-between">
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${getPriorityColor(task.priority)}`}
            >
              <Flag className="h-3 w-3" />
              {task.priority}
            </span>

            {task.dueDate && (
              <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                <Calendar className="h-3 w-3" />
                {formatDate(task.dueDate)}
              </span>
            )}
          </div>
        </>
      )}

      <style jsx>{`
        .group:hover .opacity-0 {
          opacity: 1;
        }
      `}</style>
    </div>
  )
}
