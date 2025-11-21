'use client'

import { useEffect, useState } from 'react'
import { authClient } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { LogOut, User } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

export function UserMenu() {
  const [session, setSession] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const currentUser = useQuery(api.auth.getCurrentUser)

  useEffect(() => {
    authClient.getSession().then((result) => {
      setSession(result.data?.session || null)
      setIsLoading(false)
    })
  }, [])

  const handleSignOut = async () => {
    await authClient.signOut()
    setSession(null)
    window.location.href = '/'
  }

  if (isLoading) {
    return <div className="h-8 w-8 animate-pulse rounded-full bg-gray-300" />
  }

  const user = session?.user || currentUser
  if (!user) return null

  const userInitials = user?.name
    ? user.name
        .split(' ')
        .map((n: string) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : user?.email?.[0]?.toUpperCase() || 'U'

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 rounded-full p-0">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user.image} alt={user.name || user.email} />
            <AvatarFallback>{userInitials}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="px-2 py-1.5">
          <p className="text-sm font-medium">{user.name || user.email}</p>
          <p className="text-xs text-gray-500">{user.email}</p>
        </div>
        <DropdownMenuItem onClick={handleSignOut}>
          <LogOut className="mr-2 h-4 w-4" />
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
