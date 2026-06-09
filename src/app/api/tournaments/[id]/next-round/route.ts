import { NextResponse } from 'next/server'
import { db } from '@/db'
import { tournaments, matches, tournamentPlayers, players } from '@/db/schema'
import { eq, and, asc, inArray, notInArray } from 'drizzle-orm'
import {
  generatePairings,
  getStandings,
} from '@/lib/swiss'
import { requireHost } from '@/lib/session'
import { getThemeForMatch } from '@/lib/themes-db'
import { BYE_POINTS, BOUNTY_MIN_TOP4_ROUNDS, bountyIncrementForPlacement } from '@/lib/scoring'

async function createMatches(
  tournamentId: number,
  round: number,
  pairings: { player1Id: number; player2Id: number | null }[]
) {
  // Seed usedThemeIds from all existing matches in the tournament
  const existingMatches = await db
    .select()
    .from(matches)
    .where(eq(matches.tournamentId, tournamentId))
  const usedThemeIds = existingMatches
    .filter((m) => m.backgroundMusicId)
    .map((m) => m.backgroundMusicId!)

  // Build player name map for theme priority matching
  const allPlayerIds = pairings.flatMap((p) =>
    p.player2Id ? [p.player1Id, p.player2Id] : [p.player1Id]
  )
  const playerRows = await db
    .select({ id: players.id, name: players.name })
    .from(players)
    .where(inArray(players.id, allPlayerIds))
  const playerNameMap = new Map(playerRows.map((p) => [p.id, p.name]))

  for (const pairing of pairings) {
    if (pairing.player2Id === null) {
      // Bye
      await db.insert(matches).values({
        tournamentId,
        round,
        player1Id: pairing.player1Id,
        player2Id: null,
        result: 'bye',
        winnerId: pairing.player1Id,
      })
      // Award point for bye
      const current = await db
        .select()
        .from(tournamentPlayers)
        .where(
          and(
            eq(tournamentPlayers.tournamentId, tournamentId),
            eq(tournamentPlayers.playerId, pairing.player1Id)
          )
        )
      if (current[0]) {
        await db
          .update(tournamentPlayers)
          .set({ points: current[0].points + BYE_POINTS })
          .where(eq(tournamentPlayers.id, current[0].id))
      }
    } else {
      const names = [
        playerNameMap.get(pairing.player1Id) ?? '',
        playerNameMap.get(pairing.player2Id) ?? '',
      ]
      const theme = await getThemeForMatch(usedThemeIds, names, round)
      usedThemeIds.push(theme.id)
      await db.insert(matches).values({
        tournamentId,
        round,
        player1Id: pairing.player1Id,
        player2Id: pairing.player2Id,
        result: 'pending',
        backgroundMusicId: theme.id,
      })
    }
  }
}

// Accrue bounties for the round that just completed. Players in the top 4 of the
// standings have their top-4 round count incremented; once a player has been top-4
// in BOUNTY_MIN_TOP4_ROUNDS rounds, each subsequent (and that qualifying) top-4
// finish adds an amount based on their current standing position.
async function accrueRoundBounties(tournamentId: number) {
  const standings = await getStandings(tournamentId, { excludeRetired: true })
  const topFour = standings.slice(0, 4)
  const topFourIds = topFour.map((p) => p.playerId)

  // Bounty is only kept while a player stays in the top 4. Anyone who has
  // dropped out loses both their accumulated bounty and their top-4 streak, so
  // re-entering means re-earning the BOUNTY_MIN_TOP4_ROUNDS gate from scratch.
  await db
    .update(tournamentPlayers)
    .set({ bounty: 0, topFourRounds: 0 })
    .where(
      topFourIds.length > 0
        ? and(
            eq(tournamentPlayers.tournamentId, tournamentId),
            notInArray(tournamentPlayers.playerId, topFourIds)
          )
        : eq(tournamentPlayers.tournamentId, tournamentId)
    )

  for (let i = 0; i < topFour.length; i++) {
    const tp = await db
      .select()
      .from(tournamentPlayers)
      .where(
        and(
          eq(tournamentPlayers.tournamentId, tournamentId),
          eq(tournamentPlayers.playerId, topFour[i].playerId)
        )
      )
    if (!tp[0]) continue

    const newTopFourRounds = tp[0].topFourRounds + 1
    const bountyGain =
      newTopFourRounds >= BOUNTY_MIN_TOP4_ROUNDS ? bountyIncrementForPlacement(i) : 0

    await db
      .update(tournamentPlayers)
      .set({
        topFourRounds: newTopFourRounds,
        bounty: tp[0].bounty + bountyGain,
      })
      .where(eq(tournamentPlayers.id, tp[0].id))
  }
}

async function getFirstNonByeMatchId(tournamentId: number, round: number): Promise<number | null> {
  const roundMatches = await db
    .select({ id: matches.id, player2Id: matches.player2Id })
    .from(matches)
    .where(and(eq(matches.tournamentId, tournamentId), eq(matches.round, round)))
    .orderBy(asc(matches.id))
  const first = roundMatches.find((m) => m.player2Id !== null)
  return first?.id ?? null
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const auth = await requireHost()
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: 403 })
  }

  const tournamentId = parseInt(params.id)

  // Get tournament
  const tournament = await db
    .select()
    .from(tournaments)
    .where(eq(tournaments.id, tournamentId))

  if (!tournament[0] || !['active', 'overtime'].includes(tournament[0].status)) {
    return NextResponse.json({ error: 'Tournament not found or not active' }, { status: 400 })
  }

  // Check all current round matches are complete
  const currentMatches = await db
    .select()
    .from(matches)
    .where(
      and(
        eq(matches.tournamentId, tournamentId),
        eq(matches.round, tournament[0].currentRound)
      )
    )

  const pendingMatches = currentMatches.filter((m) => m.result === 'pending')
  if (pendingMatches.length > 0) {
    return NextResponse.json(
      { error: 'All matches must be completed before advancing' },
      { status: 400 }
    )
  }

  const t = tournament[0]

  // Accrue bounties for the just-completed round (regular play only — not the
  // finals/overtime bracket). Runs once per advance, since the pending-match
  // guard above prevents re-running for an already-advanced round.
  if (t.status === 'active') {
    await accrueRoundBounties(tournamentId)
  }

  // Handle finals mode
  if (t.status === 'overtime') {
    const overtimePlayerIds: number[] = JSON.parse(t.overtimePlayers || '[]')

    if (t.overtimeRound === 1) {
      // Semifinal just completed — create final match (top 2 from updated standings)
      const allStandings = await getStandings(tournamentId)
      const finalistStandings = allStandings.filter((p) => overtimePlayerIds.includes(p.playerId))
      const nextRound = t.currentRound + 1

      const pairings = [
        { player1Id: finalistStandings[0].playerId, player2Id: finalistStandings[1].playerId },
      ]
      await createMatches(tournamentId, nextRound, pairings)

      await db
        .update(tournaments)
        .set({
          currentRound: nextRound,
          overtimeRound: 2,
        })
        .where(eq(tournaments.id, tournamentId))

      const firstMatchId = await getFirstNonByeMatchId(tournamentId, nextRound)
      return NextResponse.json({ success: true, overtimeRound: 2, firstMatchId })
    }

    if (t.overtimeRound === 2) {
      // Final just completed — tournament is done
      await db
        .update(tournaments)
        .set({ status: 'completed' })
        .where(eq(tournaments.id, tournamentId))
      return NextResponse.json({ success: true, completed: true })
    }
  }

  // Regular round logic
  const nextRound = t.currentRound + 1

  // Check if we've completed all regular rounds — always enter finals
  if (nextRound > t.rounds) {
    const standings = await getStandings(tournamentId, { excludeRetired: true })
    const activePlayers = standings.length

    if (activePlayers < 2) {
      return NextResponse.json(
        { error: 'Not enough active players for finals (need at least 2)' },
        { status: 400 }
      )
    }

    let pairings: { player1Id: number; player2Id: number }[]
    let finalistIds: number[]

    if (activePlayers < 4) {
      // Not enough for semifinals — go straight to a single final match (top 2)
      const top2 = standings.slice(0, 2)
      finalistIds = top2.map((p) => p.playerId)
      pairings = [{ player1Id: top2[0].playerId, player2Id: top2[1].playerId }]
    } else {
      // Full semifinals: 1st vs 2nd, 3rd vs 4th
      const top4 = standings.slice(0, 4)
      finalistIds = top4.map((p) => p.playerId)
      pairings = [
        { player1Id: top4[0].playerId, player2Id: top4[1].playerId },
        { player1Id: top4[2].playerId, player2Id: top4[3].playerId },
      ]
    }

    await createMatches(tournamentId, nextRound, pairings)

    await db
      .update(tournaments)
      .set({
        status: 'overtime',
        currentRound: nextRound,
        overtimeRound: activePlayers < 4 ? 2 : 1,
        overtimePlayers: JSON.stringify(finalistIds),
      })
      .where(eq(tournaments.id, tournamentId))

    const firstMatchId = await getFirstNonByeMatchId(tournamentId, nextRound)
    return NextResponse.json({
      success: true,
      overtime: true,
      firstMatchId,
    })
  }

  // Normal round advancement
  const pairings = await generatePairings(tournamentId, nextRound)
  await createMatches(tournamentId, nextRound, pairings)

  await db
    .update(tournaments)
    .set({ currentRound: nextRound })
    .where(eq(tournaments.id, tournamentId))

  const firstMatchId = await getFirstNonByeMatchId(tournamentId, nextRound)
  return NextResponse.json({ success: true, firstMatchId })
}
