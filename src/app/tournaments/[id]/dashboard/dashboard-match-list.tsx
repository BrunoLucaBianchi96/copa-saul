'use client'

import { useTranslations } from 'next-intl'
import { GAMES } from '@/lib/games'
import { useMatchStatus } from '../use-match-status'
import { type DashboardMatch } from '@/lib/dashboard'

interface DashboardMatchListProps {
  matches: DashboardMatch[]
}

// Read-only twin of MatchList — same visuals, no links/gamepad. Used on the
// spectator dashboard where matches update live but aren't interactive.
export function DashboardMatchList({ matches }: DashboardMatchListProps) {
  const t = useTranslations('match')
  const tCommon = useTranslations('common')
  const getMatchStatus = useMatchStatus()

  if (matches.length === 0) {
    return <p className="text-darcula-text-muted">{t('pending')}</p>
  }

  return (
    <div className="space-y-3">
      {matches.map((match) => {
        // BYE matches
        if (match.player2Id === null) {
          return (
            <div
              key={match.id}
              className="border border-darcula-border rounded p-4 bg-darcula-elevated text-center text-darcula-text-muted"
            >
              <span className="font-medium text-darcula-text">{match.player1Name}</span> - {t('bye')}
            </div>
          )
        }

        const status = getMatchStatus(match)
        const isComplete = match.result !== 'pending'

        return (
          <div
            key={match.id}
            className="block border border-darcula-border rounded p-4 bg-darcula-elevated"
          >
            <div className="flex justify-between items-center">
              <span
                className={`font-medium ${match.result === 'player1' ? 'text-darcula-green' : 'text-darcula-text'}`}
              >
                {match.player1Name}
              </span>
              <span className="text-darcula-text-muted text-sm">{tCommon('vs')}</span>
              <span
                className={`font-medium ${match.result === 'player2' ? 'text-darcula-green' : 'text-darcula-text'}`}
              >
                {match.player2Name}
              </span>
            </div>

            <div className="text-center mt-2 text-sm text-darcula-text-muted">
              {isComplete ? (
                <>
                  {match.selectedGame && (
                    <span className="mr-2">
                      {GAMES.find((g) => g.id === match.selectedGame)?.name} &bull;
                    </span>
                  )}
                  <span>
                    {match.result === 'draw'
                      ? t('draw')
                      : match.result === 'player1'
                        ? `${match.player1Name} ${t('wins')}`
                        : `${match.player2Name} ${t('wins')}`}
                  </span>
                  {match.pointsAwarded && match.pointsAwarded > 0 && (
                    <span className="ml-2 text-darcula-green">
                      +{match.pointsAwarded} {tCommon('pts')}
                    </span>
                  )}
                </>
              ) : (
                <span className="text-darcula-orange">{status}</span>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
