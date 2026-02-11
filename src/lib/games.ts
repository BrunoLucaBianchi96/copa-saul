export interface ControlEntry {
  label: string
  buttons: string[] // shorthand notation, e.g. ["PS-SQUARE", "PS-R2"]
}

export interface Game {
  id: string
  name: string
  description?: string
  howToPlay?: string
  imageUrl?: string
  imageFit?: 'cover' | 'contain'
  videoUrl?: string
  videoStart?: number
  controls?: ControlEntry[]
}

export const GAMES: Game[] = [
  {
    id: 'sparking-zero',
    name: 'Sparking Zero',
    imageUrl: '/avatars/sparking-zero-2.jpg',
    videoUrl: 'https://www.youtube.com/watch?v=wV-dsMTKgH4',
    videoStart: 25,
    "controls": [
      {
        "label": "Subir",
        "buttons": ["PS-L1"]
      },
      {
        "label": "Bajar",
        "buttons": ["PS-L2"]
      },
      {
        "label": "Blockear",
        "buttons": ["PS-R1+HOLD"]
      },
      {
        "label": "Cargar Ki",
        "buttons": ["PS-R2+HOLD"]
      },
      {
        "label": "Poderes",
        "buttons": ["PS-R2+HOLD", "+", "PS-COLOR-SQUARE/PS-COLOR-TRIANGLE/PS-COLOR-CIRCLE/PS-COLOR-CROSS"]
      },
      {
        "label": "Counterear",
        "buttons": ["PS-COLOR-CIRCLE+HOLD"]
      },
      {
        "label": "Volar rapido",
        "buttons": ["PS-R2+HOLD", "+", "PS-COLOR-CROSS"]
      },
      {
        "label": "Dashear al otro",
        "buttons": ["PS-R2+HOLD", "+", "PS-COLOR-CROSS", "PS-COLOR-CROSS"]
      },
      {
        "label": "Combo (todos los combos son cuadrado una a cuatro veces y despues triangulo)",
        "buttons": ["PS-COLOR-SQUARE", "PS-COLOR-SQUARE","PS-COLOR-TRIANGLE"]
      },
      {
        "label": "Cambiar de personaje",
        "buttons": ["PS-DPAD-LEFT+HOLD", "+", "PS-COLOR-SQUARE/PS-COLOR-TRIANGLE/PS-COLOR-CIRCLE/PS-COLOR-CROSS"]
      },
      {
        "label": "Transformaciones y fusiones",
        "buttons": ["PS-DPAD-UP+HOLD", "+", "PS-COLOR-SQUARE/PS-COLOR-TRIANGLE/PS-COLOR-CIRCLE/PS-COLOR-CROSS"]
      },
    ],
  },
  {
    id: 'taiko-no-tatsujin',
    name: 'Taiko no Tatsujin',
    imageUrl: '/avatars/taiko.webp',
    imageFit: 'contain',
    videoUrl: 'https://www.youtube.com/watch?v=ynP3WcqcUHc',
    videoStart: 462,
    controls: [
      { label: 'Nota roja', buttons: ['WII-1'] },
      { label: 'Nota azul', buttons: ['WII-2'] },
      { label: 'Nota globo', buttons: ['WII-1/WII-2'] },
      { label: 'Nota amarilla', buttons: ['WII-1/WII-2'] },
    ],
  },
  {
    id: 'trackmania',
    name: 'Trackmania',
    imageUrl: '/avatars/trackmania.jpg',
    videoUrl: 'https://www.youtube.com/watch?v=VEe4e0OA67I',
    videoStart: 18,
    controls: [
      { label: 'Acelerar', buttons: ['PS-R2'] },
      { label: 'Frenar', buttons: ['PS-L2'] },
    ],
  },
  { id: 'wii-sports-ping-pong', name: 'Wii Sports Ping Pong', imageUrl: '/avatars/wii-sports.jpg' },
  { id: 'tricky-towers', name: 'Tricky Towers', imageUrl: '/avatars/tricky-towers.jpg', videoUrl: 'https://www.youtube.com/watch?v=GyT1S0jeRq0', videoStart: 113 },
  {
    id: 'duck-game',
    name: 'Duck Game',
    imageUrl: '/avatars/duck-game.jpeg',
    videoUrl: 'https://www.youtube.com/watch?v=VZrwIrfr7xk',
    videoStart: 327,
    controls: [
      { label: 'Moverse', buttons: ['PS-LS'] },
      { label: 'Lengua', buttons: ['PS-RS'] },
      { label: 'Saltar / Aceptar', buttons: ['PS-COLOR-CROSS'] },
      { label: 'Cuac', buttons: ['PS-COLOR-CIRCLE'] },
      { label: 'Disparar', buttons: ['PS-COLOR-SQUARE'] },
      { label: 'Agarrar', buttons: ['PS-COLOR-TRIANGLE'] },
      { label: 'Strafe', buttons: ['PS-L1'] },
      { label: 'Tropezar / Ragdoll', buttons: ['PS-R1'] },
    ],
  },
  { id: 'boomerang-fu', name: 'Boomerang Fu', imageUrl: '/avatars/boomerang-fu.jpg', videoUrl: 'https://www.youtube.com/watch?v=I1wz1M-n98c', videoStart: 90 },
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
