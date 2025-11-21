'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'

const colorOptions = [
  { name: 'Ocean', class: 'bg-gradient-to-br from-blue-500 to-cyan-500' },
  { name: 'Sunset', class: 'bg-gradient-to-br from-orange-500 to-pink-500' },
  { name: 'Forest', class: 'bg-gradient-to-br from-green-500 to-emerald-500' },
  { name: 'Purple', class: 'bg-gradient-to-br from-purple-500 to-indigo-500' },
  { name: 'Fire', class: 'bg-gradient-to-br from-red-500 to-orange-500' },
  {
    name: 'Lavender',
    class: 'bg-gradient-to-br from-violet-500 to-purple-500',
  },
]

interface CreateBoardDialogProps {
  onCreateBoard?: (boardId: Id<'boards'>) => void
}

export function CreateBoardDialog({ onCreateBoard }: CreateBoardDialogProps) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [selectedColor, setSelectedColor] = useState(colorOptions[0].class)

  const createBoardMutation = useMutation(api.boards.createBoard)

  const handleCreate = async () => {
    if (!title.trim()) {
      toast.error('Please enter a board title')
      return
    }

    try {
      const boardId = await createBoardMutation({
        title: title.trim(),
        description: description.trim() || undefined,
        color: selectedColor,
      })

      setTitle('')
      setDescription('')
      setSelectedColor(colorOptions[0].class)
      setOpen(false)
      toast.success('Board created successfully!')

      if (onCreateBoard) {
        onCreateBoard(boardId)
      }
    } catch (error) {
      console.error('Error creating board:', error)
      toast.error('Failed to create board')
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="lg"
          className="bg-gradient-to-r from-blue-600 to-blue-700 shadow-md transition-opacity hover:opacity-90"
        >
          <Plus className="mr-2 h-5 w-5" />
          Create New Board
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Board</DialogTitle>
          <DialogDescription>
            Give your board a name and choose a color theme.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">Board Title</Label>
            <Input
              id="title"
              placeholder="e.g., Website Redesign"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleCreate()
                }
              }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              placeholder="What is this board about?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label>Board Color</Label>
            <div className="grid grid-cols-3 gap-3">
              {colorOptions.map((color) => (
                <button
                  key={color.name}
                  onClick={() => setSelectedColor(color.class)}
                  className={`h-16 rounded-lg ${color.class} transition-all duration-200 ${
                    selectedColor === color.class
                      ? 'ring-primary scale-105 ring-4'
                      : 'hover:scale-105'
                  }`}
                  aria-label={color.name}
                />
              ))}
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            className="bg-gradient-to-r from-blue-600 to-blue-700"
          >
            Create Board
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
