import { NextResponse } from 'next/server'
import { db } from '@/db'
import { rosterBets, tournaments } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { getGamesForTournament } from '@/lib/games-db'
import { requireHost } from '@/lib/session'
import { EVEN_BET, generateRandomBets, rosterKey } from '@/lib/scoring-constants'

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const auth = await requireHost()
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: 403 })
  }

  const tournamentId = parseInt(params.id)
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

  const tournament = await db.select().from(tournaments).where(eq(tournaments.id, tournamentId))
  if (!tournament[0]) {
    return NextResponse.json({ error: 'Tournament not found' }, { status: 404 })
  }
  if (tournament[0].status !== 'pending') {
    return NextResponse.json({ error: 'Bets are locked once the tournament has started' }, { status: 409 })
  }

  const games = await getGamesForTournament(tournamentId)
  const gameIds = games.map((g) => g.id)
  const key = rosterKey(gameIds)

  for (const playerId of playerIds) {
    await db
      .delete(rosterBets)
      .where(and(eq(rosterBets.playerId, playerId), eq(rosterBets.rosterKey, key)))

    const bets =
      action === 'reset'
        ? gameIds.map((id) => ({ gameId: id, bet: EVEN_BET }))
        : generateRandomBets(gameIds)

    await db.insert(rosterBets).values(
      bets.map((bet) => ({ playerId, rosterKey: key, gameId: bet.gameId, bet: bet.bet }))
    )
  }

  return NextResponse.json({ success: true })
}
