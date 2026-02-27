import { NextResponse } from 'next/server'
import { db } from '@/db'
import { tournaments, tournamentPlayers } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { requireHost } from '@/lib/session'

export async function POST(
  request: Request,
  { params }: { params: { id: string; playerId: string } }
) {
  const auth = await requireHost()
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: 403 })
  }

  const tournamentId = parseInt(params.id)
  const playerId = parseInt(params.playerId)

  // Validate tournament is active or overtime
  const tournament = await db
    .select()
    .from(tournaments)
    .where(eq(tournaments.id, tournamentId))

  if (!tournament[0] || !['active', 'overtime'].includes(tournament[0].status)) {
    return NextResponse.json(
      { error: 'Tournament not found or not active' },
      { status: 400 }
    )
  }

  // Find the tournament player row
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

  // Toggle retired
  const newRetired = !tp[0].retired
  await db
    .update(tournamentPlayers)
    .set({ retired: newRetired })
    .where(eq(tournamentPlayers.id, tp[0].id))

  return NextResponse.json({ success: true, retired: newRetired })
}
