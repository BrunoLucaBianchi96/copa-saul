'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { GAMES } from '@/lib/games'
import { TOTAL_BET_POINTS, MIN_BET_PER_GAME, MAX_BET_PER_GAME, DEFAULT_BET, calculateMatchPoints } from '@/lib/scoring-constants'
import { BetRadarChart } from '@/app/components/bet-radar-chart'

interface Player {
  playerId: number
  playerName: string
}

interface BetsFormProps {
  tournamentId: number
  players: Player[]
  sessionPlayerId: number | null
  isHost: boolean
}

export function BetsForm({ tournamentId, players, sessionPlayerId, isHost }: BetsFormProps) {
  const t = useTranslations('bets')
  const tCommon = useTranslations('common')
  const tErrors = useTranslations('errors')

  const [showInfo, setShowInfo] = useState(false)
  const [infoPage, setInfoPage] = useState(0)
  const [selectedPlayerId, setSelectedPlayerId] = useState<number | null>(
    sessionPlayerId ?? (isHost && players.length > 0 ? players[0].playerId : null)
  )
  const [bets, setBets] = useState<Record<string, number>>(
    Object.fromEntries(GAMES.map((g) => [g.id, DEFAULT_BET]))
  )
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(false)
  const [saved, setSaved] = useState(false)

  const total = Object.values(bets).reduce((sum, b) => sum + b, 0)
  const isValid = total === TOTAL_BET_POINTS && Object.values(bets).every((b) => b >= MIN_BET_PER_GAME && b <= MAX_BET_PER_GAME)

  useEffect(() => {
    if (!selectedPlayerId) return
    setFetching(true)
    setSaved(false)
    fetch(`/api/tournaments/${tournamentId}/bets?playerId=${selectedPlayerId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.bets) {
          const betMap: Record<string, number> = {}
          for (const b of data.bets) {
            betMap[b.gameId] = b.bet
          }
          // Fill in defaults for any missing games
          for (const game of GAMES) {
            if (!(game.id in betMap)) {
              betMap[game.id] = DEFAULT_BET
            }
          }
          setBets(betMap)
        }
      })
      .finally(() => setFetching(false))
  }, [selectedPlayerId, tournamentId])

  async function saveBets() {
    if (!selectedPlayerId || !isValid) return
    setLoading(true)
    setSaved(false)
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/bets`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: selectedPlayerId,
          bets: GAMES.map((g) => ({ gameId: g.id, bet: bets[g.id] })),
        }),
      })
      if (res.ok) {
        setSaved(true)
      } else {
        const data = await res.json()
        alert(data.error || tErrors('failedToSaveAction'))
      }
    } finally {
      setLoading(false)
    }
  }

  function resetToDefault() {
    setBets(Object.fromEntries(GAMES.map((g) => [g.id, DEFAULT_BET])))
    setSaved(false)
  }

  function updateBet(gameId: string, value: number) {
    setBets((prev) => ({ ...prev, [gameId]: value }))
    setSaved(false)
  }

  const selectedPlayerName = players.find((p) => p.playerId === selectedPlayerId)?.playerName

  return (
    <div className="bg-darcula-surface rounded-lg shadow-lg border border-darcula-border p-6">
      {/* Info button */}
      <div className="flex justify-end mb-4">
        <button
          onClick={() => setShowInfo(true)}
          className="p-2 rounded-full bg-darcula-elevated border border-darcula-border text-darcula-text-muted hover:text-darcula-blue hover:border-darcula-blue transition-colors"
          title={t('howItWorks')}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>
      </div>

      {/* Info modal */}
      {showInfo && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-darcula-surface border border-darcula-border rounded-lg p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-darcula-text-bright">
                {infoPage === 0 ? t('howItWorks') : t('matchupExamplesTitle')}
              </h2>
              <button
                onClick={() => { setShowInfo(false); setInfoPage(0) }}
                className="text-darcula-text-muted hover:text-darcula-text"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {infoPage === 0 ? (
              <div className="space-y-4 text-darcula-text">
                <section>
                  <h3 className="font-semibold text-darcula-blue mb-2">{t('infoAllocationTitle')}</h3>
                  <ul className="text-sm text-darcula-text-muted list-disc list-inside space-y-1">
                    <li>{t('infoAllocation1', { total: TOTAL_BET_POINTS })}</li>
                    <li>{t('infoAllocation2', { min: MIN_BET_PER_GAME, max: MAX_BET_PER_GAME })}</li>
                    <li>{t('infoAllocation3')}</li>
                  </ul>
                </section>

                <section>
                  <h3 className="font-semibold text-darcula-blue mb-2">{t('infoScoringTitle')}</h3>
                  <p className="text-sm text-darcula-text-muted mb-2">{t('infoScoringDesc')}</p>
                  <ul className="text-sm text-darcula-text-muted list-disc list-inside space-y-1">
                    <li>{t('infoScoringEqual')}</li>
                    <li>{t('infoScoringUnderdog')}</li>
                    <li>{t('infoScoringFavorite')}</li>
                  </ul>
                </section>

                <section>
                  <h3 className="font-semibold text-darcula-blue mb-2">{t('infoExampleTitle')}</h3>
                  <div className="text-sm text-darcula-text-muted space-y-2 bg-darcula-elevated rounded p-3">
                    <p>{t('infoExample1')}</p>
                    <p>{t('infoExample2')}</p>
                    <p>{t('infoExample3')}</p>
                  </div>
                </section>

                <section>
                  <h3 className="font-semibold text-darcula-blue mb-2">{t('infoStrategyTitle')}</h3>
                  <p className="text-sm text-darcula-text-muted">{t('infoStrategyDesc')}</p>
                </section>
              </div>
            ) : (
              <div className="space-y-3 text-darcula-text">
                {([
                  { a: 20, b: 20, keyA: 'noob', keyB: 'noob' },
                  { a: 15, b: 60, keyA: 'noob', keyB: 'pro' },
                  { a: 40, b: 15, keyA: 'mid', keyB: 'noob' },
                  { a: 40, b: 70, keyA: 'mid', keyB: 'pro' },
                ] as const).map(({ a, b, keyA, keyB }, i) => (
                  <div key={i} className="bg-darcula-elevated rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-darcula-text-bright">
                        {t(`matchup_${keyA}`)} ({a} pts) vs {t(`matchup_${keyB}`)} ({b} pts)
                      </span>
                    </div>
                    <div className="text-sm text-darcula-text-muted space-y-1">
                      <p>
                        <span className="text-darcula-green">{t('matchupWinsA', { name: t(`matchup_${keyA}`) })}</span>{' '}
                        → +{calculateMatchPoints(a, b)} pts
                      </p>
                      <p>
                        <span className="text-darcula-green">{t('matchupWinsB', { name: t(`matchup_${keyB}`) })}</span>{' '}
                        → +{calculateMatchPoints(b, a)} pts
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Page dots + navigation */}
            <div className="mt-6 flex items-center gap-3">
              <div className="flex gap-2 flex-1 justify-center">
                {[0, 1].map((page) => (
                  <button
                    key={page}
                    onClick={() => setInfoPage(page)}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      infoPage === page ? 'bg-darcula-blue' : 'bg-darcula-border'
                    }`}
                  />
                ))}
              </div>
              <button
                onClick={() => {
                  if (infoPage === 0) {
                    setInfoPage(1)
                  } else {
                    setShowInfo(false)
                    setInfoPage(0)
                  }
                }}
                className="px-4 py-2 bg-darcula-blue text-darcula-bg rounded hover:bg-darcula-blue/80 transition text-sm"
              >
                {infoPage === 0 ? t('matchupExamplesButton') : tCommon('close')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Player selection */}
      {isHost ? (
        <div className="mb-6">
          <label className="block text-sm text-darcula-text-muted mb-2">{t('selectPlayer')}</label>
          <select
            value={selectedPlayerId ?? ''}
            onChange={(e) => setSelectedPlayerId(parseInt(e.target.value))}
            className="w-full bg-darcula-elevated border border-darcula-border rounded px-3 py-2 text-darcula-text focus:outline-none focus:border-darcula-blue"
          >
            {players.map((p) => (
              <option key={p.playerId} value={p.playerId}>
                {p.playerName}
              </option>
            ))}
          </select>
        </div>
      ) : sessionPlayerId ? (
        <div className="mb-6">
          <p className="text-darcula-text-muted">
            {t('settingBetsFor')} <span className="text-darcula-text font-medium">{selectedPlayerName}</span>
          </p>
        </div>
      ) : null}

      {fetching ? (
        <p className="text-darcula-text-muted text-center py-8">{t('loading')}</p>
      ) : selectedPlayerId ? (
        <>
          {/* Radar chart */}
          <div className="w-48 h-48 sm:w-56 sm:h-56 mx-auto mb-6">
            <BetRadarChart
              datasets={[{
                bets,
                fill: 'rgba(104, 151, 187, 0.15)',
                stroke: 'rgba(104, 151, 187, 0.4)',
              }]}
              showLabels
            />
          </div>

          {/* Game bet rows */}
          <div className="space-y-3">
            {GAMES.map((game) => (
              <div
                key={game.id}
                className="flex items-center gap-3 bg-darcula-elevated rounded-lg p-3"
              >
                {game.imageUrl && (
                  <img
                    src={game.imageUrl}
                    alt={game.name}
                    className="w-12 h-12 rounded object-cover flex-shrink-0"
                  />
                )}
                <span className="text-darcula-text flex-1 min-w-0 truncate">{game.name}</span>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => updateBet(game.id, Math.max(MIN_BET_PER_GAME, bets[game.id] - 5))}
                    className="w-8 h-8 rounded bg-darcula-bg border border-darcula-border text-darcula-text hover:bg-darcula-border transition flex items-center justify-center"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min={MIN_BET_PER_GAME}
                    max={MAX_BET_PER_GAME}
                    value={bets[game.id]}
                    onChange={(e) => {
                      const val = parseInt(e.target.value)
                      if (!isNaN(val)) updateBet(game.id, Math.min(MAX_BET_PER_GAME, Math.max(MIN_BET_PER_GAME, val)))
                    }}
                    className="w-16 text-center bg-darcula-bg border border-darcula-border rounded px-2 py-1 text-darcula-text focus:outline-none focus:border-darcula-blue [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <button
                    onClick={() => updateBet(game.id, Math.min(MAX_BET_PER_GAME, bets[game.id] + 5))}
                    disabled={bets[game.id] >= MAX_BET_PER_GAME || total >= TOTAL_BET_POINTS}
                    className="w-8 h-8 rounded bg-darcula-bg border border-darcula-border text-darcula-text hover:bg-darcula-border transition flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    +
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Total and actions */}
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-lg font-medium">
              <span className="text-darcula-text-muted">{t('total')}: </span>
              <span className={total === TOTAL_BET_POINTS ? 'text-darcula-green' : 'text-darcula-red'}>
                {total} / {TOTAL_BET_POINTS}
              </span>
              {total !== TOTAL_BET_POINTS && (
                <span className="text-sm text-darcula-text-muted ml-2">
                  ({total < TOTAL_BET_POINTS ? `${TOTAL_BET_POINTS - total} ${t('remaining')}` : `${total - TOTAL_BET_POINTS} ${t('over')}`})
                </span>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={resetToDefault}
                className="px-4 py-2 border border-darcula-border text-darcula-text rounded hover:bg-darcula-elevated transition"
              >
                {t('resetToDefault')}
              </button>
              <button
                onClick={saveBets}
                disabled={!isValid || loading}
                className="px-4 py-2 bg-darcula-green text-darcula-bg rounded hover:bg-darcula-green/80 transition disabled:opacity-50 font-medium"
              >
                {loading ? t('saving') : t('save')}
              </button>
            </div>
          </div>

          {/* Minimum bet hint */}
          <p className="mt-2 text-sm text-darcula-text-muted">
            {t('minimumBet', { min: MIN_BET_PER_GAME })}
          </p>

          {/* Success feedback */}
          {saved && (
            <div className="mt-4 p-3 bg-darcula-green/10 border border-darcula-green/30 rounded text-darcula-green text-sm text-center">
              {t('savedSuccessfully')}
            </div>
          )}
        </>
      ) : (
        <p className="text-darcula-text-muted text-center py-8">{t('selectPlayerFirst')}</p>
      )}
    </div>
  )
}
