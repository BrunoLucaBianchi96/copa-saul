import { useState, useCallback } from 'react'
import type { GamepadDirection } from './useGamepad'

const TWO_PI = 2 * Math.PI

/**
 * Spatial navigation for the 7-game pick-ban wheel.
 *
 * Given a direction input (up/down/left/right), finds the game on the circle
 * that is most aligned with that direction from the currently focused game,
 * using dot-product / cosine similarity.
 */
export function useWheelNavigation(numGames: number) {
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null)

  // Precompute positions on the unit circle (same layout as pick-ban.tsx)
  // angle = idx * 2PI / n - PI/2  (starts at top, goes clockwise)
  const getPosition = useCallback(
    (idx: number): [number, number] => {
      const angle = (idx * TWO_PI) / numGames - Math.PI / 2
      return [Math.cos(angle), Math.sin(angle)]
    },
    [numGames],
  )

  const navigate = useCallback(
    (dir: GamepadDirection) => {
      if (focusedIndex === null) {
        // First input → focus top game (index 0)
        setFocusedIndex(0)
        return
      }

      // Direction vector
      const dirVec: [number, number] =
        dir === 'up'    ? [0, -1] :
        dir === 'down'  ? [0, 1] :
        dir === 'left'  ? [-1, 0] :
                          [1, 0]

      const [cx, cy] = getPosition(focusedIndex)

      let bestIdx = focusedIndex
      let bestScore = -Infinity

      for (let i = 0; i < numGames; i++) {
        if (i === focusedIndex) continue

        const [px, py] = getPosition(i)
        const dx = px - cx
        const dy = py - cy

        // Dot product with direction vector (cosine similarity, unnormalized)
        const dot = dx * dirVec[0] + dy * dirVec[1]

        // Only consider candidates roughly in the pressed direction
        if (dot <= 0) continue

        // Normalize by distance to avoid bias toward far-away items
        const dist = Math.sqrt(dx * dx + dy * dy)
        const score = dot / dist

        if (score > bestScore) {
          bestScore = score
          bestIdx = i
        }
      }

      setFocusedIndex(bestIdx)
    },
    [focusedIndex, numGames, getPosition],
  )

  const reset = useCallback(() => setFocusedIndex(null), [])

  return { focusedIndex, navigate, reset, setFocusedIndex }
}
