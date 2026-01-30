import { db } from '@/db'
import { tournaments, tournamentPlayers, players, matches } from '@/db/schema'
import { eq, and, desc } from 'drizzle-orm'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { TournamentActions } from './actions'
import { MatchList } from './match-list'
import { RoundNavigation } from './round-navigation'
import { Leaderboard } from './leaderboard'
import { getSession, isHost as checkIsHost } from '@/lib/session'
import { getTranslations } from 'next-intl/server'

export const dynamic = 'force-dynamic'

async function getTournament(id: number) {
  const result = await db.select().from(tournaments).where(eq(tournaments.id, id))
  return result[0] || null
}

async function getStandings(tournamentId: number) {
  return db
    .select({
      playerId: tournamentPlayers.playerId,
      playerName: players.name,
      playerAvatar: players.avatarUrl,
      points: tournamentPlayers.points,
    })
    .from(tournamentPlayers)
    .innerJoin(players, eq(tournamentPlayers.playerId, players.id))
    .where(eq(tournamentPlayers.tournamentId, tournamentId))
    .orderBy(desc(tournamentPlayers.points))
}

async function getRoundMatches(tournamentId: number, round: number) {
  const result = await db
    .select({
      id: matches.id,
      round: matches.round,
      player1Id: matches.player1Id,
      player2Id: matches.player2Id,
      result: matches.result,
      selectedGame: matches.selectedGame,
      pickBanHistory: matches.pickBanHistory,
    })
    .from(matches)
    .where(and(eq(matches.tournamentId, tournamentId), eq(matches.round, round)))

  // Get player names
  const playerIds = new Set<number>()
  result.forEach((m) => {
    playerIds.add(m.player1Id)
    if (m.player2Id) playerIds.add(m.player2Id)
  })

  const allPlayers = await db.select().from(players)
  const playerMap = new Map(allPlayers.map((p) => [p.id, p.name]))

  return result.map((m) => ({
    ...m,
    player1Name: playerMap.get(m.player1Id) || 'Unknown',
    player2Name: m.player2Id ? playerMap.get(m.player2Id) || 'Unknown' : null,
    selectedGame: m.selectedGame,
    pickBanHistory: m.pickBanHistory,
  }))
}

export default async function TournamentPage({
  params,
  searchParams,
}: {
  params: { id: string }
  searchParams: { round?: string }
}) {
  const role = await getSession()

  if (!role) {
    redirect('/')
  }

  const id = parseInt(params.id)
  const tournament = await getTournament(id)

  if (!tournament) {
    notFound()
  }

  const standings = await getStandings(id)
  const isHost = checkIsHost(role)

  const t = await getTranslations('tournament')
  const tStatus = await getTranslations('status')

  // Determine which round to view
  const viewingRound = searchParams.round
    ? Math.min(Math.max(1, parseInt(searchParams.round)), tournament.currentRound)
    : tournament.currentRound

  const roundMatches =
    tournament.currentRound > 0 ? await getRoundMatches(id, viewingRound) : []

  // Check if all matches in the current round are complete (for advancing)
  const currentRoundMatches =
    tournament.currentRound > 0 ? await getRoundMatches(id, tournament.currentRound) : []
  const allMatchesComplete = currentRoundMatches.every((m) => m.result !== 'pending')

  return (
    <main className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex justify-between items-start mb-6">
        <div>
          <Link href="/" className="text-darcula-blue hover:underline text-sm">
            &larr; {t('backToHome')}
          </Link>
          <h1 className="text-3xl font-bold text-darcula-text-bright mt-2">{tournament.name}</h1>
          <p className="text-darcula-text-muted">
            {tournament.status === 'overtime'
              ? t('overtimeRound', { number: tournament.overtimeRound ?? 1 })
              : t('roundOf', { current: tournament.currentRound, total: tournament.rounds })}
            {' '}&bull;{' '}
            <span
              className={`${
                tournament.status === 'active'
                  ? 'text-darcula-green'
                  : tournament.status === 'overtime'
                    ? 'text-darcula-orange font-semibold'
                    : tournament.status === 'completed'
                      ? 'text-darcula-text-muted'
                      : 'text-darcula-orange'
              }`}
            >
              {tStatus(tournament.status)}
            </span>
          </p>
        </div>
        <TournamentActions tournament={tournament} isHost={isHost} players={standings} />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Leaderboard standings={standings} />

        <section className="bg-darcula-surface rounded-lg shadow-lg border border-darcula-border p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-darcula-text">
              {tournament.status === 'overtime' && viewingRound > tournament.rounds
                ? t('overtimeMatches', { number: viewingRound - tournament.rounds })
                : t('roundMatches', { number: viewingRound })}
            </h2>
            {tournament.currentRound > 0 && (
              <RoundNavigation
                tournamentId={id}
                viewingRound={viewingRound}
                currentRound={tournament.currentRound}
                totalRounds={tournament.rounds}
                isHost={isHost}
                allMatchesComplete={allMatchesComplete}
                isOvertime={tournament.status === 'overtime'}
                overtimeRound={tournament.overtimeRound ?? undefined}
              />
            )}
          </div>
          {tournament.currentRound === 0 ? (
            <p className="text-darcula-text-muted">{t('tournamentNotStarted')}</p>
          ) : (
            <MatchList matches={roundMatches} tournamentId={id} />
          )}
        </section>
      </div>
    </main>
  )
}
