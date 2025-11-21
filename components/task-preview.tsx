import React, { useEffect, useState } from 'react'
import { Task } from '../types'
import {
  ArrowLeft,
  Edit,
  Calendar,
  Flag,
  Trash2,
  FileText,
  Clock,
  Trello,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Notes } from './notes'

interface TaskPreviewProps {
  task: Task | null
  isOpen: boolean
  onClose: () => void
  onUpdate: (taskId: string, updates: Partial<Task>) => void
  onDelete: (taskId: string) => void
}

export function TaskPreview({
  task,
  isOpen,
  onClose,
  onUpdate,
  onDelete,
}: TaskPreviewProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editPriority, setEditPriority] = useState<Task['priority']>('medium')
  const [editDueDate, setEditDueDate] = useState('')

  // Update form fields when task changes
  useEffect(() => {
    if (task) {
      setEditTitle(task.title)
      setEditDescription(task.description || '')
      setEditPriority(task.priority)
      setEditDueDate(task.dueDate || '')
    }
  }, [task])

  // Handle ESC key to close
  useEffect(() => {
    if (!isOpen) return

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onClose])

  // Early return after all hooks
  if (!isOpen || !task) return null

  const getPriorityColor = (priority: Task['priority']) => {
    switch (priority) {
      case 'high':
        return 'text-red-600 bg-red-50 border-red-200'
      case 'medium':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'low':
        return 'text-green-600 bg-green-50 border-green-200'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const formatCreatedDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this task?')) {
      onDelete(task.id)
      onClose()
    }
  }

  const handleSaveEdit = () => {
    onUpdate(task.id, {
      title: editTitle.trim() || 'Untitled',
      description: editDescription.trim() || undefined,
      priority: editPriority,
      dueDate: editDueDate || undefined,
    })
    setIsEditing(false)
  }

  const handleCancelEdit = () => {
    if (task) {
      setEditTitle(task.title)
      setEditDescription(task.description || '')
      setEditPriority(task.priority)
      setEditDueDate(task.dueDate || '')
    }
    setIsEditing(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white px-6 py-4 shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onClose}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Board
            </button>
            <div className="hidden h-6 w-px bg-gray-300 md:block"></div>
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-blue-600 p-2">
                <Trello className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-xl font-bold text-gray-900">TaskBoard</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <button
                  onClick={handleCancelEdit}
                  className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
                >
                  Save Changes
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setIsEditing(true)}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
                >
                  <Edit className="h-4 w-4" />
                  Edit
                </button>
                <button
                  onClick={handleDelete}
                  className="inline-flex items-center gap-2 rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto min-h-screen px-4 py-8">
        <div className="mx-auto max-w-7xl">
          {/* Main Content Grid */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:items-start">
            {/* Left Column - Main Content */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl">Task Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {isEditing ? (
                    <div className="space-y-4">
                      <div>
                        <label className="mb-2 block text-sm font-medium text-gray-700">
                          Title
                        </label>
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                          placeholder="Task title..."
                        />
                      </div>
                      <div>
                        <label className="mb-2 block text-sm font-medium text-gray-700">
                          Description
                        </label>
                        <textarea
                          value={editDescription}
                          onChange={(e) => setEditDescription(e.target.value)}
                          className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                          rows={6}
                          placeholder="Add description..."
                        />
                      </div>
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                          <label className="mb-2 block text-sm font-medium text-gray-700">
                            Priority
                          </label>
                          <select
                            value={editPriority}
                            onChange={(e) =>
                              setEditPriority(
                                e.target.value as Task['priority'],
                              )
                            }
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                          >
                            <option value="low">Low Priority</option>
                            <option value="medium">Medium Priority</option>
                            <option value="high">High Priority</option>
                          </select>
                        </div>
                        <div>
                          <label className="mb-2 block text-sm font-medium text-gray-700">
                            Due Date
                          </label>
                          <input
                            type="date"
                            value={editDueDate}
                            onChange={(e) => setEditDueDate(e.target.value)}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-gray-500" />
                        <div>
                          <p className="text-sm text-gray-600">Title</p>
                          <p className="font-medium text-gray-900">
                            {task.title}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Description Card */}
              {!isEditing && (
                <Card className="mt-6">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Description
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {task.description ? (
                      <p className="leading-relaxed whitespace-pre-wrap text-gray-700">
                        {task.description}
                      </p>
                    ) : (
                      <p className="text-gray-400 italic">
                        No description provided
                      </p>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Priority & Due Date Card - Below Description */}
              {!isEditing && (
                <Card className="mt-6">
                  <CardHeader>
                    <CardTitle>Priority & Due Date</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      <div>
                        <p className="mb-2 text-sm text-gray-600">Priority</p>
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium ${getPriorityColor(task.priority)}`}
                          >
                            <Flag className="h-4 w-4" />
                            {task.priority.charAt(0).toUpperCase() +
                              task.priority.slice(1)}
                          </span>
                        </div>
                      </div>
                      {task.dueDate && (
                        <div>
                          <p className="mb-2 text-sm text-gray-600">Due Date</p>
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
                              <Calendar className="h-4 w-4" />
                              {formatDate(task.dueDate)}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Timestamps Card - Below Priority & Due Date */}
              {!isEditing && (
                <Card className="mt-6">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="h-5 w-5" />
                      Timestamps
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-sm text-gray-600">Created At</p>
                      <p className="font-medium text-gray-900">
                        {formatCreatedDate(task.createdAt)}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Right Column - Notes */}
            {!isEditing && (
              <div className="lg:h-[calc(100vh-9rem)] mb-8">
                <Notes taskId={task.id} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
