import { db } from '@/db'
import { tournaments, tournamentPlayers, players, matches } from '@/db/schema'
import { eq, and, desc, isNotNull, ne } from 'drizzle-orm'
import { GAMES } from '@/lib/games'

// Combined live state for the tournament dashboard. Shared by the dashboard
// page (initial render) and the SSE stream route (polling) so the two never
// diverge.
export interface DashboardStandingRow {
  playerId: number
  playerName: string
  playerAvatar: string | null
  points: number
  retired: boolean
}

export interface DashboardMatch {
  id: number
  player1Id: number
  player2Id: number | null
  player1Name: string
  player2Name: string | null
  result: string
  selectedGame: string | null
  pickBanHistory: string | null
  pointsAwarded: number | null
}

export interface DashboardState {
  tournament: {
    id: number
    name: string
    status: string
    currentRound: number
    rounds: number
    overtimeRound: number
  }
  standings: DashboardStandingRow[]
  matches: DashboardMatch[]
  // gameId -> number of completed matches played on that game. Every game id is
  // always present (defaults to 0) so the radar keeps all of its axes.
  gamesPlayed: Record<string, number>
}

export async function getDashboardState(
  tournamentId: number
): Promise<DashboardState | null> {
  const tournamentRows = await db
    .select()
    .from(tournaments)
    .where(eq(tournaments.id, tournamentId))
  const tournament = tournamentRows[0]
  if (!tournament) return null

  const standings: DashboardStandingRow[] = await db
    .select({
      playerId: tournamentPlayers.playerId,
      playerName: players.name,
      playerAvatar: players.avatarUrl,
      points: tournamentPlayers.points,
      retired: tournamentPlayers.retired,
    })
    .from(tournamentPlayers)
    .innerJoin(players, eq(tournamentPlayers.playerId, players.id))
    .where(eq(tournamentPlayers.tournamentId, tournamentId))
    .orderBy(desc(tournamentPlayers.points))

  // Current-round matches (empty before the tournament starts).
  let dashboardMatches: DashboardMatch[] = []
  if (tournament.currentRound > 0) {
    const roundMatches = await db
      .select({
        id: matches.id,
        player1Id: matches.player1Id,
        player2Id: matches.player2Id,
        result: matches.result,
        selectedGame: matches.selectedGame,
        pickBanHistory: matches.pickBanHistory,
        pointsAwarded: matches.pointsAwarded,
      })
      .from(matches)
      .where(
        and(
          eq(matches.tournamentId, tournamentId),
          eq(matches.round, tournament.currentRound)
        )
      )

    const allPlayers = await db.select().from(players)
    const playerMap = new Map(allPlayers.map((p) => [p.id, p.name]))

    dashboardMatches = roundMatches.map((m) => ({
      ...m,
      player1Name: playerMap.get(m.player1Id) || 'Unknown',
      player2Name: m.player2Id ? playerMap.get(m.player2Id) || 'Unknown' : null,
    }))
  }

  // Games played: completed matches that landed on a game. Seed every game id
  // to 0 so the radar always renders all axes.
  const gamesPlayed: Record<string, number> = {}
  for (const game of GAMES) gamesPlayed[game.id] = 0

  const completedMatches = await db
    .select({ selectedGame: matches.selectedGame })
    .from(matches)
    .where(
      and(
        eq(matches.tournamentId, tournamentId),
        isNotNull(matches.selectedGame),
        ne(matches.result, 'pending')
      )
    )
  for (const m of completedMatches) {
    if (m.selectedGame && m.selectedGame in gamesPlayed) {
      gamesPlayed[m.selectedGame] += 1
    }
  }

  return {
    tournament: {
      id: tournament.id,
      name: tournament.name,
      status: tournament.status,
      currentRound: tournament.currentRound,
      rounds: tournament.rounds,
      overtimeRound: tournament.overtimeRound ?? 0,
    },
    standings,
    matches: dashboardMatches,
    gamesPlayed,
  }
}
