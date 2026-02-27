import { getTranslations } from 'next-intl/server'
import { GAMES } from '@/lib/games'
import { GamesGrid } from './games-grid'

export default async function GamesPage() {
  const t = await getTranslations('games')

  return (
    <main className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-darcula-text-bright mt-2">
          {t('games')}
        </h1>
        <p className="text-darcula-text-muted">
          {GAMES.length} {t('gameCount')}
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
