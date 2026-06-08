// --- Bet system balance knobs ---
// The point budget scales with roster size: a player gets POINTS_PER_GAME per
// game to spread, so different-sized rosters stay balanced and feasible.
export const POINTS_PER_GAME = 40
export const MIN_BET_PER_GAME = 20
export const MAX_BET_PER_GAME = 80
// Even-split default (== POINTS_PER_GAME): a fresh roster starts here, and it's
// the fallback when a snapshot row is missing a game.
export const EVEN_BET = POINTS_PER_GAME
export const DEFAULT_BET = EVEN_BET
// A bye is worth one game's average value.
export const BYE_POINTS = POINTS_PER_GAME
export const OVERDOG_THRESHOLD = 15

/** Total points a player must allocate across a roster of `gameCount` games. */
export function betBudget(gameCount: number): number {
  return gameCount * POINTS_PER_GAME
}

/**
 * Canonical identity of a "game collection": the gameIds sorted and joined.
 * Two tournaments with the same roster share the same key (and thus bets).
 * Pure function — safe for both client and server.
 */
export function rosterKey(gameIds: string[]): string {
  return [...gameIds].sort().join(',')
}

// --- Bounty system ---
// A player must finish in the top 4 of the standings in this many rounds before
// any bounty accrues. Accrual starts on the Nth top-4 finish.
export const BOUNTY_MIN_TOP4_ROUNDS = 3
// Bounty increment per top-4 finish, keyed by 0-based standing position:
// index 0 = 1st place, 1 = 2nd, 2 = 3rd, 3 = 4th.
export const BOUNTY_RATE_BY_PLACEMENT = [15, 13, 10, 7] as const

/**
 * Increment added to a player's bounty for a top-4 finish at the given
 * 0-based standing position. Returns 0 for positions outside the top 4.
 * Pure function — safe for both client and server.
 */
export function bountyIncrementForPlacement(placementIndex: number): number {
  return BOUNTY_RATE_BY_PLACEMENT[placementIndex] ?? 0
}

export interface BetAllocation {
  gameId: string
  bet: number
}

/**
 * Generate a random valid bet allocation over the given game ids.
 * Pure function — safe for both client and server.
 */
export function generateRandomBets(gameIds: string[]): BetAllocation[] {
  const result: Record<string, number> = {}
  for (const id of gameIds) result[id] = MIN_BET_PER_GAME
  let remaining = betBudget(gameIds.length) - MIN_BET_PER_GAME * gameIds.length
  while (remaining > 0) {
    const eligible = gameIds.filter((id) => result[id] < MAX_BET_PER_GAME)
    if (eligible.length === 0) break
    const pick = eligible[Math.floor(Math.random() * eligible.length)]
    const add = Math.min(5, remaining, MAX_BET_PER_GAME - result[pick])
    result[pick] += add
    remaining -= add
  }
  return gameIds.map((id) => ({ gameId: id, bet: result[id] }))
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
