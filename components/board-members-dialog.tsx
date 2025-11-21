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
import { Label } from '@/components/ui/label'
import { Users, UserPlus, X } from 'lucide-react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { toast } from 'sonner'

// Types for board members and invitations
type BoardMember = {
  userId: string
  role: string
  joinedAt: string
  email: string | null
  name: string | null
  image: string | null
}

type BoardInvitation = {
  _id: Id<'boardInvitations'>
  email: string
  invitedBy: string
  createdAt: string
  expiresAt: string
}

interface BoardMembersDialogProps {
  boardId: Id<'boards'>
  isOwner: boolean
}

export function BoardMembersDialog({
  boardId,
  isOwner,
}: BoardMembersDialogProps) {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [isAdding, setIsAdding] = useState(false)

  const board = useQuery(api.boards.getBoard, { id: boardId })
  const addMemberMutation = useMutation(api.boards.addBoardMember)
  const removeMemberMutation = useMutation(api.boards.removeBoardMember)
  const cancelInvitationMutation = useMutation(api.boards.cancelBoardInvitation)
  const invitations = useQuery(
    api.boards.getBoardInvitations,
    isOwner ? { boardId } : 'skip',
  )

  const members = board?.members || []
  const pendingInvitations = invitations || []

  const handleAddMember = async () => {
    if (!email.trim()) {
      toast.error('Please enter an email address')
      return
    }

    setIsAdding(true)
    try {
      const result = await addMemberMutation({
        boardId,
        email: email.trim(),
      })
      setEmail('')
      if (result.added) {
        toast.success('Member added successfully')
      } else {
        toast.success('Invitation sent successfully')
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to add member'
      toast.error(message)
    } finally {
      setIsAdding(false)
    }
  }

  const handleCancelInvitation = async (
    invitationId: Id<'boardInvitations'>,
    email: string,
  ) => {
    if (!confirm(`Cancel invitation for ${email}?`)) return

    try {
      await cancelInvitationMutation({ invitationId })
      toast.success('Invitation cancelled')
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to cancel invitation'
      toast.error(message)
    }
  }

  const handleRemoveMember = async (userId: string, userEmail: string) => {
    if (!confirm(`Remove ${userEmail || 'this member'} from this board?`))
      return

    try {
      await removeMemberMutation({
        boardId,
        userId,
      })
      toast.success('Member removed successfully')
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to remove member'
      toast.error(message)
    }
  }

  const getInitials = (
    name: string | null | undefined,
    email: string | null | undefined,
  ) => {
    if (name) {
      return name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    }
    return email?.[0]?.toUpperCase() || 'U'
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Users className="mr-2 h-4 w-4" />
          Members ({members.length})
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Board Members</DialogTitle>
          <DialogDescription>
            Manage who has access to this board
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {isOwner && (
            <div className="space-y-2">
              <Label htmlFor="email">Add member by email</Label>
              <div className="flex gap-2">
                <Input
                  id="email"
                  type="email"
                  placeholder="user@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddMember()
                  }}
                  disabled={isAdding}
                />
                <Button onClick={handleAddMember} disabled={isAdding}>
                  <UserPlus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {pendingInvitations.length > 0 && isOwner && (
            <div className="space-y-2">
              <Label>Pending Invitations ({pendingInvitations.length})</Label>
              <div className="max-h-[200px] space-y-2 overflow-y-auto">
                {pendingInvitations.map((invitation: BoardInvitation) => (
                  <div
                    key={invitation._id}
                    className="flex items-center justify-between rounded-lg border border-dashed p-3"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>
                          {invitation.email?.[0]?.toUpperCase() || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">
                          {invitation.email}
                        </p>
                        <p className="text-xs text-gray-500">
                          Invited{' '}
                          {new Date(invitation.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        handleCancelInvitation(invitation._id, invitation.email)
                      }
                      className="h-8 w-8 p-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Members ({members.length})</Label>
            <div className="max-h-[300px] space-y-2 overflow-y-auto">
              {members.map((member: BoardMember) => (
                <div
                  key={member.userId}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={member.image || undefined} />
                      <AvatarFallback>
                        {getInitials(member.name, member.email)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">
                        {member.name || member.email || 'Unknown'}
                      </p>
                      {member.email && member.name && (
                        <p className="text-xs text-gray-500">{member.email}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 capitalize">
                      {member.role}
                    </span>
                    {isOwner && member.role !== 'owner' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          handleRemoveMember(member.userId, member.email || '')
                        }
                        className="h-8 w-8 p-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
