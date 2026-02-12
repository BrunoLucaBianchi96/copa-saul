# Ticket 05: Bets Page UI

## Changes

### `src/app/tournaments/[id]/bets/page.tsx` (NEW)
Server component:
- Fetch tournament (redirect if not `pending`)
- Fetch all tournament players
- Get session player ID via `getSessionPlayerId()`
- Render `<BetsForm>` with auto-selected player for players, or full dropdown for host

### `src/app/tournaments/[id]/bets/bets-form.tsx` (NEW)
Client component:

**For players** (sessionPlayerId set): Auto-selected, shows "Setting bets for: {name}".
**For host** (no sessionPlayerId): Player selection dropdown, then bet form.

**Bet allocation UI:**
- 7 rows: game image thumbnail, game name, number input (min 10)
- Running total: `{total} / 140` with green (valid) / red (invalid) indicator
- "Reset to Default" button (all to 20)
- "Save" button (PUT, disabled when total != 140 or any < 10)
- Success feedback on save

### `src/app/tournaments/[id]/actions.tsx`
When `tournament.status === 'pending'` (lines 142-150):
- Add "Set Bets" link to `/tournaments/[id]/bets`
- Visible to ALL roles (host and player)

### `src/app/tournaments/[id]/page.tsx`
- Add `matches.pointsAwarded` to `getRoundMatches` select

### `src/app/tournaments/[id]/match-list.tsx`
- Show "+{points} pts" next to winner name for completed matches

### `messages/en.json` and `messages/es.json`
- Add `bets.*` keys, `auth.selectYourName/playerSelect`, update `rules.scoring*`
- Add `match.pointsAwarded`

## Acceptance Criteria
- "Set Bets" link visible on pending tournament page
- Bets page shows game list with inputs
- Total validation works (green at 140, red otherwise)
- Save persists bets and shows confirmation
- Match list shows points awarded for completed matches
