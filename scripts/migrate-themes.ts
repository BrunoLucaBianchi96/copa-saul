import { createClient } from '@libsql/client'
import { drizzle } from 'drizzle-orm/libsql'
import { put } from '@vercel/blob'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { themes } from '../src/db/schema'

// One-off, idempotent migration. Run AFTER `yarn db:push` creates the new
// `themes` table, and with BLOB_READ_WRITE_TOKEN + DATABASE_URL set:
//   1. Upload each simple theme's audio (public/songs) + soundbites
//      (public/soundbites) to Vercel Blob.
//   2. Download each external backgroundImage and re-host it on Blob so themes
//      don't depend on wallpapercave/etc. (falls back to the original URL if the
//      fetch fails).
//   3. Upsert a `themes` row per simple theme with the resulting Blob URLs and a
//      sortOrder matching the historical THEMES array order.
//
// The three custom-renderer themes (balatro / matrix / gta-4) are skipped — they
// stay in CUSTOM_THEMES in src/lib/themes.ts and keep referencing local assets.

interface Soundbite {
  path: string
  offset?: number
  volume?: number
}
interface Soundbites {
  onBan?: Soundbite
  onPick?: Soundbite
  onGameSelected?: Soundbite
  onWinnerChosen?: Soundbite
}
interface SeedTheme {
  id: string
  name: string
  bpm: number
  division: number
  audioFile: string // local path under public/
  audioOffset?: number
  normalizeVolume?: number
  backgroundImage?: string // external URL (re-hosted on Blob)
  backgroundSize?: 'cover' | 'contain' | 'repeat'
  soundbites?: Soundbites
  sortOrder: number // historical index in the original THEMES array
}

// The simple themes from the original src/lib/themes.ts THEMES array, in display
// order. sortOrder is the original array index (custom themes at 5/11/22 are
// intentionally skipped, leaving gaps that the runtime merge fills back in).
const SEED_THEMES: SeedTheme[] = [
  {
    id: 'techno-syndrome',
    name: 'Techno Syndrome',
    bpm: 134,
    division: 1,
    audioFile: '/songs/techno-syndrome.mp3',
    normalizeVolume: 0.7,
    audioOffset: 16000,
    backgroundImage:
      'https://cdna.artstation.com/p/assets/images/images/003/714/696/large/pawel-kot-mk2-hd-armory.jpg?1476740914',
    soundbites: {
      onGameSelected: { path: '/soundbites/MORTAL KOMBAT! Scream.mp3', offset: 100, volume: 0.2 },
      onWinnerChosen: { path: '/soundbites/Fatality - Mortal Kombat Sound Effect (HD).mp3', volume: 0.2 },
    },
    sortOrder: 0,
  },
  {
    id: 'mucha-lucha',
    name: 'Mucha Lucha Theme',
    bpm: 124,
    division: 1,
    audioFile: '/songs/mucha-lucha.mp3',
    normalizeVolume: 1,
    backgroundImage: 'https://static.wikia.nocookie.net/muchalucha/images/e/e7/S1E11ATitleCard.jpg/',
    sortOrder: 1,
  },
  {
    id: 'running-in-the-90s',
    name: "Running in the 90's (Initial D)",
    bpm: 159,
    division: 2,
    audioFile: '/songs/running-in-the-90s-initial-d.mp3',
    normalizeVolume: 1,
    backgroundImage: 'https://wallpapercave.com/wp/wp12381690.jpg',
    sortOrder: 2,
  },
  {
    id: 'bury-the-light',
    name: 'Bury the Light (DMC5)',
    bpm: 150,
    division: 1,
    audioOffset: 26000,
    audioFile: '/songs/bury-the-light-dmc.mp3',
    normalizeVolume: 1,
    backgroundImage: 'https://wallpapercave.com/wp/wp5554957.jpg',
    sortOrder: 3,
  },
  {
    id: 'crash-bandicoot',
    name: 'Crash Bandicoot Theme',
    bpm: 153,
    division: 1,
    audioFile: '/songs/crash-bandicoot-main.mp3',
    normalizeVolume: 1,
    backgroundImage: 'https://wallpapercave.com/wp/wp10708932.jpg',
    sortOrder: 4,
  },
  // 5 = matrix (custom, skipped)
  {
    id: 'raising-fighting-spirit',
    name: 'The Raising Fighting Spirit',
    bpm: 140,
    division: 1,
    audioFile: '/songs/naruto.mp3',
    normalizeVolume: 1,
    backgroundImage: 'https://wallpapercave.com/wp/wp8813234.png',
    soundbites: {
      onGameSelected: { path: '/soundbites/yooooooooooo.mp3', offset: 6200, volume: 0.2 },
    },
    sortOrder: 6,
  },
  {
    id: 'take-over',
    name: 'Take Over (Persona 5 Royal)',
    bpm: 125,
    division: 1,
    audioFile: '/songs/take-over-persona-5.mp3',
    normalizeVolume: 1,
    backgroundImage: 'https://wallpapercave.com/wp/wp15118727.webp',
    sortOrder: 7,
  },
  {
    id: 'marvel-vs-capcom',
    name: "Captain America's Theme (MvC)",
    bpm: 190,
    division: 1,
    audioFile: '/songs/marvel-vs-capcom-captain-americas-theme.mp3',
    normalizeVolume: 1.2,
    backgroundImage: 'https://wallpapercave.com/wp/wp8157803.jpg',
    sortOrder: 8,
  },
  {
    id: 'melee-character-select',
    name: 'SSBM Character Select',
    bpm: 154,
    division: 1,
    audioFile: '/songs/melee-character-select.mp3',
    normalizeVolume: 1,
    backgroundImage: 'https://ssb.wiki.gallery/images/thumb/8/86/SSBU-Battlefield.png/1200px-SSBU-Battlefield.png',
    sortOrder: 9,
  },
  {
    id: 'age-of-empires-2',
    name: 'Age of Empires 2 Theme',
    bpm: 65,
    division: 1,
    audioFile: '/songs/age-of-empires-2.mp3',
    normalizeVolume: 1,
    backgroundImage: 'https://pbs.twimg.com/media/EIjXBAsXkAMbUsk.jpg',
    soundbites: {
      onGameSelected: { path: '/soundbites/Wololo Sound Effect.mp3' },
    },
    sortOrder: 10,
  },
  // 11 = gta-4 (custom, skipped)
  {
    id: 'perfect-cell-theme',
    name: 'Perfect Cell Theme',
    bpm: 100,
    division: 1,
    audioFile: '/songs/perfect-cell-theme.mp3',
    audioOffset: 9000,
    normalizeVolume: 1,
    backgroundImage: 'https://i.redd.it/i66bdvdl1h561.jpg',
    sortOrder: 12,
  },
  {
    id: 'guiles-theme',
    name: "Guile's Theme",
    bpm: 125,
    division: 1,
    audioFile: '/songs/guiles-theme.mp3',
    normalizeVolume: 1,
    backgroundImage: 'https://www.arcadequartermaster.com/ssf2/bonus1.png',
    sortOrder: 13,
  },
  {
    id: 'overtaken',
    name: 'Overtaken (One Piece)',
    bpm: 107,
    division: 1,
    audioFile: '/songs/overtaken.mp3',
    normalizeVolume: 1,
    backgroundImage: 'https://wallpapercave.com/wp/wp11199297.png',
    sortOrder: 14,
  },
  {
    id: 'red-sun',
    name: 'Red Sun (MGRR)',
    bpm: 150,
    division: 1,
    audioFile: '/songs/mgrr-red-sun.mp3',
    normalizeVolume: 1,
    backgroundImage: 'https://images6.alphacoders.com/388/thumb-1920-388347.jpg',
    sortOrder: 15,
  },
  {
    id: 'the-beast-arcane',
    name: 'The Beast (Arcane)',
    bpm: 135,
    division: 1,
    audioFile: '/songs/the-beast-arcane.mp3',
    audioOffset: 10000,
    normalizeVolume: 1,
    backgroundImage: 'https://wallpapercave.com/wp/wp12409949.jpg',
    sortOrder: 16,
  },
  {
    id: 'elden-ring',
    name: 'Elden Ring Main Theme',
    bpm: 75,
    division: 1,
    audioFile: '/songs/elden-ring-main-menu.mp3',
    audioOffset: 23000,
    normalizeVolume: 1,
    backgroundImage: 'https://wallpapercave.com/uwp/uwp4431208.png',
    sortOrder: 17,
  },
  {
    id: 'megalovania',
    name: 'Megalovania (Undertale)',
    bpm: 120,
    division: 1,
    audioFile: '/songs/megalovania.mp3',
    normalizeVolume: 1,
    backgroundImage: 'https://wallpapercave.com/wp/wp15821690.png',
    sortOrder: 18,
  },
  {
    id: 'wii-sports',
    name: 'Wii Sports Theme',
    bpm: 120,
    division: 1,
    audioFile: '/songs/wii-sports.mp3',
    normalizeVolume: 1,
    backgroundImage: 'https://s1.thcdn.com/design-assets/products/Large/10456603/pic1.jpg',
    sortOrder: 19,
  },
  {
    id: 'scarface-push-it-to-the-limit',
    name: 'Push It to the Limit (Scarface)',
    bpm: 156,
    division: 1,
    audioFile: '/songs/Scarface-push-it-to-the-limit.mp3',
    normalizeVolume: 1,
    backgroundImage: 'https://wallpapercave.com/wp/wp2479343.jpg',
    sortOrder: 20,
  },
  {
    id: 'dbz-theme',
    name: 'DBZ battle theme',
    bpm: 170,
    division: 1,
    audioFile: '/songs/dbz-theme.mp3',
    normalizeVolume: 1,
    audioOffset: 2000,
    backgroundImage:
      'https://images.wallpapersden.com/image/download/kame-house-dragon-ball-z_a2llbmaUmZqaraWkpJRoZWhnrWZsZWs.jpg',
    backgroundSize: 'repeat',
    sortOrder: 21,
  },
  // 22 = balatro (custom, skipped)
  {
    id: 'stardust-crusaders',
    name: "Jotaro's Theme (JoJo)",
    bpm: 140,
    division: 2,
    audioFile: '/songs/stardust-crusaders.mp3',
    normalizeVolume: 1,
    backgroundImage:
      'https://wallpapers.com/images/hd/stardust-crusaders-1920-x-1080-wallpaper-d675thhdqigslk2g.jpg',
    soundbites: {
      onGameSelected: { path: '/soundbites/Za Warudo - Sound Effect.mp3', volume: 0.6 },
      onWinnerChosen: { path: '/soundbites/Yare Yare Daze.mp3', volume: 5 },
      onBan: { path: '/soundbites/bakudan.mp3' },
      onPick: { path: '/soundbites/bakudan.mp3' },
    },
    sortOrder: 23,
  },
  {
    id: 'live-and-learn',
    name: 'Live and Learn (Sonic Adventure 2)',
    bpm: 172,
    division: 1,
    audioFile: '/songs/live-and-learn-sonic-adventure.mp3',
    normalizeVolume: 1,
    backgroundImage: 'https://wallpapercave.com/wp/wp3022024.png',
    sortOrder: 24,
  },
]

const CONTENT_TYPES: Record<string, string> = {
  mp3: 'audio/mpeg',
  ogg: 'audio/ogg',
  wav: 'audio/wav',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
}

function ext(name: string): string {
  // Strip query string and any trailing slashes before reading the extension,
  // so URLs like `.../foo.jpg/` yield `jpg`, not `jpg/`.
  const clean = name.split('?')[0].replace(/\/+$/, '')
  return clean.split('.').pop()?.toLowerCase() || 'bin'
}

// Upload a file from public/ to Blob at a deterministic path (idempotent).
async function uploadLocal(publicPath: string, blobPrefix: string): Promise<string> {
  const rel = publicPath.replace(/^\//, '')
  const buf = await readFile(join(process.cwd(), 'public', rel))
  const e = ext(publicPath)
  const base = rel.split('/').pop() || rel
  const blob = await put(`${blobPrefix}/${base}`, buf, {
    access: 'public',
    contentType: CONTENT_TYPES[e] ?? 'application/octet-stream',
    addRandomSuffix: false,
    allowOverwrite: true,
  })
  return blob.url
}

// Download an external image and re-host it on Blob. Falls back to the original
// URL on any error so the migration never blocks on a dead link.
async function uploadRemote(url: string, id: string): Promise<string> {
  try {
    // Normalize trailing slashes, and send browser-like headers so hosts with
    // hotlink/bot protection (e.g. wallpapersden) don't 403 a bare fetch.
    const src = url.replace(/\/+$/, '')
    const res = await fetch(src, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
        Accept: 'image/avif,image/webp,image/png,image/*,*/*;q=0.8',
      },
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const buf = Buffer.from(await res.arrayBuffer())
    const e = ext(src)
    const blob = await put(`themes/bg/${id}.${e}`, buf, {
      access: 'public',
      contentType: CONTENT_TYPES[e] ?? res.headers.get('content-type') ?? 'image/jpeg',
      addRandomSuffix: false,
      allowOverwrite: true,
    })
    return blob.url
  } catch (err) {
    console.warn(`  ! could not re-host bg for ${id} (${(err as Error).message}); keeping original URL`)
    return url
  }
}

async function uploadSoundbites(sb: Soundbites | undefined, id: string): Promise<Soundbites | null> {
  if (!sb) return null
  const out: Soundbites = {}
  for (const key of ['onBan', 'onPick', 'onGameSelected', 'onWinnerChosen'] as const) {
    const slot = sb[key]
    if (!slot) continue
    const url = await uploadLocal(slot.path, 'themes/soundbites')
    out[key] = { ...slot, path: url }
  }
  return Object.keys(out).length > 0 ? out : null
}

async function migrateThemes() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error('BLOB_READ_WRITE_TOKEN is required to upload to Vercel Blob')
  }
  const client = createClient({
    url: process.env.DATABASE_URL || 'file:local.db',
    authToken: process.env.DATABASE_AUTH_TOKEN,
  })
  const db = drizzle(client)

  console.log('Migrating themes to the database + Vercel Blob...')
  for (const t of SEED_THEMES) {
    console.log(`- ${t.id}`)
    const audioUrl = await uploadLocal(t.audioFile, 'themes/audio')
    const backgroundImage = t.backgroundImage ? await uploadRemote(t.backgroundImage, t.id) : null
    const soundbites = await uploadSoundbites(t.soundbites, t.id)

    const values = {
      id: t.id,
      name: t.name,
      bpm: t.bpm,
      division: t.division,
      audioUrl,
      audioOffset: t.audioOffset ?? null,
      normalizeVolume: t.normalizeVolume ?? null,
      backgroundImage,
      backgroundSize: t.backgroundSize ?? null,
      soundbites: soundbites ? JSON.stringify(soundbites) : null,
      sortOrder: t.sortOrder,
      active: true,
      deletedAt: null,
    }
    await db.insert(themes).values(values).onConflictDoUpdate({ target: themes.id, set: values })
    console.log(`  ✓ ${t.id}`)
  }

  console.log('Done.')
}

migrateThemes().catch((e) => {
  console.error(e)
  process.exit(1)
})
