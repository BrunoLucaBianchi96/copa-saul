# Ticket 06: Real-Time Pick-Ban with Player Control

## Problem
Currently the host controls all pick-ban actions on a single screen. With per-player identity (ticket-01), each player should control their own turn from their own device. This requires real-time sync between clients.

## Approach: Polling (simpler, no infrastructure changes)
Use polling to sync pick-ban state. Each client polls the match state periodically and updates when changes are detected. WebSockets would be ideal but require additional server infrastructure (Next.js doesn't natively support persistent WS connections in serverless).

### `src/app/components/pick-ban.tsx`
- Add new prop: `sessionPlayerId: number | null` (from server component)
- **Turn control**: Player can only act when it's their turn:
  - `isMyTurn = sessionPlayerId === (state.currentPlayer === 1 ? player1Id : player2Id)`
  - `isInteractive` changes from `isHost && ...` to `(isHost || isMyTurn) && ...`
  - `canSelectWinner` remains host-only (host records result)
- **Polling loop**: When it's NOT the player's turn, poll `GET /api/tournaments/[id]/matches/[matchId]/state` every 2-3 seconds
  - On state change: update `actions`, `selectedGame`, `localMatchResult` from server
  - Stop polling when match is complete
- Visual indicator showing "Waiting for {opponent}..." when not your turn

### `src/app/api/tournaments/[id]/matches/[matchId]/state/route.ts` (NEW)
Lightweight GET endpoint returning current match state:
```json
{
  "pickBanHistory": [...],
  "selectedGame": "...",
  "result": "pending",
  "pointsAwarded": null
}
```

### `src/app/tournaments/[id]/matches/[matchId]/page.tsx`
- Pass `sessionPlayerId` to `<PickBan>` component

## Acceptance Criteria
- Player 1 can ban/pick on their own device during their turn
- Player 2 sees the update within 2-3 seconds
- Players cannot act when it's not their turn
- Host can still act on behalf of any player (backwards compatible)
- Game selection animation still runs correctly
- Match result recording remains host-only
- Polling stops when match completes
