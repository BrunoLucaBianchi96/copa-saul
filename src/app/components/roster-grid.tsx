'use client'

import { useState } from 'react'
import type { Player } from '@/db/schema'
import { PlayerCard } from './player-card'
import { EditPlayerModal } from './edit-player-modal'

interface RosterGridProps {
  players: {
    player: Player
    displayName: string
    gradientColors: string
  }[]
  isHost: boolean
}

export function RosterGrid({ players, isHost }: RosterGridProps) {
  const [editPlayer, setEditPlayer] = useState<Player | null>(null)

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
        {players.map((p) => (
          <div
            key={p.player.id}
            className={`flex justify-center transition-transform duration-200 hover:scale-[1.2] hover:z-10 ${
              isHost ? 'cursor-pointer' : ''
            }`}
            onClick={isHost ? () => setEditPlayer(p.player) : undefined}
          >
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
