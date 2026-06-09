import { describe, it, expect } from 'vitest'
import { selectThemeForMatch, type Theme, type ThemePriority } from './themes'

// The theme data now lives in the database; selectThemeForMatch is the pure
// assignment algorithm that operates on a supplied, already-ordered theme list
// plus the active priority rules. These tests exercise it with a fixed mock list
// that mirrors the shape of the merged runtime list (priority themes included).

const t = (id: string): Theme => ({ id, name: id, bpm: 120, division: 1 })

// Priority themes are kept at the END of the order (as in the real merged list)
// so sequential fallback fills generics first and doesn't consume a priority
// theme before its designated round.
const THEMES: Theme[] = [
  t('first-theme'),
  t('gen-1'),
  t('gen-2'),
  t('gen-3'),
  t('gen-4'),
  t('balatro'),
  t('stardust-crusaders'),
  t('live-and-learn'),
]

const PRIORITIES: ThemePriority[] = [
  { playerName: 'Lucho', themeId: 'balatro', round: 1 },
  { playerName: 'Lucho', themeId: 'stardust-crusaders', round: 4 },
  { playerName: 'Ailen', themeId: 'live-and-learn' },
]

const select = (used: string[], names: string[], round: number) =>
  selectThemeForMatch(THEMES, PRIORITIES, used, names, round)

describe('selectThemeForMatch', () => {
  // ---------------------------------------------------------------
  // 1. Priority themes assigned in the correct round
  // ---------------------------------------------------------------
  describe('priority rules', () => {
    it('assigns balatro to Lucho in round 1', () => {
      expect(select([], ['Lucho', 'Someone'], 1).id).toBe('balatro')
    })

    it('assigns stardust-crusaders to Lucho in round 4', () => {
      expect(select([], ['Someone', 'Lucho'], 4).id).toBe('stardust-crusaders')
    })

    it('does NOT assign balatro to Lucho in a non-round-1 match', () => {
      expect(select([], ['Lucho', 'Someone'], 2).id).not.toBe('balatro')
    })

    it('does NOT assign stardust-crusaders to Lucho in a non-round-4 match', () => {
      expect(select([], ['Lucho', 'Someone'], 1).id).not.toBe('stardust-crusaders')
    })

    it('assigns live-and-learn to Ailen in any round', () => {
      for (const round of [1, 2, 3, 4]) {
        expect(select([], ['Ailen', 'Someone'], round).id).toBe('live-and-learn')
      }
    })

    it('matches player names case-insensitively', () => {
      expect(select([], ['LUCHO', 'Someone'], 1).id).toBe('balatro')
    })

    it('matches player names as substring', () => {
      expect(select([], ['Someone', 'Maria Ailen'], 2).id).toBe('live-and-learn')
    })

    it('falls back to sequential when no priority matches', () => {
      expect(select([], ['Alice', 'Bob'], 1).id).toBe(THEMES[0].id)
    })

    it('skips priority theme if already used', () => {
      const theme = select(['balatro'], ['Lucho', 'Someone'], 1)
      // balatro is used, no other priority rule matches round 1 for Lucho → fallback
      expect(theme.id).not.toBe('balatro')
      expect(theme.id).toBe(THEMES[0].id)
    })
  })

  // ---------------------------------------------------------------
  // 2. No theme repeats until all are exhausted
  // ---------------------------------------------------------------
  describe('no repeats', () => {
    it('never returns a theme already in usedThemeIds', () => {
      const used: string[] = []
      for (let i = 0; i < THEMES.length; i++) {
        const theme = select(used, ['Alice', 'Bob'], 1)
        expect(used).not.toContain(theme.id)
        used.push(theme.id)
      }
    })

    it('all themes are assigned exactly once before any repeat', () => {
      const used: string[] = []
      for (let i = 0; i < THEMES.length; i++) {
        used.push(select(used, ['Alice', 'Bob'], 1).id)
      }
      expect(used.slice().sort()).toEqual(THEMES.map((x) => x.id).sort())
    })
  })

  // ---------------------------------------------------------------
  // 3. After exhausting all themes, cycle
  // ---------------------------------------------------------------
  describe('cycling after exhaustion', () => {
    it('returns a theme even when all are used (cycles)', () => {
      const allIds = THEMES.map((x) => x.id)
      const theme = select(allIds, ['Alice', 'Bob'], 1)
      expect(theme).toBeDefined()
      expect(theme.id).toBe(THEMES[allIds.length % THEMES.length].id)
    })

    it('priority rules fire again on a fresh cycle (reset usedThemeIds)', () => {
      expect(select([], ['Lucho', 'Someone'], 1).id).toBe('balatro')
    })
  })

  // ---------------------------------------------------------------
  // Full tournament simulation
  // ---------------------------------------------------------------
  describe('tournament simulation', () => {
    it('assigns priority themes correctly across 4 rounds with mixed players', () => {
      const used: string[] = []
      const assignments: { round: number; players: string[]; themeId: string }[] = []

      const roundMatchups: [number, string[]][] = [
        [1, ['Lucho', 'Carlos']],
        [1, ['Ailen', 'Pedro']],
        [1, ['Diego', 'Maria']],
        [2, ['Lucho', 'Pedro']],
        [2, ['Ailen', 'Carlos']],
        [4, ['Lucho', 'Sofia']],
      ]

      for (const [round, players] of roundMatchups) {
        const theme = select(used, players, round)
        used.push(theme.id)
        assignments.push({ round, players, themeId: theme.id })
      }

      expect(assignments.find((a) => a.round === 1 && a.players.includes('Lucho'))?.themeId).toBe('balatro')
      expect(assignments.find((a) => a.round === 1 && a.players.includes('Ailen'))?.themeId).toBe('live-and-learn')
      expect(assignments.find((a) => a.round === 4 && a.players.includes('Lucho'))?.themeId).toBe('stardust-crusaders')
      // Ailen round 2 → live-and-learn already used, so gets a fallback
      expect(assignments.find((a) => a.round === 2 && a.players.includes('Ailen'))?.themeId).not.toBe('live-and-learn')

      const uniqueIds = new Set(used)
      expect(uniqueIds.size).toBe(used.length)
    })
  })
})
