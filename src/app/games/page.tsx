import { getTranslations } from 'next-intl/server'
import { getActiveGames, getManageableGames } from '@/lib/games-db'
import { getSession, isHost as checkIsHost } from '@/lib/session'
import { GamesGrid } from './games-grid'

export const dynamic = 'force-dynamic'

export default async function GamesPage() {
  const t = await getTranslations('games')
  const role = await getSession()
  const isHost = checkIsHost(role)

  // Hosts see the full roster (incl. inactive) so they can edit any game;
  // everyone else sees only active games.
  const games = isHost ? await getManageableGames() : await getActiveGames()

  return (
    <main className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-darcula-text-bright mt-2">
          {t('games')}
        </h1>
        <p className="text-darcula-text-muted">
          {games.length} {t('gameCount')}
        </p>
      </div>

      {games.length === 0 && !isHost ? (
        <p className="text-darcula-text-muted">{t('noGames')}</p>
      ) : (
        <GamesGrid games={games} isHost={isHost} />
      )}
    </main>
  )
}
