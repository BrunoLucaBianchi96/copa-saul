'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { GAMES, type Game } from '@/lib/games'
import { TOTAL_BET_POINTS, MIN_BET_PER_GAME, MAX_BET_PER_GAME, DEFAULT_BET, calculateMatchPoints, generateRandomBets } from '@/lib/scoring-constants'
import { BetRadarChart } from '@/app/components/bet-radar-chart'
import { GameDetailModal } from '@/app/components/game-detail-modal'

interface Player {
  playerId: number
  playerName: string
}

interface BetsFormProps {
  players: Player[]
  sessionPlayerId: number | null
  isHost: boolean
  tournamentId?: number
  readOnly?: boolean
  editToken?: string
}

export function BetsForm({ players, sessionPlayerId, isHost, tournamentId, readOnly, editToken }: BetsFormProps) {
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
  const [detailGame, setDetailGame] = useState<Game | null>(null)
  const [bulkLoading, setBulkLoading] = useState(false)

  const total = Object.values(bets).reduce((sum, b) => sum + b, 0)
  const isValid = total === TOTAL_BET_POINTS && Object.values(bets).every((b) => b >= MIN_BET_PER_GAME && b <= MAX_BET_PER_GAME)

  // Determine API endpoint based on context
  const apiUrl = tournamentId
    ? `/api/tournaments/${tournamentId}/bets`
    : '/api/bets'

  useEffect(() => {
    if (!selectedPlayerId) return
    setFetching(true)
    setSaved(false)
    const params = new URLSearchParams({ playerId: String(selectedPlayerId) })
    if (editToken) params.set('editToken', editToken)
    fetch(`${apiUrl}?${params}`)
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
  }, [selectedPlayerId, apiUrl, editToken])

  async function saveBets() {
    if (!selectedPlayerId || !isValid || readOnly) return
    setLoading(true)
    setSaved(false)
    try {
      const res = await fetch(apiUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: selectedPlayerId,
          bets: GAMES.map((g) => ({ gameId: g.id, bet: bets[g.id] })),
          ...(editToken ? { editToken } : {}),
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

  function setAllToMinimum() {
    setBets(Object.fromEntries(GAMES.map((g) => [g.id, MIN_BET_PER_GAME])))
    setSaved(false)
  }

  function setEvenBet() {
    const evenBet = Math.floor(TOTAL_BET_POINTS / GAMES.length)
    setBets(Object.fromEntries(GAMES.map((g) => [g.id, evenBet])))
    setSaved(false)
  }

  function setRandomBets() {
    const randomBets = generateRandomBets()
    setBets(Object.fromEntries(randomBets.map((b) => [b.gameId, b.bet])))
    setSaved(false)
  }

  function updateBet(gameId: string, value: number) {
    setBets((prev) => ({ ...prev, [gameId]: value }))
    setSaved(false)
  }

  async function bulkAction(action: 'reset' | 'random') {
    const msg = action === 'reset' ? t('confirmResetAll') : t('confirmRandomizeAll')
    if (!confirm(msg)) return
    setBulkLoading(true)
    setSaved(false)
    try {
      const res = await fetch('/api/bets/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          playerIds: players.map((p) => p.playerId),
        }),
      })
      if (res.ok) {
        // Re-fetch current player's bets to reflect changes
        if (selectedPlayerId) {
          const betsRes = await fetch(`${apiUrl}?playerId=${selectedPlayerId}`)
          const data = await betsRes.json()
          if (data.bets) {
            const betMap: Record<string, number> = {}
            for (const b of data.bets) betMap[b.gameId] = b.bet
            for (const game of GAMES) {
              if (!(game.id in betMap)) betMap[game.id] = DEFAULT_BET
            }
            setBets(betMap)
          }
        }
        alert(action === 'reset' ? t('allPlayersBetsReset') : t('allPlayersBetsRandomized'))
      } else {
        const data = await res.json()
        alert(data.error || tErrors('failedToSaveAction'))
      }
    } finally {
      setBulkLoading(false)
    }
  }

  const selectedPlayerName = players.find((p) => p.playerId === selectedPlayerId)?.playerName

  return (
    <div className="bg-darcula-surface rounded-lg shadow-lg border border-darcula-border p-3 sm:p-6">
      {/* Info button */}
      <div className="flex justify-end mb-2 sm:mb-4">
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
                  <h3 className="font-semibold text-darcula-blue mb-2">{t('infoStrategyTitle')}</h3>
                  <p className="text-sm text-darcula-text-muted">{t('infoStrategyDesc')}</p>
                </section>

                <section>
                  <h3 className="font-semibold text-darcula-blue mb-2">{t('infoExampleTitle')}</h3>
                  <div className="text-sm text-darcula-text-muted space-y-2 bg-darcula-elevated rounded p-3">
                    <p>{t('infoExample1')}</p>
                    <p>{t('infoExample2')}</p>
                    <p>{t('infoExample3')}</p>
                  </div>
                </section>
              </div>
            ) : (
              <div className="space-y-3 text-darcula-text">
                {([
                  { a: 20, b: 20, keyA: 'noob', keyB: 'noob' },
                  { a: 30, b: 40, keyA: 'mid', keyB: 'mid' },
                  { a: 20, b: 50, keyA: 'noob', keyB: 'mid' },
                  { a: 20, b: 80, keyA: 'noob', keyB: 'pro' },
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
        <div>
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
          <div className="w-[500px] h-[500px] max-w-full mx-auto mb-6">
            <BetRadarChart
              datasets={[{
                bets,
                fill: 'rgba(104, 151, 187, 0.3)',
                stroke: 'rgba(104, 151, 187, 0.8)',
              }]}
              showLabels
            />
          </div>

          {/* Game bet rows */}
          <div className="space-y-2 sm:space-y-3">
            {GAMES.map((game) => (
              <div
                key={game.id}
                className="bg-darcula-elevated rounded-lg p-2 sm:p-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3"
              >
                <div className="flex items-center gap-2 sm:gap-3 min-w-0 sm:flex-1">
                  {game.imageUrl && (
                    <img
                      src={game.imageUrl}
                      alt={game.name}
                      className="w-10 h-10 sm:w-12 sm:h-12 rounded object-cover flex-shrink-0"
                    />
                  )}
                  <span className="text-darcula-text flex-1 min-w-0 truncate text-sm sm:text-base">{game.name}</span>
                  <button
                    onClick={() => setDetailGame(game)}
                    className="flex-shrink-0 text-darcula-text-muted hover:text-darcula-blue transition-colors"
                    title={game.name}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </button>
                </div>
                {readOnly ? (
                  <div className="flex items-center justify-center sm:justify-end flex-shrink-0">
                    <span className="w-16 text-center text-darcula-text font-medium">{bets[game.id]}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 flex-shrink-0 justify-center sm:justify-end">
                    <button
                      onClick={() => updateBet(game.id, Math.max(MIN_BET_PER_GAME, bets[game.id] - 5))}
                      disabled={bets[game.id] <= MIN_BET_PER_GAME}
                      className="w-8 h-8 rounded bg-darcula-bg border border-darcula-border text-darcula-text hover:bg-darcula-border transition flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed"
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
                )}
              </div>
            ))}
          </div>

          {/* Total and actions */}
          <div className="mt-4 sm:mt-6 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
            <div className="text-base sm:text-lg font-medium">
              <span className="text-darcula-text-muted">{t('total')}: </span>
              <span className={total === TOTAL_BET_POINTS ? 'text-darcula-green' : 'text-darcula-red'}>
                {total} / {TOTAL_BET_POINTS}
              </span>
              {!readOnly && total !== TOTAL_BET_POINTS && (
                <span className="text-sm text-darcula-text-muted ml-2">
                  ({total < TOTAL_BET_POINTS ? `${TOTAL_BET_POINTS - total} ${t('remaining')}` : `${total - TOTAL_BET_POINTS} ${t('over')}`})
                </span>
              )}
            </div>

            {!readOnly && (
              <div className="flex flex-wrap gap-2 sm:gap-3 justify-center sm:justify-end">
                <button
                  onClick={setAllToMinimum}
                  className="px-3 py-1.5 sm:px-4 sm:py-2 text-sm sm:text-base border border-darcula-border text-darcula-text rounded hover:bg-darcula-elevated transition"
                >
                  {t('setToMinimum')}
                </button>
                <button
                  onClick={setEvenBet}
                  className="px-3 py-1.5 sm:px-4 sm:py-2 text-sm sm:text-base border border-darcula-border text-darcula-text rounded hover:bg-darcula-elevated transition"
                >
                  {t('evenBet')}
                </button>
                <button
                  onClick={setRandomBets}
                  className="px-3 py-1.5 sm:px-4 sm:py-2 text-sm sm:text-base border border-darcula-border text-darcula-text rounded hover:bg-darcula-elevated transition"
                >
                  {t('randomBet')}
                </button>
                <button
                  onClick={saveBets}
                  disabled={!isValid || loading}
                  className="px-3 py-1.5 sm:px-4 sm:py-2 text-sm sm:text-base bg-darcula-green text-darcula-bg rounded hover:bg-darcula-green/80 transition disabled:opacity-50 font-medium"
                >
                  {loading ? t('saving') : t('save')}
                </button>
              </div>
            )}
          </div>

          {/* Minimum bet hint */}
          {!readOnly && (
            <p className="mt-2 text-sm text-darcula-text-muted">
              {t('minimumBet', { min: MIN_BET_PER_GAME })}
            </p>
          )}

          {/* Read-only indicator */}
          {readOnly && (
            <div className="mt-4 p-3 bg-darcula-elevated border border-darcula-border rounded text-darcula-text-muted text-sm text-center">
              {t('readOnlySnapshot')}
            </div>
          )}

          {/* Success feedback */}
          {saved && (
            <div className="mt-4 p-3 bg-darcula-green/10 border border-darcula-green/30 rounded text-darcula-green text-sm text-center">
              {t('savedSuccessfully')}
            </div>
          )}

          {/* Host bulk actions */}
          {isHost && !readOnly && (
            <div className="mt-6 pt-4 border-t border-darcula-border">
              <div className="flex flex-wrap gap-2 sm:gap-3 justify-center">
                <button
                  onClick={() => bulkAction('reset')}
                  disabled={bulkLoading}
                  className="px-3 py-1.5 sm:px-4 sm:py-2 text-sm sm:text-base border border-darcula-red/50 text-darcula-red rounded hover:bg-darcula-red/10 transition disabled:opacity-50"
                >
                  {t('resetAllPlayers')}
                </button>
                <button
                  onClick={() => bulkAction('random')}
                  disabled={bulkLoading}
                  className="px-3 py-1.5 sm:px-4 sm:py-2 text-sm sm:text-base border border-darcula-purple/50 text-darcula-purple rounded hover:bg-darcula-purple/10 transition disabled:opacity-50"
                >
                  {t('randomizeAllPlayers')}
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        <p className="text-darcula-text-muted text-center py-8">{t('selectPlayerFirst')}</p>
      )}

      {/* Game detail modal */}
      {detailGame && (
        <GameDetailModal
          game={detailGame}
          gradientColors="from-darcula-blue to-darcula-purple"
          onClose={() => setDetailGame(null)}
        />
      )}
    </div>
  )
}
