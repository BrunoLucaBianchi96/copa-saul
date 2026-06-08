import { NextResponse } from 'next/server'
import { db } from '@/db'
import { playerBets } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { getGamesForTournament } from '@/lib/games-db'
import { getSession, getSessionPlayerId, isHost as checkIsHost } from '@/lib/session'
import { DEFAULT_BET, type BetAllocation } from '@/lib/scoring'

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const role = await getSession()
  if (!role) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const tournamentId = parseInt(params.id)
  const { searchParams } = new URL(request.url)
  const playerId = parseInt(searchParams.get('playerId') || '0')

  if (!playerId) {
    return NextResponse.json({ error: 'playerId required' }, { status: 400 })
  }

  // Players can only fetch their own bets
  if (!checkIsHost(role)) {
    const sessionPlayerId = await getSessionPlayerId()
    if (sessionPlayerId !== playerId) {
      return NextResponse.json({ error: "Cannot view other players' bets" }, { status: 403 })
    }
  }

  // Get tournament-scoped bets (snapshot)
  const bets = await db
    .select()
    .from(playerBets)
    .where(
      and(eq(playerBets.tournamentId, tournamentId), eq(playerBets.playerId, playerId))
    )

  const betMap = new Map(bets.map((b) => [b.gameId, b.bet]))

  const games = await getGamesForTournament(tournamentId)
  const result: BetAllocation[] = games.map((game) => ({
    gameId: game.id,
    bet: betMap.get(game.id) ?? DEFAULT_BET,
  }))

  return NextResponse.json({ bets: result })
}
