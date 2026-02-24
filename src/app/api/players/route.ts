import { NextResponse } from 'next/server'
import { db } from '@/db'
import { players } from '@/db/schema'
import { requireHost } from '@/lib/session'
import { put } from '@vercel/blob'
import { generateEditToken } from '@/lib/edit-token'

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

export async function POST(request: Request) {
  const auth = await requireHost()
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: 403 })
  }

  const formData = await request.formData()
  const name = formData.get('name') as string
  const avatar = formData.get('avatar') as File | null

  if (!name || name.trim() === '') {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  }

  let avatarUrl: string | null = null

  if (avatar && avatar.size > 0) {
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(7)
    const bytes = await avatar.arrayBuffer()
    const imageBuffer = Buffer.from(bytes)

    // Try to remove background
    const noBgBuffer = await removeBackgroundWithAPI(imageBuffer)

    if (noBgBuffer) {
      // Upload the no-background version
      const blob = await put(`avatars/${timestamp}-${random}_nobg.png`, noBgBuffer, {
        access: 'public',
        contentType: 'image/png',
      })
      avatarUrl = blob.url
    } else {
      // Upload original if background removal fails or is not configured
      const ext = avatar.name.split('.').pop() || 'png'
      const blob = await put(`avatars/${timestamp}-${random}.${ext}`, imageBuffer, {
        access: 'public',
        contentType: avatar.type || 'image/png',
      })
      avatarUrl = blob.url
    }
  }

  const result = await db.insert(players).values({
    name: name.trim(),
    avatarUrl,
    editToken: generateEditToken(),
  }).returning()

  return NextResponse.json(result[0])
}
