import { db } from '@/db'
import { players } from '@/db/schema'
import { isNull } from 'drizzle-orm'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSession, isHost as checkIsHost, getSessionPlayerId } from '@/lib/session'
import { getTranslations } from 'next-intl/server'
import { BetsForm } from '@/app/components/bets-form'
import { TOTAL_BET_POINTS } from '@/lib/scoring-constants'

export const dynamic = 'force-dynamic'

async function getPlayers() {
  return db
    .select({
      playerId: players.id,
      playerName: players.name,
    })
    .from(players)
    .where(isNull(players.deletedAt))
}

export default async function BetsPage() {
  const role = await getSession()
  if (!role) redirect('/')

  const isHost = checkIsHost(role)
  const sessionPlayerId = await getSessionPlayerId()
  const playersList = await getPlayers()

  const t = await getTranslations('bets')

  return (
    <main className="container mx-auto px-2 py-4 sm:px-4 sm:py-8 max-w-4xl">
      <div className="mb-4 sm:mb-6">
        <Link href="/" className="text-darcula-blue hover:underline text-sm">
          &larr; {t('backToHome')}
        </Link>
        <h1 className="text-3xl font-bold text-darcula-text-bright mt-2">{t('myBetsTitle')}</h1>
        <p className="text-darcula-text-muted mt-1">
          {t('allocatePoints', { total: TOTAL_BET_POINTS })}
        </p>
      </div>

      <BetsForm
        players={playersList}
        sessionPlayerId={sessionPlayerId}
        isHost={isHost}
      />
    </main>
  )
}
