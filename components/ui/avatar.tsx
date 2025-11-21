import React from 'react'

interface AvatarProps {
  children: React.ReactNode
  className?: string
}

export function Avatar({ children, className = '' }: AvatarProps) {
  return (
    <div
      className={`flex items-center justify-center rounded-full ${className}`}
    >
      {children}
    </div>
  )
}

interface AvatarFallbackProps {
  children: React.ReactNode
  className?: string
}

export function AvatarFallback({
  children,
  className = '',
}: AvatarFallbackProps) {
  return (
    <div
      className={`flex h-full w-full items-center justify-center rounded-full ${className}`}
    >
      {children}
    </div>
  )
}

