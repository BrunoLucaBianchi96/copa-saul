'use client'

import { useRouter } from 'next/navigation'
import { useState, useContext } from 'react'
import { useTranslations } from 'next-intl'
import { GamepadFocusContext } from './tournament-gamepad'

interface RoundNavigationProps {
  tournamentId: number
  viewingRound: number
  currentRound: number
  totalRounds: number
  isHost: boolean
  allMatchesComplete: boolean
  isOvertime?: boolean
  overtimeRound?: number
}

export function RoundNavigation({
  tournamentId,
  viewingRound,
  currentRound,
  totalRounds,
  isHost,
  allMatchesComplete,
  isOvertime,
}: RoundNavigationProps) {
  const router = useRouter()
  const t = useTranslations('common')
  const tErrors = useTranslations('errors')
  const [loading, setLoading] = useState(false)
  const { setNavigating } = useContext(GamepadFocusContext)

  const canGoPrev = viewingRound > 1
  const canGoNext = viewingRound < currentRound
  // In overtime, can always advance if matches complete; in regular, only if under total rounds
  const canAdvanceRound = isHost && viewingRound === currentRound && allMatchesComplete && (isOvertime || currentRound < totalRounds)

  function goToRound(round: number) {
    setNavigating(true)
    router.push(`/tournaments/${tournamentId}?round=${round}`)
  }

  async function advanceRound() {
    setLoading(true)
    const res = await fetch(`/api/tournaments/${tournamentId}/next-round`, { method: 'POST' })
    if (res.ok) {
      const data = await res.json()
      if (data.completed) {
        // Tournament finished - redirect to result page
        router.push(`/tournaments/${tournamentId}/result`)
      } else {
        router.push(`/tournaments/${tournamentId}?round=${currentRound + 1}`)
        router.refresh()
      }
    } else {
      alert(tErrors('failedToAdvance'))
    }
    setLoading(false)
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => goToRound(viewingRound - 1)}
        disabled={!canGoPrev}
        data-gamepad-action="prev-round"
        className="p-2 rounded border border-darcula-border text-darcula-text hover:bg-darcula-elevated transition disabled:opacity-30 disabled:cursor-not-allowed"
        title={t('back')}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      <span className="text-darcula-text-muted text-sm min-w-[80px] text-center">
        {isOvertime && viewingRound > totalRounds
          ? viewingRound - totalRounds === 2 ? 'F' : 'SF'
          : `${t('round')} ${viewingRound}`}
      </span>

      {canAdvanceRound ? (
        <button
          onClick={advanceRound}
          disabled={loading}
          data-gamepad-action="advance-round"
          className="p-2 rounded bg-darcula-blue text-darcula-bg hover:bg-darcula-blue/80 transition disabled:opacity-50"
          title={t('processing')}
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
          data-gamepad-action="next-round"
          className="p-2 rounded border border-darcula-border text-darcula-text hover:bg-darcula-elevated transition disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}
    </div>
  )
}
