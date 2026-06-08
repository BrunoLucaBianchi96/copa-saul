import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { getManageableGames } from '@/lib/games-db'
import { getSession, isHost as checkIsHost } from '@/lib/session'
import { GamesGrid } from './games-grid'

export const dynamic = 'force-dynamic'

// Global game management — host only. Players view a tournament's roster at
// /tournaments/[id]/games instead.
export default async function GamesPage() {
  const t = await getTranslations('games')
  if (!checkIsHost(await getSession())) redirect('/')

  // Full roster (incl. inactive) so the host can edit any game.
  const games = await getManageableGames()

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

      <GamesGrid games={games} isHost />
    </main>
  )
}
