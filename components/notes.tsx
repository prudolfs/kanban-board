'use client'

import { useState } from 'react'
import type React from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { MessageSquare, Send, Clock, Trash } from 'lucide-react'
import { formatDate } from '@/utils/format-date'

// Note type from Convex
type Note = {
  _id: Id<'notes'>
  _creationTime: number
  taskId: Id<'tasks'>
  content: string
  createdAt: string
}

type Props = {
  taskId: string
}

function Notes({ taskId }: Props) {
  const [noteContent, setNoteContent] = useState('')
  const [isAddingNote, setIsAddingNote] = useState(false)
  const [isDeletingNote, setIsDeletingNote] = useState<Id<'notes'> | null>(null)

  // Fetch notes from Convex
  const notes = useQuery(
    api.notes.getNotes,
    taskId ? { taskId: taskId as Id<'tasks'> } : 'skip',
  ) as Note[] | undefined

  // Mutations
  const addNoteMutation = useMutation(api.notes.addNote)
  const deleteNoteMutation = useMutation(api.notes.deleteNote)

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (noteContent.trim() && taskId && !isAddingNote) {
      setIsAddingNote(true)
      try {
        await addNoteMutation({
          taskId: taskId as Id<'tasks'>,
          content: noteContent,
        })
        setNoteContent('')
      } catch (error) {
        console.error('Error adding note:', error)
      } finally {
        setIsAddingNote(false)
      }
    }
  }

  const handleDelete = async (noteId: Id<'notes'>) => {
    if (isDeletingNote) return
    setIsDeletingNote(noteId)
    try {
      await deleteNoteMutation({ noteId })
    } catch (error) {
      console.error('Error deleting note:', error)
    } finally {
      setIsDeletingNote(null)
    }
  }

  // Show loading state
  if (notes === undefined) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Notes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="py-4 text-center text-gray-500">Loading notes...</div>
        </CardContent>
      </Card>
    )
  }

  const notesList = notes || []

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Notes ({notesList.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <form className="space-y-3" onSubmit={handleSubmit}>
          <Textarea
            placeholder="Add a note..."
            value={noteContent}
            onChange={(e) => setNoteContent(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={3}
            className="resize-none"
          />
          <div className="flex justify-end">
            <Button
              type="submit"
              size="sm"
              disabled={!noteContent.trim() || isAddingNote}
            >
              <Send className="mr-2 h-4 w-4" />
              {isAddingNote ? 'Adding...' : 'Add Note'}
            </Button>
          </div>
        </form>

        <div className="space-y-4">
          {notesList.length === 0 ? (
            <div className="py-8 text-center text-gray-500">
              <MessageSquare className="mx-auto mb-3 h-12 w-12 opacity-30" />
              <p>No notes yet. Add the first note above.</p>
            </div>
          ) : (
            notesList.map((note) => (
              <div
                key={note._id}
                className="flex gap-3 rounded-lg bg-gray-50 p-4"
              >
                <Avatar className="h-8 w-8 flex-shrink-0">
                  <AvatarFallback className="bg-blue-100 text-xs text-blue-700">
                    A
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">
                        Admin
                      </span>
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Clock className="h-3 w-3" />
                        {formatDate(note.createdAt)}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-gray-500 hover:text-red-500"
                      onClick={() => handleDelete(note._id)}
                      disabled={isDeletingNote === note._id}
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
                    {note.content}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export { Notes }

