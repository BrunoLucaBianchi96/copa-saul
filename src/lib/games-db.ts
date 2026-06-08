import { db } from '@/db'
import { games, tournamentGames, type GameRow } from '@/db/schema'
import { eq, and, isNull, asc } from 'drizzle-orm'
import type { Game, ControlEntry } from '@/lib/games'

// Map a raw DB row to the client-safe Game shape, parsing the controls JSON.
function rowToGame(row: GameRow): Game {
  let controls: ControlEntry[] | null = null
  if (row.controls) {
    try {
      controls = JSON.parse(row.controls) as ControlEntry[]
    } catch {
      controls = null
    }
  }
  return {
    id: row.id,
    name: row.name,
    descriptionEn: row.descriptionEn,
    descriptionEs: row.descriptionEs,
    howToPlayEn: row.howToPlayEn,
    howToPlayEs: row.howToPlayEs,
    imageUrl: row.imageUrl,
    imageFit: row.imageFit,
    videoUrl: row.videoUrl,
    videoStart: row.videoStart,
    controls,
    launchable: row.launchable,
    steamAppId: row.steamAppId,
    defaultLaunchUrl: row.defaultLaunchUrl,
    sortOrder: row.sortOrder,
    active: row.active,
  }
}

/**
 * Active, non-deleted games in display order. The selectable roster for new
 * tournaments, the public games browser, the global bets form and setup.
 */
export async function getActiveGames(): Promise<Game[]> {
  const rows = await db
    .select()
    .from(games)
    .where(and(isNull(games.deletedAt), eq(games.active, true)))
    .orderBy(asc(games.sortOrder))
  return rows.map(rowToGame)
}

/**
 * Every game the host can manage — both active and inactive, excluding only
 * soft-deleted rows. Used by the admin management UI.
 */
export async function getManageableGames(): Promise<Game[]> {
  const rows = await db
    .select()
    .from(games)
    .where(isNull(games.deletedAt))
    .orderBy(asc(games.sortOrder))
  return rows.map(rowToGame)
}

/**
 * The fixed game roster for a tournament. Does NOT filter soft-deleted games —
 * the set was frozen at tournament creation, so historical matches/bets keep
 * resolving even if a game was later removed from the global roster.
 */
export async function getGamesForTournament(tournamentId: number): Promise<Game[]> {
  const rows = await db
    .select({ game: games })
    .from(tournamentGames)
    .innerJoin(games, eq(tournamentGames.gameId, games.id))
    .where(eq(tournamentGames.tournamentId, tournamentId))
    .orderBy(asc(games.sortOrder))
  return rows.map((r) => rowToGame(r.game))
}

/** Every game ever, including soft-deleted, for name resolution of old matches. */
export async function getAllGames(): Promise<Game[]> {
  const rows = await db.select().from(games).orderBy(asc(games.sortOrder))
  return rows.map(rowToGame)
}

export async function getGameById(id: string): Promise<Game | null> {
  const rows = await db.select().from(games).where(eq(games.id, id))
  return rows[0] ? rowToGame(rows[0]) : null
}

// --- CRUD (host-only; callers must guard with requireHost) ---

export interface GameInput {
  id: string
  name: string
  descriptionEn?: string | null
  descriptionEs?: string | null
  howToPlayEn?: string | null
  howToPlayEs?: string | null
  imageUrl?: string | null
  imageFit?: 'cover' | 'contain' | null
  videoUrl?: string | null
  videoStart?: number | null
  controls?: ControlEntry[] | null
  launchable?: boolean
  steamAppId?: number | null
  defaultLaunchUrl?: string | null
  sortOrder?: number
  active?: boolean
}

/** Turn an arbitrary game name into a URL-safe slug for use as the row id. */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip accents
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export async function createGame(input: GameInput): Promise<Game> {
  // Place new games at the end of the display order by default.
  let sortOrder = input.sortOrder
  if (sortOrder === undefined) {
    const existing = await db.select({ sortOrder: games.sortOrder }).from(games)
    sortOrder = existing.reduce((max, g) => Math.max(max, g.sortOrder), -1) + 1
  }
  const row = await db
    .insert(games)
    .values({
      id: input.id,
      name: input.name,
      descriptionEn: input.descriptionEn ?? null,
      descriptionEs: input.descriptionEs ?? null,
      howToPlayEn: input.howToPlayEn ?? null,
      howToPlayEs: input.howToPlayEs ?? null,
      imageUrl: input.imageUrl ?? null,
      imageFit: input.imageFit ?? null,
      videoUrl: input.videoUrl ?? null,
      videoStart: input.videoStart ?? null,
      controls: input.controls ? JSON.stringify(input.controls) : null,
      launchable: input.launchable ?? false,
      steamAppId: input.steamAppId ?? null,
      defaultLaunchUrl: input.defaultLaunchUrl ?? null,
      sortOrder,
      active: input.active ?? true,
    })
    .returning()
  return rowToGame(row[0])
}

// Fields that may be patched on an existing game. The slug id is intentionally
// excluded — it is immutable to protect match/bet references.
export type GameUpdate = Partial<Omit<GameInput, 'id'>>

export async function updateGame(id: string, updates: GameUpdate): Promise<Game | null> {
  const patch: Partial<GameRow> = {}
  if (updates.name !== undefined) patch.name = updates.name
  if (updates.descriptionEn !== undefined) patch.descriptionEn = updates.descriptionEn
  if (updates.descriptionEs !== undefined) patch.descriptionEs = updates.descriptionEs
  if (updates.howToPlayEn !== undefined) patch.howToPlayEn = updates.howToPlayEn
  if (updates.howToPlayEs !== undefined) patch.howToPlayEs = updates.howToPlayEs
  if (updates.imageUrl !== undefined) patch.imageUrl = updates.imageUrl
  if (updates.imageFit !== undefined) patch.imageFit = updates.imageFit
  if (updates.videoUrl !== undefined) patch.videoUrl = updates.videoUrl
  if (updates.videoStart !== undefined) patch.videoStart = updates.videoStart
  if (updates.controls !== undefined) patch.controls = updates.controls ? JSON.stringify(updates.controls) : null
  if (updates.launchable !== undefined) patch.launchable = updates.launchable
  if (updates.steamAppId !== undefined) patch.steamAppId = updates.steamAppId
  if (updates.defaultLaunchUrl !== undefined) patch.defaultLaunchUrl = updates.defaultLaunchUrl
  if (updates.sortOrder !== undefined) patch.sortOrder = updates.sortOrder
  if (updates.active !== undefined) patch.active = updates.active

  if (Object.keys(patch).length === 0) return getGameById(id)

  await db.update(games).set(patch).where(eq(games.id, id))
  return getGameById(id)
}

/** Soft-delete: keep the row (old matches reference it) but drop it from selection. */
export async function softDeleteGame(id: string): Promise<void> {
  await db.update(games).set({ deletedAt: new Date(), active: false }).where(eq(games.id, id))
}

/** Replace a tournament's game set with the given list of game ids. */
export async function setTournamentGames(tournamentId: number, gameIds: string[]): Promise<void> {
  await db.delete(tournamentGames).where(eq(tournamentGames.tournamentId, tournamentId))
  if (gameIds.length > 0) {
    await db.insert(tournamentGames).values(gameIds.map((gameId) => ({ tournamentId, gameId })))
  }
}
