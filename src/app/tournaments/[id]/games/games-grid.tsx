'use client'

import { useState } from 'react'
import type { Game } from '@/lib/games'
import { GameCard } from '@/app/components/game-card'
import { GameDetailModal } from '@/app/components/game-detail-modal'

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
}

export function GamesGrid({ games }: GamesGridProps) {
  const [selectedGame, setSelectedGame] = useState<{ game: Game; colorIndex: number } | null>(null)

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
        {games.map((game, i) => (
          <div key={game.id} className="flex justify-center">
            <GameCard
              name={game.name}
              imageUrl={game.imageUrl}
              gradientColors={GRADIENT_COLORS[i % GRADIENT_COLORS.length]}
              onClick={() => setSelectedGame({ game, colorIndex: i })}
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
    </>
  )
}
