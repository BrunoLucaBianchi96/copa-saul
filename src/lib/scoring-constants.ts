// --- Bet system balance knobs ---
export const NUM_GAMES = 7
export const TOTAL_BET_POINTS = 280
export const MIN_BET_PER_GAME = 20
export const MAX_BET_PER_GAME = 80
export const DEFAULT_BET = MIN_BET_PER_GAME
export const BYE_POINTS = MIN_BET_PER_GAME

export interface BetAllocation {
  gameId: string
  bet: number
}

/**
 * Calculate the points awarded to the winner of a match.
 *
 * Rules:
 * - Equal bets: winner gets their bet amount
 * - Underdog wins (winnerBet < loserBet): winner gets the LARGER bet (loserBet)
 * - Top dog wins (winnerBet > loserBet): winner gets loserBet + floor((winnerBet - loserBet) / 2)
 */
export function calculateMatchPoints(winnerBet: number, loserBet: number): number {
  if (winnerBet === loserBet) {
    return winnerBet
  }

  if (winnerBet < loserBet) {
    // Underdog wins — gets the larger number (the loser's bet)
    return loserBet
  }

  // Top dog wins — gets loserBet + floor((difference) / 2)
  return loserBet + Math.floor((winnerBet - loserBet) / 2)
}
