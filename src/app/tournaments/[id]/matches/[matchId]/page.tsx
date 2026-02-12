import { db } from '@/db'
import { matches, players, tournaments } from '@/db/schema'
import { eq, and, asc } from 'drizzle-orm'
import { notFound, redirect } from 'next/navigation'
import { getSession, isHost as checkIsHost, getSessionPlayerId } from '@/lib/session'
import { PickBan } from '@/app/components/pick-ban'
import { type PickBanAction } from '@/lib/games'
import { getThemeById, THEMES } from '@/lib/themes'
import { getPlayerBets } from '@/lib/scoring'

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

function betsToRecord(bets: { gameId: string; bet: number }[]): Record<string, number> {
  const record: Record<string, number> = {}
  for (const b of bets) {
    record[b.gameId] = b.bet
  }
  return record
}

async function getNonByeMatchesInRound(tournamentId: number, round: number) {
  const roundMatches = await db
    .select()
    .from(matches)
    .where(and(eq(matches.tournamentId, tournamentId), eq(matches.round, round)))
    .orderBy(asc(matches.id))
  return roundMatches.filter((m) => m.player2Id !== null)
}

async function getAdjacentMatches(tournamentId: number, round: number, currentMatchId: number) {
  const nonByeMatches = await getNonByeMatchesInRound(tournamentId, round)
  const currentIndex = nonByeMatches.findIndex((m) => m.id === currentMatchId)

  // Within the same round
  let prevMatch = currentIndex > 0 ? nonByeMatches[currentIndex - 1] : null
  let nextMatch = currentIndex < nonByeMatches.length - 1 ? nonByeMatches[currentIndex + 1] : null

  // Cross round boundaries: go to last match of previous round
  if (!prevMatch && round > 1) {
    const prevRoundMatches = await getNonByeMatchesInRound(tournamentId, round - 1)
    prevMatch = prevRoundMatches.length > 0 ? prevRoundMatches[prevRoundMatches.length - 1] : null
  }

  // Cross round boundaries: go to first match of next round (if matches exist)
  if (!nextMatch) {
    const nextRoundMatches = await getNonByeMatchesInRound(tournamentId, round + 1)
    nextMatch = nextRoundMatches.length > 0 ? nextRoundMatches[0] : null
  }

  const prevTheme = prevMatch?.backgroundMusicId ? getThemeById(prevMatch.backgroundMusicId) : undefined
  const nextTheme = nextMatch?.backgroundMusicId ? getThemeById(nextMatch.backgroundMusicId) : undefined

  return {
    prevMatchId: prevMatch?.id ?? null,
    nextMatchId: nextMatch?.id ?? null,
    prevMatchAudioFile: prevTheme?.audioFile ?? null,
    nextMatchAudioFile: nextTheme?.audioFile ?? null,
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
  const sessionPlayerId = await getSessionPlayerId()

  // If it's a bye match, redirect back
  if (!player2) {
    redirect(`/tournaments/${tournamentId}`)
  }

  // Get theme for this match (fallback to first theme if not set)
  const theme = match.backgroundMusicId
    ? getThemeById(match.backgroundMusicId) || THEMES[0]
    : THEMES[0]

  // Get adjacent matches for navigation
  const { prevMatchId, nextMatchId, prevMatchAudioFile, nextMatchAudioFile } = await getAdjacentMatches(tournamentId, match.round, matchId)

  // Check if round can be advanced (all matches complete, on current round, not past total rounds or in overtime)
  const allRoundMatches = await getNonByeMatchesInRound(tournamentId, match.round)
  const allMatchesComplete = allRoundMatches.every((m) => m.result !== 'pending')
  const isOnCurrentRound = match.round === tournament.currentRound
  const canAdvanceRound = isHost && isOnCurrentRound && allMatchesComplete && nextMatchId === null
    && (tournament.status === 'overtime' || tournament.currentRound < tournament.rounds)

  // Get player bets for radar chart overlay
  const [p1Bets, p2Bets] = await Promise.all([
    getPlayerBets(tournamentId, player1.id),
    getPlayerBets(tournamentId, player2.id),
  ])
  const player1Bets = betsToRecord(p1Bets)
  const player2Bets = betsToRecord(p2Bets)

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
      player1Id={player1.id}
      player2Id={player2.id}
      initialActions={pickBanHistory}
      initialSelectedGame={match.selectedGame || undefined}
      isHost={isHost}
      matchResult={match.result}
      roundNumber={match.round}
      theme={theme}
      prevMatchId={prevMatchId}
      nextMatchId={nextMatchId}
      prevMatchAudioFile={prevMatchAudioFile}
      nextMatchAudioFile={nextMatchAudioFile}
      canAdvanceRound={canAdvanceRound}
      player1Bets={player1Bets}
      player2Bets={player2Bets}
      sessionPlayerId={sessionPlayerId}
    />
  )
}
