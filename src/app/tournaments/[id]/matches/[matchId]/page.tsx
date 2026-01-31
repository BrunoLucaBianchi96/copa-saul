import { db } from '@/db'
import { matches, players, tournaments } from '@/db/schema'
import { eq, and, asc, isNotNull } from 'drizzle-orm'
import { notFound, redirect } from 'next/navigation'
import { getSession, isHost as checkIsHost } from '@/lib/session'
import { PickBan } from '@/app/components/pick-ban'
import { type PickBanAction } from '@/lib/games'
import { getThemeById, THEMES } from '@/lib/themes'

export const dynamic = 'force-dynamic'

async function getMatch(matchId: number) {
  const result = await db.select().from(matches).where(eq(matches.id, matchId))
  return result[0] || null
}

async function getTournament(tournamentId: number) {
  const result = await db.select().from(tournaments).where(eq(tournaments.id, tournamentId))
  return result[0] || null
}

async function getPlayer(playerId: number) {
  const result = await db.select().from(players).where(eq(players.id, playerId))
  return result[0] || null
}

async function getGamePlayCounts(tournamentId: number) {
  const matchesWithGames = await db
    .select({ selectedGame: matches.selectedGame })
    .from(matches)
    .where(
      and(
        eq(matches.tournamentId, tournamentId),
        isNotNull(matches.selectedGame)
      )
    )

  const counts: Record<string, number> = {}
  for (const match of matchesWithGames) {
    if (match.selectedGame) {
      counts[match.selectedGame] = (counts[match.selectedGame] || 0) + 1
    }
  }
  return counts
}

async function getAdjacentMatches(tournamentId: number, round: number, currentMatchId: number) {
  // Get all non-bye matches in this round, ordered by ID
  const roundMatches = await db
    .select({ id: matches.id })
    .from(matches)
    .where(and(eq(matches.tournamentId, tournamentId), eq(matches.round, round)))
    .orderBy(asc(matches.id))

  // Filter out bye matches (player2Id is null) - we need full match data for this
  const fullMatches = await db
    .select()
    .from(matches)
    .where(and(eq(matches.tournamentId, tournamentId), eq(matches.round, round)))
    .orderBy(asc(matches.id))

  const nonByeMatches = fullMatches.filter((m) => m.player2Id !== null)
  const currentIndex = nonByeMatches.findIndex((m) => m.id === currentMatchId)

  return {
    prevMatchId: currentIndex > 0 ? nonByeMatches[currentIndex - 1].id : null,
    nextMatchId: currentIndex < nonByeMatches.length - 1 ? nonByeMatches[currentIndex + 1].id : null,
  }
}

export default async function MatchPage({
  params,
}: {
  params: { id: string; matchId: string }
}) {
  const role = await getSession()

  if (!role) {
    redirect('/')
  }

  const tournamentId = parseInt(params.id)
  const matchId = parseInt(params.matchId)

  const match = await getMatch(matchId)

  if (!match || match.tournamentId !== tournamentId) {
    notFound()
  }

  const tournament = await getTournament(tournamentId)

  if (!tournament) {
    notFound()
  }

  const player1 = await getPlayer(match.player1Id)
  const player2 = match.player2Id ? await getPlayer(match.player2Id) : null

  if (!player1) {
    notFound()
  }

  // Parse pick-ban history
  const pickBanHistory: PickBanAction[] = match.pickBanHistory
    ? JSON.parse(match.pickBanHistory)
    : []

  const isHost = checkIsHost(role)

  // If it's a bye match, redirect back
  if (!player2) {
    redirect(`/tournaments/${tournamentId}`)
  }

  // Get theme for this match (fallback to first theme if not set)
  const theme = match.backgroundMusicId
    ? getThemeById(match.backgroundMusicId) || THEMES[0]
    : THEMES[0]

  // Get adjacent matches for navigation
  const { prevMatchId, nextMatchId } = await getAdjacentMatches(tournamentId, match.round, matchId)

  // Get game play counts for radar chart
  const gamePlayCounts = await getGamePlayCounts(tournamentId)

  // Format name with nickname: "FirstName 'Nickname' LastName"
  function formatDisplayName(name: string, nickname: string | null): string {
    if (!nickname) return name
    const parts = name.split(' ')
    if (parts.length === 1) {
      return `${name} '${nickname}'`
    }
    const firstName = parts[0]
    const lastName = parts.slice(1).join(' ')
    return `${firstName} '${nickname}' ${lastName}`
  }

  return (
    <PickBan
      player1Name={formatDisplayName(player1.name, player1.nickname)}
      player2Name={formatDisplayName(player2.name, player2.nickname)}
      player1Avatar={player1.avatarUrl}
      player2Avatar={player2.avatarUrl}
      matchId={matchId}
      tournamentId={tournamentId}
      initialActions={pickBanHistory}
      initialSelectedGame={match.selectedGame || undefined}
      isHost={isHost}
      matchResult={match.result}
      roundNumber={match.round}
      theme={theme}
      prevMatchId={prevMatchId}
      nextMatchId={nextMatchId}
      gamePlayCounts={gamePlayCounts}
    />
  )
}
