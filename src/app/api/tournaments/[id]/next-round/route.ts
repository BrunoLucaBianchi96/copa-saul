import { NextResponse } from 'next/server'
import { db } from '@/db'
import { tournaments, matches, tournamentPlayers } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { generatePairings } from '@/lib/swiss'
import { requireHost } from '@/lib/session'
import { getThemeForTournament } from '@/lib/themes'

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const auth = await requireHost()
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: 403 })
  }

  const tournamentId = parseInt(params.id)

  // Get tournament
  const tournament = await db
    .select()
    .from(tournaments)
    .where(eq(tournaments.id, tournamentId))

  if (!tournament[0] || tournament[0].status !== 'active') {
    return NextResponse.json({ error: 'Tournament not found or not active' }, { status: 400 })
  }

  // Check all current round matches are complete
  const currentMatches = await db
    .select()
    .from(matches)
    .where(
      and(
        eq(matches.tournamentId, tournamentId),
        eq(matches.round, tournament[0].currentRound)
      )
    )

  const pendingMatches = currentMatches.filter((m) => m.result === 'pending')
  if (pendingMatches.length > 0) {
    return NextResponse.json(
      { error: 'All matches must be completed before advancing' },
      { status: 400 }
    )
  }

  const nextRound = tournament[0].currentRound + 1

  if (nextRound > tournament[0].rounds) {
    return NextResponse.json({ error: 'Tournament has reached maximum rounds' }, { status: 400 })
  }

  // Generate pairings for next round
  const pairings = await generatePairings(tournamentId, nextRound)

  // Count existing non-bye matches for round-robin theme selection
  const existingMatches = await db
    .select()
    .from(matches)
    .where(eq(matches.tournamentId, tournamentId))
  const existingNonByeCount = existingMatches.filter((m) => m.player2Id !== null).length

  // Create matches (round-robin theme selection continues from where we left off)
  let matchIndex = existingNonByeCount
  for (const pairing of pairings) {
    if (pairing.player2Id === null) {
      // Bye
      await db.insert(matches).values({
        tournamentId,
        round: nextRound,
        player1Id: pairing.player1Id,
        player2Id: null,
        result: 'bye',
        winnerId: pairing.player1Id,
      })
      // Award point for bye
      const current = await db
        .select()
        .from(tournamentPlayers)
        .where(
          and(
            eq(tournamentPlayers.tournamentId, tournamentId),
            eq(tournamentPlayers.playerId, pairing.player1Id)
          )
        )
      if (current[0]) {
        await db
          .update(tournamentPlayers)
          .set({ points: current[0].points + 1 })
          .where(eq(tournamentPlayers.id, current[0].id))
      }
    } else {
      await db.insert(matches).values({
        tournamentId,
        round: nextRound,
        player1Id: pairing.player1Id,
        player2Id: pairing.player2Id,
        result: 'pending',
        backgroundMusicId: getThemeForTournament(tournamentId, matchIndex).id,
      })
      matchIndex++
    }
  }

  // Update tournament round
  await db
    .update(tournaments)
    .set({ currentRound: nextRound })
    .where(eq(tournaments.id, tournamentId))

  return NextResponse.json({ success: true })
}
