import { put } from '@vercel/blob'
import type { GameInput } from '@/lib/games-db'
import type { ControlEntry } from '@/lib/games'

// Parse the multipart form shared by the create/edit game routes into a patch.
// Every field is optional here; the route decides which are required. Uploads
// any provided image to Vercel Blob (mirrors the players avatar upload).
export async function parseGameForm(
  formData: FormData
): Promise<Omit<GameInput, 'id' | 'name'> & { name?: string }> {
  const str = (k: string) => {
    const v = formData.get(k)
    return typeof v === 'string' && v.trim() !== '' ? v.trim() : null
  }
  const bool = (k: string) => formData.get(k) === 'true'
  const num = (k: string) => {
    const v = str(k)
    if (v === null) return null
    const n = parseInt(v, 10)
    return Number.isNaN(n) ? null : n
  }

  let controls: ControlEntry[] | null = null
  const controlsRaw = str('controls')
  if (controlsRaw) {
    try {
      controls = JSON.parse(controlsRaw) as ControlEntry[]
    } catch {
      throw new Error('Invalid controls JSON')
    }
  }

  let imageUrl: string | null | undefined
  const image = formData.get('image') as File | null
  if (image && image.size > 0) {
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(7)
    const bytes = await image.arrayBuffer()
    const ext = image.name.split('.').pop() || 'png'
    const blob = await put(`games/${timestamp}-${random}.${ext}`, Buffer.from(bytes), {
      access: 'public',
      contentType: image.type || 'image/png',
    })
    imageUrl = blob.url
  } else if (str('imageUrl') !== null) {
    // Allow setting an image by URL directly (no file upload).
    imageUrl = str('imageUrl')
  }

  const fitRaw = str('imageFit')
  const imageFit = fitRaw === 'contain' ? 'contain' : fitRaw === 'cover' ? 'cover' : null

  return {
    name: str('name') ?? undefined,
    descriptionEn: str('descriptionEn'),
    descriptionEs: str('descriptionEs'),
    howToPlayEn: str('howToPlayEn'),
    howToPlayEs: str('howToPlayEs'),
    ...(imageUrl !== undefined ? { imageUrl } : {}),
    imageFit,
    videoUrl: str('videoUrl'),
    videoStart: num('videoStart'),
    controls,
    launchable: bool('launchable'),
    steamAppId: num('steamAppId'),
    defaultLaunchUrl: str('defaultLaunchUrl'),
    active: formData.get('active') === null ? true : bool('active'),
  }
}
