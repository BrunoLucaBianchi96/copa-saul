import { NextResponse } from 'next/server'
import { db } from '@/db'
import { playerBets } from '@/db/schema'
import { eq, and, isNull } from 'drizzle-orm'
import { GAMES } from '@/lib/games'
import { getSession, getSessionPlayerId, isHost as checkIsHost } from '@/lib/session'
import { validateBets, DEFAULT_BET, type BetAllocation } from '@/lib/scoring'

export async function GET(request: Request) {
  const role = await getSession()
  if (!role) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

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

  // Get existing default bets (tournamentId IS NULL)
  const bets = await db
    .select()
    .from(playerBets)
    .where(
      and(isNull(playerBets.tournamentId), eq(playerBets.playerId, playerId))
    )

  const betMap = new Map(bets.map((b) => [b.gameId, b.bet]))

  const result: BetAllocation[] = GAMES.map((game) => ({
    gameId: game.id,
    bet: betMap.get(game.id) ?? DEFAULT_BET,
  }))

  return NextResponse.json({ bets: result })
}

export async function PUT(request: Request) {
  const role = await getSession()
  if (!role) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const { playerId, bets } = (await request.json()) as {
    playerId: number
    bets: BetAllocation[]
  }

  // Players can only save their own bets
  if (!checkIsHost(role)) {
    const sessionPlayerId = await getSessionPlayerId()
    if (sessionPlayerId !== playerId) {
      return NextResponse.json({ error: "Cannot modify other players' bets" }, { status: 403 })
    }
  }

  // Validate bets
  const validation = validateBets(bets)
  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: 400 })
  }

  // Delete existing default bets then insert new ones
  await db
    .delete(playerBets)
    .where(
      and(isNull(playerBets.tournamentId), eq(playerBets.playerId, playerId))
    )

  for (const bet of bets) {
    await db.insert(playerBets).values({
      tournamentId: null,
      playerId,
      gameId: bet.gameId,
      bet: bet.bet,
    })
  }

  return NextResponse.json({ success: true })
}
