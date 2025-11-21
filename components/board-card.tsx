'use client'

import { Card } from '@/components/ui/card'
import { useRouter } from 'next/navigation'
import { LayoutGrid } from 'lucide-react'
import { type Id } from '@/convex/_generated/dataModel'

interface BoardCardProps {
  id: string
  title: string
  description?: string
  color: string
}

export function BoardCard({ id, title, description, color }: BoardCardProps) {
  const router = useRouter()

  return (
    <Card
      onClick={() => router.push(`/boards/${id}`)}
      className="group cursor-pointer overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-lg"
      style={{ animationDelay: `${Math.random() * 0.2}s` }}
    >
      <div className={`h-24 w-full ${color} flex items-center justify-center`}>
        <LayoutGrid className="h-10 w-10 text-white opacity-80" />
      </div>
      <div className="p-5">
        <h3 className="text-card-foreground group-hover:text-primary mb-2 text-lg font-semibold transition-colors">
          {title}
        </h3>
        {description && (
          <p className="text-muted-foreground line-clamp-2 text-sm">
            {description}
          </p>
        )}
      </div>
    </Card>
  )
}
