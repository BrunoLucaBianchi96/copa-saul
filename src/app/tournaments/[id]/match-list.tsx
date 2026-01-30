'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { GAMES, calculatePickBanState, type PickBanAction } from '@/lib/games'

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
}

interface MatchListProps {
  matches: Match[]
  tournamentId: number
}

function useMatchStatus() {
  const t = useTranslations('match')

  return function getMatchStatus(match: Match): string {
    // If match is complete, don't show status (winner is highlighted instead)
    if (match.result !== 'pending') {
      return ''
    }

    // Parse pick-ban history
    const actions: PickBanAction[] = match.pickBanHistory
      ? JSON.parse(match.pickBanHistory)
      : []

    const state = calculatePickBanState(actions, match.selectedGame ?? undefined)
    const currentPlayerName = state.currentPlayer === 1 ? match.player1Name : match.player2Name

    switch (state.currentPhase) {
      case 'ban1':
        return `${currentPlayerName} ${t('banning')}`
      case 'pick':
        return `${currentPlayerName} ${t('protecting')}`
      case 'ban2':
        return `${currentPlayerName} ${t('banning')}`
      case 'selecting':
        return t('selectingGame')
      case 'complete': {
        const game = GAMES.find((g) => g.id === match.selectedGame)
        return game ? `${t('playing')} ${game.name}` : t('playing')
      }
      default:
        return t('pending')
    }
  }
}

export function MatchList({ matches, tournamentId }: MatchListProps) {
  const t = useTranslations('match')
  const tCommon = useTranslations('common')
  const getMatchStatus = useMatchStatus()

  if (matches.length === 0) {
    return <p className="text-darcula-text-muted">{t('pending')}</p>
  }

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

        const status = getMatchStatus(match)
        const isComplete = match.result !== 'pending'

        return (
          <Link
            key={match.id}
            href={`/tournaments/${tournamentId}/matches/${match.id}`}
            className="block border border-darcula-border rounded p-4 bg-darcula-elevated hover:bg-darcula-surface hover:border-darcula-text-muted transition-colors"
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
