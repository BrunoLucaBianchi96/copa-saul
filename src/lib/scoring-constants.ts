// --- Bet system balance knobs ---
export const NUM_GAMES = 7
export const TOTAL_BET_POINTS = 280
export const MIN_BET_PER_GAME = 20
export const MAX_BET_PER_GAME = 80
export const DEFAULT_BET = MIN_BET_PER_GAME
export const BYE_POINTS = TOTAL_BET_POINTS / NUM_GAMES
export const OVERDOG_THRESHOLD = 15

export interface BetAllocation {
  gameId: string
  bet: number
}

/** All 7 game IDs — keep in sync with GAMES in games.ts */
const GAME_IDS = [
  'sparking-zero',
  'taiko-no-tatsujin',
  'trackmania',
  'wii-sports-ping-pong',
  'tricky-towers',
  'duck-game',
  'boomerang-fu',
]

/**
 * Generate a random valid bet allocation.
 * Pure function — safe for both client and server.
 */
export function generateRandomBets(): BetAllocation[] {
  const result: Record<string, number> = {}
  for (const id of GAME_IDS) result[id] = MIN_BET_PER_GAME
  let remaining = TOTAL_BET_POINTS - MIN_BET_PER_GAME * GAME_IDS.length
  while (remaining > 0) {
    const eligible = GAME_IDS.filter((id) => result[id] < MAX_BET_PER_GAME)
    if (eligible.length === 0) break
    const pick = eligible[Math.floor(Math.random() * eligible.length)]
    const add = Math.min(5, remaining, MAX_BET_PER_GAME - result[pick])
    result[pick] += add
    remaining -= add
  }
  return GAME_IDS.map((id) => ({ gameId: id, bet: result[id] }))
}

/**
 * Calculate the points awarded to the winner of a match.
 *
 * Rules:
 * - Equal bets: winner gets their bet amount
 * - Underdog wins (winnerBet < loserBet): winner gets the LARGER bet (loserBet)
 * - Difference ≤ OVERDOG_THRESHOLD: winner gets max(winnerBet, loserBet)
 * - Overdog wins beyond threshold: loserBet + floor(sqrt(OVERDOG_THRESHOLD * diff))
 *   This gives diminishing returns — each extra point of difference yields less bonus.
 */
export function calculateMatchPoints(winnerBet: number, loserBet: number): number {
  if (winnerBet === loserBet) {
    return winnerBet
  }

  const diff = Math.abs(winnerBet - loserBet)

  if (diff <= OVERDOG_THRESHOLD) {
    // Within threshold — winner always gets the higher bet
    return Math.max(winnerBet, loserBet)
  }

  if (winnerBet < loserBet) {
    // Underdog wins — gets the larger number (the loser's bet)
    return loserBet
  }

  // Overdog wins beyond threshold — diminishing returns via sqrt curve
  return loserBet + Math.floor(Math.sqrt(OVERDOG_THRESHOLD * diff))
}
