import Link from 'next/link'
import { db } from '@/db'
import { players } from '@/db/schema'
import { eq, isNull } from 'drizzle-orm'
import { redirect } from 'next/navigation'
import { getSession, isHost } from '@/lib/session'
import { getTranslations } from 'next-intl/server'
import { generateEditToken } from '@/lib/edit-token'
import { headers } from 'next/headers'
import { Avatar } from '@/app/components/avatar'
import { CopyButton } from './copy-button'

export const dynamic = 'force-dynamic'

export default async function PlayerLinksPage() {
  const role = await getSession()
  if (!role || !isHost(role)) {
    redirect('/')
  }

  const t = await getTranslations('playerLinks')
  const tCommon = await getTranslations('common')

  // Get all active players
  const allPlayers = await db
    .select()
    .from(players)
    .where(isNull(players.deletedAt))

  // Backfill tokens for players that don't have one
  for (const player of allPlayers) {
    if (!player.editToken) {
      const token = generateEditToken()
      await db.update(players).set({ editToken: token }).where(eq(players.id, player.id))
      player.editToken = token
    }
  }

  // Get the base URL from headers
  const headersList = await headers()
  const host = headersList.get('host') || 'localhost:3000'
  const protocol = headersList.get('x-forwarded-proto') || 'http'
  const baseUrl = `${protocol}://${host}`

  return (
    <main className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="flex items-center gap-4 mb-6">
        <Link
          href="/"
          className="text-darcula-text-muted hover:text-darcula-text transition"
        >
          &larr; {tCommon('back')}
        </Link>
        <h1 className="text-2xl font-bold text-darcula-text-bright">{t('title')}</h1>
      </div>

      <p className="text-darcula-text-muted mb-6">{t('description')}</p>

      <div className="space-y-3">
        {allPlayers.map((player) => {
          const editUrl = `${baseUrl}/edit/${player.editToken}`
          return (
            <div
              key={player.id}
              className="bg-darcula-surface border border-darcula-border rounded-lg p-4 flex items-center gap-4"
            >
              <Avatar src={player.avatarUrl} name={player.name} size="md" />
              <div className="flex-1 min-w-0">
                <p className="text-darcula-text-bright font-medium truncate">{player.name}</p>
                <p className="text-darcula-text-muted text-sm truncate font-mono">{editUrl}</p>
              </div>
              <CopyButton text={editUrl} label={t('copy')} copiedLabel={t('copied')} />
            </div>
          )
        })}

        {allPlayers.length === 0 && (
          <p className="text-darcula-text-muted text-center py-8">{t('noPlayers')}</p>
        )}
      </div>
    </main>
  )
}
