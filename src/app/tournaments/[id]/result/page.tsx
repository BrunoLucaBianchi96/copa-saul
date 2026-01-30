import { db } from '@/db'
import { tournaments, tournamentPlayers, players, matches } from '@/db/schema'
import { eq, desc, and, isNotNull } from 'drizzle-orm'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { ResultDisplay } from './result-display'
import { GAMES } from '@/lib/games'

export const dynamic = 'force-dynamic'

async function getTournament(id: number) {
  const result = await db.select().from(tournaments).where(eq(tournaments.id, id))
  return result[0] || null
}

async function getStandings(tournamentId: number) {
  return db
    .select({
      playerId: tournamentPlayers.playerId,
      playerName: players.name,
      playerAvatar: players.avatarUrl,
      points: tournamentPlayers.points,
    })
    .from(tournamentPlayers)
    .innerJoin(players, eq(tournamentPlayers.playerId, players.id))
    .where(eq(tournamentPlayers.tournamentId, tournamentId))
    .orderBy(desc(tournamentPlayers.points))
}

async function getMatchStats(tournamentId: number, winnerId: number) {
  // Get all completed matches with a selected game
  const completedMatches = await db
    .select({
      selectedGame: matches.selectedGame,
      winnerId: matches.winnerId,
      result: matches.result,
    })
    .from(matches)
    .where(
      and(
        eq(matches.tournamentId, tournamentId),
        isNotNull(matches.selectedGame)
      )
    )

  // Count games played
  const gamePlayCounts = new Map<string, number>()
  const winnerGameWins = new Map<string, number>()

  for (const match of completedMatches) {
    if (!match.selectedGame) continue

    // Count total plays
    gamePlayCounts.set(
      match.selectedGame,
      (gamePlayCounts.get(match.selectedGame) || 0) + 1
    )

    // Count winner's wins in each game
    if (match.winnerId === winnerId) {
      winnerGameWins.set(
        match.selectedGame,
        (winnerGameWins.get(match.selectedGame) || 0) + 1
      )
    }
  }

  // Find most played game
  let mostPlayedGameId: string | null = null
  let mostPlayedCount = 0
  gamePlayCounts.forEach((count, gameId) => {
    if (count > mostPlayedCount) {
      mostPlayedCount = count
      mostPlayedGameId = gameId
    }
  })

  // Find least played game (only among games that were actually played)
  let leastPlayedGameId: string | null = null
  let leastPlayedCount = Infinity
  gamePlayCounts.forEach((count, gameId) => {
    if (count < leastPlayedCount) {
      leastPlayedCount = count
      leastPlayedGameId = gameId
    }
  })

  // Find winner's best game
  let winnerBestGameId: string | null = null
  let winnerBestCount = 0
  winnerGameWins.forEach((count, gameId) => {
    if (count > winnerBestCount) {
      winnerBestCount = count
      winnerBestGameId = gameId
    }
  })

  // Convert IDs to game names
  const getGameName = (id: string | null) => {
    if (!id) return null
    return GAMES.find((g) => g.id === id)?.name || id
  }

  return {
    mostPlayedGame: mostPlayedGameId ? {
      name: getGameName(mostPlayedGameId)!,
      count: mostPlayedCount,
    } : null,
    leastPlayedGame: leastPlayedGameId ? {
      name: getGameName(leastPlayedGameId)!,
      count: leastPlayedCount,
    } : null,
    winnerBestGame: winnerBestGameId ? {
      name: getGameName(winnerBestGameId)!,
      count: winnerBestCount,
    } : null,
    totalMatches: completedMatches.length,
  }
}

export default async function ResultPage({
  params,
}: {
  params: { id: string }
}) {
  const role = await getSession()

  if (!role) {
    redirect('/')
  }

  const id = parseInt(params.id)
  const tournament = await getTournament(id)

  if (!tournament) {
    redirect('/')
  }

  // If tournament is not completed, redirect to tournament page
  if (tournament.status !== 'completed') {
    redirect(`/tournaments/${id}`)
  }

  const standings = await getStandings(id)

  if (standings.length === 0) {
    redirect(`/tournaments/${id}`)
  }

  const winner = standings[0]
  const stats = await getMatchStats(id, winner.playerId)

  return (
    <ResultDisplay
      tournamentName={tournament.name}
      winnerName={winner.playerName}
      winnerAvatar={winner.playerAvatar}
      winnerPoints={winner.points}
      participants={standings}
      stats={stats}
    />
  )
}
