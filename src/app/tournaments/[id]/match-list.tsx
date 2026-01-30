'use client'

import Link from 'next/link'
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

function getMatchStatus(match: Match): string {
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
      return `${currentPlayerName} banning`
    case 'pick':
      return `${currentPlayerName} protecting`
    case 'ban2':
      return `${currentPlayerName} banning`
    case 'selecting':
      return 'Selecting game...'
    case 'complete':
      return 'Playing'
    default:
      return 'Pending'
  }
}

export function MatchList({ matches, tournamentId }: MatchListProps) {
  if (matches.length === 0) {
    return <p className="text-darcula-text-muted">No matches yet.</p>
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
              <span className="font-medium text-darcula-text">{match.player1Name}</span> - BYE
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
              <span className="text-darcula-text-muted text-sm">vs</span>
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
                      ? 'Draw'
                      : match.result === 'player1'
                        ? `${match.player1Name} wins`
                        : `${match.player2Name} wins`}
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
