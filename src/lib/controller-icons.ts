export type ControllerPlatform = 'playstation' | 'wii'

export type PlayStationButton =
  | 'cross'
  | 'circle'
  | 'square'
  | 'triangle'
  | 'color-cross'
  | 'color-circle'
  | 'color-square'
  | 'color-triangle'
  | 'l3'
  | 'r3'
  | 'l1'
  | 'l2'
  | 'r1'
  | 'r2'
  | 'dpad'
  | 'dpad-up'
  | 'dpad-down'
  | 'dpad-left'
  | 'dpad-right'
  | 'stick-l'
  | 'stick-r'
  | 'stick-l-up'
  | 'stick-l-down'
  | 'stick-l-left'
  | 'stick-l-right'
  | 'stick-r-up'
  | 'stick-r-down'
  | 'stick-r-left'
  | 'stick-r-right'

export type WiiButton =
  | 'a'
  | 'b'
  | 'c'
  | 'z'
  | 'plus'
  | 'minus'
  | '1'
  | '2'
  | 'home'
  | 'l'
  | 'r'
  | 'zl'
  | 'zr'
  | 'dpad'
  | 'dpad-up'
  | 'dpad-down'
  | 'dpad-left'
  | 'dpad-right'
  | 'nunchuk'
  | 'stick'
  | 'stick-up'
  | 'stick-down'
  | 'stick-left'
  | 'stick-right'

export const PLAYSTATION_MAP: Record<PlayStationButton, string> = {
  'cross': 'playstation_button_cross',
  'circle': 'playstation_button_circle',
  'square': 'playstation_button_square',
  'triangle': 'playstation_button_triangle',
  'color-cross': 'playstation_button_color_cross',
  'color-circle': 'playstation_button_color_circle',
  'color-square': 'playstation_button_color_square',
  'color-triangle': 'playstation_button_color_triangle',
  'l3': 'playstation_button_l3',
  'r3': 'playstation_button_r3',
  'l1': 'playstation_trigger_l1',
  'l2': 'playstation_trigger_l2',
  'r1': 'playstation_trigger_r1',
  'r2': 'playstation_trigger_r2',
  'dpad': 'playstation_dpad',
  'dpad-up': 'playstation_dpad_up',
  'dpad-down': 'playstation_dpad_down',
  'dpad-left': 'playstation_dpad_left',
  'dpad-right': 'playstation_dpad_right',
  'stick-l': 'playstation_stick_l',
  'stick-r': 'playstation_stick_r',
  'stick-l-up': 'playstation_stick_l_up',
  'stick-l-down': 'playstation_stick_l_down',
  'stick-l-left': 'playstation_stick_l_left',
  'stick-l-right': 'playstation_stick_l_right',
  'stick-r-up': 'playstation_stick_r_up',
  'stick-r-down': 'playstation_stick_r_down',
  'stick-r-left': 'playstation_stick_r_left',
  'stick-r-right': 'playstation_stick_r_right',
}

export const WII_MAP: Record<WiiButton, string> = {
  'a': 'wii_button_a',
  'b': 'wii_button_b',
  'c': 'wii_button_c',
  'z': 'wii_button_z',
  'plus': 'wii_button_plus',
  'minus': 'wii_button_minus',
  '1': 'wii_button_1',
  '2': 'wii_button_2',
  'home': 'wii_button_home',
  'l': 'wii_button_l',
  'r': 'wii_button_r',
  'zl': 'wii_button_zl',
  'zr': 'wii_button_zr',
  'dpad': 'wii_dpad',
  'dpad-up': 'wii_dpad_up',
  'dpad-down': 'wii_dpad_down',
  'dpad-left': 'wii_dpad_left',
  'dpad-right': 'wii_dpad_right',
  'nunchuk': 'wii_controller_nunchuk',
  'stick': 'wii_stick',
  'stick-up': 'wii_stick_up',
  'stick-down': 'wii_stick_down',
  'stick-left': 'wii_stick_left',
  'stick-right': 'wii_stick_right',
}

export function getControllerIconPath(
  platform: ControllerPlatform,
  button: PlayStationButton | WiiButton,
): string {
  const map = platform === 'playstation' ? PLAYSTATION_MAP : WII_MAP
  const filename = (map as Record<string, string>)[button]
  if (!filename) {
    throw new Error(`Unknown button "${button}" for platform "${platform}"`)
  }
  return `/icons/controller/${platform}/${filename}.svg`
}

// Shorthand notation: "PS-SQUARE", "PS-R2", "PS-LS-UP", "WII-A", "WII-DPAD-UP"
// PS-LS-* maps to stick-l-*, PS-RS-* maps to stick-r-*
// PS-LS / PS-RS (no direction) maps to stick-l / stick-r
// Append +HOLD to indicate the button must be held: "PS-R2+HOLD"
// Use / to indicate a choice between buttons: "PS-COLOR-SQUARE/PS-COLOR-TRIANGLE"

const PS_SHORTHAND: Record<string, PlayStationButton> = {
  'CROSS': 'cross', 'CIRCLE': 'circle', 'SQUARE': 'square', 'TRIANGLE': 'triangle',
  'COLOR-CROSS': 'color-cross', 'COLOR-CIRCLE': 'color-circle',
  'COLOR-SQUARE': 'color-square', 'COLOR-TRIANGLE': 'color-triangle',
  'L3': 'l3', 'R3': 'r3', 'L1': 'l1', 'L2': 'l2', 'R1': 'r1', 'R2': 'r2',
  'DPAD': 'dpad', 'DPAD-UP': 'dpad-up', 'DPAD-DOWN': 'dpad-down',
  'DPAD-LEFT': 'dpad-left', 'DPAD-RIGHT': 'dpad-right',
  'LS': 'stick-l', 'RS': 'stick-r',
  'LS-UP': 'stick-l-up', 'LS-DOWN': 'stick-l-down',
  'LS-LEFT': 'stick-l-left', 'LS-RIGHT': 'stick-l-right',
  'RS-UP': 'stick-r-up', 'RS-DOWN': 'stick-r-down',
  'RS-LEFT': 'stick-r-left', 'RS-RIGHT': 'stick-r-right',
}

const WII_SHORTHAND: Record<string, WiiButton> = {
  'A': 'a', 'B': 'b', 'C': 'c', 'Z': 'z',
  'PLUS': 'plus', 'MINUS': 'minus', '1': '1', '2': '2', 'HOME': 'home',
  'L': 'l', 'R': 'r', 'ZL': 'zl', 'ZR': 'zr',
  'DPAD': 'dpad', 'DPAD-UP': 'dpad-up', 'DPAD-DOWN': 'dpad-down',
  'DPAD-LEFT': 'dpad-left', 'DPAD-RIGHT': 'dpad-right',
  'NUNCHUK': 'nunchuk', 'STICK': 'stick',
  'STICK-UP': 'stick-up', 'STICK-DOWN': 'stick-down',
  'STICK-LEFT': 'stick-left', 'STICK-RIGHT': 'stick-right',
}

export interface ParsedControl {
  platform: ControllerPlatform
  button: PlayStationButton | WiiButton
  hold: boolean
}

export type ParsedButton = ParsedControl | ParsedControl[]

export function parseControlNotation(notation: string): ParsedButton | null {
  if (notation.includes('/')) {
    const parts = notation.split('/')
    const parsed = parts.map(p => parseSingle(p))
    if (parsed.some(p => p === null)) return null
    return parsed as ParsedControl[]
  }
  return parseSingle(notation)
}

function parseSingle(notation: string): ParsedControl | null {
  let upper = notation.toUpperCase()
  const hold = upper.endsWith('+HOLD')
  if (hold) upper = upper.slice(0, -5)

  if (upper.startsWith('PS-')) {
    const key = upper.slice(3)
    const button = PS_SHORTHAND[key]
    if (button) return { platform: 'playstation', button, hold }
  } else if (upper.startsWith('WII-')) {
    const key = upper.slice(4)
    const button = WII_SHORTHAND[key]
    if (button) return { platform: 'wii', button, hold }
  }
  return null
}
