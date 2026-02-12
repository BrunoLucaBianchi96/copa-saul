import { NextResponse } from 'next/server'
import { db } from '@/db'
import { matches } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { getSession } from '@/lib/session'

export async function GET(
  request: Request,
  { params }: { params: { id: string; matchId: string } }
) {
  const role = await getSession()
  if (!role) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const matchId = parseInt(params.matchId)
  const tournamentId = parseInt(params.id)

  const match = await db.select().from(matches).where(eq(matches.id, matchId))

  if (!match[0] || match[0].tournamentId !== tournamentId) {
    return NextResponse.json({ error: 'Match not found' }, { status: 404 })
  }

  return NextResponse.json({
    pickBanHistory: match[0].pickBanHistory ? JSON.parse(match[0].pickBanHistory) : [],
    selectedGame: match[0].selectedGame,
    result: match[0].result,
    pointsAwarded: match[0].pointsAwarded,
  })
}
