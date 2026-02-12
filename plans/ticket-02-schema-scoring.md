# Ticket 02: Database Schema + Scoring Library

## Changes

### `src/db/schema.ts`
Add `playerBets` table:
```typescript
export const playerBets = sqliteTable('player_bets', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  tournamentId: integer('tournament_id').notNull().references(() => tournaments.id),
  playerId: integer('player_id').notNull().references(() => players.id),
  gameId: text('game_id').notNull(),
  bet: integer('bet').notNull().default(20),
})
export type PlayerBet = typeof playerBets.$inferSelect
```

Add `pointsAwarded` column to `matches`:
```typescript
pointsAwarded: integer('points_awarded'),
```

Run `npx drizzle-kit generate` then `npm run db:push`.

### `src/lib/scoring.ts` (NEW)
Constants:
- `TOTAL_BET_POINTS = 140`, `MIN_BET_PER_GAME = 10`, `DEFAULT_BET = 20`, `BYE_POINTS = 20`

Functions:
- `validateBets(bets)` — exactly 7 entries, each >= 10, total = 140, valid game IDs
- `getPlayerBetForGame(tournamentId, playerId, gameId)` — returns bet or DEFAULT_BET
- `getPlayerBets(tournamentId, playerId)` — returns all 7 bets with defaults
- `calculateMatchPoints(winnerBet, loserBet)`:
  - Equal: return winnerBet
  - Underdog wins (winnerBet < loserBet): return loserBet
  - Top dog wins (winnerBet > loserBet): return loserBet + Math.floor((winnerBet - loserBet) / 2)

## Acceptance Criteria
- Schema pushes cleanly
- `calculateMatchPoints(20, 20)` returns 20
- `calculateMatchPoints(30, 80)` returns 80 (underdog)
- `calculateMatchPoints(80, 30)` returns 55 (top dog)
- `calculateMatchPoints(15, 40)` returns 27 (floor rounding: 15 + floor(25/2) = 27)
- `validateBets()` rejects totals != 140, bets < 10, wrong count
