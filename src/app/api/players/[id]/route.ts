import { NextResponse } from 'next/server'
import { db } from '@/db'
import { players } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { requireHost } from '@/lib/session'
import { writeFile } from 'fs/promises'
import { exec } from 'child_process'
import { promisify } from 'util'
import path from 'path'

const execAsync = promisify(exec)

async function removeBackground(inputPath: string, outputPath: string): Promise<boolean> {
  try {
    const scriptPath = path.join(process.cwd(), 'scripts', 'remove-bg.py')
    const venvPython = path.join(process.cwd(), '.venv', 'bin', 'python3')

    await execAsync(`${venvPython} ${scriptPath} "${inputPath}" "${outputPath}"`)
    return true
  } catch (error) {
    console.error('Background removal failed:', error)
    return false
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const auth = await requireHost()
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: 403 })
  }

  const playerId = parseInt(params.id)

  // Check player exists
  const player = await db
    .select()
    .from(players)
    .where(eq(players.id, playerId))

  if (!player[0]) {
    return NextResponse.json({ error: 'Player not found' }, { status: 404 })
  }

  const formData = await request.formData()
  const name = formData.get('name') as string | null
  const nickname = formData.get('nickname') as string | null
  const avatar = formData.get('avatar') as File | null

  const updates: Partial<{ name: string; nickname: string | null; avatarUrl: string }> = {}

  if (name && name.trim() !== '') {
    updates.name = name.trim()
  }

  // Handle nickname - can be set to empty string to clear it
  if (nickname !== null) {
    updates.nickname = nickname.trim() === '' ? null : nickname.trim()
  }

  if (avatar && avatar.size > 0) {
    // Generate unique filename
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(7)
    const ext = avatar.name.split('.').pop() || 'png'
    const originalFilename = `${timestamp}-${random}.${ext}`
    const originalPath = path.join(process.cwd(), 'public', 'avatars', originalFilename)

    // Write original file
    const bytes = await avatar.arrayBuffer()
    await writeFile(originalPath, Buffer.from(bytes))

    // Try to remove background
    const noBgFilename = `${timestamp}-${random}_nobg.png`
    const noBgPath = path.join(process.cwd(), 'public', 'avatars', noBgFilename)

    const bgRemoved = await removeBackground(originalPath, noBgPath)

    if (bgRemoved) {
      updates.avatarUrl = `/avatars/${noBgFilename}`
    } else {
      updates.avatarUrl = `/avatars/${originalFilename}`
    }
  }

  if (Object.keys(updates).length > 0) {
    await db.update(players).set(updates).where(eq(players.id, playerId))
  }

  // Return updated player
  const updatedPlayer = await db.select().from(players).where(eq(players.id, playerId))
  return NextResponse.json(updatedPlayer[0])
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const auth = await requireHost()
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: 403 })
  }

  const playerId = parseInt(params.id)

  // Check player exists and is not already deleted
  const player = await db
    .select()
    .from(players)
    .where(eq(players.id, playerId))

  if (!player[0]) {
    return NextResponse.json({ error: 'Player not found' }, { status: 404 })
  }

  if (player[0].deletedAt) {
    return NextResponse.json({ error: 'Player already deleted' }, { status: 400 })
  }

  // Soft delete - set deletedAt timestamp
  await db
    .update(players)
    .set({ deletedAt: new Date() })
    .where(eq(players.id, playerId))

  return NextResponse.json({ success: true })
}
