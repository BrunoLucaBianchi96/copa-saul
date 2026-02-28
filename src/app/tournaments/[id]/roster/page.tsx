import { db } from '@/db'
import { tournaments, tournamentPlayers, players } from '@/db/schema'
import { eq, and, notInArray, isNull } from 'drizzle-orm'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { getSession, isHost as checkIsHost } from '@/lib/session'
import { getTranslations } from 'next-intl/server'
import { RosterGrid } from '@/app/components/roster-grid'

export const dynamic = 'force-dynamic'

async function getTournament(id: number) {
  const result = await db.select().from(tournaments).where(eq(tournaments.id, id))
  return result[0] || null
}

async function getRosterPlayers(tournamentId: number) {
  return db
    .select({
      id: players.id,
      name: players.name,
      nickname: players.nickname,
      avatarUrl: players.avatarUrl,
      editToken: players.editToken,
      passwordHash: players.passwordHash,
      createdAt: players.createdAt,
      deletedAt: players.deletedAt,
      retired: tournamentPlayers.retired,
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
  const isHost = checkIsHost(role)
  const t = await getTranslations('roster')

  // Query available players for late-join (host only, active tournament)
  let availablePlayers: { id: number; name: string; avatarUrl: string | null }[] = []
  if (isHost && tournament.status === 'active') {
    const rosterPlayerIds = rosterPlayers.map((p) => p.id)
    const conditions = [isNull(players.deletedAt)]
    if (rosterPlayerIds.length > 0) {
      conditions.push(notInArray(players.id, rosterPlayerIds))
    }
    availablePlayers = await db
      .select({ id: players.id, name: players.name, avatarUrl: players.avatarUrl })
      .from(players)
      .where(and(...conditions))
  }

  const playersWithMeta = rosterPlayers.map((p, i) => ({
    player: p,
    displayName: formatDisplayName(p.name, p.nickname),
    gradientColors: GRADIENT_COLORS[i % GRADIENT_COLORS.length],
    retired: p.retired,
  }))

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
        <RosterGrid
          players={playersWithMeta}
          isHost={isHost}
          tournamentId={id}
          tournamentStatus={tournament.status}
          availablePlayers={availablePlayers}
        />
      )}
    </main>
  )
}
