import { NextResponse } from 'next/server'
import { db } from '@/db'
import { matches, tournamentPlayers } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { requireHost } from '@/lib/session'

export async function POST(
  request: Request,
  { params }: { params: { id: string; matchId: string } }
) {
  const auth = await requireHost()
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: 403 })
  }

  const tournamentId = parseInt(params.id)
  const matchId = parseInt(params.matchId)

  // Get the match
  const match = await db.select().from(matches).where(eq(matches.id, matchId))

  if (!match[0] || match[0].tournamentId !== tournamentId) {
    return NextResponse.json({ error: 'Match not found' }, { status: 404 })
  }

  // If the match had a winner, subtract the awarded points
  if (match[0].winnerId && match[0].pointsAwarded && match[0].pointsAwarded > 0) {
    const winner = await db
      .select()
      .from(tournamentPlayers)
      .where(
        and(
          eq(tournamentPlayers.tournamentId, tournamentId),
          eq(tournamentPlayers.playerId, match[0].winnerId)
        )
      )
    if (winner[0]) {
      await db
        .update(tournamentPlayers)
        .set({ points: Math.max(0, winner[0].points - match[0].pointsAwarded) })
        .where(eq(tournamentPlayers.id, winner[0].id))
    }
  }

  // Reset the match
  await db
    .update(matches)
    .set({
      result: 'pending',
      winnerId: null,
      pickBanHistory: null,
      selectedGame: null,
      player1PreferredGame: null,
      player2PreferredGame: null,
      pickBanComplete: false,
      pointsAwarded: null,
    })
    .where(eq(matches.id, matchId))

  return NextResponse.json({ success: true })
}
