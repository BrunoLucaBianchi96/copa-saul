import { NextResponse } from 'next/server'
import { requireHost } from '@/lib/session'
import { getGameById, updateGame, softDeleteGame } from '@/lib/games-db'
import { parseGameForm } from '@/lib/game-form'

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const auth = await requireHost()
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: 403 })
  }

  const existing = await getGameById(params.id)
  if (!existing) {
    return NextResponse.json({ error: 'Game not found' }, { status: 404 })
  }

  const formData = await request.formData()
  let parsed
  try {
    parsed = await parseGameForm(formData)
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 })
  }

  // The slug id is immutable; name and everything else may change.
  const updated = await updateGame(params.id, parsed)
  return NextResponse.json(updated)
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const auth = await requireHost()
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: 403 })
  }

  const existing = await getGameById(params.id)
  if (!existing) {
    return NextResponse.json({ error: 'Game not found' }, { status: 404 })
  }

  // Soft delete only — the row survives so historical matches/bets that
  // reference this game id keep resolving its name/image.
  await softDeleteGame(params.id)
  return NextResponse.json({ success: true })
}
