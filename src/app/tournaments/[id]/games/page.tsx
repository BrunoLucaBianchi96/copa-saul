import { db } from '@/db'
import { tournaments } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { getGamesForTournament } from '@/lib/games-db'
import { GamesGrid } from '@/app/games/games-grid'

export const dynamic = 'force-dynamic'

// The current tournament's game roster, view-only. Players reach this from the
// nav; global add/edit lives on the host-only /games page.
export default async function TournamentGamesPage({ params }: { params: { id: string } }) {
  const t = await getTranslations('games')

  const id = parseInt(params.id)
  const tournament = (await db.select().from(tournaments).where(eq(tournaments.id, id)))[0]
  if (!tournament) notFound()

  const games = await getGamesForTournament(id)

  return (
    <main className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6">
        <Link href={`/tournaments/${id}`} className="text-darcula-blue hover:underline text-sm">
          &larr; {t('backToTournament')}
        </Link>
        <h1 className="text-3xl font-bold text-darcula-text-bright mt-2">
          {t('games')}
        </h1>
        <p className="text-darcula-text-muted">
          {games.length} {t('gameCount')}
        </p>
      </div>

      {games.length === 0 ? (
        <p className="text-darcula-text-muted">{t('noGames')}</p>
      ) : (
        <GamesGrid games={games} />
      )}
    </main>
  )
}
