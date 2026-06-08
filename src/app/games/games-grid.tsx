'use client'

import { useState } from 'react'
import type { Game } from '@/lib/games'
import { GameCard } from '@/app/components/game-card'
import { GameDetailModal } from '@/app/components/game-detail-modal'
import { GameFormModal } from '@/app/components/game-form-modal'

const GRADIENT_COLORS = [
  'from-darcula-blue to-darcula-purple',
  'from-darcula-orange to-darcula-red',
  'from-emerald-500 to-teal-700',
  'from-amber-500 to-orange-700',
  'from-pink-500 to-rose-700',
  'from-cyan-500 to-blue-700',
  'from-violet-500 to-indigo-700',
  'from-lime-500 to-green-700',
]

interface GamesGridProps {
  games: Game[]
  // Hosts manage the roster: clicking a card edits it, and an add tile appears.
  isHost?: boolean
}

export function GamesGrid({ games, isHost = false }: GamesGridProps) {
  const [selectedGame, setSelectedGame] = useState<{ game: Game; colorIndex: number } | null>(null)
  const [editGame, setEditGame] = useState<Game | null>(null)
  const [creating, setCreating] = useState(false)

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {isHost && (
          <div className="flex justify-center">
            <button
              onClick={() => setCreating(true)}
              title="Add game"
              className="w-full aspect-[3/4] rounded-t-lg border-2 border-dashed border-darcula-text-muted/50 bg-transparent flex items-center justify-center text-darcula-text-muted hover:border-darcula-text-muted hover:text-darcula-text transition-colors"
            >
              <svg className="w-1/2 h-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
        )}
        {games.map((game, i) => (
          <div key={game.id} className="flex justify-center">
            <GameCard
              name={game.name}
              imageUrl={game.imageUrl ?? undefined}
              imageFit={game.imageFit ?? undefined}
              gradientColors={GRADIENT_COLORS[i % GRADIENT_COLORS.length]}
              onClick={() =>
                isHost ? setEditGame(game) : setSelectedGame({ game, colorIndex: i })
              }
            />
          </div>
        ))}
      </div>

      {selectedGame && (
        <GameDetailModal
          game={selectedGame.game}
          gradientColors={GRADIENT_COLORS[selectedGame.colorIndex % GRADIENT_COLORS.length]}
          onClose={() => setSelectedGame(null)}
        />
      )}

      {isHost && (
        <>
          <GameFormModal isOpen={creating} onClose={() => setCreating(false)} />
          <GameFormModal game={editGame ?? undefined} isOpen={editGame !== null} onClose={() => setEditGame(null)} />
        </>
      )}
    </>
  )
}
