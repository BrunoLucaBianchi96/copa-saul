import { useEffect, useRef, useCallback, useState } from 'react'

export type GamepadButton = 'cross' | 'circle' | 'square' | 'triangle' | 'l1' | 'r1' | 'l2' | 'r2' | 'share' | 'options' | 'l3' | 'r3' | 'ps' | 'touchpad'
export type GamepadDirection = 'up' | 'down' | 'left' | 'right'

// Standard Gamepad button indices → friendly names
const BUTTON_MAP: Record<number, GamepadButton> = {
  0: 'cross',
  1: 'circle',
  2: 'square',
  3: 'triangle',
  4: 'l1',
  5: 'r1',
  6: 'l2',
  7: 'r2',
  8: 'share',
  9: 'options',
  10: 'l3',
  11: 'r3',
  12: 'ps',      // d-pad up is handled separately
  16: 'ps',
  17: 'touchpad',
}

// D-pad button indices
const DPAD_UP = 12
const DPAD_DOWN = 13
const DPAD_LEFT = 14
const DPAD_RIGHT = 15

const STICK_DEADZONE = 0.4

// Key repeat timing
const REPEAT_DELAY = 400  // ms before repeat starts
const REPEAT_RATE = 150   // ms between repeats

// Modal suppression: when a modal claims gamepad input, other hooks yield
let _modalClaimCount = 0
export function claimGamepadForModal() { _modalClaimCount++ }
export function releaseGamepadForModal() { _modalClaimCount-- }

interface UseGamepadOptions {
  onButtonPress?: (button: GamepadButton, gamepadIndex: number) => void
  onDirection?: (dir: GamepadDirection, gamepadIndex: number) => void
  enabled?: boolean
  /** If true, this hook owns a modal and isn't suppressed by other modals */
  modal?: boolean
}

export function useGamepad({
  onButtonPress,
  onDirection,
  enabled = true,
  modal = false,
}: UseGamepadOptions): { connected: boolean; connectedCount: number } {
  const [connected, setConnected] = useState(false)
  const [connectedCount, setConnectedCount] = useState(0)

  // Store callbacks in refs so the polling loop doesn't restart on callback changes
  const onButtonPressRef = useRef(onButtonPress)
  const onDirectionRef = useRef(onDirection)
  useEffect(() => { onButtonPressRef.current = onButtonPress }, [onButtonPress])
  useEffect(() => { onDirectionRef.current = onDirection }, [onDirection])

  // Edge-detection: track which buttons were pressed last frame (per gamepad)
  const prevButtonsRef = useRef<Map<number, Set<number>>>(new Map())

  // Direction repeat state (per gamepad)
  const dirRepeatRef = useRef<Map<number, {
    dir: GamepadDirection | null
    startTime: number
    lastFireTime: number
  }>>(new Map())

  const rafRef = useRef<number>(0)
  const pausedRef = useRef(false)
  const modalRef = useRef(modal)

  const poll = useCallback(() => {
    if (pausedRef.current) return
    // When a modal claims the gamepad, suppress non-modal hooks
    const suppressed = _modalClaimCount > 0 && !modalRef.current

    const gamepads = navigator.getGamepads()

    // Track which gamepad indices are active this frame
    const activeIndices = new Set<number>()
    let count = 0

    for (let gpIdx = 0; gpIdx < gamepads.length; gpIdx++) {
      const gp = gamepads[gpIdx]
      if (!gp) continue

      activeIndices.add(gpIdx)
      count++

      const now = performance.now()

      // Get or create per-gamepad button state
      if (!prevButtonsRef.current.has(gpIdx)) {
        prevButtonsRef.current.set(gpIdx, new Set())
      }
      const prevButtons = prevButtonsRef.current.get(gpIdx)!
      const newButtons = new Set<number>()

      // --- Buttons (edge detection) ---
      for (let i = 0; i < gp.buttons.length; i++) {
        if (gp.buttons[i].pressed) {
          newButtons.add(i)

          // Skip d-pad buttons (handled as directions below)
          if (i >= DPAD_UP && i <= DPAD_RIGHT) continue

          // Fire only on initial press (not held), and only if not suppressed
          if (!suppressed && !prevButtons.has(i)) {
            const name = BUTTON_MAP[i]
            if (name) {
              onButtonPressRef.current?.(name, gpIdx)
            }
          }
        }
      }
      prevButtonsRef.current.set(gpIdx, newButtons)

      // --- Directions (d-pad + left stick, unified with key repeat) ---
      let dir: GamepadDirection | null = null

      // D-pad
      if (gp.buttons[DPAD_UP]?.pressed) dir = 'up'
      else if (gp.buttons[DPAD_DOWN]?.pressed) dir = 'down'
      else if (gp.buttons[DPAD_LEFT]?.pressed) dir = 'left'
      else if (gp.buttons[DPAD_RIGHT]?.pressed) dir = 'right'

      // Left stick (only if d-pad isn't active)
      if (!dir) {
        const lx = gp.axes[0] ?? 0
        const ly = gp.axes[1] ?? 0

        // Pick dominant axis
        if (Math.abs(lx) > Math.abs(ly)) {
          if (lx < -STICK_DEADZONE) dir = 'left'
          else if (lx > STICK_DEADZONE) dir = 'right'
        } else {
          if (ly < -STICK_DEADZONE) dir = 'up'
          else if (ly > STICK_DEADZONE) dir = 'down'
        }
      }

      // Get or create per-gamepad direction repeat state
      if (!dirRepeatRef.current.has(gpIdx)) {
        dirRepeatRef.current.set(gpIdx, { dir: null, startTime: 0, lastFireTime: 0 })
      }
      const repeat = dirRepeatRef.current.get(gpIdx)!

      if (suppressed) {
        // Track direction state but don't fire callbacks
        repeat.dir = dir
        repeat.startTime = now
        repeat.lastFireTime = now
      } else if (dir) {
        if (repeat.dir !== dir) {
          // New direction — fire immediately
          onDirectionRef.current?.(dir, gpIdx)
          repeat.dir = dir
          repeat.startTime = now
          repeat.lastFireTime = now
        } else {
          // Same direction held — key repeat logic
          const held = now - repeat.startTime
          if (held >= REPEAT_DELAY) {
            const sinceLast = now - repeat.lastFireTime
            if (sinceLast >= REPEAT_RATE) {
              onDirectionRef.current?.(dir, gpIdx)
              repeat.lastFireTime = now
            }
          }
        }
      } else {
        // Released
        repeat.dir = null
      }
    }

    // Clean up state for disconnected gamepads
    prevButtonsRef.current.forEach((_, idx) => {
      if (!activeIndices.has(idx)) {
        prevButtonsRef.current.delete(idx)
        dirRepeatRef.current.delete(idx)
      }
    })

    // Update connected state
    setConnected(count > 0)
    setConnectedCount(count)

    rafRef.current = requestAnimationFrame(poll)
  }, [])

  useEffect(() => {
    if (!enabled) return

    const updateConnectedState = () => {
      const gamepads = navigator.getGamepads()
      let count = 0
      for (const gp of gamepads) {
        if (gp) count++
      }
      setConnected(count > 0)
      setConnectedCount(count)
    }

    const handleConnected = () => updateConnectedState()
    const handleDisconnected = () => updateConnectedState()

    window.addEventListener('gamepadconnected', handleConnected)
    window.addEventListener('gamepaddisconnected', handleDisconnected)

    // Check if already connected
    updateConnectedState()

    // Start polling
    rafRef.current = requestAnimationFrame(poll)

    // Pause polling when page is hidden/blurred (e.g. opening a game)
    const pausePolling = () => {
      pausedRef.current = true
      cancelAnimationFrame(rafRef.current)
      prevButtonsRef.current = new Map()
      dirRepeatRef.current = new Map()
    }

    const resumePolling = () => {
      if (!pausedRef.current) return
      pausedRef.current = false
      rafRef.current = requestAnimationFrame(poll)
    }

    const handleVisibilityChange = () => {
      if (document.hidden) pausePolling()
      else resumePolling()
    }

    const handleWindowBlur = () => pausePolling()

    const handleWindowFocus = () => {
      if (!document.hidden) resumePolling()
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('blur', handleWindowBlur)
    window.addEventListener('focus', handleWindowFocus)

    return () => {
      window.removeEventListener('gamepadconnected', handleConnected)
      window.removeEventListener('gamepaddisconnected', handleDisconnected)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('blur', handleWindowBlur)
      window.removeEventListener('focus', handleWindowFocus)
      cancelAnimationFrame(rafRef.current)
    }
  }, [enabled, poll])

  return { connected, connectedCount }
}
