import { NextResponse } from 'next/server'
import { db } from '@/db'
import { players, playerBets } from '@/db/schema'
import { eq, and, isNull } from 'drizzle-orm'
import { GAMES } from '@/lib/games'
import { getSession, getSessionPlayerId, isHost as checkIsHost } from '@/lib/session'
import { validateBets, DEFAULT_BET, type BetAllocation } from '@/lib/scoring'

async function authenticatePlayer(playerId: number, editToken: string | null): Promise<boolean> {
  if (editToken) {
    const result = await db
      .select({ id: players.id })
      .from(players)
      .where(and(eq(players.id, playerId), eq(players.editToken, editToken), isNull(players.deletedAt)))
    return result.length > 0
  }

  const role = await getSession()
  if (!role) return false
  if (checkIsHost(role)) return true

  const sessionPlayerId = await getSessionPlayerId()
  return sessionPlayerId === playerId
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const playerId = parseInt(searchParams.get('playerId') || '0')
  const editToken = searchParams.get('editToken')

  if (!playerId) {
    return NextResponse.json({ error: 'playerId required' }, { status: 400 })
  }

  const authorized = await authenticatePlayer(playerId, editToken)
  if (!authorized) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
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
  const { playerId, bets, editToken } = (await request.json()) as {
    playerId: number
    bets: BetAllocation[]
    editToken?: string
  }

  const authorized = await authenticatePlayer(playerId, editToken ?? null)
  if (!authorized) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
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
