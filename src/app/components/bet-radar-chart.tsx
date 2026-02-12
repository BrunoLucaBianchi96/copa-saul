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

function getBetPoints(bets: Record<string, number>) {
  const minR = RADIUS * 0.1
  const maxR = RADIUS * WEB_SCALE
  return GAMES.map((game, idx) => {
    const bet = bets[game.id] || MIN_BET_PER_GAME
    const angle = getAngle(idx)
    const r = minR + ((bet - MIN_BET_PER_GAME) / (MAX_BET_PER_GAME - MIN_BET_PER_GAME)) * (maxR - minR)
    return `${CENTER_X + r * Math.cos(angle)},${CENTER_Y + r * Math.sin(angle)}`
  }).join(' ')
}

const outerPoints = GAMES.map((_, idx) => getPoint(idx, WEB_SCALE))
const subdivisionRings = SUBDIVISIONS.map((scale) =>
  GAMES.map((_, idx) => getPoint(idx, scale))
)

export function BetRadarChart({ datasets, showLabels = false }: BetRadarChartProps) {
  return (
    <svg viewBox={`0 0 ${CENTER_X * 2} ${CENTER_Y * 2}`} className="w-full h-full">
      {/* Outer polygon */}
      <polygon
        points={outerPoints.map((p) => `${p.x},${p.y}`).join(' ')}
        fill="none"
        stroke="rgba(169, 183, 198, 0.2)"
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
      {/* Bet data polygons */}
      {datasets.map((dataset, i) => (
        <polygon
          key={i}
          points={getBetPoints(dataset.bets)}
          fill={dataset.fill}
          stroke={dataset.stroke}
          strokeWidth="2"
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
