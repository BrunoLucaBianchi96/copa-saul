import { put } from '@vercel/blob'
import type { ThemeInput } from '@/lib/themes-db'
import type { Soundbite, Soundbites } from '@/lib/themes'

// The four soundbite slots, in display order.
const SOUNDBITE_KEYS = ['onBan', 'onPick', 'onGameSelected', 'onWinnerChosen'] as const
type SoundbiteKey = (typeof SOUNDBITE_KEYS)[number]

async function uploadFile(file: File, prefix: string): Promise<string> {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(7)
  const bytes = await file.arrayBuffer()
  const ext = file.name.split('.').pop() || 'bin'
  const blob = await put(`${prefix}/${timestamp}-${random}.${ext}`, Buffer.from(bytes), {
    access: 'public',
    contentType: file.type || 'application/octet-stream',
  })
  return blob.url
}

// Parse the multipart form shared by the create/edit theme routes into a patch.
// Uploads any provided audio / background image / soundbite files to Vercel
// Blob, and assembles the structured soundbites object from the per-slot file +
// offset + volume fields. Mirrors src/lib/game-form.ts.
export async function parseThemeForm(
  formData: FormData
): Promise<Omit<ThemeInput, 'id' | 'name' | 'bpm'> & { name?: string; bpm?: number }> {
  const str = (k: string) => {
    const v = formData.get(k)
    return typeof v === 'string' && v.trim() !== '' ? v.trim() : null
  }
  const intNum = (k: string) => {
    const v = str(k)
    if (v === null) return null
    const n = parseInt(v, 10)
    return Number.isNaN(n) ? null : n
  }
  const floatNum = (k: string) => {
    const v = str(k)
    if (v === null) return null
    const n = parseFloat(v)
    return Number.isNaN(n) ? null : n
  }
  const fileOf = (k: string) => {
    const f = formData.get(k)
    return f instanceof File && f.size > 0 ? f : null
  }

  // Audio: new upload wins, otherwise keep an existing/explicit URL.
  let audioFile: string | null | undefined
  const audio = fileOf('audio')
  if (audio) {
    audioFile = await uploadFile(audio, 'themes/audio')
  } else if (str('audioUrl') !== null) {
    audioFile = str('audioUrl')
  }

  // Background image: same pattern.
  let backgroundImage: string | null | undefined
  const bg = fileOf('backgroundImage')
  if (bg) {
    backgroundImage = await uploadFile(bg, 'themes/bg')
  } else if (str('backgroundImageUrl') !== null) {
    backgroundImage = str('backgroundImageUrl')
  }

  // Structured soundbites: for each slot, upload a new file or keep the existing
  // URL, then attach the per-slot offset/volume. A slot with neither file nor
  // existing URL is dropped.
  const soundbites: Soundbites = {}
  for (const key of SOUNDBITE_KEYS) {
    const file = fileOf(`soundbite_${key}`)
    let path: string | null = null
    if (file) {
      path = await uploadFile(file, 'themes/soundbites')
    } else {
      path = str(`soundbite_${key}_url`)
    }
    if (!path) continue
    const slot: Soundbite = { path }
    const offset = intNum(`soundbite_${key}_offset`)
    const volume = floatNum(`soundbite_${key}_volume`)
    if (offset !== null) slot.offset = offset
    if (volume !== null) slot.volume = volume
    soundbites[key as SoundbiteKey] = slot
  }

  const sizeRaw = str('backgroundSize')
  const backgroundSize =
    sizeRaw === 'contain' ? 'contain' : sizeRaw === 'repeat' ? 'repeat' : sizeRaw === 'cover' ? 'cover' : null

  return {
    name: str('name') ?? undefined,
    bpm: intNum('bpm') ?? undefined,
    division: intNum('division') ?? 1,
    ...(audioFile !== undefined ? { audioFile } : {}),
    audioOffset: intNum('audioOffset'),
    normalizeVolume: floatNum('normalizeVolume'),
    ...(backgroundImage !== undefined ? { backgroundImage } : {}),
    backgroundSize,
    soundbites: Object.keys(soundbites).length > 0 ? soundbites : null,
    active: formData.get('active') === null ? true : formData.get('active') === 'true',
  }
}
