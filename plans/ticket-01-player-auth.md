# Ticket 01: Player Identity in Sessions

## Problem
The current auth system only stores `"host"` or `"player"` in the session cookie. There is no way to know *which* player is logged in, which is needed for the betting system (secrecy, auto-selection) and for real-time pick-ban control.

## Changes

### `src/lib/session.ts`
- `getSession()` — still returns `Role | null`. Parse `"player:5"` as `"player"`. Existing callers unaffected.
- `setSession(role, playerId?)` — stores `"player:{id}"` when playerId provided.
- **NEW** `getSessionPlayerId()` — extracts player ID from `"player:5"` format. Returns null for host/anonymous.

### `src/app/api/auth/login/route.ts`
- Accept optional `playerId` in request body.
- When `role === 'player'` and `playerId` provided, call `setSession('player', playerId)`.
- Validate playerId corresponds to an existing player.

### `src/app/components/login-form.tsx`
- "Join as Player" now transitions to a **player selection step** instead of immediately logging in.
- New mode `'player-select'` in `LoginMode` union.
- Player selects their name from a list, then confirms.
- Login request sends `{ role: 'player', playerId: selectedId }`.
- Needs `players` prop (list of all players).

### `src/app/page.tsx`
- Fetch players list even when `!role` (unauthenticated) to pass to `<LoginForm>`.
- Show logged-in player's name in the header badge using `getSessionPlayerId()`.

## Acceptance Criteria
- Clicking "Join as Player" shows player selection dropdown
- After selecting a player, session cookie stores `player:{id}`
- Header displays the player's name
- `getSessionPlayerId()` returns correct ID
- Existing host login flow unchanged
- All existing pages still work (no breaking changes to `getSession()`)
