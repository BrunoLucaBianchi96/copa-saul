'use client'

import { useContext } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import type { Game } from '@/lib/games'
import { GamepadFocusContext } from './tournament-gamepad'
import { useMatchStatus } from './use-match-status'

interface Match {
  id: number
  round: number
  player1Id: number
  player2Id: number | null
  result: string
  player1Name: string
  player2Name: string | null
  selectedGame?: string | null
  pickBanHistory?: string | null
  pointsAwarded?: number | null
}

interface MatchListProps {
  matches: Match[]
  tournamentId: number
  games: Game[]
}

export function MatchList({ matches, tournamentId, games }: MatchListProps) {
  const t = useTranslations('match')
  const tCommon = useTranslations('common')
  const getMatchStatus = useMatchStatus(games)
  const { focusedMatchIndex, setNavigating } = useContext(GamepadFocusContext)

  if (matches.length === 0) {
    return <p className="text-darcula-text-muted">{t('pending')}</p>
  }

  // Track navigable index (non-bye matches only)
  let navigableIdx = -1

  return (
    <div className="space-y-3">
      {matches.map((match) => {
        // BYE matches are not clickable
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

        navigableIdx++
        const isFocused = focusedMatchIndex === navigableIdx
        const status = getMatchStatus(match)
        const isComplete = match.result !== 'pending'

        return (
          <Link
            key={match.id}
            href={`/tournaments/${tournamentId}/matches/${match.id}`}
            onClick={() => setNavigating(true)}
            className={`block border border-darcula-border rounded p-4 bg-darcula-elevated hover:bg-darcula-surface hover:border-darcula-text-muted transition-colors ${isFocused ? 'gamepad-focus' : ''}`}
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
                      {games.find((g) => g.id === match.selectedGame)?.name} &bull;
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
          </Link>
        )
      })}
    </div>
  )
}
