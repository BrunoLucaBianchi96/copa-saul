import { NextResponse } from 'next/server'
import { db } from '@/db'
import { tournaments } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { requireHost } from '@/lib/session'

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const auth = await requireHost()
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: 403 })
  }

  const tournamentId = parseInt(params.id)

  const tournament = await db
    .select()
    .from(tournaments)
    .where(eq(tournaments.id, tournamentId))

  if (!tournament[0] || tournament[0].status !== 'active') {
    return NextResponse.json({ error: 'Tournament not found or not in active status' }, { status: 400 })
  }

  const newRounds = tournament[0].rounds + 1

  await db
    .update(tournaments)
    .set({ rounds: newRounds })
    .where(eq(tournaments.id, tournamentId))

  return NextResponse.json({ success: true, rounds: newRounds })
}
