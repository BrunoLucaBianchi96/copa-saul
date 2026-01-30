'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

interface RoundNavigationProps {
  tournamentId: number
  viewingRound: number
  currentRound: number
  totalRounds: number
  isHost: boolean
  allMatchesComplete: boolean
}

export function RoundNavigation({
  tournamentId,
  viewingRound,
  currentRound,
  totalRounds,
  isHost,
  allMatchesComplete,
}: RoundNavigationProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const canGoPrev = viewingRound > 1
  const canGoNext = viewingRound < currentRound
  const canAdvanceRound = isHost && viewingRound === currentRound && allMatchesComplete && currentRound < totalRounds

  function goToRound(round: number) {
    router.push(`/tournaments/${tournamentId}?round=${round}`)
  }

  async function advanceRound() {
    setLoading(true)
    const res = await fetch(`/api/tournaments/${tournamentId}/next-round`, { method: 'POST' })
    if (res.ok) {
      router.push(`/tournaments/${tournamentId}?round=${currentRound + 1}`)
      router.refresh()
    } else {
      const data = await res.json()
      alert(data.error || 'Failed to advance to next round')
    }
    setLoading(false)
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => goToRound(viewingRound - 1)}
        disabled={!canGoPrev}
        className="p-2 rounded border border-darcula-border text-darcula-text hover:bg-darcula-elevated transition disabled:opacity-30 disabled:cursor-not-allowed"
        title="Previous round"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      <span className="text-darcula-text-muted text-sm min-w-[80px] text-center">
        Round {viewingRound} / {currentRound}
      </span>

      {canAdvanceRound ? (
        <button
          onClick={advanceRound}
          disabled={loading}
          className="p-2 rounded bg-darcula-blue text-darcula-bg hover:bg-darcula-blue/80 transition disabled:opacity-50"
          title="Advance to next round"
        >
          {loading ? (
            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
            </svg>
          )}
        </button>
      ) : (
        <button
          onClick={() => goToRound(viewingRound + 1)}
          disabled={!canGoNext}
          className="p-2 rounded border border-darcula-border text-darcula-text hover:bg-darcula-elevated transition disabled:opacity-30 disabled:cursor-not-allowed"
          title="Next round"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}
    </div>
  )
}
