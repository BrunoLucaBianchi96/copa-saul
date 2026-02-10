'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { BALATRO_JOKERS } from '@/lib/balatro-jokers'

interface FallingCard {
  id: number
  jokerIndex: number
  left: number       // % from left
  delay: number      // seconds
  duration: number   // seconds to fall
  size: number       // px width
  rotStart: number   // degrees at top
  rotEnd: number     // degrees at bottom
  opacity: number
  startY: string     // CSS value for where the fall begins
  key: number        // bumped to force animation restart
}

function generateCard(id: number): FallingCard {
  return {
    id,
    jokerIndex: Math.floor(Math.random() * BALATRO_JOKERS.length),
    left: Math.random() * 100,
    delay: Math.random() * -40, // negative so cards are already mid-fall on load
    duration: 20 + Math.random() * 25, // 20-45 seconds to fall
    size: 100 + Math.random() * 50, // 100-150px wide
    rotStart: -20 + Math.random() * 40,
    rotEnd: -20 + Math.random() * 40,
    opacity: 1,
    startY: '-150px',
    key: 0,
  }
}

const CARD_COUNT = 25

export function BalatroCardRain() {
  const [cards, setCards] = useState<FallingCard[]>([])
  const [grabbed, setGrabbed] = useState<number | null>(null) // card id
  const mousePosRef = useRef({ x: 0, y: 0 })
  const lerpPosRef = useRef({ x: 0, y: 0 })
  const grabbedElRef = useRef<HTMLImageElement | null>(null)
  const rafRef = useRef<number>(0)
  const cardRefs = useRef<Map<number, HTMLImageElement>>(new Map())

  // When a card is dropped, we snapshot its current screen position and
  // restart the fall animation from there by giving it a new left/delay
  const dropCard = useCallback((cardId: number) => {
    const el = cardRefs.current.get(cardId)
    if (!el) { setGrabbed(null); return }

    const card = cards.find(c => c.id === cardId)
    const cardWidth = card?.size ?? 100
    const cardHeight = cardWidth * 1.4 // approximate card aspect ratio
    const currentLeft = ((lerpPosRef.current.x - cardWidth / 2) / window.innerWidth) * 100
    const dropY = lerpPosRef.current.y - cardHeight / 2
    // scale duration to remaining distance
    const remainingFraction = Math.max(0.1, (window.innerHeight - dropY + 150) / (window.innerHeight + 300))

    setCards(prev => prev.map(c => {
      if (c.id !== cardId) return c
      return {
        ...c,
        left: currentLeft,
        delay: 0,
        duration: Math.max(4, 30 * remainingFraction),
        rotStart: 0,
        rotEnd: -10 + Math.random() * 20,
        startY: `${dropY}px`,
        key: c.key + 1, // force animation restart
      }
    }))
    setGrabbed(null)
  }, [])

  useEffect(() => {
    setCards(Array.from({ length: CARD_COUNT }, (_, i) => generateCard(i)))
  }, [])

  useEffect(() => {
    if (grabbed === null) return

    const el = cardRefs.current.get(grabbed)
    grabbedElRef.current = el ?? null

    // Initialize lerp position to current mouse so it doesn't jump from (0,0)
    lerpPosRef.current = { ...mousePosRef.current }

    const LERP_SPEED = 0.1

    const tick = () => {
      const lp = lerpPosRef.current
      const mp = mousePosRef.current
      lp.x += (mp.x - lp.x) * LERP_SPEED
      lp.y += (mp.y - lp.y) * LERP_SPEED

      if (grabbedElRef.current) {
        grabbedElRef.current.style.transform = `translate(${lp.x - 100}px, ${lp.y - 140}px) rotate(0deg)`
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)

    const onMove = (e: MouseEvent) => {
      mousePosRef.current = { x: e.clientX, y: e.clientY }
    }
    const onUp = () => dropCard(grabbed)

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      cancelAnimationFrame(rafRef.current)
      grabbedElRef.current = null
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [grabbed, dropCard])

  if (cards.length === 0) return null

  return (
    <div className="fixed inset-0 overflow-hidden" style={{ zIndex: 1, pointerEvents: 'none' }}>
      <style>{`
        @keyframes cardFall {
          0% {
            transform: translateY(var(--start-y)) rotate(var(--rot-start));
          }
          100% {
            transform: translateY(calc(100vh + 150px)) rotate(var(--rot-end));
          }
        }
      `}</style>
      {cards.map((card) => {
        const isGrabbed = grabbed === card.id
        const wasDropped = card.key > 0
        return (
          <img
            key={`${card.id}-${card.key}`}
            ref={(el) => {
              if (el) cardRefs.current.set(card.id, el)
              else cardRefs.current.delete(card.id)
            }}
            src={BALATRO_JOKERS[card.jokerIndex].image}
            alt=""
            draggable={false}
            onMouseDown={(e) => {
              e.preventDefault()
              mousePosRef.current = { x: e.clientX, y: e.clientY }
              setGrabbed(card.id)
            }}
            onAnimationEnd={wasDropped ? () => {
              // Respawn as a fresh card falling from the top
              setCards(prev => prev.map(c =>
                c.id === card.id ? generateCard(card.id) : c
              ))
            } : undefined}
            style={isGrabbed ? {
              position: 'fixed',
              left: 0,
              top: 0,
              width: '200px',
              opacity: card.opacity,
              filter: 'drop-shadow(0 0 16px rgba(0,0,0,0.8))',
              imageRendering: 'auto',
              pointerEvents: 'auto',
              cursor: 'grabbing',
              zIndex: 10,
            } : {
              position: 'absolute',
              left: `${card.left}%`,
              top: 0,
              width: `${card.size}px`,
              opacity: card.opacity,
              animation: `cardFall ${card.duration}s linear ${card.delay}s ${wasDropped ? '1 forwards' : 'infinite'}`,
              '--start-y': card.startY,
              '--rot-start': `${card.rotStart}deg`,
              '--rot-end': `${card.rotEnd}deg`,
              filter: 'drop-shadow(0 0 8px rgba(0,0,0,0.6))',
              imageRendering: 'auto',
              pointerEvents: 'auto',
              cursor: 'grab',
            } as React.CSSProperties}
          />
        )
      })}
    </div>
  )
}