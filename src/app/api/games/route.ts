import { NextResponse } from 'next/server'
import { requireHost } from '@/lib/session'
import { createGame, getGameById, getActiveGames, slugify } from '@/lib/games-db'
import { parseGameForm } from '@/lib/game-form'

// Active game roster — used by the new-tournament picker.
export async function GET() {
  const games = await getActiveGames()
  return NextResponse.json({ games })
}

export async function POST(request: Request) {
  const auth = await requireHost()
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: 403 })
  }

  const formData = await request.formData()
  let parsed
  try {
    parsed = await parseGameForm(formData)
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 })
  }

  if (!parsed.name) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  }

  // Derive an immutable slug id from the name; ensure it is unique.
  const id = slugify(parsed.name)
  if (!id) {
    return NextResponse.json({ error: 'Could not derive a valid id from the name' }, { status: 400 })
  }
  if (await getGameById(id)) {
    return NextResponse.json({ error: `A game with id "${id}" already exists` }, { status: 409 })
  }

  const game = await createGame({ ...parsed, id, name: parsed.name })
  return NextResponse.json(game)
}
