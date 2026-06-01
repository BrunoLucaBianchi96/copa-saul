import { NextResponse } from 'next/server'
import { db } from '@/db'
import { matches } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { getSession, getSessionPlayerId } from '@/lib/session'
import { type PickBanAction, calculatePickBanState } from '@/lib/games'

export async function POST(
  request: Request,
  { params }: { params: { id: string; matchId: string } }
) {
  const role = await getSession()
  if (!role) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const isHost = role === 'host'
  const sessionPlayerId = await getSessionPlayerId()

  const tournamentId = parseInt(params.id)
  const matchId = parseInt(params.matchId)
  const body = await request.json()

  // Get the match
  const match = await db.select().from(matches).where(eq(matches.id, matchId))

  if (!match[0] || match[0].tournamentId !== tournamentId) {
    return NextResponse.json({ error: 'Match not found' }, { status: 404 })
  }

  if (match[0].result !== 'pending') {
    return NextResponse.json({ error: 'Match already completed' }, { status: 400 })
  }

  // Parse existing history
  const existingHistory: PickBanAction[] = match[0].pickBanHistory
    ? JSON.parse(match[0].pickBanHistory)
    : []

  // Handle action (ban/pick)
  if (body.action) {
    const newAction: PickBanAction = body.action

    // Compute whose turn it is from existing history
    const state = calculatePickBanState(existingHistory, match[0].selectedGame ?? undefined)
    const currentPlayerId = state.currentPlayer === 1 ? match[0].player1Id : match[0].player2Id

    // Allow host OR the player whose turn it is
    if (!isHost && sessionPlayerId !== currentPlayerId) {
      return NextResponse.json({ error: 'Not your turn' }, { status: 403 })
    }

    // Server-side validation: action must match current state
    if (newAction.player !== state.currentPlayer || newAction.phase !== state.currentPhase) {
      return NextResponse.json({ error: 'Invalid action for current state' }, { status: 400 })
    }

    const updatedHistory = [...existingHistory, newAction]

    await db
      .update(matches)
      .set({ pickBanHistory: JSON.stringify(updatedHistory) })
      .where(eq(matches.id, matchId))

    return NextResponse.json({ success: true, history: updatedHistory })
  }

  // Handle preferred-game selection. Each player marks the game they want; when both
  // point at the same game it is chosen immediately, ending pick-ban early.
  if (body.preference) {
    const { player, gameId, both } = body.preference as {
      player?: 1 | 2
      gameId: string | null
      both?: boolean
    }

    // Both players agree on one game at once (ctrl+shift+click) — host only.
    if (both) {
      if (!isHost) {
        return NextResponse.json({ error: 'Host access required' }, { status: 403 })
      }
      await db
        .update(matches)
        .set({
          player1PreferredGame: gameId,
          player2PreferredGame: gameId,
          selectedGame: gameId ?? undefined,
          pickBanComplete: gameId ? true : undefined,
        })
        .where(eq(matches.id, matchId))
      return NextResponse.json({ success: true, agreedGame: gameId })
    }

    if (player !== 1 && player !== 2) {
      return NextResponse.json({ error: 'Invalid player' }, { status: 400 })
    }

    // Host can set either player's preference; a player can set only their own.
    const targetPlayerId = player === 1 ? match[0].player1Id : match[0].player2Id
    if (!isHost && sessionPlayerId !== targetPlayerId) {
      return NextResponse.json({ error: 'Not allowed' }, { status: 403 })
    }

    // Toggle off if the same game is re-sent, otherwise set it.
    const currentPref = player === 1 ? match[0].player1PreferredGame : match[0].player2PreferredGame
    const next = currentPref === gameId ? null : gameId

    const p1 = player === 1 ? next : match[0].player1PreferredGame
    const p2 = player === 2 ? next : match[0].player2PreferredGame
    const agreed = p1 && p2 && p1 === p2 ? p1 : null

    await db
      .update(matches)
      .set({
        ...(player === 1 ? { player1PreferredGame: next } : { player2PreferredGame: next }),
        ...(agreed ? { selectedGame: agreed, pickBanComplete: true } : {}),
      })
      .where(eq(matches.id, matchId))

    return NextResponse.json({ success: true, preferred: next, agreedGame: agreed })
  }

  // Handle game selection — host only (animation runs on host device)
  if (body.selectGame) {
    if (!isHost) {
      return NextResponse.json({ error: 'Host access required' }, { status: 403 })
    }

    await db
      .update(matches)
      .set({
        selectedGame: body.selectGame,
        pickBanComplete: true,
        pickBanHistory: body.actions ? JSON.stringify(body.actions) : undefined,
      })
      .where(eq(matches.id, matchId))

    return NextResponse.json({ success: true, selectedGame: body.selectGame })
  }

  return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
}
