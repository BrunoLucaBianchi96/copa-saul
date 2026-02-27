'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import type { Player } from '@/db/schema'
import { PlayerCard } from './player-card'
import { EditPlayerModal } from './edit-player-modal'

interface RosterGridProps {
  players: {
    player: Player
    displayName: string
    gradientColors: string
    retired: boolean
  }[]
  isHost: boolean
  tournamentId?: number
  tournamentStatus?: string
}

export function RosterGrid({ players, isHost, tournamentId, tournamentStatus }: RosterGridProps) {
  const [editPlayer, setEditPlayer] = useState<Player | null>(null)
  const [togglingId, setTogglingId] = useState<number | null>(null)
  const router = useRouter()
  const t = useTranslations('roster')

  const canToggleRetire = isHost && tournamentId && ['active', 'overtime'].includes(tournamentStatus ?? '')

  async function toggleRetire(e: React.MouseEvent, playerId: number) {
    e.stopPropagation()
    if (!tournamentId || togglingId) return
    setTogglingId(playerId)
    try {
      await fetch(`/api/tournaments/${tournamentId}/players/${playerId}/retire`, {
        method: 'POST',
      })
      router.refresh()
    } finally {
      setTogglingId(null)
    }
  }

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
        {players.map((p) => (
          <div
            key={p.player.id}
            className={`relative flex justify-center transition-transform duration-200 hover:scale-[1.2] hover:z-10 ${
              isHost ? 'cursor-pointer' : ''
            } ${p.retired ? 'grayscale opacity-60' : ''}`}
            onClick={isHost ? () => setEditPlayer(p.player) : undefined}
          >
            {p.retired && (
              <span className="absolute top-2 right-2 z-20 bg-darcula-red/80 text-white text-xs font-bold px-2 py-0.5 rounded">
                {t('retired')}
              </span>
            )}
            {canToggleRetire && (
              <button
                onClick={(e) => toggleRetire(e, p.player.id)}
                disabled={togglingId === p.player.id}
                className="absolute bottom-2 right-2 z-20 w-8 h-8 flex items-center justify-center rounded-full bg-darcula-surface/90 border border-darcula-border hover:bg-darcula-elevated transition-colors disabled:opacity-50"
                title={p.retired ? t('unretire') : t('retire')}
              >
                {togglingId === p.player.id ? (
                  <svg className="w-4 h-4 animate-spin text-darcula-text-muted" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : p.retired ? (
                  // Undo/return icon
                  <svg className="w-4 h-4 text-darcula-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a5 5 0 015 5v2M3 10l4-4M3 10l4 4" />
                  </svg>
                ) : (
                  // Ban/block icon
                  <svg className="w-4 h-4 text-darcula-red" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                  </svg>
                )}
              </button>
            )}
            <PlayerCard
              name={p.displayName}
              avatar={p.player.avatarUrl}
              gradientColors={p.gradientColors}
              className="w-44 h-60 sm:w-48 sm:h-64"
              nameClassName="text-base"
              initialsClassName="text-4xl"
            />
          </div>
        ))}
      </div>

      {isHost && editPlayer && (
        <EditPlayerModal
          player={editPlayer}
          isOpen={true}
          onClose={() => setEditPlayer(null)}
        />
      )}
    </>
  )
}
