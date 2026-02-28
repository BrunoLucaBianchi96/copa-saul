'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import type { Player } from '@/db/schema'
import { PlayerCard } from './player-card'
import { EditPlayerModal } from './edit-player-modal'

interface AvailablePlayer {
  id: number
  name: string
  avatarUrl: string | null
}

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
  availablePlayers?: AvailablePlayer[]
}

export function RosterGrid({ players, isHost, tournamentId, tournamentStatus, availablePlayers = [] }: RosterGridProps) {
  const [editPlayer, setEditPlayer] = useState<Player | null>(null)
  const [togglingId, setTogglingId] = useState<number | null>(null)
  const [showAddDropdown, setShowAddDropdown] = useState(false)
  const [addingPlayerId, setAddingPlayerId] = useState<number | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const t = useTranslations('roster')

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowAddDropdown(false)
      }
    }
    if (showAddDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showAddDropdown])

  async function handleAddPlayer(playerId: number) {
    if (!tournamentId || addingPlayerId) return
    setAddingPlayerId(playerId)
    try {
      await fetch(`/api/tournaments/${tournamentId}/late-join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId }),
      })
      setShowAddDropdown(false)
      router.refresh()
    } finally {
      setAddingPlayerId(null)
    }
  }

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
        {availablePlayers.length > 0 && tournamentStatus === 'active' && isHost && (
          <div className="relative flex justify-center" ref={dropdownRef}>
            <button
              onClick={() => setShowAddDropdown(!showAddDropdown)}
              className="w-44 h-60 sm:w-48 sm:h-64 border-2 border-dashed border-darcula-border rounded-xl flex flex-col items-center justify-center gap-2 hover:border-darcula-blue hover:bg-darcula-surface/50 transition-colors"
            >
              <svg className="w-10 h-10 text-darcula-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span className="text-darcula-text-muted text-sm font-medium">{t('addPlayer')}</span>
            </button>
            {showAddDropdown && (
              <div className="absolute top-full mt-2 z-30 bg-darcula-surface border border-darcula-border rounded-lg shadow-xl w-56 max-h-60 overflow-y-auto">
                <div className="px-3 py-2 text-xs text-darcula-text-muted border-b border-darcula-border">
                  {t('selectPlayerToAdd')}
                </div>
                {availablePlayers.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => handleAddPlayer(p.id)}
                    disabled={addingPlayerId === p.id}
                    className="w-full flex items-center gap-3 px-3 py-2 hover:bg-darcula-elevated transition-colors disabled:opacity-50"
                  >
                    {p.avatarUrl ? (
                      <img src={p.avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-darcula-blue/20 flex items-center justify-center text-darcula-blue text-sm font-bold">
                        {p.name.charAt(0)}
                      </div>
                    )}
                    <span className="text-darcula-text text-sm truncate">{p.name}</span>
                    {addingPlayerId === p.id && (
                      <svg className="w-4 h-4 animate-spin text-darcula-text-muted ml-auto" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
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
