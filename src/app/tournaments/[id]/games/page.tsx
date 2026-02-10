import { db } from '@/db'
import { tournaments } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/session'
import { getTranslations } from 'next-intl/server'
import { GAMES } from '@/lib/games'
import { GamesGrid } from './games-grid'

export const dynamic = 'force-dynamic'

async function getTournament(id: number) {
  const result = await db.select().from(tournaments).where(eq(tournaments.id, id))
  return result[0] || null
}

export default async function GamesPage({ params }: { params: { id: string } }) {
  const role = await getSession()

  if (!role) {
    redirect('/')
  }

  const id = parseInt(params.id)
  const tournament = await getTournament(id)

  if (!tournament) {
    notFound()
  }

  const t = await getTranslations('games')

  return (
    <main className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6">
        <Link
          href={`/tournaments/${id}`}
          className="text-darcula-blue hover:underline text-sm"
        >
          &larr; {t('backToTournament')}
        </Link>
        <h1 className="text-3xl font-bold text-darcula-text-bright mt-2">
          {t('games')}
        </h1>
        <p className="text-darcula-text-muted">
          {tournament.name} &bull; {GAMES.length} {t('gameCount')}
        </p>
      </div>

      {GAMES.length === 0 ? (
        <p className="text-darcula-text-muted">{t('noGames')}</p>
      ) : (
        <GamesGrid games={GAMES} />
      )}
    </main>
  )
}
