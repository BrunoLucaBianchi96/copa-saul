import { db } from '@/db'
import { playerBets } from '@/db/schema'
import { eq, and } from 'drizzle-orm'

// Re-export constants and pure functions from client-safe module
export {
  POINTS_PER_GAME,
  EVEN_BET,
  MIN_BET_PER_GAME,
  MAX_BET_PER_GAME,
  DEFAULT_BET,
  BYE_POINTS,
  OVERDOG_THRESHOLD,
  BOUNTY_MIN_TOP4_ROUNDS,
  BOUNTY_RATE_BY_PLACEMENT,
  betBudget,
  rosterKey,
  bountyIncrementForPlacement,
  calculateMatchPoints,
  generateRandomBets,
  type BetAllocation,
} from './scoring-constants'

import { betBudget, MIN_BET_PER_GAME, MAX_BET_PER_GAME, DEFAULT_BET, type BetAllocation } from './scoring-constants'

/**
 * Validate that a set of bets is legal against a tournament's game roster:
 * - Exactly one entry per game in the roster
 * - Each bet within [MIN_BET_PER_GAME, MAX_BET_PER_GAME]
 * - Total === betBudget(gameIds.length)
 * - All gameIds belong to the roster
 */
export function validateBets(
  bets: BetAllocation[],
  gameIds: string[]
): { valid: boolean; error?: string } {
  const validGameIds = new Set(gameIds)

  if (bets.length !== gameIds.length) {
    return { valid: false, error: `Must have exactly ${gameIds.length} bets` }
  }

  const seenGameIds = new Set<string>()
  let total = 0

  for (const bet of bets) {
    if (!validGameIds.has(bet.gameId)) {
      return { valid: false, error: `Invalid game ID: ${bet.gameId}` }
    }
    if (seenGameIds.has(bet.gameId)) {
      return { valid: false, error: `Duplicate game ID: ${bet.gameId}` }
    }
    if (!Number.isInteger(bet.bet) || bet.bet < MIN_BET_PER_GAME) {
      return { valid: false, error: `Bet for ${bet.gameId} must be at least ${MIN_BET_PER_GAME}` }
    }
    if (bet.bet > MAX_BET_PER_GAME) {
      return { valid: false, error: `Bet for ${bet.gameId} must be at most ${MAX_BET_PER_GAME}` }
    }
    seenGameIds.add(bet.gameId)
    total += bet.bet
  }

  const budget = betBudget(gameIds.length)
  if (total !== budget) {
    return { valid: false, error: `Total must be ${budget}, got ${total}` }
  }

  return { valid: true }
}

/**
 * Get a player's bet for a specific game in a tournament.
 * Returns DEFAULT_BET if no bet has been placed.
 */
export async function getPlayerBetForGame(
  tournamentId: number,
  playerId: number,
  gameId: string
): Promise<number> {
  const bet = await db
    .select()
    .from(playerBets)
    .where(
      and(
        eq(playerBets.tournamentId, tournamentId),
        eq(playerBets.playerId, playerId),
        eq(playerBets.gameId, gameId)
      )
    )
  return bet[0]?.bet ?? DEFAULT_BET
}

/**
 * Get all bets for a player in a tournament, one entry per game in `gameIds`.
 * Returns default bets for any games not explicitly set.
 */
export async function getPlayerBets(
  tournamentId: number,
  playerId: number,
  gameIds: string[]
): Promise<BetAllocation[]> {
  const bets = await db
    .select()
    .from(playerBets)
    .where(
      and(eq(playerBets.tournamentId, tournamentId), eq(playerBets.playerId, playerId))
    )

  const betMap = new Map(bets.map((b) => [b.gameId, b.bet]))

  return gameIds.map((gameId) => ({
    gameId,
    bet: betMap.get(gameId) ?? DEFAULT_BET,
  }))
}
