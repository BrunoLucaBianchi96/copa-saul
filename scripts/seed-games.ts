import { createClient } from '@libsql/client'
import { drizzle } from 'drizzle-orm/libsql'
import { eq, and } from 'drizzle-orm'
import { readFileSync } from 'fs'
import { join } from 'path'
import { games, tournamentGames, tournaments } from '../src/db/schema'

// One-off, idempotent migration. Run AFTER `yarn db:push` creates the new
// `games` / `tournament_games` tables:
//   1. Upsert the 7 original hardcoded games (slug ids preserved).
//   2. Pull description / howToPlay text out of messages/{en,es}.json.
//   3. Backfill tournament_games for every existing tournament so historical
//      dashboards/radars/scoring read the same "all games everywhere" roster.

interface ControlEntry {
  label: string
  buttons: string[]
}

interface SeedGame {
  id: string
  name: string
  imageUrl?: string
  imageFit?: 'cover' | 'contain'
  videoUrl?: string
  videoStart?: number
  controls?: ControlEntry[]
  launchable: boolean
  steamAppId?: number
  defaultLaunchUrl?: string
}

// The original GAMES array (formerly hardcoded in src/lib/games.ts), in display
// order. sortOrder is derived from this order.
const SEED_GAMES: SeedGame[] = [
  {
    id: 'sparking-zero',
    name: 'Sparking Zero',
    launchable: true,
    defaultLaunchUrl: 'steam://rungameid/',
    imageUrl: '/avatars/sparking-zero-2.jpg',
    videoUrl: 'https://www.youtube.com/watch?v=wV-dsMTKgH4',
    videoStart: 25,
    controls: [
      { label: 'Subir', buttons: ['PS-L1'] },
      { label: 'Bajar', buttons: ['PS-L2'] },
      { label: 'Blockear', buttons: ['PS-R1+HOLD'] },
      { label: 'Cargar Ki', buttons: ['PS-R2+HOLD'] },
      { label: 'Poderes', buttons: ['PS-R2+HOLD', '+', 'PS-COLOR-SQUARE/PS-COLOR-TRIANGLE/PS-COLOR-CIRCLE/PS-COLOR-CROSS'] },
      { label: 'Counterear', buttons: ['PS-COLOR-CIRCLE+HOLD'] },
      { label: 'Volar rapido', buttons: ['PS-R2+HOLD', '+', 'PS-COLOR-CROSS'] },
      { label: 'Dashear al otro', buttons: ['PS-R2+HOLD', '+', 'PS-COLOR-CROSS', 'PS-COLOR-CROSS'] },
      { label: 'Combo (todos los combos son cuadrado una a cuatro veces y despues triangulo)', buttons: ['PS-COLOR-SQUARE', 'PS-COLOR-SQUARE', 'PS-COLOR-TRIANGLE'] },
      { label: 'Cambiar de personaje', buttons: ['PS-DPAD-LEFT+HOLD', '+', 'PS-COLOR-SQUARE/PS-COLOR-TRIANGLE/PS-COLOR-CIRCLE/PS-COLOR-CROSS'] },
      { label: 'Transformaciones y fusiones', buttons: ['PS-DPAD-UP+HOLD', '+', 'PS-COLOR-SQUARE/PS-COLOR-TRIANGLE/PS-COLOR-CIRCLE/PS-COLOR-CROSS'] },
    ],
  },
  {
    id: 'taiko-no-tatsujin',
    name: 'Taiko no Tatsujin',
    launchable: false,
    imageUrl: '/avatars/taiko.webp',
    imageFit: 'contain',
    videoUrl: 'https://www.youtube.com/watch?v=ynP3WcqcUHc',
    videoStart: 462,
    controls: [
      { label: 'Nota roja', buttons: ['WII-1'] },
      { label: 'Nota azul', buttons: ['WII-2'] },
      { label: 'Nota globo', buttons: ['WII-1/WII-2'] },
      { label: 'Nota amarilla', buttons: ['WII-1/WII-2'] },
    ],
  },
  {
    id: 'trackmania',
    name: 'Trackmania Turbo',
    launchable: true,
    defaultLaunchUrl: 'steam://rungameid/',
    imageUrl: 'https://image.api.playstation.com/cdn/UP0001/CUSA03008_00/Vxl9PD0n9dSbh9wV9TEKtJJYOP39Mc4R.png',
    videoUrl: 'https://www.youtube.com/watch?v=MWr369TCMmo',
    videoStart: 23,
    controls: [
      { label: 'Acelerar', buttons: ['PS-R2'] },
      { label: 'Frenar', buttons: ['PS-L2'] },
      { label: 'Volver al último checkpoint (mantiene momentum)', buttons: ['PS-COLOR-TRIANGLE'] },
      { label: 'Reset completo (si te quedás trabado)', buttons: ['PS-COLOR-TRIANGLE', 'PS-COLOR-TRIANGLE'] },
      { label: '⚠️ Reiniciar carrera - NO TOCAR EN CARRERA', buttons: ['PS-COLOR-CIRCLE'] },
    ],
  },
  { id: 'wii-sports-ping-pong', name: 'Wii Sports Ping Pong', launchable: false, imageUrl: '/avatars/wii-sports.jpg' },
  { id: 'tricky-towers', name: 'Tricky Towers', launchable: true, defaultLaunchUrl: 'steam://rungameid/', imageUrl: '/avatars/tricky-towers.jpg', videoUrl: 'https://www.youtube.com/watch?v=GyT1S0jeRq0', videoStart: 113 },
  {
    id: 'duck-game',
    name: 'Duck Game',
    launchable: true,
    steamAppId: 312530,
    defaultLaunchUrl: 'steam://rungameid/312530',
    imageUrl: '/avatars/duck-game.jpeg',
    videoUrl: 'https://www.youtube.com/watch?v=VZrwIrfr7xk',
    videoStart: 327,
    controls: [
      { label: 'Moverse', buttons: ['PS-LS'] },
      { label: 'Lengua', buttons: ['PS-RS'] },
      { label: 'Saltar / Aceptar', buttons: ['PS-COLOR-CROSS'] },
      { label: 'Cuac', buttons: ['PS-COLOR-CIRCLE'] },
      { label: 'Disparar', buttons: ['PS-COLOR-SQUARE'] },
      { label: 'Agarrar', buttons: ['PS-COLOR-TRIANGLE'] },
      { label: 'Strafe', buttons: ['PS-L1'] },
      { label: 'Tropezar / Ragdoll', buttons: ['PS-R1'] },
    ],
  },
  { id: 'boomerang-fu', name: 'Boomerang Fu', launchable: true, steamAppId: 965680, defaultLaunchUrl: 'steam://rungameid/965680', imageUrl: '/avatars/boomerang-fu.jpg', videoUrl: 'https://www.youtube.com/watch?v=I1wz1M-n98c', videoStart: 90 },
]

function loadMessages(file: string): Record<string, { description?: string; howToPlay?: string }> {
  const raw = readFileSync(join(process.cwd(), 'messages', file), 'utf-8')
  const parsed = JSON.parse(raw) as { games?: Record<string, { description?: string; howToPlay?: string }> }
  return parsed.games ?? {}
}

async function seedGames() {
  const client = createClient({
    url: process.env.DATABASE_URL || 'file:local.db',
    authToken: process.env.DATABASE_AUTH_TOKEN,
  })
  const db = drizzle(client)

  const en = loadMessages('en.json')
  const es = loadMessages('es.json')

  console.log('Upserting games...')
  for (let i = 0; i < SEED_GAMES.length; i++) {
    const g = SEED_GAMES[i]
    const values = {
      id: g.id,
      name: g.name,
      descriptionEn: en[g.id]?.description ?? null,
      descriptionEs: es[g.id]?.description ?? null,
      howToPlayEn: en[g.id]?.howToPlay ?? null,
      howToPlayEs: es[g.id]?.howToPlay ?? null,
      imageUrl: g.imageUrl ?? null,
      imageFit: g.imageFit ?? null,
      videoUrl: g.videoUrl ?? null,
      videoStart: g.videoStart ?? null,
      controls: g.controls ? JSON.stringify(g.controls) : null,
      launchable: g.launchable,
      steamAppId: g.steamAppId ?? null,
      defaultLaunchUrl: g.defaultLaunchUrl ?? null,
      sortOrder: i,
      active: true,
      deletedAt: null,
    }
    await db
      .insert(games)
      .values(values)
      .onConflictDoUpdate({ target: games.id, set: values })
    console.log(`  ✓ ${g.id}`)
  }

  console.log('Backfilling tournament_games for existing tournaments...')
  const allTournaments = await db.select({ id: tournaments.id }).from(tournaments)
  for (const t of allTournaments) {
    for (const g of SEED_GAMES) {
      const existing = await db
        .select({ id: tournamentGames.id })
        .from(tournamentGames)
        .where(and(eq(tournamentGames.tournamentId, t.id), eq(tournamentGames.gameId, g.id)))
      if (existing.length === 0) {
        await db.insert(tournamentGames).values({ tournamentId: t.id, gameId: g.id })
      }
    }
    console.log(`  ✓ tournament ${t.id} (${SEED_GAMES.length} games)`)
  }

  console.log('Done.')
}

seedGames().catch((e) => {
  console.error(e)
  process.exit(1)
})
