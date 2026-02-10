import { NextResponse } from 'next/server'
import { db } from '@/db'
import { players } from '@/db/schema'
import { isNull } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

export async function GET() {
  const allPlayers = await db
    .select({ avatarUrl: players.avatarUrl })
    .from(players)
    .where(isNull(players.deletedAt))

  const avatars = allPlayers
    .filter((p) => p.avatarUrl)
    .map((p) => p.avatarUrl!)

  return NextResponse.json({ avatars })
}
