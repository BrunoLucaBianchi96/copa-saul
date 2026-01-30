'use client'

import { useState } from 'react'
import { Avatar } from '@/app/components/avatar'

interface Player {
  playerId: number
  playerName: string
  playerAvatar: string | null
  points: number
}

interface LeaderboardProps {
  standings: Player[]
}

export function Leaderboard({ standings }: LeaderboardProps) {
  const [isOpen, setIsOpen] = useState(false)

  if (standings.length === 0) {
    return (
      <section className="bg-darcula-surface rounded-lg shadow-lg border border-darcula-border p-6">
        <h2 className="text-xl font-semibold text-darcula-text mb-4">Leaderboard</h2>
        <p className="text-darcula-text-muted">No players registered yet.</p>
      </section>
    )
  }

  return (
    <section className="bg-darcula-surface rounded-lg shadow-lg border border-darcula-border p-6">
      {/* Header - clickable on mobile */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex justify-between items-center md:cursor-default"
      >
        <h2 className="text-xl font-semibold text-darcula-text">Leaderboard</h2>
        {/* Chevron - only visible on mobile */}
        <svg
          className={`w-5 h-5 text-darcula-text-muted transition-transform md:hidden ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Table - collapsible on mobile, always visible on md+ */}
      <div className={`mt-4 ${isOpen ? 'block' : 'hidden'} md:block`}>
        <table className="w-full">
          <thead>
            <tr className="text-left text-sm text-darcula-text-muted border-b border-darcula-border">
              <th className="pb-2">#</th>
              <th className="pb-2">Player</th>
              <th className="pb-2 text-right">Points</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((s, i) => (
              <tr key={s.playerId} className="border-b border-darcula-border last:border-0">
                <td className="py-2 text-darcula-text-muted">{i + 1}</td>
                <td className="py-2">
                  <div className="flex items-center gap-2">
                    <Avatar src={s.playerAvatar} name={s.playerName} size="sm" />
                    <span className="text-darcula-text">{s.playerName}</span>
                  </div>
                </td>
                <td className="py-2 text-right font-medium text-darcula-text-bright">{s.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
