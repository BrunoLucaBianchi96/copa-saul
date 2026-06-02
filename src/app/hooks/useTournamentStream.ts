'use client'

import { useEffect, useRef, useState } from 'react'
import { type DashboardState } from '@/lib/dashboard'

interface UseTournamentStreamOptions {
  tournamentId: number
  enabled: boolean
  onStateUpdate: (state: DashboardState) => void
}

export function useTournamentStream({
  tournamentId,
  enabled,
  onStateUpdate,
}: UseTournamentStreamOptions): { connected: boolean } {
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

    const url = `/api/tournaments/${tournamentId}/dashboard/stream`
    const es = new EventSource(url)

    es.addEventListener('open', () => {
      setConnected(true)
    })

    es.addEventListener('state', (event) => {
      try {
        const data: DashboardState = JSON.parse(event.data)
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
  }, [tournamentId, enabled])

  return { connected }
}
