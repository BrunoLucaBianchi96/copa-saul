import { NextResponse } from 'next/server'
import { db } from '@/db'
import { players } from '@/db/schema'
import { requireHost } from '@/lib/session'
import { writeFile, unlink } from 'fs/promises'
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
    // Generate unique filename
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(7)
    const ext = avatar.name.split('.').pop() || 'png'
    const originalFilename = `${timestamp}-${random}.${ext}`
    const originalPath = path.join(process.cwd(), 'public', 'avatars', originalFilename)

    // Write original file to public/avatars
    const bytes = await avatar.arrayBuffer()
    await writeFile(originalPath, Buffer.from(bytes))

    // Try to remove background
    const noBgFilename = `${timestamp}-${random}_nobg.png`
    const noBgPath = path.join(process.cwd(), 'public', 'avatars', noBgFilename)

    const bgRemoved = await removeBackground(originalPath, noBgPath)

    if (bgRemoved) {
      // Use the no-background version
      avatarUrl = `/avatars/${noBgFilename}`
    } else {
      // Fallback to original if background removal fails
      avatarUrl = `/avatars/${originalFilename}`
    }
  }

  const result = await db.insert(players).values({
    name: name.trim(),
    avatarUrl,
  }).returning()

  return NextResponse.json(result[0])
}
