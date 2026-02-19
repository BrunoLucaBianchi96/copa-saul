'use client'

import { createContext, useState, useCallback, useEffect, useRef, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { useGamepad } from '@/app/hooks/useGamepad'

export const GamepadFocusContext = createContext<{
  focusedMatchIndex: number | null
  setNavigating: (v: boolean) => void
}>({
  focusedMatchIndex: null,
  setNavigating: () => {},
})

interface TournamentGamepadProps {
  children: ReactNode
  tournamentId: number
  matchHrefs: string[]
  viewingRound: number
  canGoPrev: boolean
  canGoNext: boolean
}

function getActionElements() {
  return Array.from(document.querySelectorAll<HTMLElement>('[data-gamepad-action]'))
}

export function TournamentGamepad({
  children,
  tournamentId,
  matchHrefs,
  viewingRound,
  canGoPrev,
  canGoNext,
}: TournamentGamepadProps) {
  const router = useRouter()
  const [focusedMatchIndex, setFocusedMatchIndex] = useState<number | null>(null)
  const [focusedActionIndex, setFocusedActionIndex] = useState<number | null>(null)
  const [navigating, setNavigating] = useState(false)
  const lastBumperPress = useRef(0)

  // Clear navigating state when the round changes (new page rendered)
  useEffect(() => {
    setNavigating(false)
    setFocusedMatchIndex(null)
  }, [viewingRound])

  // Sync gamepad-focus class on action elements via DOM
  useEffect(() => {
    const actions = getActionElements()
    actions.forEach((el, i) => {
      el.classList.toggle('gamepad-focus', i === focusedActionIndex)
    })
    return () => {
      actions.forEach((el) => el.classList.remove('gamepad-focus'))
    }
  }, [focusedActionIndex])

  const handleDirection = useCallback(
    (dir: 'up' | 'down' | 'left' | 'right') => {
      const actionCount = getActionElements().length

      if (dir === 'down') {
        if (focusedActionIndex !== null) {
          // Move from actions back to first match
          setFocusedActionIndex(null)
          setFocusedMatchIndex(matchHrefs.length > 0 ? 0 : null)
          return
        }
        if (matchHrefs.length === 0) return
        setFocusedMatchIndex((prev) => {
          if (prev === null) return 0
          return Math.min(matchHrefs.length - 1, prev + 1)
        })
      } else if (dir === 'up') {
        if (focusedActionIndex !== null) return // already at top
        if (matchHrefs.length === 0 && actionCount > 0) {
          setFocusedActionIndex(0)
          return
        }
        setFocusedMatchIndex((prev) => {
          if (prev === null) return 0
          if (prev > 0) return prev - 1
          // At first match — move to actions if available
          if (actionCount > 0) {
            setFocusedActionIndex(0)
            return null
          }
          return prev
        })
      } else if (dir === 'left' || dir === 'right') {
        if (focusedActionIndex !== null && actionCount > 1) {
          setFocusedActionIndex((prev) => {
            if (prev === null) return 0
            if (dir === 'left') return Math.max(0, prev - 1)
            return Math.min(actionCount - 1, prev + 1)
          })
        }
      }
    },
    [matchHrefs.length, focusedActionIndex],
  )

  const handleButton = useCallback(
    (button: string) => {
      if (button === 'cross') {
        if (focusedActionIndex !== null) {
          const actions = getActionElements()
          actions[focusedActionIndex]?.click()
        } else if (focusedMatchIndex !== null && matchHrefs[focusedMatchIndex]) {
          setNavigating(true)
          router.push(matchHrefs[focusedMatchIndex])
        }
      } else if (button === 'triangle') {
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {})
        } else {
          document.documentElement.requestFullscreen().catch(() => {})
        }
      } else if (button === 'l1' && canGoPrev) {
        const now = Date.now()
        if (now - lastBumperPress.current < 500) return
        lastBumperPress.current = now
        setNavigating(true)
        router.push(`/tournaments/${tournamentId}?round=${viewingRound - 1}`)
      } else if (button === 'r1' && canGoNext) {
        const now = Date.now()
        if (now - lastBumperPress.current < 500) return
        lastBumperPress.current = now
        setNavigating(true)
        router.push(`/tournaments/${tournamentId}?round=${viewingRound + 1}`)
      }
    },
    [focusedMatchIndex, focusedActionIndex, matchHrefs, canGoPrev, canGoNext, viewingRound, tournamentId, router],
  )

  useGamepad({
    onButtonPress: handleButton,
    onDirection: handleDirection,
    enabled: true,
  })

  return (
    <GamepadFocusContext.Provider value={{ focusedMatchIndex, setNavigating }}>
      <div className="relative">
        {children}
        {navigating && (
          <div className="absolute inset-0 flex items-center justify-center bg-darcula-surface/60 rounded">
            <svg className="w-8 h-8 animate-spin text-darcula-text-muted" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        )}
      </div>
    </GamepadFocusContext.Provider>
  )
}
