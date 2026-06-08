'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useTournamentStream } from '@/app/hooks/useTournamentStream'
import { GamesRadarChart } from '@/app/components/games-radar-chart'
import { type DashboardState } from '@/lib/dashboard'
import { AnimatedLeaderboard } from './animated-leaderboard'
import { DashboardMatchList } from './dashboard-match-list'

interface DashboardViewProps {
  tournamentId: number
  initial: DashboardState
}

export function DashboardView({ tournamentId, initial }: DashboardViewProps) {
  const [state, setState] = useState<DashboardState>(initial)
  const { connected } = useTournamentStream({
    tournamentId,
    enabled: true,
    onStateUpdate: setState,
  })

  const t = useTranslations('tournament')
  const tStatus = useTranslations('status')
  const tDashboard = useTranslations('dashboard')

  const { tournament } = state

  const roundLabel =
    tournament.status === 'overtime'
      ? t(tournament.overtimeRound === 2 ? 'final' : 'semifinal')
      : tournament.currentRound > 0
        ? t('roundOf', { current: tournament.currentRound, total: tournament.rounds })
        : t('tournamentNotStarted')

  const statusColor =
    tournament.status === 'active'
      ? 'text-darcula-green'
      : tournament.status === 'overtime'
        ? 'text-darcula-orange font-semibold'
        : tournament.status === 'completed'
          ? 'text-darcula-text-muted'
          : 'text-darcula-orange'

  return (
    <main className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <div className="flex justify-between items-start mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-darcula-text-bright">{tournament.name}</h1>
          <p className="text-darcula-text-muted mt-1">
            {roundLabel} &bull;{' '}
            <span className={statusColor}>{tStatus(tournament.status)}</span>
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm shrink-0">
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              connected ? 'bg-darcula-green animate-pulse' : 'bg-darcula-orange'
            }`}
          />
          <span className="text-darcula-text-muted">
            {connected ? tDashboard('live') : tDashboard('connecting')}
          </span>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 items-start">
        {/* Left column: current-round matches + games radar */}
        <div className="space-y-6">
          <section className="bg-darcula-surface rounded-lg shadow-lg border border-darcula-border p-6">
            <h2 className="text-xl font-semibold text-darcula-text mb-4">
              {tournament.status === 'overtime'
                ? t(tournament.overtimeRound === 2 ? 'finalMatch' : 'semifinalMatches')
                : tournament.currentRound > 0
                  ? t('roundMatches', { number: tournament.currentRound })
                  : t('matches')}
            </h2>
            <DashboardMatchList matches={state.matches} games={state.games} />
          </section>

          <section className="bg-darcula-surface rounded-lg shadow-lg border border-darcula-border p-6">
            <h2 className="text-xl font-semibold text-darcula-text mb-4">
              {tDashboard('gamesPlayed')}
            </h2>
            <div className="max-w-md mx-auto">
              <GamesRadarChart games={state.games} counts={state.gamesPlayed} />
            </div>
          </section>
        </div>

        {/* Right column: animated leaderboard */}
        <AnimatedLeaderboard standings={state.standings} />
      </div>
    </main>
  )
}
