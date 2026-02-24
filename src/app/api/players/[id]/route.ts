import { NextResponse } from 'next/server'
import { db } from '@/db'
import { players } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { requireHost } from '@/lib/session'
import { put } from '@vercel/blob'

async function removeBackgroundWithAPI(imageBuffer: Buffer): Promise<Buffer | null> {
  const apiKey = process.env.REMOVE_BG_API_KEY
  if (!apiKey) {
    console.log('REMOVE_BG_API_KEY not set, skipping background removal')
    return null
  }

  try {
    const formData = new FormData()
    formData.append('image_file', new Blob([new Uint8Array(imageBuffer)]), 'image.png')
    formData.append('size', 'auto')

    const response = await fetch('https://api.remove.bg/v1.0/removebg', {
      method: 'POST',
      headers: {
        'X-Api-Key': apiKey,
      },
      body: formData,
    })

    if (!response.ok) {
      console.error('remove.bg API error:', response.status, await response.text())
      return null
    }

    const resultBuffer = await response.arrayBuffer()
    return Buffer.from(resultBuffer)
  } catch (error) {
    console.error('Background removal failed:', error)
    return null
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
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

  // Auth: either host session OR valid edit token
  const editToken = formData.get('editToken') as string | null
  if (editToken) {
    if (player[0].editToken !== editToken) {
      return NextResponse.json({ error: 'Invalid edit token' }, { status: 403 })
    }
  } else {
    const auth = await requireHost()
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: 403 })
    }
  }
  const name = formData.get('name') as string | null
  const nickname = formData.get('nickname') as string | null
  const avatar = formData.get('avatar') as File | null
  const skipBgRemoval = formData.get('skipBgRemoval') === 'true'

  const updates: Partial<{ name: string; nickname: string | null; avatarUrl: string }> = {}

  if (name && name.trim() !== '') {
    updates.name = name.trim()
  }

  // Handle nickname - can be set to empty string to clear it
  if (nickname !== null) {
    updates.nickname = nickname.trim() === '' ? null : nickname.trim()
  }

  if (avatar && avatar.size > 0) {
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(7)
    const bytes = await avatar.arrayBuffer()
    const imageBuffer = Buffer.from(bytes)

    // Try to remove background (unless skipped)
    const noBgBuffer = skipBgRemoval ? null : await removeBackgroundWithAPI(imageBuffer)

    if (noBgBuffer) {
      const blob = await put(`avatars/${timestamp}-${random}_nobg.png`, noBgBuffer, {
        access: 'public',
        contentType: 'image/png',
      })
      updates.avatarUrl = blob.url
    } else {
      const ext = avatar.name.split('.').pop() || 'png'
      const blob = await put(`avatars/${timestamp}-${random}.${ext}`, imageBuffer, {
        access: 'public',
        contentType: avatar.type || 'image/png',
      })
      updates.avatarUrl = blob.url
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
