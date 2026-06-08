import { db } from '@/db'
import { tournaments, tournamentPlayers, players } from '@/db/schema'
import { eq, desc, and, isNull } from 'drizzle-orm'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { getSession, isHost as checkIsHost, getSessionPlayerId } from '@/lib/session'
import { getTranslations } from 'next-intl/server'
import { BetsForm } from '@/app/components/bets-form'
import { getGamesForTournament } from '@/lib/games-db'
import { betBudget } from '@/lib/scoring-constants'

export const dynamic = 'force-dynamic'

async function getTournament(id: number) {
  const result = await db.select().from(tournaments).where(eq(tournaments.id, id))
  return result[0] || null
}

// Resolve a player by edit token (lets token-only players edit without a session).
async function getPlayerByToken(token: string) {
  const rows = await db
    .select({ id: players.id })
    .from(players)
    .where(and(eq(players.editToken, token), isNull(players.deletedAt)))
  return rows[0] ?? null
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

export default async function BetsPage({
  params,
  searchParams,
}: {
  params: { id: string }
  searchParams: { editToken?: string }
}) {
  const editToken = searchParams.editToken
  // A valid edit token lets a token-only player in (no session required).
  const tokenPlayer = editToken ? await getPlayerByToken(editToken) : null

  const role = await getSession()
  if (!role && !tokenPlayer) redirect('/')

  const id = parseInt(params.id)
  const tournament = await getTournament(id)
  if (!tournament) notFound()

  const isHost = role ? checkIsHost(role) : false
  const sessionPlayerId = tokenPlayer ? tokenPlayer.id : await getSessionPlayerId()
  const tournamentPlayersList = await getTournamentPlayers(id)

  const t = await getTranslations('bets')

  const isPending = tournament.status === 'pending'
  // Bets are always scoped to the tournament's own roster (set at creation), so
  // pre- and post-start use the same game set.
  const games = await getGamesForTournament(id)

  return (
    <main className="container mx-auto px-2 py-4 sm:px-4 sm:py-8 max-w-4xl">
      <div className="mb-4 sm:mb-6">
        <Link href={`/tournaments/${id}`} className="text-darcula-blue hover:underline text-sm">
          &larr; {t('backToTournament')}
        </Link>
        <h1 className="text-3xl font-bold text-darcula-text-bright mt-2">{t('title')}</h1>
        <p className="text-darcula-text-muted mt-1">
          {t('allocatePoints', { total: betBudget(games.length) })}
        </p>
      </div>

      {isPending ? (
        /* Pre-start: edit the shared per-roster bets for this tournament */
        <BetsForm
          games={games}
          tournamentId={id}
          players={tournamentPlayersList}
          sessionPlayerId={sessionPlayerId}
          isHost={isHost}
          editToken={editToken}
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
