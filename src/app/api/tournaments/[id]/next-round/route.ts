import { NextResponse } from 'next/server'
import { db } from '@/db'
import { tournaments, matches, tournamentPlayers, players } from '@/db/schema'
import { eq, and, asc, inArray } from 'drizzle-orm'
import {
  generatePairings,
  checkFirstPlaceTie,
  getOvertimeParticipants,
  generateOvertimePairings,
} from '@/lib/swiss'
import { requireHost } from '@/lib/session'
import { getThemeForMatch } from '@/lib/themes'
import { BYE_POINTS } from '@/lib/scoring'

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
      const theme = getThemeForMatch(usedThemeIds, names, round)
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

  // Handle overtime mode
  if (t.status === 'overtime') {
    const overtimePlayerIds: number[] = JSON.parse(t.overtimePlayers || '[]')

    // If there were only 2 players in overtime, the match winner is the tournament winner
    // No need to check for ties - it's mathematically impossible
    if (overtimePlayerIds.length === 2) {
      await db
        .update(tournaments)
        .set({ status: 'completed' })
        .where(eq(tournaments.id, tournamentId))
      return NextResponse.json({ success: true, completed: true })
    }

    // Check if there's still a tie among overtime players
    const tieCheck = await checkFirstPlaceTie(tournamentId)
    const stillTied = tieCheck.tiedPlayers.filter((p) =>
      overtimePlayerIds.includes(p.playerId)
    )

    if (stillTied.length <= 1) {
      // We have a winner
      await db
        .update(tournaments)
        .set({ status: 'completed' })
        .where(eq(tournaments.id, tournamentId))
      return NextResponse.json({ success: true, completed: true })
    }

    // Still tied - generate next overtime round
    const nextOvertimeRound = (t.overtimeRound ?? 0) + 1
    const nextRound = t.currentRound + 1

    // Check if we need to narrow down participants
    let participants = overtimePlayerIds
    if (stillTied.length < overtimePlayerIds.length) {
      // Some players fell behind, narrow down to those still tied
      participants = stillTied.map((p) => p.playerId)
      // If odd, add one more
      if (participants.length % 2 !== 0) {
        const nextBest = tieCheck.tiedPlayers.find(
          (p) => !participants.includes(p.playerId) && overtimePlayerIds.includes(p.playerId)
        )
        if (nextBest) participants.push(nextBest.playerId)
      }
    }

    const pairings = await generateOvertimePairings(tournamentId, participants)
    await createMatches(tournamentId, nextRound, pairings)

    await db
      .update(tournaments)
      .set({
        currentRound: nextRound,
        overtimeRound: nextOvertimeRound,
        overtimePlayers: JSON.stringify(participants),
      })
      .where(eq(tournaments.id, tournamentId))

    const firstMatchId = await getFirstNonByeMatchId(tournamentId, nextRound)
    return NextResponse.json({ success: true, overtimeRound: nextOvertimeRound, firstMatchId })
  }

  // Regular round logic
  const nextRound = t.currentRound + 1

  // Check if we've completed all regular rounds
  if (nextRound > t.rounds) {
    // Check for first-place tie
    const tieCheck = await checkFirstPlaceTie(tournamentId)

    if (tieCheck.hasTie) {
      // Enter overtime
      const overtimeParticipants = await getOvertimeParticipants(tournamentId)
      const overtimePlayerIds = overtimeParticipants.map((p) => p.playerId)

      const pairings = await generateOvertimePairings(tournamentId, overtimePlayerIds)
      await createMatches(tournamentId, nextRound, pairings)

      await db
        .update(tournaments)
        .set({
          status: 'overtime',
          currentRound: nextRound,
          overtimeRound: 1,
          overtimePlayers: JSON.stringify(overtimePlayerIds),
        })
        .where(eq(tournaments.id, tournamentId))

      const firstMatchId = await getFirstNonByeMatchId(tournamentId, nextRound)
      return NextResponse.json({
        success: true,
        overtime: true,
        participants: overtimeParticipants,
        firstMatchId,
      })
    } else {
      // No tie - complete tournament
      await db
        .update(tournaments)
        .set({ status: 'completed' })
        .where(eq(tournaments.id, tournamentId))
      return NextResponse.json({ success: true, completed: true })
    }
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
