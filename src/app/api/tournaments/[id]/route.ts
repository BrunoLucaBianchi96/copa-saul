import { NextResponse } from 'next/server'
import { db } from '@/db'
import { tournaments, matches, tournamentPlayers, playerBets } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { requireHost } from '@/lib/session'

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const auth = await requireHost()
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: 403 })
  }

  const tournamentId = parseInt(params.id)

  // Check tournament exists
  const tournament = await db
    .select()
    .from(tournaments)
    .where(eq(tournaments.id, tournamentId))

  if (!tournament[0]) {
    return NextResponse.json({ error: 'Tournament not found' }, { status: 404 })
  }

  // Delete in order to respect foreign key constraints:
  // 1. Delete all player bets for this tournament
  await db.delete(playerBets).where(eq(playerBets.tournamentId, tournamentId))

  // 2. Delete all matches for this tournament
  await db.delete(matches).where(eq(matches.tournamentId, tournamentId))

  // 3. Delete all tournament players
  await db.delete(tournamentPlayers).where(eq(tournamentPlayers.tournamentId, tournamentId))

  // 4. Delete the tournament itself
  await db.delete(tournaments).where(eq(tournaments.id, tournamentId))

  return NextResponse.json({ success: true })
}
