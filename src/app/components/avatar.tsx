'use client'

import { useState, useEffect, useRef } from 'react'

interface AvatarProps {
  src?: string | null
  name: string
  size?: 'sm' | 'md' | 'lg'
}

export function Avatar({ src, name, size = 'md' }: AvatarProps) {
  const [imgLoaded, setImgLoaded] = useState(false)
  const [imgError, setImgError] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)

  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-16 h-16 text-lg',
  }

  // Get initials from name
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  // Generate a consistent color based on name
  const colors = [
    'bg-red-500',
    'bg-orange-500',
    'bg-amber-500',
    'bg-yellow-500',
    'bg-lime-500',
    'bg-green-500',
    'bg-emerald-500',
    'bg-teal-500',
    'bg-cyan-500',
    'bg-sky-500',
    'bg-blue-500',
    'bg-indigo-500',
    'bg-violet-500',
    'bg-purple-500',
    'bg-fuchsia-500',
    'bg-pink-500',
    'bg-rose-500',
  ]
  const colorIndex = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length
  const bgColor = colors[colorIndex]

  // Reset state when src changes and check if already loaded
  useEffect(() => {
    setImgLoaded(false)
    setImgError(false)

    // Check if image is already loaded (cached)
    if (imgRef.current?.complete && imgRef.current?.naturalWidth > 0) {
      setImgLoaded(true)
    }
  }, [src])

  // Show initials fallback if no src, error, or image hasn't loaded yet
  const showFallback = !src || imgError || !imgLoaded

  return (
    <div className={`${sizeClasses[size]} rounded-full overflow-hidden flex-shrink-0`}>
      {src && !imgError && (
        <img
          ref={imgRef}
          src={src}
          alt={name}
          onLoad={() => setImgLoaded(true)}
          onError={() => setImgError(true)}
          className={`w-full h-full object-cover ${imgLoaded ? 'block' : 'hidden'}`}
        />
      )}
      {showFallback && (
        <div
          className={`w-full h-full ${bgColor} flex items-center justify-center text-white font-medium`}
        >
          {initials}
        </div>
      )}
    </div>
  )
}
