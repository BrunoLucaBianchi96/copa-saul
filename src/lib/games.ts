export interface Game {
  id: string
  name: string
}

export const GAMES: Game[] = [
  { id: 'nidhogg', name: 'Nidhogg' },
  { id: 'tetris', name: 'Tetris' },
  { id: 'windjammers', name: 'Windjammers' },
  { id: 'mario-war', name: 'Mario War' },
  { id: 'darts', name: 'Darts' },
  { id: 'db-tenkaichi', name: 'DB Tenkaichi' },
  { id: 'duck-game', name: 'Duck Game' },
]

export type PickBanActionType = 'ban' | 'pick' | 'skip'

export interface PickBanAction {
  type: PickBanActionType
  player: 1 | 2
  gameId?: string // undefined for skip
  phase: 'ban1' | 'pick' | 'ban2'
}

// Game can be in one of three states:
// - 'available': normal state, can be banned or picked
// - 'protected': has been picked, banning it just removes protection (goes back to available)
// - 'banned': has been banned, can be picked to become protected
export type GameStatus = 'available' | 'protected' | 'banned'

export interface GameState {
  status: GameStatus
  protectedBy: 1 | 2 | null // which player protected this game
  bannedBy: 1 | 2 | null // which player banned this game (only set when status is 'banned')
}

export interface PickBanState {
  actions: PickBanAction[]
  currentPhase: 'ban1' | 'pick' | 'ban2' | 'selecting' | 'complete'
  currentPlayer: 1 | 2
  ban2Remaining: number // for ban2 phase, how many bans left for current player
  selectedGame?: string
}

// Calculate game states from actions
export function getGameStates(actions: PickBanAction[]): Map<string, GameState> {
  const states = new Map<string, GameState>()

  // Initialize all games as available
  for (const game of GAMES) {
    states.set(game.id, { status: 'available', protectedBy: null, bannedBy: null })
  }

  // Apply actions in order
  for (const action of actions) {
    if (!action.gameId) continue

    const current = states.get(action.gameId)!

    if (action.type === 'pick') {
      // Pick protects a game (works on any game - banned or available)
      states.set(action.gameId, {
        status: 'protected',
        protectedBy: action.player,
        bannedBy: null,
      })
    } else if (action.type === 'ban') {
      if (current.status === 'protected') {
        // Banning a protected game just removes protection (back to available)
        states.set(action.gameId, {
          status: 'available',
          protectedBy: null,
          bannedBy: null,
        })
      } else if (current.status === 'available') {
        // Banning an available game actually bans it
        states.set(action.gameId, {
          status: 'banned',
          protectedBy: null,
          bannedBy: action.player,
        })
      }
      // Can't ban an already banned game
    }
  }

  return states
}

// Calculate initial state or state from history
export function calculatePickBanState(actions: PickBanAction[], selectedGame?: string): PickBanState {
  if (actions.length === 0) {
    return {
      actions: [],
      currentPhase: 'ban1',
      currentPlayer: 1,
      ban2Remaining: 1,
    }
  }

  // Count actions by phase
  const ban1Actions = actions.filter(a => a.phase === 'ban1')
  const pickActions = actions.filter(a => a.phase === 'pick')
  const ban2Actions = actions.filter(a => a.phase === 'ban2')

  // Determine current phase and player
  if (ban1Actions.length < 2) {
    return {
      actions,
      currentPhase: 'ban1',
      currentPlayer: ban1Actions.length === 0 ? 1 : 2,
      ban2Remaining: 1,
    }
  }

  if (pickActions.length < 2) {
    return {
      actions,
      currentPhase: 'pick',
      currentPlayer: pickActions.length === 0 ? 1 : 2,
      ban2Remaining: 1,
    }
  }

  if (ban2Actions.length < 2) {
    const player1Ban2s = ban2Actions.filter(a => a.player === 1).length
    const player2Ban2s = ban2Actions.filter(a => a.player === 2).length

    if (player1Ban2s < 1) {
      return {
        actions,
        currentPhase: 'ban2',
        currentPlayer: 1,
        ban2Remaining: 1 - player1Ban2s,
      }
    } else {
      return {
        actions,
        currentPhase: 'ban2',
        currentPlayer: 2,
        ban2Remaining: 1 - player2Ban2s,
      }
    }
  }

  // All actions complete
  if (selectedGame) {
    return {
      actions,
      currentPhase: 'complete',
      currentPlayer: 1,
      ban2Remaining: 0,
      selectedGame,
    }
  }

  return {
    actions,
    currentPhase: 'selecting',
    currentPlayer: 1,
    ban2Remaining: 0,
  }
}
