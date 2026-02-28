import { NextResponse } from 'next/server'
import { db } from '@/db'
import { players } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { hashPassword } from '@/lib/password'

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const playerId = parseInt(params.id)
  const { editToken, password } = await request.json()

  if (!editToken || !password) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const player = await db
    .select()
    .from(players)
    .where(eq(players.id, playerId))

  if (!player[0]) {
    return NextResponse.json({ error: 'Player not found' }, { status: 404 })
  }

  if (player[0].editToken !== editToken) {
    return NextResponse.json({ error: 'Invalid edit token' }, { status: 403 })
  }

  const hashed = hashPassword(password)
  await db
    .update(players)
    .set({ passwordHash: hashed })
    .where(eq(players.id, playerId))

  return NextResponse.json({ success: true })
}
