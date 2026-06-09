// Client-safe theme types and pure helpers.
//
// The actual theme DATA now lives in the database (see src/lib/themes-db.ts).
// This module must stay importable from 'use client' components (pick-ban.tsx),
// so it MUST NOT import the db client. It holds only the shared shapes, the
// pure animation/selection helpers, and the three hardcoded "custom renderer"
// themes that can't be data-driven (balatro/matrix/gta-4).

export interface Soundbite {
  path: string
  offset?: number // offset in milliseconds
  volume?: number // volume multiplier (default 1)
}

export interface Soundbites {
  onBan?: Soundbite // plays when a game is banned
  onPick?: Soundbite // plays when a game is picked
  onGameSelected?: Soundbite // plays when the final game to play is selected
  onWinnerChosen?: Soundbite // plays when the match winner is chosen
}

export interface Theme {
  id: string
  name: string
  bpm: number
  division: number // 2 = binary, 3 = ternary, 4 = quaternary (bounces per sway)
  audioFile?: string // URL (Vercel Blob) or path to audio file
  audioOffset?: number // offset in milliseconds to start audio from
  normalizeVolume?: number // multiplier to normalize volume across themes (default 1)
  soundbites?: Soundbites // optional soundbites that play at different stages
  backgroundImage?: string // URL or path to background image
  backgroundSize?: 'cover' | 'contain' | 'repeat' // how to size the background (default: cover)
  active?: boolean // selectable in new tournaments (DB themes only; customs are always active)
  sortOrder?: number // position in the merged theme order
  // When set, the pick-ban background is rendered by a bespoke React component
  // instead of a static backgroundImage. These themes stay hardcoded.
  customRenderer?: 'balatro' | 'matrix' | 'gta-4'
}

// The three themes that render via custom React components (WebGL / canvas /
// image carousel) and therefore can't live in the DB. They are merged into the
// ordered theme list at runtime by themes-db.ts. The sortOrder values slot them
// into their historical positions in the original THEMES array.
export const CUSTOM_THEMES: Theme[] = [
  {
    id: 'matrix',
    name: 'Spybreak! (The Matrix)',
    bpm: 128,
    division: 1,
    audioFile: '/songs/matrix-spybreak.mp3',
    normalizeVolume: 1,
    customRenderer: 'matrix',
    sortOrder: 5,
  },
  {
    id: 'gta-4',
    name: 'Soviet Connection (GTA IV)',
    bpm: 72,
    division: 1,
    audioFile: '/songs/gta-4.mp3',
    normalizeVolume: 1,
    customRenderer: 'gta-4',
    sortOrder: 11,
  },
  {
    id: 'balatro',
    name: 'Balatro Main Theme',
    bpm: 110,
    division: 1,
    audioFile: '/songs/balatro-main.mp3',
    normalizeVolume: 1,
    customRenderer: 'balatro',
    sortOrder: 22,
    soundbites: {
      onBan: { path: '/soundbites/card1.ogg' },
      onPick: { path: '/soundbites/card3.ogg' },
      onGameSelected: { path: '/soundbites/win.ogg' },
    },
  },
]

export interface ThemePriority {
  playerName: string // case-insensitive substring match on player name
  themeId: string // theme to assign
  round?: number // if set, only applies in this round
}

// Pure theme-selection algorithm. Given the full ordered theme list and the
// active priority rules, pick a theme for a match. Kept pure (no DB access) so
// it stays unit-testable; themes-db.getThemeForMatch wraps it with DB fetches.
export function selectThemeForMatch(
  themes: Theme[],
  priorities: ThemePriority[],
  usedThemeIds: string[],
  playerNames: string[],
  round: number,
): Theme {
  // Check priority rules
  for (const rule of priorities) {
    if (rule.round !== undefined && rule.round !== round) continue
    const matches = playerNames.some(
      (name) => name.toLowerCase().includes(rule.playerName.toLowerCase())
    )
    if (matches && !usedThemeIds.includes(rule.themeId)) {
      const theme = themes.find((t) => t.id === rule.themeId)
      if (theme) return theme
    }
  }

  // Fall back: first unused theme in order
  for (const theme of themes) {
    if (!usedThemeIds.includes(theme.id)) return theme
  }

  // All exhausted — cycle
  return themes[usedThemeIds.length % themes.length]
}

// Calculate animation durations based on BPM and division
export function getAnimationDurations(theme: Theme): { bounce: number; sway: number } {
  const beatDuration = 60 / theme.bpm
  const swayDuration = beatDuration * 6 // sway lasts for 6 beats
  return {
    bounce: beatDuration / theme.division, // divide sway by division for bounce count
    sway: swayDuration,
  }
}
