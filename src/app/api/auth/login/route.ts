import { NextResponse } from 'next/server'
import { db } from '@/db'
import { players } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { setSession, type Role } from '@/lib/session'
import { verifyPassword } from '@/lib/password'

const HOST_PASSWORD = process.env.HOST_PASSWORD

export async function POST(request: Request) {
  const { role, password, playerId } = await request.json()

  if (role !== 'host' && role !== 'player') {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
  }

  if (role === 'host') {
    if (password !== HOST_PASSWORD) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
    }
    await setSession('host')
    return NextResponse.json({ success: true, role: 'host' })
  }

  // Player login — validate playerId and password
  if (playerId) {
    const player = await db
      .select()
      .from(players)
      .where(eq(players.id, playerId))
    if (!player[0] || player[0].deletedAt) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 })
    }

    if (!player[0].passwordHash) {
      return NextResponse.json({ error: 'password_not_set' }, { status: 403 })
    }

    if (!password || !verifyPassword(password, player[0].passwordHash)) {
      return NextResponse.json({ error: 'wrong_password' }, { status: 401 })
    }

    await setSession('player', playerId)
    return NextResponse.json({ success: true, role: 'player', playerId })
  }

  // Fallback: anonymous player (backwards compatible)
  await setSession('player' as Role)
  return NextResponse.json({ success: true, role: 'player' })
}
