import { db } from '@/db'
import { tournaments, tournamentPlayers, players } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/session'
import { getTranslations } from 'next-intl/server'
import { PlayerCard } from '@/app/components/player-card'

export const dynamic = 'force-dynamic'

async function getTournament(id: number) {
  const result = await db.select().from(tournaments).where(eq(tournaments.id, id))
  return result[0] || null
}

async function getRosterPlayers(tournamentId: number) {
  return db
    .select({
      playerId: tournamentPlayers.playerId,
      playerName: players.name,
      playerNickname: players.nickname,
      playerAvatar: players.avatarUrl,
    })
    .from(tournamentPlayers)
    .innerJoin(players, eq(tournamentPlayers.playerId, players.id))
    .where(eq(tournamentPlayers.tournamentId, tournamentId))
}

// Format name with nickname: FirstName "Nickname" LastName
function formatDisplayName(name: string, nickname: string | null): string {
  if (!nickname) return name
  const parts = name.split(' ')
  if (parts.length === 1) {
    return `${name} "${nickname}"`
  }
  const firstName = parts[0]
  const lastName = parts.slice(1).join(' ')
  return `${firstName} "${nickname}" ${lastName}`
}

const GRADIENT_COLORS = [
  'from-darcula-blue to-darcula-purple',
  'from-darcula-orange to-darcula-red',
  'from-emerald-500 to-teal-700',
  'from-amber-500 to-orange-700',
  'from-pink-500 to-rose-700',
  'from-cyan-500 to-blue-700',
  'from-violet-500 to-indigo-700',
  'from-lime-500 to-green-700',
]

export default async function RosterPage({ params }: { params: { id: string } }) {
  const role = await getSession()

  if (!role) {
    redirect('/')
  }

  const id = parseInt(params.id)
  const tournament = await getTournament(id)

  if (!tournament) {
    notFound()
  }

  const rosterPlayers = await getRosterPlayers(id)
  const t = await getTranslations('roster')

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
          {t('roster')}
        </h1>
        <p className="text-darcula-text-muted">
          {tournament.name} &bull; {rosterPlayers.length} {t('participants')}
        </p>
      </div>

      {rosterPlayers.length === 0 ? (
        <p className="text-darcula-text-muted">{t('noPlayers')}</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {rosterPlayers.map((p, i) => (
            <div key={p.playerId} className="flex justify-center transition-transform duration-200 hover:scale-[1.2] hover:z-10">
              <PlayerCard
                name={formatDisplayName(p.playerName, p.playerNickname)}
                avatar={p.playerAvatar}
                gradientColors={GRADIENT_COLORS[i % GRADIENT_COLORS.length]}
                className="w-44 h-60 sm:w-48 sm:h-64"
                nameClassName="text-base"
                initialsClassName="text-4xl"
              />
            </div>
          ))}
        </div>
      )}
    </main>
  )
}
