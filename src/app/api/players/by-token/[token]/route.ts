import { NextResponse } from 'next/server'
import { db } from '@/db'
import { players } from '@/db/schema'
import { eq, isNull, and } from 'drizzle-orm'

export async function GET(
  _request: Request,
  { params }: { params: { token: string } }
) {
  const token = params.token

  if (!token || token.length !== 8) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 400 })
  }

  const result = await db
    .select({
      id: players.id,
      name: players.name,
      nickname: players.nickname,
      avatarUrl: players.avatarUrl,
    })
    .from(players)
    .where(and(eq(players.editToken, token), isNull(players.deletedAt)))

  if (!result[0]) {
    return NextResponse.json({ error: 'Player not found' }, { status: 404 })
  }

  return NextResponse.json(result[0])
}
