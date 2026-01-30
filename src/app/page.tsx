import Link from 'next/link'
import { db } from '@/db'
import { tournaments, players } from '@/db/schema'
import { desc } from 'drizzle-orm'
import { getSession, isHost } from '@/lib/session'
import { getTranslations } from 'next-intl/server'
import { LoginForm } from './components/login-form'
import { LogoutButton } from './components/logout-button'
import { Avatar } from './components/avatar'
import { TournamentItem } from './components/tournament-item'

export const dynamic = 'force-dynamic'

async function getTournaments() {
  return db.select().from(tournaments).orderBy(desc(tournaments.createdAt))
}

async function getPlayers() {
  return db.select().from(players)
}

export default async function Home() {
  const role = await getSession()
  const t = await getTranslations('home')
  const tCommon = await getTranslations('common')

  if (!role) {
    return (
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-4xl font-bold text-center mb-8 text-darcula-text-bright">{t('appTitle')}</h1>
        <LoginForm />
      </main>
    )
  }

  const [allTournaments, allPlayers] = await Promise.all([getTournaments(), getPlayers()])

  return (
    <main className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold text-darcula-text-bright">{t('appTitle')}</h1>
        <div className="flex items-center gap-4">
          <span className={`text-sm px-3 py-1 rounded ${isHost(role) ? 'bg-darcula-blue/20 text-darcula-blue' : 'bg-darcula-elevated text-darcula-text'}`}>
            {isHost(role) ? tCommon('host') : tCommon('player')}
          </span>
          <LogoutButton />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <section className="bg-darcula-surface rounded-lg shadow-lg border border-darcula-border p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-semibold text-darcula-text">{t('tournaments')}</h2>
            {isHost(role) && (
              <Link
                href="/tournaments/new"
                className="bg-darcula-blue text-darcula-bg w-8 h-8 rounded hover:bg-darcula-blue/80 transition flex items-center justify-center"
                title={t('newTournament')}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </Link>
            )}
          </div>

          {allTournaments.length === 0 ? (
            <p className="text-darcula-text-muted">{t('noTournaments')}</p>
          ) : (
            <ul className="space-y-3">
              {allTournaments.map((tournament) => (
                <li key={tournament.id}>
                  <TournamentItem tournament={tournament} isHost={isHost(role)} />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="bg-darcula-surface rounded-lg shadow-lg border border-darcula-border p-6">
          <h2 className="text-2xl font-semibold text-darcula-text mb-4">{tCommon('players')} ({allPlayers.length})</h2>
          <ul className="space-y-2">
            {allPlayers.map((p) => (
              <li key={p.id} className="p-2 bg-darcula-elevated rounded text-darcula-text flex items-center gap-3 border border-darcula-border">
                <Avatar src={p.avatarUrl} name={p.name} size="sm" />
                <span>{p.name}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  )
}
