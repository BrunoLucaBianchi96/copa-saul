import { db } from '@/db'
import { tournaments, tournamentPlayers, players } from '@/db/schema'
import { eq, desc } from 'drizzle-orm'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { getSession, isHost as checkIsHost, getSessionPlayerId } from '@/lib/session'
import { getTranslations } from 'next-intl/server'
import { BetsForm } from '@/app/components/bets-form'
import { getActiveGames, getGamesForTournament } from '@/lib/games-db'
import { TOTAL_BET_POINTS } from '@/lib/scoring-constants'

export const dynamic = 'force-dynamic'

async function getTournament(id: number) {
  const result = await db.select().from(tournaments).where(eq(tournaments.id, id))
  return result[0] || null
}

async function getTournamentPlayers(tournamentId: number) {
  return db
    .select({
      playerId: tournamentPlayers.playerId,
      playerName: players.name,
    })
    .from(tournamentPlayers)
    .innerJoin(players, eq(tournamentPlayers.playerId, players.id))
    .where(eq(tournamentPlayers.tournamentId, tournamentId))
    .orderBy(desc(tournamentPlayers.points))
}

export default async function BetsPage({ params }: { params: { id: string } }) {
  const role = await getSession()
  if (!role) redirect('/')

  const id = parseInt(params.id)
  const tournament = await getTournament(id)
  if (!tournament) notFound()

  const isHost = checkIsHost(role)
  const sessionPlayerId = await getSessionPlayerId()
  const tournamentPlayersList = await getTournamentPlayers(id)

  const t = await getTranslations('bets')

  const isPending = tournament.status === 'pending'
  // Pre-start edits the global default bets (active roster); post-start shows
  // the frozen snapshot against the tournament's own roster.
  const games = isPending ? await getActiveGames() : await getGamesForTournament(id)

  return (
    <main className="container mx-auto px-2 py-4 sm:px-4 sm:py-8 max-w-4xl">
      <div className="mb-4 sm:mb-6">
        <Link href={`/tournaments/${id}`} className="text-darcula-blue hover:underline text-sm">
          &larr; {t('backToTournament')}
        </Link>
        <h1 className="text-3xl font-bold text-darcula-text-bright mt-2">{t('title')}</h1>
        <p className="text-darcula-text-muted mt-1">
          {t('allocatePoints', { total: TOTAL_BET_POINTS })}
        </p>
      </div>

      {isPending ? (
        /* Pre-start: edit global default bets via /api/bets */
        <BetsForm
          games={games}
          players={tournamentPlayersList}
          sessionPlayerId={sessionPlayerId}
          isHost={isHost}
        />
      ) : (
        /* Post-start: read-only view of the frozen snapshot */
        <BetsForm
          games={games}
          tournamentId={id}
          players={tournamentPlayersList}
          sessionPlayerId={sessionPlayerId}
          isHost={isHost}
          readOnly
        />
      )}
    </main>
  )
}
