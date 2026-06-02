import { NextResponse } from 'next/server'
import { db } from '@/db'
import { matches, tournamentPlayers } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { requireHost } from '@/lib/session'
import { getPlayerBetForGame, calculateMatchPoints, DEFAULT_BET } from '@/lib/scoring'

export async function PATCH(
  request: Request,
  { params }: { params: { id: string; matchId: string } }
) {
  const auth = await requireHost()
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: 403 })
  }

  const tournamentId = parseInt(params.id)
  const matchId = parseInt(params.matchId)
  const { result } = await request.json()

  // Get the match
  const match = await db.select().from(matches).where(eq(matches.id, matchId))

  if (!match[0] || match[0].tournamentId !== tournamentId) {
    return NextResponse.json({ error: 'Match not found' }, { status: 404 })
  }

  if (match[0].result !== 'pending') {
    return NextResponse.json({ error: 'Match already has a result' }, { status: 400 })
  }

  // Determine winner
  let winnerId: number | null = null
  if (result === 'player1') {
    winnerId = match[0].player1Id
  } else if (result === 'player2') {
    winnerId = match[0].player2Id
  }

  // Calculate points based on bets
  let pointsToAward = 0

  if (winnerId && match[0].player2Id) {
    const loserId = winnerId === match[0].player1Id ? match[0].player2Id : match[0].player1Id

    if (match[0].selectedGame) {
      const winnerBet = await getPlayerBetForGame(tournamentId, winnerId, match[0].selectedGame)
      const loserBet = await getPlayerBetForGame(tournamentId, loserId, match[0].selectedGame)
      pointsToAward = calculateMatchPoints(winnerBet, loserBet)
    } else {
      // Fallback if no game selected (shouldn't happen in normal flow)
      pointsToAward = DEFAULT_BET
    }

    // Bounty: beating a player carrying a bounty grants their bounty as bonus
    // points. Folded into pointsToAward so the reset route reverses it too.
    // The loser's bounty itself persists (it reflects their leaderboard standing).
    const loser = await db
      .select()
      .from(tournamentPlayers)
      .where(
        and(
          eq(tournamentPlayers.tournamentId, tournamentId),
          eq(tournamentPlayers.playerId, loserId)
        )
      )
    if (loser[0]?.bounty && loser[0].bounty > 0) {
      pointsToAward += loser[0].bounty
    }
  }

  // Update match with result and points awarded
  await db
    .update(matches)
    .set({ result, winnerId, pointsAwarded: pointsToAward || null })
    .where(eq(matches.id, matchId))

  // Award points to winner
  if (pointsToAward > 0 && winnerId) {
    const winner = await db
      .select()
      .from(tournamentPlayers)
      .where(
        and(
          eq(tournamentPlayers.tournamentId, tournamentId),
          eq(tournamentPlayers.playerId, winnerId)
        )
      )
    if (winner[0]) {
      await db
        .update(tournamentPlayers)
        .set({ points: winner[0].points + pointsToAward })
        .where(eq(tournamentPlayers.id, winner[0].id))
    }
  }

  return NextResponse.json({ success: true, pointsAwarded: pointsToAward })
}
