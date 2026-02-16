'use client'

import { useEffect, useRef, useState } from 'react'
import { type PickBanAction } from '@/lib/games'

export interface MatchState {
  pickBanHistory: PickBanAction[]
  selectedGame: string | null
  result: string
  pointsAwarded: number | null
}

interface UseMatchStreamOptions {
  tournamentId: number
  matchId: number
  enabled: boolean
  onStateUpdate: (state: MatchState) => void
}

export function useMatchStream({
  tournamentId,
  matchId,
  enabled,
  onStateUpdate,
}: UseMatchStreamOptions): { connected: boolean } {
  const [connected, setConnected] = useState(false)
  const callbackRef = useRef(onStateUpdate)

  // Keep callback ref current without triggering reconnection
  useEffect(() => {
    callbackRef.current = onStateUpdate
  })

  useEffect(() => {
    if (!enabled) {
      setConnected(false)
      return
    }

    const url = `/api/tournaments/${tournamentId}/matches/${matchId}/stream`
    const es = new EventSource(url)

    es.addEventListener('open', () => {
      setConnected(true)
    })

    es.addEventListener('state', (event) => {
      try {
        const data: MatchState = JSON.parse(event.data)
        callbackRef.current(data)
      } catch {
        // Malformed event — ignore
      }
    })

    es.addEventListener('error', () => {
      setConnected(false)
      // EventSource will auto-reconnect using the retry directive
    })

    return () => {
      es.close()
      setConnected(false)
    }
  }, [tournamentId, matchId, enabled])

  return { connected }
}
