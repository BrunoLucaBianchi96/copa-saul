'use client'

import { useEffect, useState } from 'react'

// Darcula accent palette so the confetti matches the rest of the theme.
const COLORS = ['#98C379', '#6897BB', '#FFC66D', '#E06C75', '#C678DD', '#56B6C2']

interface Piece {
  left: number
  delay: number
  duration: number
  color: string
  width: number
  height: number
  drift: number
  spin: number
}

// Falling confetti rendered as lightweight CSS-animated spans. Pieces are
// generated after mount (Math.random would otherwise cause a hydration
// mismatch) and loop forever, drifting and spinning as they fall.
export function Confetti({ count = 90 }: { count?: number }) {
  const [pieces, setPieces] = useState<Piece[]>([])

  useEffect(() => {
    setPieces(
      Array.from({ length: count }, () => {
        const width = 6 + Math.random() * 8
        return {
          left: Math.random() * 100,
          delay: Math.random() * 6,
          duration: 4 + Math.random() * 4,
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
          width,
          height: width * (0.35 + Math.random() * 0.3),
          drift: (Math.random() - 0.5) * 160,
          spin: 180 + Math.random() * 540,
        }
      })
    )
  }, [count])

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-20">
      {pieces.map((p, i) => (
        <span
          key={i}
          className="confetti-piece"
          style={
            {
              left: `${p.left}%`,
              width: p.width,
              height: p.height,
              backgroundColor: p.color,
              animationDelay: `${p.delay}s`,
              animationDuration: `${p.duration}s`,
              '--drift': `${p.drift}px`,
              '--spin': `${p.spin}deg`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  )
}
