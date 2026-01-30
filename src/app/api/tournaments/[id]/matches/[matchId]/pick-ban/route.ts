import { NextResponse } from 'next/server'
import { db } from '@/db'
import { matches } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { requireHost } from '@/lib/session'
import { type PickBanAction } from '@/lib/games'

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
  const body = await request.json()

  // Get the match
  const match = await db.select().from(matches).where(eq(matches.id, matchId))

  if (!match[0] || match[0].tournamentId !== tournamentId) {
    return NextResponse.json({ error: 'Match not found' }, { status: 404 })
  }

  if (match[0].result !== 'pending') {
    return NextResponse.json({ error: 'Match already completed' }, { status: 400 })
  }

  // Parse existing history
  const existingHistory: PickBanAction[] = match[0].pickBanHistory
    ? JSON.parse(match[0].pickBanHistory)
    : []

  // Handle action or game selection
  if (body.action) {
    const newAction: PickBanAction = body.action
    const updatedHistory = [...existingHistory, newAction]

    await db
      .update(matches)
      .set({ pickBanHistory: JSON.stringify(updatedHistory) })
      .where(eq(matches.id, matchId))

    return NextResponse.json({ success: true, history: updatedHistory })
  }

  if (body.selectGame) {
    await db
      .update(matches)
      .set({
        selectedGame: body.selectGame,
        pickBanComplete: true,
      })
      .where(eq(matches.id, matchId))

    return NextResponse.json({ success: true, selectedGame: body.selectGame })
  }

  return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
}
