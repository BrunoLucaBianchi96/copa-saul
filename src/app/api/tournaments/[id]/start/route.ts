import { NextResponse } from 'next/server'
import { db } from '@/db'
import { tournaments, matches, tournamentPlayers } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { generatePairings } from '@/lib/swiss'
import { requireHost } from '@/lib/session'
import { getThemeForTournament } from '@/lib/themes'
import { BYE_POINTS } from '@/lib/scoring'

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
    for (const playerId of excludedPlayerIds) {
      await db
        .delete(tournamentPlayers)
        .where(
          and(
            eq(tournamentPlayers.tournamentId, tournamentId),
            eq(tournamentPlayers.playerId, playerId)
          )
        )
    }
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

  // Create matches (round-robin theme selection)
  let matchIndex = 0
  for (const pairing of pairings) {
    if (pairing.player2Id === null) {
      // Bye - player automatically gets a point
      await db.insert(matches).values({
        tournamentId,
        round: 1,
        player1Id: pairing.player1Id,
        player2Id: null,
        result: 'bye',
        winnerId: pairing.player1Id,
      })
      // Award points for bye
      await db
        .update(tournamentPlayers)
        .set({ points: BYE_POINTS })
        .where(
          and(
            eq(tournamentPlayers.tournamentId, tournamentId),
            eq(tournamentPlayers.playerId, pairing.player1Id)
          )
        )
    } else {
      await db.insert(matches).values({
        tournamentId,
        round: 1,
        player1Id: pairing.player1Id,
        player2Id: pairing.player2Id,
        result: 'pending',
        backgroundMusicId: getThemeForTournament(tournamentId, matchIndex).id,
      })
      matchIndex++
    }
  }

  // Update tournament status
  await db
    .update(tournaments)
    .set({ status: 'active', currentRound: 1 })
    .where(eq(tournaments.id, tournamentId))

  return NextResponse.json({ success: true })
}
