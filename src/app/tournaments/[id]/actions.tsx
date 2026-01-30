'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import type { Tournament } from '@/db/schema'
import { Avatar } from '@/app/components/avatar'

interface Player {
  playerId: number
  playerName: string
  playerAvatar: string | null
  points: number
}

interface TournamentActionsProps {
  tournament: Tournament
  isHost: boolean
  players: Player[]
}

export function TournamentActions({ tournament, isHost, players }: TournamentActionsProps) {
  const router = useRouter()
  const t = useTranslations('tournament')
  const tCommon = useTranslations('common')
  const tErrors = useTranslations('errors')
  const [loading, setLoading] = useState(false)
  const [showPlayerSelect, setShowPlayerSelect] = useState(false)
  const [selectedPlayers, setSelectedPlayers] = useState<Set<number>>(
    new Set(players.map((p) => p.playerId))
  )

  function togglePlayer(playerId: number) {
    setSelectedPlayers((prev) => {
      const next = new Set(prev)
      if (next.has(playerId)) {
        next.delete(playerId)
      } else {
        next.add(playerId)
      }
      return next
    })
  }

  async function startTournament() {
    setLoading(true)
    const excludedPlayerIds = players
      .filter((p) => !selectedPlayers.has(p.playerId))
      .map((p) => p.playerId)

    const res = await fetch(`/api/tournaments/${tournament.id}/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ excludedPlayerIds }),
    })
    if (res.ok) {
      router.refresh()
    } else {
      alert(tErrors('failedToStart'))
    }
    setLoading(false)
    setShowPlayerSelect(false)
  }

  async function nextRound() {
    setLoading(true)
    const res = await fetch(`/api/tournaments/${tournament.id}/next-round`, { method: 'POST' })
    if (res.ok) {
      const data = await res.json()
      if (data.completed) {
        // Tournament finished - redirect to result page
        router.push(`/tournaments/${tournament.id}/result`)
      } else {
        router.refresh()
      }
    } else {
      alert(tErrors('failedToAdvance'))
    }
    setLoading(false)
  }

  if (tournament.status === 'completed') {
    return (
      <a
        href={`/tournaments/${tournament.id}/result`}
        className="px-4 py-2 bg-darcula-green/20 text-darcula-green rounded border border-darcula-green/50 hover:bg-darcula-green/30 transition-colors"
      >
        {t('viewWinner')}
      </a>
    )
  }

  if (!isHost) {
    return null
  }

  if (tournament.status === 'pending') {
    if (showPlayerSelect) {
      return (
        <div className="bg-darcula-surface border border-darcula-border rounded-lg shadow-lg p-4 min-w-[250px]">
          <h3 className="font-semibold text-darcula-text mb-3">{t('selectPlayers')}</h3>
          <p className="text-sm text-darcula-text-muted mb-3">{t('uncheckAbsentPlayers')}</p>
          <div className="space-y-2 max-h-60 overflow-y-auto mb-4">
            {players.map((player) => (
              <label
                key={player.playerId}
                className="flex items-center gap-2 cursor-pointer hover:bg-darcula-elevated p-1 rounded"
              >
                <input
                  type="checkbox"
                  checked={selectedPlayers.has(player.playerId)}
                  onChange={() => togglePlayer(player.playerId)}
                  className="w-4 h-4 rounded border-darcula-border bg-darcula-elevated text-darcula-green focus:ring-darcula-green"
                />
                <Avatar src={player.playerAvatar} name={player.playerName} size="sm" />
                <span className="text-darcula-text">{player.playerName}</span>
              </label>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowPlayerSelect(false)}
              className="flex-1 px-3 py-2 border border-darcula-border text-darcula-text rounded hover:bg-darcula-elevated transition"
            >
              {tCommon('cancel')}
            </button>
            <button
              onClick={startTournament}
              disabled={loading || selectedPlayers.size < 2}
              className="flex-1 bg-darcula-green text-darcula-bg px-3 py-2 rounded hover:bg-darcula-green/80 transition disabled:opacity-50 font-medium"
            >
              {loading ? tCommon('starting') : `${t('start')} (${selectedPlayers.size})`}
            </button>
          </div>
          {selectedPlayers.size < 2 && (
            <p className="text-darcula-red text-sm mt-2">{t('needAtLeast2Players')}</p>
          )}
        </div>
      )
    }

    return (
      <button
        onClick={() => setShowPlayerSelect(true)}
        disabled={loading}
        className="bg-darcula-green text-darcula-bg px-4 py-2 rounded hover:bg-darcula-green/80 transition disabled:opacity-50 font-medium"
      >
        {t('startTournament')}
      </button>
    )
  }

  // Overtime mode - show next overtime round button
  if (tournament.status === 'overtime') {
    return (
      <button
        onClick={nextRound}
        disabled={loading}
        className="bg-darcula-orange text-darcula-bg px-4 py-2 rounded hover:bg-darcula-orange/80 transition disabled:opacity-50 font-medium"
      >
        {loading ? tCommon('processing') : t('nextOvertimeRound')}
      </button>
    )
  }

  // At final regular round - next-round API will check for tie and either complete or start overtime
  if (tournament.currentRound >= tournament.rounds) {
    return (
      <button
        onClick={nextRound}
        disabled={loading}
        className="bg-darcula-elevated text-darcula-text px-4 py-2 rounded hover:bg-darcula-border transition disabled:opacity-50 border border-darcula-border"
      >
        {loading ? tCommon('processing') : t('finishRegularRounds')}
      </button>
    )
  }

  return (
    <button
      onClick={nextRound}
      disabled={loading}
      className="bg-darcula-blue text-darcula-bg px-4 py-2 rounded hover:bg-darcula-blue/80 transition disabled:opacity-50 font-medium"
    >
      {loading ? tCommon('processing') : t('nextRound')}
    </button>
  )
}
