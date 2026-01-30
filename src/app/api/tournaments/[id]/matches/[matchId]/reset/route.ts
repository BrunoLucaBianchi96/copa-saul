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

  // If the match had a result, subtract points from the winner
  if (match[0].result === 'player1') {
    const p1 = await db
      .select()
      .from(tournamentPlayers)
      .where(
        and(
          eq(tournamentPlayers.tournamentId, tournamentId),
          eq(tournamentPlayers.playerId, match[0].player1Id)
        )
      )
    if (p1[0] && p1[0].points > 0) {
      await db
        .update(tournamentPlayers)
        .set({ points: p1[0].points - 1 })
        .where(eq(tournamentPlayers.id, p1[0].id))
    }
  } else if (match[0].result === 'player2' && match[0].player2Id) {
    const p2 = await db
      .select()
      .from(tournamentPlayers)
      .where(
        and(
          eq(tournamentPlayers.tournamentId, tournamentId),
          eq(tournamentPlayers.playerId, match[0].player2Id)
        )
      )
    if (p2[0] && p2[0].points > 0) {
      await db
        .update(tournamentPlayers)
        .set({ points: p2[0].points - 1 })
        .where(eq(tournamentPlayers.id, p2[0].id))
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
      pickBanComplete: false,
    })
    .where(eq(matches.id, matchId))

  return NextResponse.json({ success: true })
}
