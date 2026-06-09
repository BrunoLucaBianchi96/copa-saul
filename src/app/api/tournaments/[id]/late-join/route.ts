import { NextResponse } from 'next/server'
import { db } from '@/db'
import { tournaments, matches, tournamentPlayers, players, playerBets, rosterBets } from '@/db/schema'
import { eq, and, isNull } from 'drizzle-orm'
import { requireHost } from '@/lib/session'
import { getThemeForMatch } from '@/lib/themes-db'
import { BYE_POINTS, EVEN_BET, rosterKey } from '@/lib/scoring'
import { getGamesForTournament } from '@/lib/games-db'

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const auth = await requireHost()
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: 403 })
  }

  const tournamentId = parseInt(params.id)

  const body = await request.json()
  const playerId: number = body.playerId
  if (!playerId) {
    return NextResponse.json({ error: 'playerId is required' }, { status: 400 })
  }

  // Validate tournament is active
  const tournament = await db
    .select()
    .from(tournaments)
    .where(eq(tournaments.id, tournamentId))

  if (!tournament[0] || tournament[0].status !== 'active') {
    return NextResponse.json({ error: 'Tournament not found or not active' }, { status: 400 })
  }

  // Validate player exists and is not soft-deleted
  const player = await db
    .select()
    .from(players)
    .where(and(eq(players.id, playerId), isNull(players.deletedAt)))

  if (!player[0]) {
    return NextResponse.json({ error: 'Player not found' }, { status: 404 })
  }

  // Validate player not already in tournament
  const existing = await db
    .select()
    .from(tournamentPlayers)
    .where(
      and(
        eq(tournamentPlayers.tournamentId, tournamentId),
        eq(tournamentPlayers.playerId, playerId)
      )
    )

  if (existing.length > 0) {
    return NextResponse.json({ error: 'Player already in tournament' }, { status: 400 })
  }

  // Create tournamentPlayers row with 0 points
  await db.insert(tournamentPlayers).values({
    tournamentId,
    playerId,
    points: 0,
  })

  // Freeze a snapshot of the player's per-roster bets into tournament-scoped rows
  const tournamentGameList = await getGamesForTournament(tournamentId)
  const key = rosterKey(tournamentGameList.map((g) => g.id))
  const playerRosterBets = await db
    .select()
    .from(rosterBets)
    .where(and(eq(rosterBets.playerId, playerId), eq(rosterBets.rosterKey, key)))

  const betMap = new Map(playerRosterBets.map((b) => [b.gameId, b.bet]))
  const betRows = tournamentGameList.map((game) => ({
    tournamentId,
    playerId,
    gameId: game.id,
    bet: betMap.get(game.id) ?? EVEN_BET,
  }))
  await db.insert(playerBets).values(betRows)

  // Check for a bye match in the current round
  const currentRound = tournament[0].currentRound
  const byeMatch = await db
    .select()
    .from(matches)
    .where(
      and(
        eq(matches.tournamentId, tournamentId),
        eq(matches.round, currentRound),
        eq(matches.result, 'bye'),
        isNull(matches.player2Id)
      )
    )

  if (byeMatch[0]) {
    const bye = byeMatch[0]

    // Subtract BYE_POINTS from the bye player
    const byePlayerRow = await db
      .select()
      .from(tournamentPlayers)
      .where(
        and(
          eq(tournamentPlayers.tournamentId, tournamentId),
          eq(tournamentPlayers.playerId, bye.player1Id)
        )
      )

    if (byePlayerRow[0]) {
      await db
        .update(tournamentPlayers)
        .set({ points: Math.max(0, byePlayerRow[0].points - BYE_POINTS) })
        .where(eq(tournamentPlayers.id, byePlayerRow[0].id))
    }

    // Get used theme IDs for theme assignment
    const existingMatches = await db
      .select()
      .from(matches)
      .where(eq(matches.tournamentId, tournamentId))
    const usedThemeIds = existingMatches
      .filter((m) => m.backgroundMusicId)
      .map((m) => m.backgroundMusicId!)

    // Get player names for theme priority matching
    const matchPlayerIds = [bye.player1Id, playerId]
    const playerRows = await db
      .select({ id: players.id, name: players.name })
      .from(players)
      .where(
        and(
          eq(players.id, matchPlayerIds[0])
        )
      )
    const player2Row = await db
      .select({ id: players.id, name: players.name })
      .from(players)
      .where(eq(players.id, playerId))

    const names = [
      playerRows[0]?.name ?? '',
      player2Row[0]?.name ?? '',
    ]
    const theme = await getThemeForMatch(usedThemeIds, names, currentRound)

    // Update bye match: set player2, result to pending, clear winnerId, assign theme
    await db
      .update(matches)
      .set({
        player2Id: playerId,
        result: 'pending',
        winnerId: null,
        backgroundMusicId: theme.id,
      })
      .where(eq(matches.id, bye.id))

    return NextResponse.json({ success: true, matched: true, matchId: bye.id })
  }

  // No bye — player waits for next round
  return NextResponse.json({ success: true, matched: false })
}
