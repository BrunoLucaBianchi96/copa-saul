import { db } from '@/db'
import { matches, tournamentPlayers, players } from '@/db/schema'
import { eq, and, or, gte, isNull } from 'drizzle-orm'

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
export async function getStandings(
  tournamentId: number,
  opts?: { excludeRetired?: boolean }
): Promise<PlayerStanding[]> {
  const conditions = [eq(tournamentPlayers.tournamentId, tournamentId)]
  if (opts?.excludeRetired) {
    conditions.push(eq(tournamentPlayers.retired, false))
  }

  const tPlayers = await db
    .select({
      playerId: tournamentPlayers.playerId,
      playerName: players.name,
      points: tournamentPlayers.points,
    })
    .from(tournamentPlayers)
    .innerJoin(players, eq(tournamentPlayers.playerId, players.id))
    .where(and(...conditions))

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
// recentByePlayerIds: players who had a bye in the last 3 rounds (ineligible for another bye)
export function generatePairingsFromStandings(
  standings: PlayerStanding[],
  recentByePlayerIds: number[] = []
): { player1Id: number; player2Id: number | null }[] {
  const pairings: { player1Id: number; player2Id: number | null }[] = []
  const paired = new Set<number>()

  // If odd number of players, pre-assign the bye to the lowest-ranked eligible player
  if (standings.length % 2 === 1) {
    const recentByeSet = new Set(recentByePlayerIds)
    // Walk from bottom of standings upward, pick first player without a recent bye
    let byePlayer: PlayerStanding | null = null
    for (let i = standings.length - 1; i >= 0; i--) {
      if (!recentByeSet.has(standings[i].playerId)) {
        byePlayer = standings[i]
        break
      }
    }
    // Fallback: if everyone had a recent bye, give it to the last player anyway
    if (!byePlayer) {
      byePlayer = standings[standings.length - 1]
    }
    pairings.push({ player1Id: byePlayer.playerId, player2Id: null })
    paired.add(byePlayer.playerId)
  }

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
      // Should not happen since we pre-assigned the bye, but safety fallback
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
  const standings = await getStandings(tournamentId, { excludeRetired: true })

  // Find players who had a bye in the last 3 rounds
  const lookbackFrom = Math.max(1, round - 3)
  const recentByes = await db
    .select({ player1Id: matches.player1Id })
    .from(matches)
    .where(
      and(
        eq(matches.tournamentId, tournamentId),
        gte(matches.round, lookbackFrom),
        isNull(matches.player2Id)
      )
    )
  const recentByePlayerIds = recentByes.map((b) => b.player1Id)

  // Protect players with zero matches (e.g. late joiners) from getting a bye
  const allTournamentMatches = await db
    .select({ player1Id: matches.player1Id, player2Id: matches.player2Id })
    .from(matches)
    .where(eq(matches.tournamentId, tournamentId))

  const playersWithMatchSet = new Set<number>()
  for (const m of allTournamentMatches) {
    playersWithMatchSet.add(m.player1Id)
    if (m.player2Id) playersWithMatchSet.add(m.player2Id)
  }

  for (const s of standings) {
    if (!playersWithMatchSet.has(s.playerId) && !recentByePlayerIds.includes(s.playerId)) {
      recentByePlayerIds.push(s.playerId)
    }
  }

  return generatePairingsFromStandings(standings, recentByePlayerIds)
}

