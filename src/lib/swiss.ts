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

// Shuffle array using Fisher-Yates
function shuffle<T>(array: T[]): T[] {
  const result = [...array]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

// Generate Swiss pairings for the next round
export async function generatePairings(
  tournamentId: number,
  round: number
): Promise<{ player1Id: number; player2Id: number | null }[]> {
  const standings = await getStandings(tournamentId)
  const pairings: { player1Id: number; player2Id: number | null }[] = []
  const paired = new Set<number>()

  // Group players by points
  const groups = new Map<number, PlayerStanding[]>()
  for (const player of standings) {
    const pointGroup = groups.get(player.points) || []
    pointGroup.push(player)
    groups.set(player.points, pointGroup)
  }

  // Sort point groups (highest first)
  const sortedPoints = Array.from(groups.keys()).sort((a, b) => b - a)

  // Unpaired players from higher groups flow down
  let floaters: PlayerStanding[] = []

  for (const points of sortedPoints) {
    const group = shuffle([...floaters, ...(groups.get(points) || [])])
    floaters = []

    for (let i = 0; i < group.length; i++) {
      const player = group[i]
      if (paired.has(player.playerId)) continue

      // Try to find an opponent from the same group
      let opponent: PlayerStanding | null = null
      for (let j = i + 1; j < group.length; j++) {
        const candidate = group[j]
        if (paired.has(candidate.playerId)) continue
        // Check if they haven't played before
        if (!player.opponents.includes(candidate.playerId)) {
          opponent = candidate
          break
        }
      }

      if (opponent) {
        pairings.push({ player1Id: player.playerId, player2Id: opponent.playerId })
        paired.add(player.playerId)
        paired.add(opponent.playerId)
      } else {
        // Float down to next group
        floaters.push(player)
      }
    }
  }

  // Handle any remaining floaters (pair with each other or give bye)
  const remaining = floaters.filter((p) => !paired.has(p.playerId))
  for (let i = 0; i < remaining.length; i += 2) {
    if (i + 1 < remaining.length) {
      pairings.push({ player1Id: remaining[i].playerId, player2Id: remaining[i + 1].playerId })
    } else {
      // Bye for the last unpaired player
      pairings.push({ player1Id: remaining[i].playerId, player2Id: null })
    }
  }

  return pairings
}
