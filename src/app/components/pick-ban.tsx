'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { ConfirmModal } from './confirm-modal'
import { NavMenu } from './nav-menu'
import {
  GAMES,
  GAME_URLS_STORAGE_KEY,
  type PickBanAction,
  getGameStates,
  calculatePickBanState,
} from '@/lib/games'
import { useMatchStream, type MatchState } from '@/app/hooks/useMatchStream'
import { useGamepad, type GamepadDirection } from '@/app/hooks/useGamepad'
import { useWheelNavigation } from '@/app/hooks/useWheelNavigation'
import { type Theme, getAnimationDurations } from '@/lib/themes'
import { calculateMatchPoints, DEFAULT_BET } from '@/lib/scoring-constants'
import { BetRadarChart } from './bet-radar-chart'
import { GTA4LoadingBackground } from './gta4-loading-background'
import { MatrixBackground } from './matrix-background'
import { BalatroBackground } from './balatro-background'
import { BalatroCardRain } from './balatro-card-rain'
import { PlayerCard, BountyBadge, formatPlayerName, getInitials } from './player-card'

/**
 * Points a player would win per game if they played and won it against this
 * opponent — i.e. their match winnings (bounty bonus excluded). Surfacing this
 * on the radar instead of raw bets entices underdog play: betting low against a
 * high opponent yields the larger payout when you win the upset.
 */
function buildPotentialWinnings(
  myBets: Record<string, number>,
  opponentBets: Record<string, number>,
): Record<string, number> {
  const result: Record<string, number> = {}
  for (const game of GAMES) {
    const myBet = myBets[game.id] ?? DEFAULT_BET
    const opponentBet = opponentBets[game.id] ?? DEFAULT_BET
    result[game.id] = calculateMatchPoints(myBet, opponentBet)
  }
  return result
}

interface PickBanProps {
  player1Name: string
  player2Name: string
  player1Avatar?: string | null
  player2Avatar?: string | null
  matchId: number
  tournamentId: number
  initialActions: PickBanAction[]
  initialSelectedGame?: string
  initialPlayer1PreferredGame?: string | null
  initialPlayer2PreferredGame?: string | null
  isHost: boolean
  matchResult: string
  roundNumber: number
  theme: Theme
  prevMatchId: number | null
  nextMatchId: number | null
  player1Id: number
  player2Id: number
  prevMatchAudioFile: string | null
  nextMatchAudioFile: string | null
  canAdvanceRound: boolean
  player1Bets: Record<string, number>
  player2Bets: Record<string, number>
  player1Bounty?: number
  player2Bounty?: number
  sessionPlayerId: number | null
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
  gamepadFocused?: boolean
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
  gamepadFocused,
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
        filter: playerNumber === 1
          ? 'drop-shadow(0 0 12px rgba(104, 151, 187, 0.7))'
          : 'drop-shadow(0 0 12px rgba(106, 175, 89, 0.7))',
        ...(shouldAnimate ? { '--sway-duration': `${animationDurations.sway}s`, '--bounce-duration': `${animationDurations.bounce}s` } : {})
      } as React.CSSProperties}
    >
      <button
        onClick={() => canSelectWinner && onSelectWinner()}
        disabled={!canSelectWinner || saving}
        className={`relative transition-all duration-300 rounded-t-lg ${
          playerNumber === 1 ? 'ring-darcula-blue' : 'ring-darcula-green'
        } ring-offset-darcula-bg ${
          shouldAnimate
            ? 'ring-4 ring-offset-2 lg:ring-offset-4 idle-bounce'
            : canSelectWinner
              ? 'ring-2 ring-offset-1 lg:ring-offset-2 hover:ring-4 hover:ring-offset-2 lg:hover:ring-offset-4 cursor-pointer'
              : opponentIsWinner
                ? 'ring-2 ring-offset-1 grayscale opacity-60'
                : 'ring-2 ring-offset-1 opacity-60'
        } ${gamepadFocused ? 'gamepad-focus' : ''}`}
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
  initialPlayer1PreferredGame,
  initialPlayer2PreferredGame,
  isHost,
  matchResult,
  roundNumber,
  theme,
  prevMatchId,
  nextMatchId,
  player1Id,
  player2Id,
  prevMatchAudioFile,
  nextMatchAudioFile,
  canAdvanceRound,
  player1Bets,
  player2Bets,
  player1Bounty,
  player2Bounty,
  sessionPlayerId,
}: PickBanProps) {
  const router = useRouter()
  const t = useTranslations('pickBan')
  const tCommon = useTranslations('common')
  const tMatch = useTranslations('match')
  const tErrors = useTranslations('errors')
  const tHome = useTranslations('home')
  const tBets = useTranslations('bets')
  const tGames = useTranslations('games')
  const tAuth = useTranslations('auth')
  const tRoster = useTranslations('roster')
  const [actions, setActions] = useState<PickBanAction[]>(initialActions)
  const [selectedGame, setSelectedGame] = useState<string | undefined>(initialSelectedGame)
  const [player1PreferredGame, setPlayer1PreferredGame] = useState<string | null>(initialPlayer1PreferredGame ?? null)
  const [player2PreferredGame, setPlayer2PreferredGame] = useState<string | null>(initialPlayer2PreferredGame ?? null)
  const [animatingGame, setAnimatingGame] = useState<string | null>(null)
  const [flashingGame, setFlashingGame] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [showNavMenu, setShowNavMenu] = useState(false)
  const [advancing, setAdvancing] = useState(false)
  const [backgroundFlash, setBackgroundFlash] = useState<'ban' | 'pick' | 'select' | null>(null)
  const [localMatchResult, setLocalMatchResult] = useState(matchResult)
  const [victoryScreenLoaded, setVictoryScreenLoaded] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [navigating, setNavigating] = useState(false)
  const [showEntranceAnimation, setShowEntranceAnimation] = useState(
    initialActions.length === 0 && matchResult === 'pending'
  )
  const [showExplosion1, setShowExplosion1] = useState(false)
  const [showExplosion2, setShowExplosion2] = useState(false)
  const animationStartedRef = useRef(false)
  const entranceAnimationShownRef = useRef(initialActions.length === 0 && matchResult === 'pending')
  const currentAnimatingGameRef = useRef<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const optimisticCountRef = useRef(initialActions.length)
  const [wheelScale, setWheelScale] = useState(1)
  const [floatingPoints, setFloatingPoints] = useState<{ player: 1 | 2; points: number; bounty: number } | null>(null)
  const [focusedWinner, setFocusedWinner] = useState<'player1' | 'player2' | null>(null)
  const [focusedOpenGame, setFocusedOpenGame] = useState(false)
  const [gameLaunchUrl, setGameLaunchUrl] = useState<string | null>(null)

  // Resolve launch URL from localStorage when game is selected
  useEffect(() => {
    if (!selectedGame) { setGameLaunchUrl(null); return }
    const game = GAMES.find(g => g.id === selectedGame)
    if (!game?.launchable) { setGameLaunchUrl(null); return }

    let url: string | null = null
    try {
      const stored = localStorage.getItem(GAME_URLS_STORAGE_KEY)
      if (stored) {
        const urls = JSON.parse(stored) as Record<string, string>
        if (urls[selectedGame] && urls[selectedGame].length > 'steam://rungameid/'.length) {
          url = urls[selectedGame]
        }
      }
    } catch { /* ignore */ }

    // Fall back to default URL if it has an actual app ID
    if (!url && game.steamAppId && game.defaultLaunchUrl) {
      url = game.defaultLaunchUrl
    }

    setGameLaunchUrl(url)
  }, [selectedGame])

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

  // Preload explosion assets on mount
  useEffect(() => {
    const links: HTMLLinkElement[] = []

    const gifLink = document.createElement('link')
    gifLink.rel = 'preload'
    gifLink.as = 'image'
    gifLink.href = '/explosion.gif'
    document.head.appendChild(gifLink)
    links.push(gifLink)

    const audioLink = document.createElement('link')
    audioLink.rel = 'preload'
    audioLink.as = 'audio'
    audioLink.href = '/Minecraft-Explosion.mp3'
    document.head.appendChild(audioLink)
    links.push(audioLink)

    return () => {
      links.forEach((link) => link.remove())
    }
  }, [])

  // Prefetch adjacent match songs for faster navigation
  useEffect(() => {
    const links: HTMLLinkElement[] = []

    for (const audioFile of [prevMatchAudioFile, nextMatchAudioFile]) {
      if (audioFile) {
        const link = document.createElement('link')
        link.rel = 'prefetch'
        link.as = 'audio'
        link.href = audioFile
        document.head.appendChild(link)
        links.push(link)
      }
    }

    return () => {
      links.forEach((link) => link.remove())
    }
  }, [prevMatchAudioFile, nextMatchAudioFile])

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

  function handleOpenGame() {
    if (gameLaunchUrl) window.location.href = gameLaunchUrl
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

  // Auto-mute when tab loses focus or browser window loses OS focus
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    let volumeBeforeMute = audio.volume

    const handleVisibilityChange = () => {
      if (document.hidden) {
        volumeBeforeMute = audio.volume
        audio.volume = 0
      } else {
        audio.volume = volumeBeforeMute
      }
    }

    const handleWindowBlur = () => {
      if (audio.volume > 0) {
        volumeBeforeMute = audio.volume
      }
      audio.volume = 0
    }

    const handleWindowFocus = () => {
      if (!document.hidden) {
        audio.volume = volumeBeforeMute
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('blur', handleWindowBlur)
    window.addEventListener('focus', handleWindowFocus)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('blur', handleWindowBlur)
      window.removeEventListener('focus', handleWindowFocus)
    }
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

  // --- Gamepad support ---
  const { getFocus, navigate: navigateWheel, reset: resetWheelFocus } = useWheelNavigation(GAMES.length)

  // Gamepad is always active (navigation buttons work anytime), except during auto-selection animation
  const gamepadEnabled = state.currentPhase !== 'selecting'
  const lastBumperPress = useRef(0)

  // useGamepad stores callbacks in refs internally, so these don't need to be stable
  const handleGamepadButton = (button: string, gamepadIndex: number) => {
    if (button === 'cross') {
      if (state.currentPhase === 'complete') {
        if (focusedOpenGame && gameLaunchUrl) {
          handleOpenGame()
        } else if (focusedWinner && canSelectWinner) {
          handleRecordResult(focusedWinner)
        }
      } else {
        // During ban/pick with 2 controllers: only the active player's controller acts
        if (connectedCount >= 2 && gamepadIndex !== state.currentPlayer - 1) return
        const idx = getFocus(gamepadIndex)
        if (idx !== null) handleGameClick(GAMES[idx].id)
      }
    } else if (button === 'triangle') {
      handleFullscreenToggle()
    } else if (button === 'square') {
      // Mark the pressing player's preferred game (gamepad 0 → player 1, gamepad 1 → player 2)
      if (state.currentPhase === 'complete' || state.currentPhase === 'selecting') return
      if (gamepadIndex > 1) return
      const idx = getFocus(gamepadIndex)
      if (idx !== null) setPreference((gamepadIndex + 1) as 1 | 2, GAMES[idx].id)
    } else if (button === 'circle') {
      setNavigating(true)
      router.push(`/tournaments/${tournamentId}`)
    } else if (button === 'l1' && prevMatchId !== null) {
      const now = Date.now()
      if (now - lastBumperPress.current < 500) return
      lastBumperPress.current = now
      setNavigating(true)
      router.push(`/tournaments/${tournamentId}/matches/${prevMatchId}`)
    } else if (button === 'r1' && nextMatchId !== null) {
      const now = Date.now()
      if (now - lastBumperPress.current < 500) return
      lastBumperPress.current = now
      setNavigating(true)
      router.push(`/tournaments/${tournamentId}/matches/${nextMatchId}`)
    } else if (button === 'options') {
      setShowNavMenu(true)
    }
  }

  const handleGamepadDirection = (dir: GamepadDirection, gamepadIndex: number) => {
    if (state.currentPhase === 'complete') {
      const hasOpenGame = gameLaunchUrl && selectedGame && GAMES.find(g => g.id === selectedGame)?.launchable
      if (dir === 'up' && hasOpenGame) {
        setFocusedOpenGame(true)
        setFocusedWinner(null)
      } else if (dir === 'down') {
        setFocusedOpenGame(false)
        if (!focusedWinner) setFocusedWinner('player1')
      } else if (dir === 'left') {
        setFocusedOpenGame(false)
        setFocusedWinner('player1')
      } else if (dir === 'right') {
        setFocusedOpenGame(false)
        setFocusedWinner('player2')
      }
    } else {
      // Each controller drives its own wheel cursor, even off its turn
      if (gamepadIndex > 1) return
      navigateWheel(dir, gamepadIndex)
    }
  }

  const { connectedCount } = useGamepad({
    onButtonPress: handleGamepadButton,
    onDirection: handleGamepadDirection,
    enabled: gamepadEnabled,
  })

  // Reset gamepad focus when phase changes
  useEffect(() => {
    resetWheelFocus()
    setFocusedWinner(null)
    setFocusedOpenGame(false)
  }, [state.currentPhase, resetWheelFocus])

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
      ?? ((type === 'onBan' || type === 'onPick') ? { path: '/soundbites/MagicClick.ogg' }
        : type === 'onWinnerChosen' ? { path: '/soundbites/ff-victory.mp3', volume: 0.1 } : null)
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
    const audio = new Audio('/multhit1.ogg')
    audio.volume = 0.5
    audio.currentTime = 0
    audio.play().catch(() => {
      // Autoplay may be blocked - that's ok
    })
  }, [])

  const currentPlayerName = state.currentPlayer === 1 ? player1Name : player2Name

  // Games that can be selected at the end (not banned)
  const selectableGames = GAMES.filter((g) => gameStates.get(g.id)?.status !== 'banned')

  const isMyTurn = sessionPlayerId !== null && sessionPlayerId === (state.currentPlayer === 1 ? player1Id : player2Id)
  const isInteractive = (isHost || isMyTurn) && localMatchResult === 'pending' && state.currentPhase !== 'complete' && state.currentPhase !== 'selecting'
  const canSelectWinner = isHost && localMatchResult === 'pending' && state.currentPhase === 'complete'

  // SSE: real-time state sync for all clients (host + players)
  const handleStateUpdate = useCallback((serverState: MatchState) => {
    const serverActionCount = serverState.pickBanHistory.length

    // Detect reset: server has been fully cleared but we still have local state.
    // (Checking prefs/selectedGame too handles agreements reached with few/no bans.)
    const serverEmpty =
      serverActionCount === 0 &&
      !serverState.selectedGame &&
      !serverState.player1PreferredGame &&
      !serverState.player2PreferredGame
    const localHasState =
      actions.length > 0 || !!selectedGame || !!player1PreferredGame || !!player2PreferredGame
    if (serverEmpty && localHasState) {
      setActions([])
      setSelectedGame(undefined)
      setPlayer1PreferredGame(null)
      setPlayer2PreferredGame(null)
      setAnimatingGame(null)
      setFlashingGame(null)
      setBackgroundFlash(null)
      setLocalMatchResult('pending')
      animationStartedRef.current = false
      currentAnimatingGameRef.current = null
      optimisticCountRef.current = 0
      return
    }

    // Skip if server hasn't caught up to our optimistic update yet
    if (serverActionCount < optimisticCountRef.current) {
      return
    }

    // Update actions if they changed
    if (serverActionCount !== actions.length || JSON.stringify(serverState.pickBanHistory) !== JSON.stringify(actions)) {
      setActions(serverState.pickBanHistory)
      optimisticCountRef.current = serverActionCount
    }

    // Update selected game if set
    if (serverState.selectedGame && serverState.selectedGame !== selectedGame) {
      setSelectedGame(serverState.selectedGame)
    }

    // Update preferred games from server
    if (serverState.player1PreferredGame !== player1PreferredGame) {
      setPlayer1PreferredGame(serverState.player1PreferredGame)
    }
    if (serverState.player2PreferredGame !== player2PreferredGame) {
      setPlayer2PreferredGame(serverState.player2PreferredGame)
    }

    // Update result if changed
    if (serverState.result !== localMatchResult) {
      setLocalMatchResult(serverState.result)
      if (serverState.result !== 'pending') {
        router.refresh()
      }
    }
  }, [actions, selectedGame, player1PreferredGame, player2PreferredGame, localMatchResult, router])

  useMatchStream({
    tournamentId,
    matchId,
    enabled: true,
    onStateUpdate: handleStateUpdate,
  })
  // Show active player animation for everyone (not just host)
  const isActivePhase = localMatchResult === 'pending' && state.currentPhase !== 'complete' && state.currentPhase !== 'selecting'
  const player1IsWinner = localMatchResult === 'player1'
  const player2IsWinner = localMatchResult === 'player2'
  const winnerId = player1IsWinner ? player1Id : player2IsWinner ? player2Id : null
  const victoryScreenUrl = winnerId ? `/victory-screens/${winnerId}.jpeg` : null
  const matchComplete = localMatchResult !== 'pending'

  // Check if the winner has a victory screen image
  useEffect(() => {
    if (!victoryScreenUrl) {
      setVictoryScreenLoaded(false)
      return
    }
    const img = new Image()
    img.onload = () => setVictoryScreenLoaded(true)
    img.onerror = () => setVictoryScreenLoaded(false)
    img.src = victoryScreenUrl
  }, [victoryScreenUrl])

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
    optimisticCountRef.current++
    setActions((prev) => [...prev, newAction])

    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/matches/${matchId}/pick-ban`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: newAction }),
      })

      if (!res.ok) {
        // Roll back on failure
        optimisticCountRef.current--
        setActions((prev) => prev.filter((a) => a !== newAction))
        toast.error(tErrors('failedToSaveAction'))
      }
    } catch {
      // Roll back on network error
      optimisticCountRef.current--
      setActions((prev) => prev.filter((a) => a !== newAction))
      toast.error(tErrors('networkError'))
    }
  }, [tournamentId, matchId, tErrors])

  function triggerBackgroundFlash(type: 'ban' | 'pick' | 'select') {
    setBackgroundFlash(type)
    setTimeout(() => setBackgroundFlash(null), type === 'select' ? 900 : 800)
  }

  // Celebrate a mutually-agreed game: flash the tile, play the soundbite, toast.
  const celebrateAgreement = useCallback((gameId: string) => {
    setSelectedGame(gameId)
    setFlashingGame(gameId)
    setTimeout(() => setFlashingGame(null), 900)
    triggerBackgroundFlash('select')
    playSoundbite('onGameSelected')
    toast.success(t('agreedToast', { game: GAMES.find((g) => g.id === gameId)?.name ?? '' }))
  }, [playSoundbite, t])

  // Mark one player's preferred game (toggles off if re-selected). When it matches the
  // other player's preference, the game is agreed and chosen immediately.
  const setPreference = useCallback(async (player: 1 | 2, gameId: string) => {
    const setter = player === 1 ? setPlayer1PreferredGame : setPlayer2PreferredGame
    const prevValue = player === 1 ? player1PreferredGame : player2PreferredGame
    const otherValue = player === 1 ? player2PreferredGame : player1PreferredGame
    const next = prevValue === gameId ? null : gameId

    // Optimistic update
    setter(next)
    if (next && next === otherValue) celebrateAgreement(next)

    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/matches/${matchId}/pick-ban`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preference: { player, gameId } }),
      })
      if (!res.ok) {
        setter(prevValue)
        toast.error(tErrors('failedToSaveAction'))
      }
    } catch {
      setter(prevValue)
      toast.error(tErrors('networkError'))
    }
  }, [tournamentId, matchId, player1PreferredGame, player2PreferredGame, celebrateAgreement, tErrors])

  // Both players agree on a game at once (ctrl+shift+click) — chosen immediately.
  const setBothPreferences = useCallback(async (gameId: string) => {
    setPlayer1PreferredGame(gameId)
    setPlayer2PreferredGame(gameId)
    celebrateAgreement(gameId)

    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/matches/${matchId}/pick-ban`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preference: { gameId, both: true } }),
      })
      if (!res.ok) toast.error(tErrors('failedToSaveAction'))
    } catch {
      toast.error(tErrors('networkError'))
    }
  }, [tournamentId, matchId, celebrateAgreement, tErrors])

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

    // Add random variance (0, 1, or 2 extra steps) so the final game varies
    const extraSteps = Math.floor(Math.random() * gamesToSelect.length)
    const totalDuration = 5000 + extraSteps * 500
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

    // Play custom soundbite if configured, otherwise play ding.mp3 4 times in quick succession
    if (theme.soundbites?.onGameSelected) {
      playSoundbite('onGameSelected')
    } else {
      for (let i = 0; i < 6; i++) {
        setTimeout(() => {
          const ding = new Audio('/soundbites/ding.mp3')
          ding.play().catch(() => {})
        }, i * 120)
      }
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
        toast.error(tErrors('failedToSelectGame'))
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

    // Show floating points for the winner
    if (result !== 'draw' && selectedGame) {
      const winnerBets = result === 'player1' ? player1Bets : player2Bets
      const loserBets = result === 'player1' ? player2Bets : player1Bets
      const winnerBet = winnerBets[selectedGame] ?? DEFAULT_BET
      const loserBet = loserBets[selectedGame] ?? DEFAULT_BET
      const pts = calculateMatchPoints(winnerBet, loserBet)
      // Bounty bonus = the defeated opponent's bounty
      const bounty = (result === 'player1' ? player2Bounty : player1Bounty) ?? 0
      setFloatingPoints({ player: result === 'player1' ? 1 : 2, points: pts, bounty })
      setTimeout(() => setFloatingPoints(null), 2000)
    }

    // Briefly fade out music for the winner soundbite, then fade back in
    fadeOutMusic(500)
    playSoundbite('onWinnerChosen').then(() => {
      fadeInMusic(2000)
    })

    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/matches/${matchId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ result }),
      })

      if (!res.ok) {
        // Roll back on failure
        setLocalMatchResult(previousResult)
        toast.error(tErrors('failedToRecordResult'))
      } else {
        router.refresh()
      }
    } catch {
      // Roll back on network error
      setLocalMatchResult(previousResult)
      toast.error(tErrors('networkError'))
    }
  }

  function handleResetRound() {
    setShowResetConfirm(true)
  }

  async function confirmResetRound() {
    setShowResetConfirm(false)
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
        toast.error(tErrors('failedToResetMatch'))
      }
    } finally {
      setResetting(false)
    }
  }

  async function handleAdvanceRound() {
    setAdvancing(true)
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/next-round`, { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        if (data.completed) {
          router.push(`/tournaments/${tournamentId}/result`)
        } else if (data.firstMatchId) {
          router.push(`/tournaments/${tournamentId}/matches/${data.firstMatchId}`)
        } else {
          router.refresh()
        }
      } else {
        toast.error(tErrors('failedToAdvance'))
      }
    } finally {
      setAdvancing(false)
    }
  }

  // Calculate positions for games in a polygon
  const numGames = GAMES.length
  const radius = 240
  const centerX = 300
  const centerY = 260

  const phaseInfo = getPhaseInstruction()

  return (
    <div className="min-h-screen bg-darcula-bg flex flex-col relative overflow-x-hidden">
      {/* Navigation loading overlay */}
      {navigating && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-darcula-bg/70">
          <svg className="w-12 h-12 animate-spin text-darcula-text-muted" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      )}

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

      {/* Active player color corner gradient */}
      {isActivePhase && (
        <div
          className="fixed inset-0 z-[1] pointer-events-none transition-opacity duration-300"
          style={{
            background: state.currentPlayer === 1
              ? 'linear-gradient(to right, rgba(104, 151, 187, 0.8) 0%, transparent 50%)'
              : 'linear-gradient(to left, rgba(106, 175, 89, 0.8) 0%, transparent 50%)',
            mixBlendMode: 'hard-light',
          }}
        />
      )}

      {/* Winner color tinge from bottom */}
      {matchComplete && localMatchResult !== 'draw' && (
        <div
          className="fixed inset-0 z-[1] pointer-events-none transition-opacity duration-1000"
          style={{
            background: localMatchResult === 'player1'
              ? 'linear-gradient(to top, rgba(104, 151, 187, 0.5) 0%, rgba(104, 151, 187, 0.15) 40%, transparent 70%)'
              : 'linear-gradient(to top, rgba(106, 175, 89, 0.5) 0%, rgba(106, 175, 89, 0.15) 40%, transparent 70%)',
            mixBlendMode: 'hard-light',
          }}
        />
      )}

      {/* Victory screen overlay */}
      {victoryScreenUrl && victoryScreenLoaded && (
        <div
          className="fixed inset-0 z-[1] pointer-events-none transition-opacity duration-1000"
          style={{
            backgroundImage: `linear-gradient(to bottom, rgba(30, 31, 34, 0.3) 0%, rgba(30, 31, 34, 0.7) 100%), url(${victoryScreenUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
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
          <button
            onClick={() => { setNavigating(true); router.push(`/tournaments/${tournamentId}`) }}
            className="text-darcula-text hover:text-darcula-text-bright text-sm inline-flex items-center gap-1 transition-colors drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {tCommon('back')}
          </button>
          {prevMatchId !== null ? (
            <button
              onClick={() => { setNavigating(true); router.push(`/tournaments/${tournamentId}/matches/${prevMatchId}`) }}
              className="p-2 rounded border border-darcula-border text-darcula-text hover:bg-darcula-elevated transition"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
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
            <button
              onClick={() => { setNavigating(true); router.push(`/tournaments/${tournamentId}/matches/${nextMatchId}`) }}
              className="p-2 rounded border border-darcula-border text-darcula-text hover:bg-darcula-elevated transition"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ) : canAdvanceRound ? (
            <button
              onClick={handleAdvanceRound}
              disabled={advancing}
              className="p-2 rounded bg-darcula-blue text-darcula-bg hover:bg-darcula-blue/80 transition disabled:opacity-50"
              title={tCommon('processing')}
            >
              {advancing ? (
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                </svg>
              )}
            </button>
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
              className="text-darcula-text hover:text-darcula-red text-sm inline-flex items-center gap-1 transition-colors disabled:opacity-50 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {resetting ? t('resetting') : t('resetMatch')}
            </button>
          )}
        </div>
      </nav>

      {/* Reset match confirm modal */}
      {showResetConfirm && (
        <ConfirmModal
          message={t('confirmResetMatch')}
          confirmLabel={t('resetMatch')}
          cancelLabel={tCommon('cancel')}
          onConfirm={confirmResetRound}
          onCancel={() => setShowResetConfirm(false)}
        />
      )}

      {/* Nav menu (Options button) */}
      {showNavMenu && (
        <NavMenu
          items={[
            { label: tHome('appTitle'), href: '/' },
            { label: tBets('myBetsNav'), href: '/bets' },
            { label: tGames('games'), href: '/games' },
            { label: tAuth('tournament'), href: `/tournaments/${tournamentId}` },
            { label: tRoster('roster'), href: `/tournaments/${tournamentId}/roster` },
            { label: isFullscreen ? t('exitFullscreen') : t('enterFullscreen'), onAction: handleFullscreenToggle },
            { label: t('resetMatch'), onAction: handleResetRound, variant: 'danger' },
          ]}
          onClose={() => setShowNavMenu(false)}
        />
      )}

      {/* Match info - mobile (shown only on small/medium screens) */}
      <div className="lg:hidden relative z-10 text-center px-4 pb-2">
        <div className="text-darcula-text text-xs uppercase tracking-widest drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">{tCommon('round')} {roundNumber}</div>
        <div className="text-darcula-text-bright text-base font-bold mt-1 flex items-center justify-center drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
          <span className="flex-1 text-center">{formatPlayerName(player1Name)}</span>
          <span className="text-darcula-text mx-2 flex-shrink-0">{tCommon('vs')}</span>
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
      <div className="absolute top-12 left-4 z-20 flex items-center gap-2 text-darcula-text text-sm drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
        </svg>
        <span>{theme.name}</span>
        <span className="text-darcula-text/50">({theme.bpm} BPM)</span>
      </div>

      {/* Phase indicator */}
      <div className="relative z-10 w-full text-center py-4 mb-12">
        <div className="text-2xl sm:text-4xl font-bold">
          <span className={state.currentPhase.includes('ban') ? 'text-darcula-red': 'text-darcula-blue'}>
            {phaseInfo.phase}: <span> {phaseInfo.detail} </span>
          </span>
        </div>
        {/* Waiting indicator for players when it's not their turn */}
        {sessionPlayerId && !isHost && !isMyTurn && localMatchResult === 'pending' && state.currentPhase !== 'complete' && state.currentPhase !== 'selecting' && (
          <div className="mt-2 text-sm text-darcula-text-muted animate-pulse">
            {t('waitingFor', { name: currentPlayerName })}
          </div>
        )}
        {/* Open Game button - shown when game is selected and launchable */}
        {state.currentPhase === 'complete' && selectedGame && GAMES.find(g => g.id === selectedGame)?.launchable && (
          <div className="mt-3">
            {gameLaunchUrl ? (
              <button
                onClick={handleOpenGame}
                className={`px-6 py-2 bg-darcula-green text-darcula-bg rounded-lg hover:bg-darcula-green/80 transition font-medium text-sm sm:text-base inline-flex items-center gap-2 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] ${focusedOpenGame ? 'gamepad-focus' : ''}`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {t('openGame')}
              </button>
            ) : (
              <p className="text-darcula-text-muted text-sm drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                {t('noLaunchUrl')}{' '}
                <a
                  href="/setup"
                  className="text-darcula-blue hover:underline"
                >
                  {t('configureInSetup')}
                </a>
              </p>
            )}
          </div>
        )}
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
        <div className="absolute inset-0 pointer-events-none">
          <BetRadarChart
            datasets={[
              { values: buildPotentialWinnings(player1Bets, player2Bets), fill: 'rgba(104, 151, 187, 0.25)', stroke: 'rgba(104, 151, 187, 0.6)' },
              { values: buildPotentialWinnings(player2Bets, player1Bets), fill: 'rgba(106, 135, 89, 0.25)', stroke: 'rgba(106, 135, 89, 0.6)' },
            ]}
          />
        </div>

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
          // Wheel cursors: a single controller uses the neutral yellow ring; with two
          // controllers each player gets their own colored ring.
          const twoCursors = connectedCount >= 2
          const isGamepadFocused = !twoCursors && getFocus(0) === idx
          const isP1Cursor = twoCursors && getFocus(0) === idx
          const isP2Cursor = twoCursors && getFocus(1) === idx
          const p1Prefers = player1PreferredGame === game.id
          const p2Prefers = player2PreferredGame === game.id

          return (
            <button
              key={game.id}
              onClick={() => handleGameClick(game.id)}
              className={`
                absolute w-28 h-28 rounded-lg flex flex-col items-center justify-center
                text-sm font-bold text-center transition-all duration-200
                transform -translate-x-1/2 -translate-y-1/2 overflow-hidden
                ${
                  status === 'banned'
                    ? 'border-4 border-darcula-red'
                    : isFlashing
                      ? 'border-4 border-darcula-yellow scale-110 game-selected-flash'
                      : isSelected || isMatchGame
                        ? 'border-4 border-darcula-yellow'
                        : isHighlighted
                          ? 'border-2 border-darcula-green border-dashed scale-110'
                          : status === 'protected'
                            ? 'border-4 border-darcula-blue'
                            : 'border-2 border-darcula-border/50'
                }
                ${canClick ? 'hover:scale-110 hover:border-dashed hover:border-darcula-text cursor-pointer' : 'cursor-default'}
                ${isGamepadFocused ? 'gamepad-focus' : ''}
                ${isP1Cursor ? 'gamepad-focus-p1' : ''}
                ${isP2Cursor ? 'gamepad-focus-p2' : ''}
              `}
              style={{ left: x, top: y }}
              onClickCapture={(e) => {
                // Modifier-clicks set preferred games instead of banning/picking:
                // ctrl → player 1, shift → player 2, ctrl+shift → both (instant agreement)
                if (state.currentPhase === 'complete' || state.currentPhase === 'selecting') return
                if (e.ctrlKey && e.shiftKey) { e.preventDefault(); e.stopPropagation(); setBothPreferences(game.id) }
                else if (e.ctrlKey) { e.preventDefault(); e.stopPropagation(); setPreference(1, game.id) }
                else if (e.shiftKey) { e.preventDefault(); e.stopPropagation(); setPreference(2, game.id) }
              }}
            >
              {/* Background image */}
              {game.imageUrl && (
                <div
                  className="absolute inset-0 bg-cover bg-center"
                  style={{ backgroundImage: `url(${game.imageUrl})` }}
                />
              )}
              {/* Dark overlay for text readability */}
              <div className={`absolute inset-0 ${
                status === 'banned'
                  ? 'bg-darcula-red/70'
                  : isFlashing
                    ? 'bg-darcula-green/50'
                    : isSelected || isMatchGame
                      ? 'bg-darcula-green/50'
                      : isHighlighted
                        ? 'bg-darcula-green/50'
                        : status === 'protected'
                          ? 'bg-darcula-blue/60'
                          : 'bg-black/50'
              }`} />
              <span className={`relative z-[1] text-lg uppercase tracking-wide drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)] ${
                status === 'banned' ? 'text-darcula-text-muted' : 'text-darcula-text-bright'
              }`}>
                {game.name}
              </span>

              {/* Banned X overlay */}
              {status === 'banned' && (
                <div className="absolute inset-0 flex items-center justify-center z-[2]">
                  <svg className="w-20 h-20 text-darcula-red drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
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

              {/* Preferred-game markers (player 1 blue, player 2 orange) */}
              {p1Prefers && (
                <span
                  className="absolute -bottom-2 -left-2 w-6 h-6 bg-darcula-blue rounded-full flex items-center justify-center text-white text-xs font-bold border-2 border-darcula-bg z-[3]"
                  title={t('preferredBy', { name: player1Name })}
                >
                  1
                </span>
              )}
              {p2Prefers && (
                <span
                  className="absolute -bottom-2 -right-2 w-6 h-6 bg-darcula-orange rounded-full flex items-center justify-center text-white text-xs font-bold border-2 border-darcula-bg z-[3]"
                  title={t('preferredBy', { name: player2Name })}
                >
                  2
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
        <div className="relative">
          {player1Bounty ? <BountyBadge amount={player1Bounty} /> : null}
          {floatingPoints?.player === 1 && (
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-20 pointer-events-none floating-points flex flex-col items-center leading-tight">
              <span className="text-darcula-green font-black text-2xl sm:text-3xl lg:text-4xl drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] whitespace-nowrap">
                +{floatingPoints.points}pts{floatingPoints.bounty > 0 ? '' : '!'}
              </span>
              {floatingPoints.bounty > 0 && (
                <>
                  <span className="text-darcula-yellow font-black text-lg sm:text-xl lg:text-2xl drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] whitespace-nowrap">
                    {tBets('bountyShout')}
                  </span>
                  <span className="text-darcula-yellow font-black text-2xl sm:text-3xl lg:text-4xl drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] whitespace-nowrap">
                    +{floatingPoints.bounty}pts
                  </span>
                </>
              )}
            </div>
          )}
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
            gamepadFocused={focusedWinner === 'player1'}
          />
        </div>

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

        <div className="relative">
          {player2Bounty ? <BountyBadge amount={player2Bounty} /> : null}
          {floatingPoints?.player === 2 && (
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-20 pointer-events-none floating-points flex flex-col items-center leading-tight">
              <span className="text-darcula-green font-black text-2xl sm:text-3xl lg:text-4xl drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] whitespace-nowrap">
                +{floatingPoints.points}pts{floatingPoints.bounty > 0 ? '' : '!'}
              </span>
              {floatingPoints.bounty > 0 && (
                <>
                  <span className="text-darcula-yellow font-black text-lg sm:text-xl lg:text-2xl drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] whitespace-nowrap">
                    {tBets('bountyShout')}
                  </span>
                  <span className="text-darcula-yellow font-black text-2xl sm:text-3xl lg:text-4xl drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] whitespace-nowrap">
                    +{floatingPoints.bounty}pts
                  </span>
                </>
              )}
            </div>
          )}
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
            gamepadFocused={focusedWinner === 'player2'}
          />
        </div>
      </div>

    </div>
  )
}
