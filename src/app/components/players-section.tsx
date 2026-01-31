'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import type { Player } from '@/db/schema'
import { PlayerItem } from './player-item'
import { AddPlayerModal } from './add-player-modal'

interface PlayersSectionProps {
  players: Player[]
  isHost: boolean
}

export function PlayersSection({ players, isHost }: PlayersSectionProps) {
  const tCommon = useTranslations('common')
  const t = useTranslations('player')
  const [showModal, setShowModal] = useState(false)

  return (
    <section className="bg-darcula-surface rounded-lg shadow-lg border border-darcula-border p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-semibold text-darcula-text">
          {tCommon('players')} ({players.length})
        </h2>
        {isHost && (
          <button
            onClick={() => setShowModal(true)}
            className="bg-darcula-blue text-darcula-bg w-8 h-8 rounded hover:bg-darcula-blue/80 transition flex items-center justify-center"
            title={t('addPlayer')}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        )}
      </div>

      <ul className="space-y-2">
        {players.map((p) => (
          <li key={p.id}>
            <PlayerItem player={p} isHost={isHost} />
          </li>
        ))}
      </ul>

      <AddPlayerModal isOpen={showModal} onClose={() => setShowModal(false)} />
    </section>
  )
}
