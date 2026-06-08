'use client'

import { useTranslations } from 'next-intl'
import { calculatePickBanState, type PickBanAction, type Game } from '@/lib/games'

// Minimal shape needed to derive a match's human-readable status. Both the
// interactive match list and the read-only dashboard list satisfy this.
export interface MatchStatusInput {
  result: string
  player1Name: string
  player2Name: string | null
  selectedGame?: string | null
  pickBanHistory?: string | null
}

export function useMatchStatus(games: Game[]) {
  const t = useTranslations('match')

  return function getMatchStatus(match: MatchStatusInput): string {
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
        const game = games.find((g) => g.id === match.selectedGame)
        return game ? `${t('playing')} ${game.name}` : t('playing')
      }
      default:
        return t('pending')
    }
  }
}
