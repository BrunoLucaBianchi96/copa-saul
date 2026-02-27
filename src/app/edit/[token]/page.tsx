import { db } from '@/db'
import { players } from '@/db/schema'
import { eq, isNull, and } from 'drizzle-orm'
import { getTranslations } from 'next-intl/server'
import { EditProfileForm } from './edit-profile-form'
import { BetsForm } from '@/app/components/bets-form'

export const dynamic = 'force-dynamic'

async function getPlayerByToken(token: string) {
  const result = await db
    .select()
    .from(players)
    .where(and(eq(players.editToken, token), isNull(players.deletedAt)))
  return result[0] ?? null
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

  const tBets = await getTranslations('bets')

  return (
    <main className="container mx-auto px-4 py-8 max-w-lg">
      <h1 className="text-2xl font-bold text-darcula-text-bright mb-6 text-center">{t('title')}</h1>
      <EditProfileForm
        playerId={player.id}
        editToken={params.token}
        initialName={player.name}
        initialNickname={player.nickname || ''}
        initialAvatarUrl={player.avatarUrl}
      />

      <h2 className="text-xl font-bold text-darcula-text-bright mt-10 mb-4 text-center">{tBets('myBetsNav')}</h2>
      <BetsForm
        players={[{ playerId: player.id, playerName: player.name }]}
        sessionPlayerId={player.id}
        isHost={false}
        editToken={params.token}
      />
    </main>
  )
}
