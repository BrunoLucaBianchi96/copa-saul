import { NextResponse } from 'next/server'
import { db } from '@/db'
import { tournaments, matches, tournamentPlayers, players, playerBets } from '@/db/schema'
import { eq, and, inArray, isNull } from 'drizzle-orm'
import { generatePairings } from '@/lib/swiss'
import { requireHost } from '@/lib/session'
import { getThemeForMatch } from '@/lib/themes'
import { BYE_POINTS, DEFAULT_BET } from '@/lib/scoring'
import { GAMES } from '@/lib/games'

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const auth = await requireHost()
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: 403 })
  }

  const tournamentId = parseInt(params.id)

  // Get excluded players from request body (optional)
  let excludedPlayerIds: number[] = []
  try {
    const body = await request.json()
    excludedPlayerIds = body.excludedPlayerIds || []
  } catch {
    // No body or invalid JSON - proceed with all players
  }

  // Check tournament exists and is pending
  const tournament = await db
    .select()
    .from(tournaments)
    .where(eq(tournaments.id, tournamentId))

  if (!tournament[0] || tournament[0].status !== 'pending') {
    return NextResponse.json({ error: 'Tournament not found or already started' }, { status: 400 })
  }

  // Remove excluded players from tournament
  if (excludedPlayerIds.length > 0) {
    await db
      .delete(tournamentPlayers)
      .where(
        and(
          eq(tournamentPlayers.tournamentId, tournamentId),
          inArray(tournamentPlayers.playerId, excludedPlayerIds)
        )
      )
  }

  // Check we have players
  const playerCount = await db
    .select()
    .from(tournamentPlayers)
    .where(eq(tournamentPlayers.tournamentId, tournamentId))

  if (playerCount.length < 2) {
    return NextResponse.json({ error: 'Need at least 2 players' }, { status: 400 })
  }

  // Generate first round pairings
  const pairings = await generatePairings(tournamentId, 1)

  // Build player name map for theme priority matching
  const allPlayerIds = pairings.flatMap((p) =>
    p.player2Id ? [p.player1Id, p.player2Id] : [p.player1Id]
  )
  const playerRows = await db
    .select({ id: players.id, name: players.name })
    .from(players)
    .where(inArray(players.id, allPlayerIds))
  const playerNameMap = new Map(playerRows.map((p) => [p.id, p.name]))

  // Create matches with priority-based theme selection
  const usedThemeIds: string[] = []
  const allMatchRows: (typeof matches.$inferInsert)[] = []
  const byePlayerIds: number[] = []

  for (const pairing of pairings) {
    if (pairing.player2Id === null) {
      // Bye - player automatically gets a point
      allMatchRows.push({
        tournamentId,
        round: 1,
        player1Id: pairing.player1Id,
        player2Id: null,
        result: 'bye',
        winnerId: pairing.player1Id,
      })
      byePlayerIds.push(pairing.player1Id)
    } else {
      const names = [
        playerNameMap.get(pairing.player1Id) ?? '',
        playerNameMap.get(pairing.player2Id) ?? '',
      ]
      const theme = getThemeForMatch(usedThemeIds, names, 1)
      usedThemeIds.push(theme.id)
      allMatchRows.push({
        tournamentId,
        round: 1,
        player1Id: pairing.player1Id,
        player2Id: pairing.player2Id,
        result: 'pending',
        backgroundMusicId: theme.id,
      })
    }
  }

  // Bulk insert all matches + parallel bye point updates
  await Promise.all([
    db.insert(matches).values(allMatchRows),
    ...byePlayerIds.map((playerId) =>
      db
        .update(tournamentPlayers)
        .set({ points: BYE_POINTS })
        .where(
          and(
            eq(tournamentPlayers.tournamentId, tournamentId),
            eq(tournamentPlayers.playerId, playerId)
          )
        )
    ),
  ])

  // Snapshot each player's default bets into tournament-scoped rows
  const remainingPlayers = await db
    .select({ playerId: tournamentPlayers.playerId })
    .from(tournamentPlayers)
    .where(eq(tournamentPlayers.tournamentId, tournamentId))

  // Read all players' default bets in parallel
  const allDefaultBets = await Promise.all(
    remainingPlayers.map(({ playerId }) =>
      db
        .select()
        .from(playerBets)
        .where(
          and(isNull(playerBets.tournamentId), eq(playerBets.playerId, playerId))
        )
    )
  )

  // Build all bet snapshot rows in memory, then bulk insert
  const allBetRows = remainingPlayers.flatMap(({ playerId }, idx) => {
    const betMap = new Map(allDefaultBets[idx].map((b) => [b.gameId, b.bet]))
    return GAMES.map((game) => ({
      tournamentId,
      playerId,
      gameId: game.id,
      bet: betMap.get(game.id) ?? DEFAULT_BET,
    }))
  })

  await db.insert(playerBets).values(allBetRows)

  // Update tournament status
  await db
    .update(tournaments)
    .set({ status: 'active', currentRound: 1 })
    .where(eq(tournaments.id, tournamentId))

  return NextResponse.json({ success: true })
}
