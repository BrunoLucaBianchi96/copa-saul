# Ticket 04: Bet-Based Match Scoring

## Changes

### `src/app/api/tournaments/[id]/matches/[matchId]/route.ts`
Replace flat 1-point scoring (lines 32-88) with:
1. Look up `winnerBet` and `loserBet` for the match's `selectedGame`
2. Call `calculateMatchPoints(winnerBet, loserBet)`
3. Store `pointsAwarded` on the match row
4. Award points only to the winner
5. Return `{ success: true, pointsAwarded }` in response

### `src/app/api/tournaments/[id]/matches/[matchId]/reset/route.ts`
Replace hard-coded `points - 1` (lines 27-59) with:
- Subtract `match.pointsAwarded` from winner (using `Math.max(0, ...)`)
- Reset `pointsAwarded` to `null` in the match reset SET clause

### `src/app/api/tournaments/[id]/start/route.ts`
- Change bye points from `1` to `BYE_POINTS` (20)
- **Bug fix:** Line 79-82 updates ALL players' points for bye. Add `eq(tournamentPlayers.playerId, pairing.player1Id)` to where clause.

### `src/app/api/tournaments/[id]/next-round/route.ts`
- Change bye points from `+1` to `+BYE_POINTS` (line 50)

## Acceptance Criteria
- Default bets (no bets set): winner gets 20 pts
- Equal bets (both 40): winner gets 40 pts
- Underdog win (10 vs 50): underdog gets 50 pts
- Top dog win (50 vs 10): top dog gets 10 + floor(40/2) = 30 pts
- Match reset subtracts correct points (not hard-coded 1)
- Bye awards 20 points to the correct player only
