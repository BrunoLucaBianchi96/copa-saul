import { NextResponse } from 'next/server'
import { db } from '@/db'
import { players, playerBets, rosterBets, tournaments } from '@/db/schema'
import { eq, and, isNull } from 'drizzle-orm'
import { getGamesForTournament } from '@/lib/games-db'
import { getSession, getSessionPlayerId, isHost as checkIsHost } from '@/lib/session'
import { validateBets, rosterKey, EVEN_BET, DEFAULT_BET, type BetAllocation } from '@/lib/scoring'

/** Host, the player themselves (by session), or a matching edit token. */
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

async function getTournament(id: number) {
  const rows = await db.select().from(tournaments).where(eq(tournaments.id, id))
  return rows[0] ?? null
}

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const tournamentId = parseInt(params.id)
  const { searchParams } = new URL(request.url)
  const playerId = parseInt(searchParams.get('playerId') || '0')
  const editToken = searchParams.get('editToken')

  if (!playerId) {
    return NextResponse.json({ error: 'playerId required' }, { status: 400 })
  }

  if (!(await authenticatePlayer(playerId, editToken))) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const tournament = await getTournament(tournamentId)
  if (!tournament) {
    return NextResponse.json({ error: 'Tournament not found' }, { status: 404 })
  }

  const games = await getGamesForTournament(tournamentId)

  if (tournament.status === 'pending') {
    // Pending: read the shared per-roster bets, filling missing games with the
    // even-split default.
    const key = rosterKey(games.map((g) => g.id))
    const bets = await db
      .select()
      .from(rosterBets)
      .where(and(eq(rosterBets.playerId, playerId), eq(rosterBets.rosterKey, key)))
    const betMap = new Map(bets.map((b) => [b.gameId, b.bet]))
    const result: BetAllocation[] = games.map((game) => ({
      gameId: game.id,
      bet: betMap.get(game.id) ?? EVEN_BET,
    }))
    return NextResponse.json({ bets: result })
  }

  // Started: read the frozen snapshot.
  const bets = await db
    .select()
    .from(playerBets)
    .where(and(eq(playerBets.tournamentId, tournamentId), eq(playerBets.playerId, playerId)))
  const betMap = new Map(bets.map((b) => [b.gameId, b.bet]))
  const result: BetAllocation[] = games.map((game) => ({
    gameId: game.id,
    bet: betMap.get(game.id) ?? DEFAULT_BET,
  }))
  return NextResponse.json({ bets: result })
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const tournamentId = parseInt(params.id)
  const { playerId, bets, editToken } = (await request.json()) as {
    playerId: number
    bets: BetAllocation[]
    editToken?: string
  }

  if (!playerId) {
    return NextResponse.json({ error: 'playerId required' }, { status: 400 })
  }

  if (!(await authenticatePlayer(playerId, editToken ?? null))) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const tournament = await getTournament(tournamentId)
  if (!tournament) {
    return NextResponse.json({ error: 'Tournament not found' }, { status: 404 })
  }
  if (tournament.status !== 'pending') {
    return NextResponse.json({ error: 'Bets are locked once the tournament has started' }, { status: 409 })
  }

  const games = await getGamesForTournament(tournamentId)
  const gameIds = games.map((g) => g.id)
  const validation = validateBets(bets, gameIds)
  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: 400 })
  }

  // Replace the player's bets for this roster (shared across same-roster tournaments).
  const key = rosterKey(gameIds)
  await db
    .delete(rosterBets)
    .where(and(eq(rosterBets.playerId, playerId), eq(rosterBets.rosterKey, key)))
  await db.insert(rosterBets).values(
    bets.map((bet) => ({ playerId, rosterKey: key, gameId: bet.gameId, bet: bet.bet }))
  )

  return NextResponse.json({ success: true })
}
