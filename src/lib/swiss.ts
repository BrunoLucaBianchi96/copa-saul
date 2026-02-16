import { db } from '@/db'
import { matches, tournamentPlayers, players } from '@/db/schema'
import { eq, and, or } from 'drizzle-orm'

interface PlayerStanding {
  playerId: number
  playerName: string
  points: number
  opponents: number[]
}

// Get all previous opponents for a player in a tournament
async function getPlayerOpponents(tournamentId: number, playerId: number): Promise<number[]> {
  const playerMatches = await db
    .select()
    .from(matches)
    .where(
      and(
        eq(matches.tournamentId, tournamentId),
        or(eq(matches.player1Id, playerId), eq(matches.player2Id, playerId))
      )
    )

  const opponents: number[] = []
  for (const match of playerMatches) {
    if (match.player1Id === playerId && match.player2Id) {
      opponents.push(match.player2Id)
    } else if (match.player2Id === playerId) {
      opponents.push(match.player1Id)
    }
  }
  return opponents
}

// Export PlayerStanding type for use in other modules
export type { PlayerStanding }

// Get current standings
export async function getStandings(tournamentId: number): Promise<PlayerStanding[]> {
  const tPlayers = await db
    .select({
      playerId: tournamentPlayers.playerId,
      playerName: players.name,
      points: tournamentPlayers.points,
    })
    .from(tournamentPlayers)
    .innerJoin(players, eq(tournamentPlayers.playerId, players.id))
    .where(eq(tournamentPlayers.tournamentId, tournamentId))

  const standings: PlayerStanding[] = []
  for (const p of tPlayers) {
    const opponents = await getPlayerOpponents(tournamentId, p.playerId)
    standings.push({
      playerId: p.playerId,
      playerName: p.playerName,
      points: p.points,
      opponents,
    })
  }

  // Sort by points (descending)
  standings.sort((a, b) => b.points - a.points)
  return standings
}

function countEncounters(player: PlayerStanding, opponentId: number): number {
  return player.opponents.filter((id) => id === opponentId).length
}

// Pure function — no DB dependency, testable
export function generatePairingsFromStandings(
  standings: PlayerStanding[]
): { player1Id: number; player2Id: number | null }[] {
  const pairings: { player1Id: number; player2Id: number | null }[] = []
  const paired = new Set<number>()

  const CANDIDATE_WINDOW = 3

  for (let i = 0; i < standings.length; i++) {
    const player = standings[i]
    if (paired.has(player.playerId)) continue

    // Find up to CANDIDATE_WINDOW closest unpaired players by leaderboard position
    const candidates: { standing: PlayerStanding; distance: number }[] = []
    for (let j = 0; j < standings.length; j++) {
      if (j === i) continue
      if (paired.has(standings[j].playerId)) continue
      candidates.push({ standing: standings[j], distance: Math.abs(i - j) })
    }
    candidates.sort((a, b) => a.distance - b.distance)
    const window = candidates.slice(0, CANDIDATE_WINDOW)

    if (window.length === 0) {
      // No opponents available — bye
      pairings.push({ player1Id: player.playerId, player2Id: null })
      paired.add(player.playerId)
      continue
    }

    // Pick candidate with fewest encounters, tie-break by closest position
    let best = window[0]
    let bestEncounters = countEncounters(player, best.standing.playerId)

    for (let k = 1; k < window.length; k++) {
      const enc = countEncounters(player, window[k].standing.playerId)
      if (
        enc < bestEncounters ||
        (enc === bestEncounters && window[k].distance < best.distance)
      ) {
        best = window[k]
        bestEncounters = enc
      }
    }

    pairings.push({ player1Id: player.playerId, player2Id: best.standing.playerId })
    paired.add(player.playerId)
    paired.add(best.standing.playerId)
  }

  return pairings
}

// Generate Swiss pairings for the next round
export async function generatePairings(
  tournamentId: number,
  round: number
): Promise<{ player1Id: number; player2Id: number | null }[]> {
  const standings = await getStandings(tournamentId)
  return generatePairingsFromStandings(standings)
}

