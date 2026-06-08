'use client'

import type { Game } from '@/lib/games'

// A radar of how many times each game has been played. Shares the SVG geometry
// of BetRadarChart, but the value scale is the dynamic max play count rather
// than the fixed 20..80 bet range.
interface GamesRadarChartProps {
  // Axes of the radar: one per game in the tournament's roster, in order.
  games: Game[]
  counts: Record<string, number>
  showLabels?: boolean
}

const RADIUS = 240
const CENTER_X = 300
const CENTER_Y = 260
const WEB_SCALE = 0.6
const LABEL_SCALE = 0.82
const SUBDIVISIONS = [0.25, 0.5, 0.75]

const MAX_R = RADIUS * WEB_SCALE

export function GamesRadarChart({ games, counts, showLabels = true }: GamesRadarChartProps) {
  const numGames = games.length

  function getAngle(idx: number) {
    return (idx * 2 * Math.PI) / numGames - Math.PI / 2
  }

  function getPoint(idx: number, scale: number) {
    const angle = getAngle(idx)
    return {
      x: CENTER_X + RADIUS * scale * Math.cos(angle),
      y: CENTER_Y + RADIUS * scale * Math.sin(angle),
    }
  }

  const outerPoints = games.map((_, idx) => getPoint(idx, WEB_SCALE))
  const subdivisionRings = SUBDIVISIONS.map((scale) =>
    games.map((_, idx) => getPoint(idx, scale))
  )

  const maxCount = Math.max(1, ...games.map((g) => counts[g.id] || 0))

  // Value polygon scaled so the most-played game reaches the web boundary.
  const valuePoints = games.map((game, idx) => {
    const value = counts[game.id] || 0
    const angle = getAngle(idx)
    const r = MAX_R * (value / maxCount)
    return { x: CENTER_X + r * Math.cos(angle), y: CENTER_Y + r * Math.sin(angle) }
  })

  return (
    <svg viewBox={`0 0 ${CENTER_X * 2} ${CENTER_Y * 2}`} className="w-full h-full">
      {/* Outer polygon with background */}
      <polygon
        points={outerPoints.map((p) => `${p.x},${p.y}`).join(' ')}
        fill="rgba(30, 31, 34, 0.93)"
        stroke="rgba(169, 183, 198, 0.3)"
        strokeWidth="2"
      />
      {/* Inner subdivision polygons */}
      {subdivisionRings.map((points, i) => (
        <polygon
          key={i}
          points={points.map((p) => `${p.x},${p.y}`).join(' ')}
          fill="none"
          stroke="rgba(169, 183, 198, 0.15)"
          strokeWidth="1"
        />
      ))}
      {/* Lines from center to each vertex */}
      {outerPoints.map((point, idx) => (
        <line
          key={idx}
          x1={CENTER_X}
          y1={CENTER_Y}
          x2={point.x}
          y2={point.y}
          stroke="rgba(169, 183, 198, 0.15)"
          strokeWidth="1"
        />
      ))}
      {/* Value polygon (transitions as counts change) */}
      <polygon
        points={valuePoints.map((p) => `${p.x},${p.y}`).join(' ')}
        fill="rgba(104, 151, 187, 0.35)"
        stroke="rgba(104, 151, 187, 0.9)"
        strokeWidth="2"
        strokeLinejoin="round"
        style={{ transition: 'all 500ms ease' }}
      />
      {/* Count markers at each played vertex */}
      {games.map((game, idx) => {
        const value = counts[game.id] || 0
        if (value === 0) return null
        const p = valuePoints[idx]
        return <circle key={game.id} cx={p.x} cy={p.y} r="4" fill="rgba(104, 151, 187, 1)" />
      })}
      {/* Game name + count labels */}
      {showLabels &&
        games.map((game, idx) => {
          const p = getPoint(idx, LABEL_SCALE)
          const value = counts[game.id] || 0
          return (
            <text
              key={game.id}
              x={p.x}
              y={p.y}
              textAnchor="middle"
              dominantBaseline="central"
              fill="rgba(169, 183, 198, 0.7)"
              fontSize="15"
              fontWeight="600"
            >
              {game.name} ({value})
            </text>
          )
        })}
    </svg>
  )
}
