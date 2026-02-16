import { NextResponse } from 'next/server'
import { db } from '@/db'
import { playerBets } from '@/db/schema'
import { eq, and, isNull } from 'drizzle-orm'
import { GAMES } from '@/lib/games'
import { requireHost } from '@/lib/session'
import { MIN_BET_PER_GAME, generateRandomBets } from '@/lib/scoring-constants'

export async function POST(request: Request) {
  const auth = await requireHost()
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: 403 })
  }

  const { action, playerIds } = (await request.json()) as {
    action: 'reset' | 'random'
    playerIds: number[]
  }

  if (!action || !['reset', 'random'].includes(action)) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }
  if (!Array.isArray(playerIds) || playerIds.length === 0) {
    return NextResponse.json({ error: 'playerIds required' }, { status: 400 })
  }

  for (const playerId of playerIds) {
    // Delete existing global bets
    await db
      .delete(playerBets)
      .where(and(isNull(playerBets.tournamentId), eq(playerBets.playerId, playerId)))

    // Generate new bets
    const bets =
      action === 'reset'
        ? GAMES.map((g) => ({ gameId: g.id, bet: MIN_BET_PER_GAME }))
        : generateRandomBets()

    for (const bet of bets) {
      await db.insert(playerBets).values({
        tournamentId: null,
        playerId,
        gameId: bet.gameId,
        bet: bet.bet,
      })
    }
  }

  return NextResponse.json({ success: true })
}
