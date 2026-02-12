import { NextResponse } from 'next/server'
import { db } from '@/db'
import { playerBets, tournaments, tournamentPlayers } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { GAMES } from '@/lib/games'
import { getSession, getSessionPlayerId, isHost as checkIsHost } from '@/lib/session'
import { validateBets, DEFAULT_BET, type BetAllocation } from '@/lib/scoring'

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
      return NextResponse.json({ error: 'Cannot view other players\' bets' }, { status: 403 })
    }
  }

  // Verify player is in tournament
  const tp = await db
    .select()
    .from(tournamentPlayers)
    .where(
      and(
        eq(tournamentPlayers.tournamentId, tournamentId),
        eq(tournamentPlayers.playerId, playerId)
      )
    )

  if (!tp[0]) {
    return NextResponse.json({ error: 'Player not in tournament' }, { status: 404 })
  }

  // Get existing bets
  const bets = await db
    .select()
    .from(playerBets)
    .where(
      and(eq(playerBets.tournamentId, tournamentId), eq(playerBets.playerId, playerId))
    )

  const betMap = new Map(bets.map((b) => [b.gameId, b.bet]))

  const result: BetAllocation[] = GAMES.map((game) => ({
    gameId: game.id,
    bet: betMap.get(game.id) ?? DEFAULT_BET,
  }))

  return NextResponse.json({ bets: result })
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const role = await getSession()
  if (!role) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const tournamentId = parseInt(params.id)
  const { playerId, bets } = (await request.json()) as {
    playerId: number
    bets: BetAllocation[]
  }

  // Players can only save their own bets
  if (!checkIsHost(role)) {
    const sessionPlayerId = await getSessionPlayerId()
    if (sessionPlayerId !== playerId) {
      return NextResponse.json({ error: 'Cannot modify other players\' bets' }, { status: 403 })
    }
  }

  // Verify tournament is pending
  const tournament = await db
    .select()
    .from(tournaments)
    .where(eq(tournaments.id, tournamentId))

  if (!tournament[0] || tournament[0].status !== 'pending') {
    return NextResponse.json(
      { error: 'Bets can only be set before tournament starts' },
      { status: 400 }
    )
  }

  // Verify player is in tournament
  const tp = await db
    .select()
    .from(tournamentPlayers)
    .where(
      and(
        eq(tournamentPlayers.tournamentId, tournamentId),
        eq(tournamentPlayers.playerId, playerId)
      )
    )

  if (!tp[0]) {
    return NextResponse.json({ error: 'Player not in tournament' }, { status: 404 })
  }

  // Validate bets
  const validation = validateBets(bets)
  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: 400 })
  }

  // Delete existing bets then insert new ones
  await db
    .delete(playerBets)
    .where(
      and(eq(playerBets.tournamentId, tournamentId), eq(playerBets.playerId, playerId))
    )

  for (const bet of bets) {
    await db.insert(playerBets).values({
      tournamentId,
      playerId,
      gameId: bet.gameId,
      bet: bet.bet,
    })
  }

  return NextResponse.json({ success: true })
}
