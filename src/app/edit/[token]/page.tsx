import { db } from '@/db'
import { players, tournaments, tournamentPlayers } from '@/db/schema'
import { eq, isNull, and, or, lte } from 'drizzle-orm'
import { getTranslations } from 'next-intl/server'
import { EditProfileForm } from './edit-profile-form'
import { BetsForm } from '@/app/components/bets-form'
import { getGamesForTournament } from '@/lib/games-db'

export const dynamic = 'force-dynamic'

async function getPlayerByToken(token: string) {
  const result = await db
    .select()
    .from(players)
    .where(and(eq(players.editToken, token), isNull(players.deletedAt)))
  return result[0] ?? null
}

// The player's tournaments still open for betting: not yet started, or in their
// first round (matches the server-side edit window in /api/.../bets).
async function getEditableTournaments(playerId: number) {
  return db
    .select({ id: tournaments.id, name: tournaments.name })
    .from(tournamentPlayers)
    .innerJoin(tournaments, eq(tournamentPlayers.tournamentId, tournaments.id))
    .where(
      and(
        eq(tournamentPlayers.playerId, playerId),
        or(
          eq(tournaments.status, 'pending'),
          and(eq(tournaments.status, 'active'), lte(tournaments.currentRound, 1)),
        ),
      ),
    )
}

export default async function EditProfilePage({ params }: { params: { token: string } }) {
  const t = await getTranslations('editProfile')
  const player = await getPlayerByToken(params.token)

  if (!player) {
    return (
      <main className="container mx-auto px-4 py-8 max-w-md">
        <div className="bg-darcula-surface border border-darcula-border rounded-lg p-8 text-center">
          <h1 className="text-2xl font-bold text-darcula-text-bright mb-2">{t('notFound')}</h1>
          <p className="text-darcula-text-muted">{t('notFoundDescription')}</p>
        </div>
      </main>
    )
  }

  const editableTournaments = await getEditableTournaments(player.id)
  const tournamentGames = await Promise.all(
    editableTournaments.map((tournament) => getGamesForTournament(tournament.id))
  )

  return (
    <main className="container mx-auto px-4 py-8 max-w-lg">
      <h1 className="text-2xl font-bold text-darcula-text-bright mb-6 text-center">{t('title')}</h1>
      <EditProfileForm
        playerId={player.id}
        editToken={params.token}
        initialName={player.name}
        initialNickname={player.nickname || ''}
        initialAvatarUrl={player.avatarUrl}
        hasPassword={!!player.passwordHash}
      />

      {/* Bets are per-roster now, so the player sets them per open tournament. */}
      {editableTournaments.length === 0 ? (
        <p className="text-darcula-text-muted text-center mt-10">{t('noBetsTournaments')}</p>
      ) : (
        editableTournaments.map((tournament, idx) => (
          <section key={tournament.id} className="mt-10">
            <h2 className="text-xl font-bold text-darcula-text-bright mb-4 text-center">
              {t('betsForTournament', { name: tournament.name })}
            </h2>
            <BetsForm
              games={tournamentGames[idx]}
              tournamentId={tournament.id}
              players={[{ playerId: player.id, playerName: player.name }]}
              sessionPlayerId={player.id}
              isHost={false}
              editToken={params.token}
            />
          </section>
        ))
      )}
    </main>
  )
}
