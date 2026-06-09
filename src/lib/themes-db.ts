import { db } from '@/db'
import { themes, type ThemeRow } from '@/db/schema'
import { eq, isNull, asc } from 'drizzle-orm'
import {
  type Theme,
  type Soundbites,
  CUSTOM_THEMES,
  selectThemeForMatch,
  prioritiesFromThemes,
} from '@/lib/themes'

// Map a raw DB row to the client-safe Theme shape, parsing the soundbites JSON.
// The DB column is `audioUrl`; the client Theme keeps the historical `audioFile`
// name, so old pick-ban code is untouched.
function rowToTheme(row: ThemeRow): Theme {
  let soundbites: Soundbites | undefined
  if (row.soundbites) {
    try {
      soundbites = JSON.parse(row.soundbites) as Soundbites
    } catch {
      soundbites = undefined
    }
  }
  return {
    id: row.id,
    name: row.name,
    bpm: row.bpm,
    division: row.division,
    audioFile: row.audioUrl ?? undefined,
    audioOffset: row.audioOffset ?? undefined,
    normalizeVolume: row.normalizeVolume ?? undefined,
    backgroundImage: row.backgroundImage ?? undefined,
    backgroundSize: row.backgroundSize ?? undefined,
    soundbites,
    priorityPlayer: row.priorityPlayer ?? undefined,
    priorityRound: row.priorityRound ?? undefined,
    active: row.active,
    sortOrder: row.sortOrder,
  }
}

/** Is this id one of the hardcoded custom-renderer themes? */
export function isCustomThemeId(id: string): boolean {
  return CUSTOM_THEMES.some((t) => t.id === id)
}

/**
 * Every DB theme the host can manage — active and inactive, excluding only
 * soft-deleted rows. Used by the admin management UI (DB themes only; the custom
 * themes are listed separately as read-only built-ins).
 */
export async function getManageableThemes(): Promise<Theme[]> {
  const rows = await db
    .select()
    .from(themes)
    .where(isNull(themes.deletedAt))
    .orderBy(asc(themes.sortOrder))
  return rows.map(rowToTheme)
}

/**
 * The single ordered theme list used for assignment: active, non-deleted DB
 * themes merged with the hardcoded CUSTOM_THEMES, sorted by sortOrder.
 */
export async function getAllThemes(): Promise<Theme[]> {
  const rows = await db
    .select()
    .from(themes)
    .where(isNull(themes.deletedAt))
    .orderBy(asc(themes.sortOrder))
  const dbThemes = rows.filter((r) => r.active).map(rowToTheme)
  return [...dbThemes, ...CUSTOM_THEMES].sort(
    (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)
  )
}

/**
 * Resolve a theme by id. Checks the hardcoded custom themes first, then the DB
 * WITHOUT filtering deletedAt — so an old match referencing a since-removed
 * theme still resolves its data (mirrors getGameById).
 */
export async function getThemeById(id: string): Promise<Theme | undefined> {
  const custom = CUSTOM_THEMES.find((t) => t.id === id)
  if (custom) return custom
  const rows = await db.select().from(themes).where(eq(themes.id, id))
  return rows[0] ? rowToTheme(rows[0]) : undefined
}

/**
 * Pick a theme for a match: priority rules first, then sequential assignment
 * over the merged theme list. Async wrapper around the pure selectThemeForMatch.
 * Priority rules are derived from the themes themselves (priorityPlayer column
 * on DB themes, set in code for the custom themes).
 */
export async function getThemeForMatch(
  usedThemeIds: string[],
  playerNames: string[],
  round: number,
): Promise<Theme> {
  const allThemes = await getAllThemes()
  const priorities = prioritiesFromThemes(allThemes)
  return selectThemeForMatch(allThemes, priorities, usedThemeIds, playerNames, round)
}

// --- CRUD (host-only; callers must guard with requireHost) ---

export interface ThemeInput {
  id: string
  name: string
  bpm: number
  division?: number
  audioFile?: string | null
  audioOffset?: number | null
  normalizeVolume?: number | null
  backgroundImage?: string | null
  backgroundSize?: 'cover' | 'contain' | 'repeat' | null
  soundbites?: Soundbites | null
  priorityPlayer?: string | null
  priorityRound?: number | null
  sortOrder?: number
  active?: boolean
}

export async function createTheme(input: ThemeInput): Promise<Theme> {
  // Place new themes at the end of the display order by default.
  let sortOrder = input.sortOrder
  if (sortOrder === undefined) {
    const existing = await db.select({ sortOrder: themes.sortOrder }).from(themes)
    const dbMax = existing.reduce((max, t) => Math.max(max, t.sortOrder), -1)
    const customMax = CUSTOM_THEMES.reduce((max, t) => Math.max(max, t.sortOrder ?? 0), -1)
    sortOrder = Math.max(dbMax, customMax) + 1
  }
  const row = await db
    .insert(themes)
    .values({
      id: input.id,
      name: input.name,
      bpm: input.bpm,
      division: input.division ?? 1,
      audioUrl: input.audioFile ?? null,
      audioOffset: input.audioOffset ?? null,
      normalizeVolume: input.normalizeVolume ?? null,
      backgroundImage: input.backgroundImage ?? null,
      backgroundSize: input.backgroundSize ?? null,
      soundbites: input.soundbites ? JSON.stringify(input.soundbites) : null,
      priorityPlayer: input.priorityPlayer ?? null,
      priorityRound: input.priorityRound ?? null,
      sortOrder,
      active: input.active ?? true,
    })
    .returning()
  return rowToTheme(row[0])
}

// Fields that may be patched on an existing theme. The slug id is intentionally
// excluded — it is immutable to protect match references.
export type ThemeUpdate = Partial<Omit<ThemeInput, 'id'>>

export async function updateTheme(id: string, updates: ThemeUpdate): Promise<Theme | undefined> {
  const patch: Partial<ThemeRow> = {}
  if (updates.name !== undefined) patch.name = updates.name
  if (updates.bpm !== undefined) patch.bpm = updates.bpm
  if (updates.division !== undefined) patch.division = updates.division
  if (updates.audioFile !== undefined) patch.audioUrl = updates.audioFile
  if (updates.audioOffset !== undefined) patch.audioOffset = updates.audioOffset
  if (updates.normalizeVolume !== undefined) patch.normalizeVolume = updates.normalizeVolume
  if (updates.backgroundImage !== undefined) patch.backgroundImage = updates.backgroundImage
  if (updates.backgroundSize !== undefined) patch.backgroundSize = updates.backgroundSize
  if (updates.soundbites !== undefined)
    patch.soundbites = updates.soundbites ? JSON.stringify(updates.soundbites) : null
  if (updates.priorityPlayer !== undefined) patch.priorityPlayer = updates.priorityPlayer
  if (updates.priorityRound !== undefined) patch.priorityRound = updates.priorityRound
  if (updates.sortOrder !== undefined) patch.sortOrder = updates.sortOrder
  if (updates.active !== undefined) patch.active = updates.active

  if (Object.keys(patch).length === 0) return getThemeById(id)

  await db.update(themes).set(patch).where(eq(themes.id, id))
  return getThemeById(id)
}

/** Soft-delete: keep the row (old matches reference it) but drop it from selection. */
export async function softDeleteTheme(id: string): Promise<void> {
  await db.update(themes).set({ deletedAt: new Date(), active: false }).where(eq(themes.id, id))
}
