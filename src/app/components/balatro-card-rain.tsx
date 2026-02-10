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
  const size = 50 + Math.random() * 100 // 50-300px wide
  // Smaller cards fall slower: size 50 → ~40s, size 150 → ~15s
  const sizeFactor = (size - 50) / 100 // 0 (smallest) to 1 (largest)
  const duration = 40 - sizeFactor * 25 + Math.random() * 5
  return {
    id,
    jokerIndex: Math.floor(Math.random() * BALATRO_JOKERS.length),
    left: Math.random() * 100,
    delay: Math.random() * -40,
    duration,
    size,
    rotStart: -20 + Math.random() * 40,
    rotEnd: -20 + Math.random() * 40,
    opacity: 1,
    startY: '-300px',
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
    let prevLerpX = lerpPosRef.current.x
    let currentRot = 0

    const LERP_SPEED = 0.18
    const ROT_SENSITIVITY = 0.8  // degrees per px of horizontal velocity
    const MAX_ROT = 30
    const ROT_LERP = 0.08        // how fast rotation eases in/out

    const tick = () => {
      const lp = lerpPosRef.current
      const mp = mousePosRef.current
      lp.x += (mp.x - lp.x) * LERP_SPEED
      lp.y += (mp.y - lp.y) * LERP_SPEED

      const dx = lp.x - prevLerpX
      prevLerpX = lp.x
      const targetRot = Math.max(-MAX_ROT, Math.min(MAX_ROT, -dx * ROT_SENSITIVITY))
      currentRot += (targetRot - currentRot) * ROT_LERP

      if (grabbedElRef.current) {
        grabbedElRef.current.style.transform = `translate(${lp.x - 100}px, ${lp.y - 140}px) rotate(${currentRot}deg)`
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
            transform: translateY(calc(100vh + 300px)) rotate(var(--rot-end));
          }
        }
        @keyframes cardShrink {
          from { transform: scale(var(--shrink-from)); }
          to { transform: scale(1); }
        }
      `}</style>
      {cards.map((card) => {
        const isGrabbed = grabbed === card.id
        const wasDropped = card.key > 0
        return isGrabbed ? (
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
            style={{
              position: 'fixed',
              left: 0,
              top: 0,
              width: '200px',
              opacity: card.opacity,
              filter: 'drop-shadow(0 0 16px rgba(0,0,0,0.8))',
              imageRendering: 'auto',
              pointerEvents: 'auto',
              cursor: 'grabbing',
              zIndex: 200,
            }}
          />
        ) : (
          <div
            key={`${card.id}-${card.key}`}
            onAnimationEnd={wasDropped ? (e) => {
              if (e.animationName !== 'cardFall') return
              setCards(prev => prev.map(c =>
                c.id === card.id ? generateCard(card.id) : c
              ))
            } : undefined}
            style={{
              position: 'absolute',
              left: `${card.left}%`,
              top: 0,
              width: `${card.size}px`,
              opacity: card.opacity,
              animation: `cardFall ${card.duration}s linear ${card.delay}s ${wasDropped ? '1 forwards' : 'infinite'}`,
              '--start-y': card.startY,
              '--rot-start': `${card.rotStart}deg`,
              '--rot-end': `${card.rotEnd}deg`,
              zIndex: Math.round(card.size),
              pointerEvents: 'auto',
              cursor: 'grab',
            } as React.CSSProperties}
          >
            <img
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
              style={{
                width: '100%',
                filter: 'drop-shadow(0 0 8px rgba(0,0,0,0.6))',
                imageRendering: 'auto',
                transformOrigin: 'center center',
                '--shrink-from': `${200 / card.size}`,
                ...(wasDropped ? { animation: 'cardShrink 0.3s ease-out forwards' } : {}),
              } as React.CSSProperties}
            />
          </div>
        )
      })}
    </div>
  )
}