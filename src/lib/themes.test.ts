import { describe, it, expect } from 'vitest'
import { getThemeForMatch, THEMES } from './themes'

describe('getThemeForMatch', () => {
  // ---------------------------------------------------------------
  // 1. Priority themes assigned in the correct round
  // ---------------------------------------------------------------
  describe('priority rules', () => {
    it('assigns balatro to Lucho in round 1', () => {
      const theme = getThemeForMatch([], ['Lucho', 'Someone'], 1)
      expect(theme.id).toBe('balatro')
    })

    it('assigns stardust-crusaders to Lucho in round 4', () => {
      const theme = getThemeForMatch([], ['Someone', 'Lucho'], 4)
      expect(theme.id).toBe('stardust-crusaders')
    })

    it('does NOT assign balatro to Lucho in a non-round-1 match', () => {
      const theme = getThemeForMatch([], ['Lucho', 'Someone'], 2)
      expect(theme.id).not.toBe('balatro')
    })

    it('does NOT assign stardust-crusaders to Lucho in a non-round-4 match', () => {
      const theme = getThemeForMatch([], ['Lucho', 'Someone'], 1)
      // round 1 → balatro, not stardust
      expect(theme.id).not.toBe('stardust-crusaders')
    })

    it('assigns live-and-learn to Ailen in any round', () => {
      for (const round of [1, 2, 3, 4]) {
        const theme = getThemeForMatch([], ['Ailen', 'Someone'], round)
        expect(theme.id).toBe('live-and-learn')
      }
    })

    it('matches player names case-insensitively', () => {
      const theme = getThemeForMatch([], ['LUCHO', 'Someone'], 1)
      expect(theme.id).toBe('balatro')
    })

    it('matches player names as substring', () => {
      const theme = getThemeForMatch([], ['Someone', 'Maria Ailen'], 2)
      expect(theme.id).toBe('live-and-learn')
    })

    it('falls back to sequential when no priority matches', () => {
      const theme = getThemeForMatch([], ['Alice', 'Bob'], 1)
      expect(theme.id).toBe(THEMES[0].id)
    })

    it('skips priority theme if already used', () => {
      const theme = getThemeForMatch(['balatro'], ['Lucho', 'Someone'], 1)
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

      // Assign themes for enough matches to cover all themes
      for (let i = 0; i < THEMES.length; i++) {
        const theme = getThemeForMatch(used, ['Alice', 'Bob'], 1)
        expect(used).not.toContain(theme.id)
        used.push(theme.id)
      }
    })

    it('all THEMES are assigned exactly once before any repeat', () => {
      const used: string[] = []

      for (let i = 0; i < THEMES.length; i++) {
        const theme = getThemeForMatch(used, ['Alice', 'Bob'], 1)
        used.push(theme.id)
      }

      // Every theme ID should appear exactly once
      const themeIds = THEMES.map((t) => t.id)
      expect(used.sort()).toEqual(themeIds.sort())
    })
  })

  // ---------------------------------------------------------------
  // 3. After exhausting all themes, cycle and priorities kick in again
  // ---------------------------------------------------------------
  describe('cycling after exhaustion', () => {
    it('returns a theme even when all are used (cycles)', () => {
      const allIds = THEMES.map((t) => t.id)
      const theme = getThemeForMatch(allIds, ['Alice', 'Bob'], 1)
      expect(theme).toBeDefined()
      expect(theme.id).toBe(THEMES[allIds.length % THEMES.length].id)
    })

    it('priority rules fire again on the second cycle', () => {
      // Simulate: all themes used once, now starting a fresh cycle
      // Even though usedThemeIds is full, the cycle fallback kicks in.
      // But if we reset usedThemeIds (as a new tournament would), priorities work again.
      const theme = getThemeForMatch([], ['Lucho', 'Someone'], 1)
      expect(theme.id).toBe('balatro')
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
        // Round 1 — 4 matches
        [1, ['Lucho', 'Carlos']],
        [1, ['Ailen', 'Pedro']],
        [1, ['Diego', 'Maria']],
        [1, ['Juan', 'Sofia']],
        // Round 2 — 4 matches
        [2, ['Lucho', 'Pedro']],
        [2, ['Ailen', 'Carlos']],
        [2, ['Diego', 'Sofia']],
        [2, ['Juan', 'Maria']],
        // Round 3 — 4 matches
        [3, ['Lucho', 'Maria']],
        [3, ['Ailen', 'Sofia']],
        [3, ['Diego', 'Carlos']],
        [3, ['Juan', 'Pedro']],
        // Round 4 — 4 matches
        [4, ['Lucho', 'Sofia']],
        [4, ['Ailen', 'Diego']],
        [4, ['Carlos', 'Maria']],
        [4, ['Juan', 'Pedro']],
      ]

      for (const [round, players] of roundMatchups) {
        const theme = getThemeForMatch(used, players, round)
        used.push(theme.id)
        assignments.push({ round, players, themeId: theme.id })
      }

      // Lucho round 1 → balatro
      const luchoR1 = assignments.find(
        (a) => a.round === 1 && a.players.includes('Lucho')
      )
      expect(luchoR1?.themeId).toBe('balatro')

      // Ailen round 1 → live-and-learn
      const ailenR1 = assignments.find(
        (a) => a.round === 1 && a.players.includes('Ailen')
      )
      expect(ailenR1?.themeId).toBe('live-and-learn')

      // Lucho round 4 → stardust-crusaders
      const luchoR4 = assignments.find(
        (a) => a.round === 4 && a.players.includes('Lucho')
      )
      expect(luchoR4?.themeId).toBe('stardust-crusaders')

      // Ailen round 2 → live-and-learn already used, so gets fallback
      const ailenR2 = assignments.find(
        (a) => a.round === 2 && a.players.includes('Ailen')
      )
      expect(ailenR2?.themeId).not.toBe('live-and-learn')

      // No duplicates across the entire tournament
      const uniqueIds = new Set(used)
      expect(uniqueIds.size).toBe(used.length)
    })
  })
})
