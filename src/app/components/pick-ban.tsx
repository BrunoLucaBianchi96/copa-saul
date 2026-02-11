'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import {
  GAMES,
  type PickBanAction,
  getGameStates,
  calculatePickBanState,
} from '@/lib/games'
import { type Theme, getAnimationDurations } from '@/lib/themes'
import { GTA4LoadingBackground } from './gta4-loading-background'
import { MatrixBackground } from './matrix-background'
import { BalatroBackground } from './balatro-background'
import { BalatroCardRain } from './balatro-card-rain'
import { PlayerCard, formatPlayerName, getInitials } from './player-card'

interface PickBanProps {
  player1Name: string
  player2Name: string
  player1Avatar?: string | null
  player2Avatar?: string | null
  matchId: number
  tournamentId: number
  initialActions: PickBanAction[]
  initialSelectedGame?: string
  isHost: boolean
  matchResult: string
  roundNumber: number
  theme: Theme
  prevMatchId: number | null
  nextMatchId: number | null
  gamePlayCounts: Record<string, number>
}

interface PlayerPortraitProps {
  playerNumber: 1 | 2
  name: string
  avatar?: string | null
  isActive: boolean
  isWinner: boolean
  opponentIsWinner: boolean
  canSelectWinner: boolean
  saving: boolean
  showEntranceAnimation: boolean
  showExplosion: boolean
  animationDurations: { sway: number; bounce: number }
  actionsLength: number
  onSelectWinner: () => void
  winnerLabel: string
  gradientColors: string
  entranceDelay?: string
}

function PlayerPortrait({
  playerNumber,
  name,
  avatar,
  isActive,
  isWinner,
  opponentIsWinner,
  canSelectWinner,
  saving,
  showEntranceAnimation,
  showExplosion,
  animationDurations,
  actionsLength,
  onSelectWinner,
  winnerLabel,
  gradientColors,
  entranceDelay,
}: PlayerPortraitProps) {
  const keyPrefix = `p${playerNumber}`
  const key = isActive ? `${keyPrefix}-active-${actionsLength}` : isWinner ? `${keyPrefix}-winner` : `${keyPrefix}-inactive`
  const shouldAnimate = !showEntranceAnimation && (isActive || isWinner)

  return (
    <div
      key={key}
      className={`relative pointer-events-auto ${showEntranceAnimation ? 'portrait-enter' : ''} ${shouldAnimate ? 'idle-sway' : ''}`}
      style={{
        '--drop-duration': '1s',
        animationDelay: entranceDelay,
        ...(shouldAnimate ? { '--sway-duration': `${animationDurations.sway}s`, '--bounce-duration': `${animationDurations.bounce}s` } : {})
      } as React.CSSProperties}
    >
      <button
        onClick={() => canSelectWinner && onSelectWinner()}
        disabled={!canSelectWinner || saving}
        className={`relative transition-all duration-300 ${
          shouldAnimate
            ? 'ring-2 lg:ring-4 ring-darcula-blue ring-offset-2 lg:ring-offset-4 ring-offset-darcula-bg idle-bounce rounded-t-lg'
            : canSelectWinner
              ? 'hover:ring-2 lg:hover:ring-4 hover:ring-darcula-green hover:ring-offset-2 lg:hover:ring-offset-4 hover:ring-offset-darcula-bg cursor-pointer rounded-t-lg'
              : opponentIsWinner
                ? 'grayscale opacity-60'
                : 'opacity-60'
        }`}
      >
        <PlayerCard
          name={name}
          avatar={avatar}
          gradientColors={gradientColors}
        />
        {canSelectWinner && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 hover:opacity-100 transition-opacity rounded-t-lg">
            <span className="text-darcula-green text-sm sm:text-base md:text-lg lg:text-xl xl:text-2xl font-bold">{winnerLabel}</span>
          </div>
        )}
      </button>
      {showExplosion && (
        <img
          src="/explosion.gif"
          alt=""
          className="absolute bottom-10 left-1/2 -translate-x-1/2 translate-y-1/3 w-48 h-48 sm:w-40 sm:h-40 md:w-48 md:h-48 lg:w-64 lg:h-64 xl:w-80 xl:h-80 pointer-events-none z-10"
        />
      )}
    </div>
  )
}

export function PickBan({
  player1Name,
  player2Name,
  player1Avatar,
  player2Avatar,
  matchId,
  tournamentId,
  initialActions,
  initialSelectedGame,
  isHost,
  matchResult,
  roundNumber,
  theme,
  prevMatchId,
  nextMatchId,
  gamePlayCounts,
}: PickBanProps) {
  const router = useRouter()
  const t = useTranslations('pickBan')
  const tCommon = useTranslations('common')
  const tMatch = useTranslations('match')
  const tErrors = useTranslations('errors')
  const [actions, setActions] = useState<PickBanAction[]>(initialActions)
  const [selectedGame, setSelectedGame] = useState<string | undefined>(initialSelectedGame)
  const [animatingGame, setAnimatingGame] = useState<string | null>(null)
  const [flashingGame, setFlashingGame] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [backgroundFlash, setBackgroundFlash] = useState<'ban' | 'pick' | 'select' | null>(null)
  const [localMatchResult, setLocalMatchResult] = useState(matchResult)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showEntranceAnimation, setShowEntranceAnimation] = useState(
    initialActions.length === 0 && matchResult === 'pending'
  )
  const [showExplosion1, setShowExplosion1] = useState(false)
  const [showExplosion2, setShowExplosion2] = useState(false)
  const animationStartedRef = useRef(false)
  const entranceAnimationShownRef = useRef(initialActions.length === 0 && matchResult === 'pending')
  const currentAnimatingGameRef = useRef<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [wheelScale, setWheelScale] = useState(1)

  // Reset animation ref when matchId changes (e.g., navigating away and back)
  useEffect(() => {
    animationStartedRef.current = false
    currentAnimatingGameRef.current = null
    // Reset entrance animation for new match (only if not already shown)
    const shouldShowEntrance = initialActions.length === 0 && matchResult === 'pending'
    entranceAnimationShownRef.current = shouldShowEntrance
    setShowEntranceAnimation(shouldShowEntrance)
  }, [matchId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Turn off entrance animation after it completes
  useEffect(() => {
    if (showEntranceAnimation) {
      const timer = setTimeout(() => {
        setShowEntranceAnimation(false)
      }, 1200) // Animation duration (1s) + buffer
      return () => clearTimeout(timer)
    }
  }, [showEntranceAnimation])

  // Play explosion sound effect
  const playExplosionSound = useCallback(() => {
    const audio = new Audio('/Minecraft-Explosion.mp3')
    audio.currentTime = 6.95 // Start at 7 seconds
    audio.volume = 0.3
    audio.play().catch(() => {
      // Autoplay may be blocked
    })
  }, [])

  // Show explosions when portraits hit the ground
  useEffect(() => {
    if (showEntranceAnimation) {
      // Player 1 hits ground at ~300ms
      const timer1 = setTimeout(() => {
        setShowExplosion1(true)
        playExplosionSound()
        setTimeout(() => setShowExplosion1(false), 500) // Hide after 500ms
      }, 350)
      // Player 2 hits ground at 300ms + 150ms delay = 450ms
      const timer2 = setTimeout(() => {
        setShowExplosion2(true)
        playExplosionSound()
        setTimeout(() => setShowExplosion2(false), 500) // Hide after 500ms
      }, 500)
      return () => {
        clearTimeout(timer1)
        clearTimeout(timer2)
      }
    }
  }, [showEntranceAnimation, playExplosionSound])

  // Track fullscreen state
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement !== null)
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    // Set initial state
    setIsFullscreen(document.fullscreenElement !== null)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  const handleFullscreenToggle = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen()
      } else {
        await document.documentElement.requestFullscreen()
      }
    } catch {
      // Fullscreen not supported or denied - that's ok
    }
  }

  // Play background music on mount, with retry on user interaction if blocked
  useEffect(() => {
    if (!theme.audioFile) return

    const audio = new Audio(theme.audioFile)
    audio.volume = 0.1 * (theme.normalizeVolume ?? 1)
    audio.loop = true
    // Set starting position if offset is specified (convert ms to seconds)
    if (theme.audioOffset) {
      audio.currentTime = theme.audioOffset / 1000
    }
    audioRef.current = audio

    let isActive = true

    const tryPlay = () => {
      if (!isActive || !audio.paused) return
      audio.play().catch(() => {
        // Still blocked - listener will retry on next interaction
      })
    }

    // Initial play attempt
    tryPlay()

    // Retry on user interaction if autoplay was blocked
    const handleInteraction = () => {
      if (audio.paused && isActive) {
        tryPlay()
        // Once playing, remove listeners
        if (!audio.paused) {
          document.removeEventListener('click', handleInteraction)
          document.removeEventListener('keydown', handleInteraction)
          document.removeEventListener('touchstart', handleInteraction)
        }
      }
    }

    document.addEventListener('click', handleInteraction)
    document.addEventListener('keydown', handleInteraction)
    document.addEventListener('touchstart', handleInteraction)

    return () => {
      isActive = false
      document.removeEventListener('click', handleInteraction)
      document.removeEventListener('keydown', handleInteraction)
      document.removeEventListener('touchstart', handleInteraction)
      audio.pause()
      audio.src = ''
    }
  }, [theme.audioFile, theme.audioOffset])

  // Auto-mute when tab loses focus
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    let volumeBeforeMute = audio.volume

    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Tab is hidden - store current volume and mute
        volumeBeforeMute = audio.volume
        audio.volume = 0
      } else {
        // Tab is visible - restore volume
        audio.volume = volumeBeforeMute
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [])

  // Calculate wheel scale based on available width
  useEffect(() => {
    const updateScale = () => {
      // Scale based on viewport width, max scale of 1
      // Use 16px padding on each side
      const availableWidth = window.innerWidth - 32
      const scale = Math.min(availableWidth / (centerX * 2), 1)
      setWheelScale(Math.max(0.3, scale)) // minimum scale of 0.3 to keep it usable
    }

    updateScale()
    window.addEventListener('resize', updateScale)
    return () => window.removeEventListener('resize', updateScale)
  }, [])

  const state = calculatePickBanState(actions, selectedGame)
  const gameStates = getGameStates(actions)
  const animationDurations = getAnimationDurations(theme)

  // Fade background music to silence
  const fadeOutMusic = useCallback((durationMs: number) => {
    const audio = audioRef.current
    if (!audio) return

    const startVolume = audio.volume
    const steps = 20
    const stepDuration = durationMs / steps
    const volumeStep = startVolume / steps
    let currentStep = 0

    const fadeInterval = setInterval(() => {
      currentStep++
      audio.volume = Math.max(0, startVolume - volumeStep * currentStep)
      if (currentStep >= steps) {
        clearInterval(fadeInterval)
      }
    }, stepDuration)
  }, [])

  // Fade background music back in
  const fadeInMusic = useCallback((durationMs: number) => {
    const audio = audioRef.current
    if (!audio) return

    const targetVolume = 0.1 * (theme.normalizeVolume ?? 1)
    const steps = 20
    const stepDuration = durationMs / steps
    const volumeStep = targetVolume / steps
    let currentStep = 0

    const fadeInterval = setInterval(() => {
      currentStep++
      audio.volume = Math.min(targetVolume, volumeStep * currentStep)
      if (currentStep >= steps) {
        clearInterval(fadeInterval)
      }
    }, stepDuration)
  }, [theme.normalizeVolume])

  // Play a soundbite if configured for this theme, returns a Promise that resolves when audio ends
  const playSoundbite = useCallback((type: 'onBan' | 'onPick' | 'onGameSelected' | 'onWinnerChosen'): Promise<void> => {
    const soundbite = theme.soundbites?.[type]
    if (!soundbite) return Promise.resolve()

    const { path, offset: offsetMs = 0, volume: volumeMultiplier = 1 } = soundbite

    const audio = new Audio(path)
    audio.currentTime = offsetMs / 1000 // convert ms to seconds

    if (volumeMultiplier > 1) {
      // Use Web Audio API with GainNode for amplification above 1.0
      const audioContext = new AudioContext()
      const source = audioContext.createMediaElementSource(audio)
      const gainNode = audioContext.createGain()
      gainNode.gain.value = volumeMultiplier
      source.connect(gainNode)
      gainNode.connect(audioContext.destination)
    } else {
      audio.volume = volumeMultiplier
    }

    return new Promise((resolve) => {
      audio.onended = () => resolve()
      audio.play().catch(() => {
        // Autoplay may be blocked - resolve immediately
        resolve()
      })
    })
  }, [theme.soundbites])

  // Play click sound during game selection animation
  const playClickSound = useCallback(() => {
    const audio = new Audio('/Mouse Click Sound Effect.mp3')
    audio.volume = 0.5
    audio.currentTime = 0.25 // 200ms offset
    audio.play().catch(() => {
      // Autoplay may be blocked - that's ok
    })
  }, [])

  const currentPlayerName = state.currentPlayer === 1 ? player1Name : player2Name

  // Games that can be selected at the end (not banned)
  const selectableGames = GAMES.filter((g) => gameStates.get(g.id)?.status !== 'banned')

  const isInteractive = isHost && localMatchResult === 'pending' && state.currentPhase !== 'complete' && state.currentPhase !== 'selecting'
  const canSelectWinner = isHost && localMatchResult === 'pending' && state.currentPhase === 'complete'
  // Show active player animation for everyone (not just host)
  const isActivePhase = localMatchResult === 'pending' && state.currentPhase !== 'complete' && state.currentPhase !== 'selecting'
  const player1IsWinner = localMatchResult === 'player1'
  const player2IsWinner = localMatchResult === 'player2'
  const matchComplete = localMatchResult !== 'pending'

  function getPhaseInstruction(): { phase: string; detail: string } {
    if (localMatchResult !== 'pending') {
      return { phase: t('complete'), detail: GAMES.find((g) => g.id === selectedGame)?.name || 'Unknown' }
    }

    switch (state.currentPhase) {
      case 'ban1':
        return { phase: `${t('ban')} 1/1`, detail: t('turn', { name: currentPlayerName }) }
      case 'pick':
        return { phase: `${t('protect')} 1/1`, detail: t('turn', { name: currentPlayerName }) }
      case 'ban2':
        return { phase: `${t('ban')} ${state.ban2Remaining}/1`, detail: t('turn', { name: currentPlayerName }) }
      case 'selecting':
        return { phase: t('selectingEllipsis'), detail: t('randomGame') }
      case 'complete':
        return { phase: t('selected'), detail: GAMES.find((g) => g.id === state.selectedGame)?.name || '' }
    }
  }

  const saveAction = useCallback(async (newAction: PickBanAction) => {
    // Optimistically update UI immediately
    setActions((prev) => [...prev, newAction])

    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/matches/${matchId}/pick-ban`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: newAction }),
      })

      if (!res.ok) {
        // Roll back on failure
        setActions((prev) => prev.filter((a) => a !== newAction))
        alert(tErrors('failedToSaveAction'))
      }
    } catch {
      // Roll back on network error
      setActions((prev) => prev.filter((a) => a !== newAction))
      alert(tErrors('networkError'))
    }
  }, [tournamentId, matchId, tErrors])

  function triggerBackgroundFlash(type: 'ban' | 'pick' | 'select') {
    setBackgroundFlash(type)
    setTimeout(() => setBackgroundFlash(null), type === 'select' ? 900 : 800)
  }

  function handleGameClick(gameId: string) {
    if (!isInteractive || saving) return

    const gameState = gameStates.get(gameId)
    if (!gameState) return

    if (state.currentPhase === 'ban1' || state.currentPhase === 'ban2') {
      if (gameState.status === 'banned' || gameState.status === 'protected') return

      const newAction: PickBanAction = {
        type: 'ban',
        player: state.currentPlayer,
        gameId,
        phase: state.currentPhase,
      }
      triggerBackgroundFlash('ban')
      playSoundbite('onBan')
      saveAction(newAction)
    } else if (state.currentPhase === 'pick') {
      if (gameState.status === 'banned') return

      const newAction: PickBanAction = {
        type: 'pick',
        player: state.currentPlayer,
        gameId,
        phase: 'pick',
      }
      triggerBackgroundFlash('pick')
      playSoundbite('onPick')
      saveAction(newAction)
    }
  }

  // Handle random selection animation
  useEffect(() => {
    // Don't run if not in selecting phase, not host, or game already selected
    if (state.currentPhase !== 'selecting' || !isHost || selectedGame) {
      return
    }

    // Prevent running multiple times for the same selection
    if (animationStartedRef.current) {
      return
    }

    animationStartedRef.current = true
    // Calculate selectable games fresh to avoid closure issues
    const currentGameStates = getGameStates(actions)
    const gamesToSelect = GAMES.filter((g) => currentGameStates.get(g.id)?.status !== 'banned')

    if (gamesToSelect.length === 0) {
      const randomGame = GAMES[Math.floor(Math.random() * GAMES.length)]
      selectFinalGame(randomGame.id)
      return
    }

    if (gamesToSelect.length === 1) {
      selectFinalGame(gamesToSelect[0].id)
      return
    }

    const totalDuration = 5000
    const startTime = Date.now()
    let cycleIndex = Math.floor(Math.random() * gamesToSelect.length)
    let timeoutId: NodeJS.Timeout
    let cancelled = false

    function pickNextGame(): string {
      const gameId = gamesToSelect[cycleIndex % gamesToSelect.length].id
      cycleIndex++
      return gameId
    }

    function animate() {
      if (cancelled) return

      const elapsed = Date.now() - startTime

      if (elapsed >= totalDuration) {
        const finalGameId = currentAnimatingGameRef.current || gamesToSelect[0].id
        selectFinalGame(finalGameId)
        return
      }

      const gameId = pickNextGame()
      currentAnimatingGameRef.current = gameId
      setAnimatingGame(gameId)
      playClickSound()

      const progress = elapsed / totalDuration
      const minDelay = 100
      const maxDelay = 1000
      const delay = minDelay + (maxDelay - minDelay) * progress

      timeoutId = setTimeout(animate, delay)
    }

    animate()

    return () => {
      cancelled = true
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [state.currentPhase, isHost, selectedGame, actions, playClickSound])

  async function selectFinalGame(gameId: string) {
    // Flash the game and background together
    setFlashingGame(gameId)
    setAnimatingGame(null)
    triggerBackgroundFlash('select')

    // Play custom soundbite if configured, otherwise play default win sound
    if (theme.soundbites?.onGameSelected) {
      playSoundbite('onGameSelected')
    } else {
      const winAudio = new Audio('/WIN.mp3')
      winAudio.currentTime = 0.15 // 150ms offset
      winAudio.play().catch(() => {})
    }

    // Wait for flash animation (0.5s)
    await new Promise(resolve => setTimeout(resolve, 500))

    setSaving(true)
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/matches/${matchId}/pick-ban`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selectGame: gameId, actions }),
        keepalive: true,
      })

      if (res.ok) {
        setSelectedGame(gameId)
        setFlashingGame(null)
      } else {
        alert(tErrors('failedToSelectGame'))
        setFlashingGame(null)
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleRecordResult(result: 'player1' | 'player2' | 'draw') {
    // Optimistically update UI immediately
    const previousResult = localMatchResult
    setLocalMatchResult(result)

    // Briefly fade out music for the winner soundbite, then fade back in
    if (theme.soundbites?.onWinnerChosen) {
      fadeOutMusic(500)
      playSoundbite('onWinnerChosen').then(() => {
        fadeInMusic(2000)
      })
    }

    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/matches/${matchId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ result }),
      })

      if (!res.ok) {
        // Roll back on failure
        setLocalMatchResult(previousResult)
        alert(tErrors('failedToRecordResult'))
      }
    } catch {
      // Roll back on network error
      setLocalMatchResult(previousResult)
      alert(tErrors('networkError'))
    }
  }

  async function handleResetRound() {
    if (!confirm(t('confirmResetMatch'))) {
      return
    }
    setResetting(true)
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/matches/${matchId}/reset`, {
        method: 'POST',
      })

      if (res.ok) {
        // Reset local state
        setActions([])
        setSelectedGame(undefined)
        setAnimatingGame(null)
        setFlashingGame(null)
        setBackgroundFlash(null)
        setLocalMatchResult('pending')
        animationStartedRef.current = false
        currentAnimatingGameRef.current = null
        router.refresh()
      } else {
        alert(tErrors('failedToResetMatch'))
      }
    } finally {
      setResetting(false)
    }
  }

  // Calculate positions for games in a polygon
  const numGames = GAMES.length
  const radius = 240
  const centerX = 300
  const centerY = 260

  // Generate polygon points for the web
  const polygonPoints = GAMES.map((_, idx) => {
    const angle = (idx * 2 * Math.PI) / numGames - Math.PI / 2
    const x = centerX + radius * 0.6 * Math.cos(angle)
    const y = centerY + radius * 0.6 * Math.sin(angle)
    return { x, y }
  })

  const innerPolygonPoints = GAMES.map((_, idx) => {
    const angle = (idx * 2 * Math.PI) / numGames - Math.PI / 2
    const x = centerX + radius * 0.3 * Math.cos(angle)
    const y = centerY + radius * 0.3 * Math.sin(angle)
    return { x, y }
  })

  const phaseInfo = getPhaseInstruction()

  return (
    <div className="min-h-screen bg-darcula-bg flex flex-col relative overflow-x-hidden">
      {/* Theme background - animated (Balatro/GTA4/Matrix) or static image */}
      {theme.id === 'balatro' ? (
        <div className="fixed inset-0 z-0 pointer-events-none">
          <BalatroBackground />
          <BalatroCardRain />
          <div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(to bottom, rgba(30, 31, 34, 0.3) 0%, rgba(30, 31, 34, 0.6) 100%)',
            }}
          />
        </div>
      ) : theme.id === 'gta-4' ? (
        <div className="fixed inset-0 z-0 pointer-events-none">
          <GTA4LoadingBackground />
          {/* Gradient overlay for readability - lower opacity to show more of the animated background */}
          <div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(to bottom, rgba(30, 31, 34, 0.3) 0%, rgba(30, 31, 34, 0.6) 100%)',
            }}
          />
        </div>
      ) : theme.id === 'matrix' ? (
        <div className="fixed inset-0 z-0 pointer-events-none">
          <MatrixBackground />
          <div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(to bottom, rgba(30, 31, 34, 0.3) 0%, rgba(30, 31, 34, 0.6) 100%)',
            }}
          />
        </div>
      ) : theme.backgroundImage && (
        <div
          className="fixed inset-0 z-0 pointer-events-none"
          style={{
            backgroundImage: `linear-gradient(to bottom, rgba(30, 31, 34, 0.7) 0%, rgba(30, 31, 34, 1) 100%), url(${theme.backgroundImage})`,
            backgroundSize: theme.backgroundSize === 'repeat' ? 'auto 100%' : (theme.backgroundSize || 'cover'),
            backgroundPosition: 'center',
            backgroundRepeat: theme.backgroundSize === 'repeat' ? 'repeat-x' : 'no-repeat',
          }}
        />
      )}

      {/* Background flash overlay */}
      {backgroundFlash && (
        <div
          className={`fixed inset-0 pointer-events-none z-50 ${
            backgroundFlash === 'select' ? 'background-flash-3x' : 'background-flash'
          } ${
            backgroundFlash === 'ban'
              ? 'bg-darcula-red'
              : backgroundFlash === 'pick'
                ? 'bg-darcula-blue'
                : 'bg-darcula-green'
          }`}
        />
      )}

      {/* Nav bar */}
      <nav className="relative z-10 w-full flex items-center justify-between px-4 py-3 mb-3">
        <div className="flex items-center gap-3">
          <a
            href={`/tournaments/${tournamentId}`}
            className="text-darcula-text-muted hover:text-darcula-text text-sm inline-flex items-center gap-1 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {tCommon('back')}
          </a>
          {prevMatchId !== null ? (
            <a
              href={`/tournaments/${tournamentId}/matches/${prevMatchId}`}
              className="p-2 rounded border border-darcula-border text-darcula-text hover:bg-darcula-elevated transition"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </a>
          ) : (
            <span className="p-2 rounded border border-darcula-border text-darcula-text opacity-30 cursor-not-allowed">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {nextMatchId !== null ? (
            <a
              href={`/tournaments/${tournamentId}/matches/${nextMatchId}`}
              className="p-2 rounded border border-darcula-border text-darcula-text hover:bg-darcula-elevated transition"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </a>
          ) : (
            <span className="p-2 rounded border border-darcula-border text-darcula-text opacity-30 cursor-not-allowed">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </span>
          )}
          <button
            onClick={handleFullscreenToggle}
            className="p-2 rounded border border-darcula-border text-darcula-text hover:bg-darcula-elevated transition"
            title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          >
            {isFullscreen ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
              </svg>
            )}
          </button>
          {isHost && (
            <button
              onClick={handleResetRound}
              disabled={resetting}
              className="text-darcula-text-muted hover:text-darcula-red text-sm inline-flex items-center gap-1 transition-colors disabled:opacity-50"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {resetting ? t('resetting') : t('resetMatch')}
            </button>
          )}
        </div>
      </nav>

      {/* Match info - mobile (shown only on small/medium screens) */}
      <div className="lg:hidden relative z-10 text-center px-4 pb-2">
        <div className="text-darcula-text-muted text-xs uppercase tracking-widest">{tCommon('round')} {roundNumber}</div>
        <div className="text-darcula-text-bright text-base font-bold mt-1 flex items-center justify-center">
          <span className="flex-1 text-center">{formatPlayerName(player1Name)}</span>
          <span className="text-darcula-text-muted mx-2 flex-shrink-0">{tCommon('vs')}</span>
          <span className="flex-1 text-center">{formatPlayerName(player2Name)}</span>
        </div>
        {localMatchResult !== 'pending' && (
          <div className="mt-2 px-4 py-2 bg-darcula-green/20 text-darcula-green rounded-lg inline-block font-bold text-sm">
            {localMatchResult === 'draw'
              ? tMatch('draw')
              : localMatchResult === 'player1'
                ? `${player1Name} ${tMatch('wins')}!`
                : `${player2Name} ${tMatch('wins')}!`}
          </div>
        )}
      </div>

      {/* Theme indicator - positioned below navbar on left, overlays content */}
      <div className="absolute top-12 left-4 z-20 flex items-center gap-2 text-darcula-text-muted text-sm">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
        </svg>
        <span>{theme.name}</span>
        <span className="text-darcula-text-muted/50">({theme.bpm} BPM)</span>
      </div>

      {/* Phase indicator */}
      <div className="relative z-10 w-full text-center py-4 mb-12">
        <div className="text-2xl sm:text-4xl font-bold">
          <span className={state.currentPhase.includes('ban') ? 'text-darcula-red': 'text-darcula-blue'}>
            {phaseInfo.phase}: <span> {phaseInfo.detail} </span>
          </span>
        </div>
      </div>

      {/* Pick-ban wheel container - full width, centers the wheel */}
      <div className="relative z-10 w-full flex justify-center py-4 mb-auto pointer-events-none">
        {/* Wrapper that has the scaled dimensions for proper layout */}
        <div
          className="pointer-events-auto"
          style={{
            width: (centerX * 2) * wheelScale,
            height: (centerY * 2) * wheelScale,
          }}
        >
          <div
            className="relative origin-top-left"
            style={{
              width: centerX * 2,
              height: centerY * 2,
              transform: `scale(${wheelScale})`,
            }}
          >
        {/* Spider web SVG */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          {/* Outer polygon */}
          <polygon
            points={polygonPoints.map(p => `${p.x},${p.y}`).join(' ')}
            fill="none"
            stroke="rgba(169, 183, 198, 0.2)"
            strokeWidth="2"
          />
          {/* Inner polygon */}
          <polygon
            points={innerPolygonPoints.map(p => `${p.x},${p.y}`).join(' ')}
            fill="none"
            stroke="rgba(169, 183, 198, 0.15)"
            strokeWidth="1"
          />
          {/* Lines from center to each vertex */}
          {polygonPoints.map((point, idx) => (
            <line
              key={idx}
              x1={centerX}
              y1={centerY}
              x2={point.x}
              y2={point.y}
              stroke="rgba(169, 183, 198, 0.15)"
              strokeWidth="1"
            />
          ))}
          {/* Radar chart polygon for game play frequency */}
          <polygon
            points={(() => {
              const minRadius = radius * 0.15  // Base offset for zero-play games
              const maxRadius = radius * 0.5   // Maximum extension
              const maxPlays = Math.max(...Object.values(gamePlayCounts), 1)

              return GAMES.map((game, idx) => {
                const playCount = gamePlayCounts[game.id] || 0
                const angle = (idx * 2 * Math.PI) / numGames - Math.PI / 2

                // Scale: minRadius when 0 plays, up to maxRadius at max plays
                const r = minRadius + (playCount / maxPlays) * (maxRadius - minRadius)

                const x = centerX + r * Math.cos(angle)
                const y = centerY + r * Math.sin(angle)
                return `${x},${y}`
              }).join(' ')
            })()}
            fill="rgba(104, 151, 187, 0.15)"
            stroke="rgba(104, 151, 187, 0.3)"
            strokeWidth="2"
          />
        </svg>

        {/* Game cards */}
        {GAMES.map((game, idx) => {
          const angle = (idx * 2 * Math.PI) / numGames - Math.PI / 2
          const x = centerX + radius * Math.cos(angle)
          const y = centerY + radius * Math.sin(angle)

          const gameState = gameStates.get(game.id)!
          const status = gameState.status

          const canClick =
            isInteractive &&
            !saving &&
            ((state.currentPhase === 'pick' && status !== 'banned') ||
              ((state.currentPhase === 'ban1' || state.currentPhase === 'ban2') && status !== 'banned' && status !== 'protected'))

          const isHighlighted = animatingGame === game.id
          const isFlashing = flashingGame === game.id
          const isSelected = state.currentPhase === 'complete' && game.id === state.selectedGame
          const isMatchGame = localMatchResult !== 'pending' && game.id === selectedGame

          return (
            <button
              key={game.id}
              onClick={() => handleGameClick(game.id)}
              disabled={!canClick}
              className={`
                absolute w-28 h-28 rounded-lg flex flex-col items-center justify-center
                text-sm font-bold text-center transition-all duration-200
                transform -translate-x-1/2 -translate-y-1/2
                ${
                  status === 'banned'
                    ? 'bg-darcula-red/20 border-2 border-darcula-red/50'
                    : isFlashing
                      ? 'bg-darcula-green/30 border-4 border-darcula-yellow scale-110 game-selected-flash'
                      : isSelected || isMatchGame
                        ? 'bg-darcula-green/30 border-4 border-darcula-yellow'
                        : isHighlighted
                          ? 'bg-darcula-green/40 border-2 border-darcula-green border-dashed scale-110'
                          : status === 'protected'
                            ? 'bg-darcula-blue/20 border-2 border-darcula-blue'
                            : 'bg-darcula-surface/80 border-2 border-darcula-border/50'
                }
                ${canClick ? 'hover:scale-110 hover:border-dashed hover:border-darcula-text cursor-pointer' : 'cursor-default'}
                backdrop-blur-sm
              `}
              style={{ left: x, top: y }}
            >
              <span className={`text-lg uppercase tracking-wide ${
                status === 'banned' ? 'text-darcula-text-muted' : 'text-darcula-text-bright'
              }`}>
                {game.name}
              </span>

              {/* Banned X overlay */}
              {status === 'banned' && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <svg className="w-16 h-16 text-darcula-red" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <path d="M6 6l12 12M6 18L18 6" />
                  </svg>
                </div>
              )}

              {/* Protected star */}
              {status === 'protected' && (
                <span className="absolute -top-2 -right-2 w-6 h-6 bg-darcula-blue rounded-full flex items-center justify-center text-white text-sm">
                  ★
                </span>
              )}

              {/* Action label */}
              {canClick && (
                <span className={`absolute -bottom-1 left-1/2 -translate-x-1/2 px-2 py-0.5 text-xs rounded ${
                  state.currentPhase === 'pick' ? 'bg-darcula-blue text-white' : 'bg-darcula-red text-white'
                }`}>
                  {state.currentPhase === 'pick' ? t('protect') : t('ban')}
                </span>
              )}
            </button>
          )
        })}
          </div>
        </div>
      </div>

      {/* Footer with portraits and match info */}
      <div className="relative z-10 w-full flex items-end justify-center gap-4 px-4 py-4 pointer-events-none">
        <PlayerPortrait
          playerNumber={1}
          name={player1Name}
          avatar={player1Avatar}
          isActive={isActivePhase && state.currentPlayer === 1}
          isWinner={player1IsWinner}
          opponentIsWinner={player2IsWinner}
          canSelectWinner={canSelectWinner}
          saving={saving}
          showEntranceAnimation={showEntranceAnimation}
          showExplosion={showExplosion1}
          animationDurations={animationDurations}
          actionsLength={actions.length}
          onSelectWinner={() => handleRecordResult('player1')}
          winnerLabel={t('winner')}
          gradientColors="from-darcula-blue to-darcula-purple"
        />

        {/* Match info - center (hidden on small/medium screens) */}
        <div className="hidden lg:block text-center pb-4 lg:pb-8 flex-shrink-0 pointer-events-auto">
          <div className="text-darcula-text-muted text-xs sm:text-sm uppercase tracking-widest">{tCommon('round')} {roundNumber}</div>
          <div className="text-darcula-text-bright text-lg sm:text-xl lg:text-2xl font-bold mt-1 flex items-center justify-center">
            <span className="flex-1 text-center">{formatPlayerName(player1Name)}</span>
            <span className="text-darcula-text-muted mx-2 flex-shrink-0">{tCommon('vs')}</span>
            <span className="flex-1 text-center">{formatPlayerName(player2Name)}</span>
          </div>

          {/* Show result if match is complete */}
          {localMatchResult !== 'pending' && (
            <div className="mt-2 sm:mt-4 px-4 sm:px-6 py-2 sm:py-3 bg-darcula-green/20 text-darcula-green rounded-lg inline-block font-bold text-sm sm:text-base">
              {localMatchResult === 'draw'
                ? tMatch('draw')
                : localMatchResult === 'player1'
                  ? `${player1Name} ${tMatch('wins')}!`
                  : `${player2Name} ${tMatch('wins')}!`}
            </div>
          )}
        </div>

        <PlayerPortrait
          playerNumber={2}
          name={player2Name}
          avatar={player2Avatar}
          isActive={isActivePhase && state.currentPlayer === 2}
          isWinner={player2IsWinner}
          opponentIsWinner={player1IsWinner}
          canSelectWinner={canSelectWinner}
          saving={saving}
          showEntranceAnimation={showEntranceAnimation}
          showExplosion={showExplosion2}
          animationDurations={animationDurations}
          actionsLength={actions.length}
          onSelectWinner={() => handleRecordResult('player2')}
          winnerLabel={t('winner')}
          gradientColors="from-darcula-orange to-darcula-red"
          entranceDelay={showEntranceAnimation ? '0.15s' : undefined}
        />
      </div>

    </div>
  )
}
