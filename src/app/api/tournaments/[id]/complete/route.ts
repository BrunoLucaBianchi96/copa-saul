import { NextResponse } from 'next/server'
import { db } from '@/db'
import { tournaments } from '@/db/schema'
import { eq } from 'drizzle-orm'

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const tournamentId = parseInt(params.id)

  await db
    .update(tournaments)
    .set({ status: 'completed' })
    .where(eq(tournaments.id, tournamentId))

  return NextResponse.json({ success: true })
}
