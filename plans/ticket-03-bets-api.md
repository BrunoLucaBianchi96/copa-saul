# Ticket 03: Bets API Endpoint

## Changes

### `src/app/api/tournaments/[id]/bets/route.ts` (NEW)

**GET** `?playerId=X`
- Returns player's 7 bets (with defaults for unset games)
- Validates player is in tournament
- Players can only fetch their own bets (check `getSessionPlayerId()` matches `playerId`)
- Host can fetch any player's bets

**PUT** `{ playerId, bets: [{ gameId, bet }] }`
- Validates tournament status is `'pending'`
- Validates player is in tournament
- Players can only save their own bets; host can save for any player
- Calls `validateBets()` for constraint checking
- Deletes existing bets then inserts new ones

## Acceptance Criteria
- GET returns default 20 for all games when no bets set
- PUT saves bets, subsequent GET returns saved values
- PUT rejects bets when tournament is not pending
- PUT rejects invalid totals/minimums
- Player A cannot GET Player B's bets (403)
- Host can GET any player's bets
