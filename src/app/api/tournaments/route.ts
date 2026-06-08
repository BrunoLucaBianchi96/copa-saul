import { NextResponse } from 'next/server'
import { db } from '@/db'
import { tournaments, tournamentPlayers, players } from '@/db/schema'
import { isNull } from 'drizzle-orm'
import { requireHost } from '@/lib/session'
import { getActiveGames, setTournamentGames } from '@/lib/games-db'

export async function POST(request: Request) {
  const auth = await requireHost()
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: 403 })
  }

  const { name, rounds, gameIds } = (await request.json()) as {
    name: string
    rounds: number
    gameIds?: string[]
  }

  // Create tournament
  const result = await db
    .insert(tournaments)
    .values({ name, rounds })
    .returning({ id: tournaments.id })

  const tournamentId = result[0].id

  // Add all active players to the tournament (exclude soft-deleted)
  const allPlayers = await db.select().from(players).where(isNull(players.deletedAt))
  for (const player of allPlayers) {
    await db.insert(tournamentPlayers).values({
      tournamentId,
      playerId: player.id,
      points: 0,
    })
  }

  // Select the tournament's game roster. Default to all active games; restrict
  // to the requested subset if one was provided (ignoring unknown ids).
  const activeIds = (await getActiveGames()).map((g) => g.id)
  const selected =
    Array.isArray(gameIds) && gameIds.length > 0
      ? activeIds.filter((id) => gameIds.includes(id))
      : activeIds
  await setTournamentGames(tournamentId, selected)

  return NextResponse.json({ id: tournamentId })
}
