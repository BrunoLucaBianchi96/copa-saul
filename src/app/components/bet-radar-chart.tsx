'use client'

import { GAMES } from '@/lib/games'
import { MIN_BET_PER_GAME, MAX_BET_PER_GAME } from '@/lib/scoring-constants'

interface BetDataset {
  bets: Record<string, number>
  fill: string
  stroke: string
}

interface BetRadarChartProps {
  datasets: BetDataset[]
  showLabels?: boolean
}

const NUM_GAMES = GAMES.length
const RADIUS = 240
const CENTER_X = 300
const CENTER_Y = 260
const WEB_SCALE = 0.6
const LABEL_SCALE = 0.78
const SUBDIVISIONS = [0.2, 0.3, 0.4, 0.5]

function getAngle(idx: number) {
  return (idx * 2 * Math.PI) / NUM_GAMES - Math.PI / 2
}

function getPoint(idx: number, scale: number) {
  const angle = getAngle(idx)
  return {
    x: CENTER_X + RADIUS * scale * Math.cos(angle),
    y: CENTER_Y + RADIUS * scale * Math.sin(angle),
  }
}

const MAX_R = RADIUS * WEB_SCALE
const MIN_R = MAX_R * (MIN_BET_PER_GAME / MAX_BET_PER_GAME)

function getBetPath(bets: Record<string, number>) {
  // Outer ring: bet values scaled proportionally (clockwise)
  const outer = GAMES.map((game, idx) => {
    const bet = bets[game.id] || MIN_BET_PER_GAME
    const angle = getAngle(idx)
    const r = MAX_R * (bet / MAX_BET_PER_GAME)
    return { x: CENTER_X + r * Math.cos(angle), y: CENTER_Y + r * Math.sin(angle) }
  })
  // Inner ring: minimum radius (counter-clockwise for hole)
  const inner = GAMES.map((_, idx) => {
    const angle = getAngle(idx)
    return { x: CENTER_X + MIN_R * Math.cos(angle), y: CENTER_Y + MIN_R * Math.sin(angle) }
  }).reverse()

  const outerPath = outer.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ') + ' Z'
  const innerPath = inner.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ') + ' Z'
  return `${outerPath} ${innerPath}`
}

const outerPoints = GAMES.map((_, idx) => getPoint(idx, WEB_SCALE))
const minBetPoints = GAMES.map((_, idx) => {
  const angle = getAngle(idx)
  return { x: CENTER_X + MIN_R * Math.cos(angle), y: CENTER_Y + MIN_R * Math.sin(angle) }
})
const subdivisionRings = SUBDIVISIONS.map((scale) =>
  GAMES.map((_, idx) => getPoint(idx, scale))
)

export function BetRadarChart({ datasets, showLabels = false }: BetRadarChartProps) {
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
      {/* Minimum bet floor (shared by all players) */}
      <polygon
        points={minBetPoints.map((p) => `${p.x},${p.y}`).join(' ')}
        fill="rgba(169, 183, 198, 0.08)"
        stroke="rgba(169, 183, 198, 0.2)"
        strokeWidth="1"
        strokeDasharray="4 3"
      />
      {/* Bet data polygons (donut shape) */}
      {datasets.map((dataset, i) => (
        <path
          key={i}
          d={getBetPath(dataset.bets)}
          fill={dataset.fill}
          stroke={dataset.stroke}
          strokeWidth="2"
          fillRule="evenodd"
        />
      ))}
      {/* Game name labels */}
      {showLabels && GAMES.map((game, idx) => {
        const p = getPoint(idx, LABEL_SCALE)
        return (
          <text
            key={game.id}
            x={p.x}
            y={p.y}
            textAnchor="middle"
            dominantBaseline="central"
            fill="rgba(169, 183, 198, 0.7)"
            fontSize="16"
            fontWeight="600"
          >
            {game.name}
          </text>
        )
      })}
    </svg>
  )
}
