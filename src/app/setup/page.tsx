import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/session'
import { getTranslations } from 'next-intl/server'
import { GAMES } from '@/lib/games'
import { SetupForm } from './setup-form'

export const dynamic = 'force-dynamic'

export default async function SetupPage() {
  const role = await getSession()
  if (!role) redirect('/')

  const t = await getTranslations('setup')
  const launchableGames = GAMES.filter(g => g.launchable)

  return (
    <main className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6">
        <Link
          href="/"
          className="text-darcula-blue hover:underline text-sm"
        >
          &larr; {t('backToHome')}
        </Link>
        <h1 className="text-3xl font-bold text-darcula-text-bright mt-2">
          {t('title')}
        </h1>
        <p className="text-darcula-text-muted">
          {t('subtitle', { count: launchableGames.length })}
        </p>
      </div>

      <SetupForm games={launchableGames} />
    </main>
  )
}
