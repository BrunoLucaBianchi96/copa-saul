import { NextResponse } from 'next/server'
import { db } from '@/db'
import { tournaments, tournamentPlayers, players } from '@/db/schema'
import { requireHost } from '@/lib/session'

export async function POST(request: Request) {
  const auth = await requireHost()
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: 403 })
  }

  const { name, rounds } = await request.json()

  // Create tournament
  const result = await db
    .insert(tournaments)
    .values({ name, rounds })
    .returning({ id: tournaments.id })

  const tournamentId = result[0].id

  // Add all players to the tournament
  const allPlayers = await db.select().from(players)
  for (const player of allPlayers) {
    await db.insert(tournamentPlayers).values({
      tournamentId,
      playerId: player.id,
      points: 0,
    })
  }

  return NextResponse.json({ id: tournamentId })
}
