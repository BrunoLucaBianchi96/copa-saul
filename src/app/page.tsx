import Link from 'next/link'
import { db } from '@/db'
import { tournaments, players } from '@/db/schema'
import { desc, eq, isNull } from 'drizzle-orm'
import { getSession, getSessionPlayerId, isHost } from '@/lib/session'
import { getTranslations } from 'next-intl/server'
import { LoginForm } from './components/login-form'
import { LogoutButton } from './components/logout-button'
import { TournamentItem } from './components/tournament-item'
import { PlayersSection } from './components/players-section'
import { RulesInfoButton } from './components/rules-info-button'

export const dynamic = 'force-dynamic'

async function getTournaments() {
  return db.select().from(tournaments).orderBy(desc(tournaments.createdAt))
}

async function getPlayers() {
  return db.select().from(players).where(isNull(players.deletedAt))
}

async function getPlayerName(playerId: number): Promise<string | null> {
  const result = await db.select({ name: players.name }).from(players).where(eq(players.id, playerId))
  return result[0]?.name ?? null
}

export default async function Home() {
  const role = await getSession()
  const t = await getTranslations('home')
  const tCommon = await getTranslations('common')

  const allPlayers = await getPlayers()

  if (!role) {
    return (
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-4xl font-bold text-center mb-8 text-darcula-text-bright">{t('appTitle')}</h1>
        <LoginForm players={allPlayers.map(p => ({ id: p.id, name: p.name, avatarUrl: p.avatarUrl }))} />
      </main>
    )
  }

  const allTournaments = await getTournaments()

  // Get logged-in player name for header
  const sessionPlayerId = await getSessionPlayerId()
  const playerName = sessionPlayerId ? await getPlayerName(sessionPlayerId) : null

  return (
    <main className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold text-darcula-text-bright">{t('appTitle')}</h1>
        <div className="flex items-center gap-4">
          {!isHost(role) && <RulesInfoButton />}
          <Link
            href="/bets"
            className="text-sm px-3 py-1 rounded bg-darcula-elevated text-darcula-text hover:bg-darcula-border transition"
          >
            {t('myBets')}
          </Link>
          <span className={`text-sm px-3 py-1 rounded ${isHost(role) ? 'bg-darcula-blue/20 text-darcula-blue' : 'bg-darcula-elevated text-darcula-text'}`}>
            {isHost(role) ? tCommon('host') : playerName || tCommon('player')}
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

        <PlayersSection players={allPlayers} isHost={isHost(role)} />
      </div>
    </main>
  )
}
