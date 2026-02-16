'use client'

import { createContext, useState, useCallback, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { useGamepad } from '@/app/hooks/useGamepad'

export const GamepadFocusContext = createContext<{ focusedMatchIndex: number | null }>({
  focusedMatchIndex: null,
})

interface TournamentGamepadProps {
  children: ReactNode
  tournamentId: number
  matchHrefs: string[]
  viewingRound: number
  canGoPrev: boolean
  canGoNext: boolean
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

  const handleDirection = useCallback(
    (dir: 'up' | 'down' | 'left' | 'right') => {
      if (matchHrefs.length === 0) return

      if (dir === 'up' || dir === 'down') {
        setFocusedMatchIndex((prev) => {
          if (prev === null) return 0
          if (dir === 'up') return Math.max(0, prev - 1)
          return Math.min(matchHrefs.length - 1, prev + 1)
        })
      }
    },
    [matchHrefs.length],
  )

  const handleButton = useCallback(
    (button: string) => {
      if (button === 'cross' && focusedMatchIndex !== null && matchHrefs[focusedMatchIndex]) {
        router.push(matchHrefs[focusedMatchIndex])
      } else if (button === 'l1' && canGoPrev) {
        router.push(`/tournaments/${tournamentId}?round=${viewingRound - 1}`)
      } else if (button === 'r1' && canGoNext) {
        router.push(`/tournaments/${tournamentId}?round=${viewingRound + 1}`)
      }
    },
    [focusedMatchIndex, matchHrefs, canGoPrev, canGoNext, viewingRound, tournamentId, router],
  )

  useGamepad({
    onButtonPress: handleButton,
    onDirection: handleDirection,
    enabled: true,
  })

  return (
    <GamepadFocusContext.Provider value={{ focusedMatchIndex }}>
      {children}
    </GamepadFocusContext.Provider>
  )
}
