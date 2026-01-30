'use client'

import { useEffect, useRef } from 'react'
import { useTranslations } from 'next-intl'

// Samba de Janeiro: 133 BPM, division 1
const VICTORY_BPM = 133
const VICTORY_DIVISION = 1
const beatDuration = 60 / VICTORY_BPM
const swayDuration = beatDuration * 6
const bounceDuration = beatDuration / VICTORY_DIVISION

interface Participant {
  playerId: number
  playerName: string
  playerAvatar: string | null
  points: number
}

interface GameStat {
  name: string
  count: number
}

interface Stats {
  mostPlayedGame: GameStat | null
  leastPlayedGame: GameStat | null
  winnerBestGame: GameStat | null
  totalMatches: number
}

interface ResultDisplayProps {
  tournamentName: string
  winnerName: string
  winnerAvatar: string | null
  winnerPoints: number
  participants: Participant[]
  stats: Stats
}

export function ResultDisplay({
  tournamentName,
  winnerName,
  winnerAvatar,
  winnerPoints,
  participants,
  stats,
}: ResultDisplayProps) {
  const t = useTranslations('result')
  const tCommon = useTranslations('common')
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Play victory music on mount
  useEffect(() => {
    const audio = new Audio('/songs/sambadejaneiro.mp3')
    audio.volume = 0.5
    audio.currentTime = 27 // Start at 27 seconds
    audio.loop = true
    audioRef.current = audio

    const tryPlay = () => {
      audio.play().catch(() => {
        // Autoplay blocked - will retry on interaction
      })
    }

    tryPlay()

    // Retry on user interaction if autoplay was blocked
    const handleInteraction = () => {
      if (audio.paused) {
        tryPlay()
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
      document.removeEventListener('click', handleInteraction)
      document.removeEventListener('keydown', handleInteraction)
      document.removeEventListener('touchstart', handleInteraction)
      audio.pause()
      audio.src = ''
    }
  }, [])

  // Get initials for fallback avatar
  const initials = winnerName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <div className="min-h-screen bg-darcula-bg flex flex-col items-center justify-center relative overflow-hidden">
      {/* Animated background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-darcula-green/10 via-darcula-bg to-darcula-bg" />

      {/* Confetti-like particles (CSS-only decoration) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-2 h-2 bg-darcula-yellow rounded-full animate-bounce" style={{ animationDelay: '0s', animationDuration: '2s' }} />
        <div className="absolute top-10 left-1/3 w-3 h-3 bg-darcula-green rounded-full animate-bounce" style={{ animationDelay: '0.3s', animationDuration: '2.5s' }} />
        <div className="absolute top-5 right-1/4 w-2 h-2 bg-darcula-blue rounded-full animate-bounce" style={{ animationDelay: '0.5s', animationDuration: '2.2s' }} />
        <div className="absolute top-20 right-1/3 w-3 h-3 bg-darcula-orange rounded-full animate-bounce" style={{ animationDelay: '0.7s', animationDuration: '1.8s' }} />
        <div className="absolute top-0 left-1/2 w-2 h-2 bg-darcula-purple rounded-full animate-bounce" style={{ animationDelay: '0.2s', animationDuration: '2.3s' }} />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center text-center px-4">
        {/* Tournament name */}
        <p className="text-darcula-text-muted text-lg mb-2">{tournamentName}</p>

        {/* Winner announcement */}
        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-darcula-text-bright mb-8">
          {t('theWinnerIs')}
        </h1>

        {/* Winner name with glow */}
        <h2 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-darcula-green mb-8 drop-shadow-[0_0_30px_rgba(152,195,121,0.5)]">
          {winnerName}!
        </h2>

        {/* Animated portrait */}
        <div
          className="idle-sway"
          style={{ '--sway-duration': `${swayDuration}s`, '--bounce-duration': `${bounceDuration}s` } as React.CSSProperties}
        >
          <div className="idle-bounce">
            <div className="relative w-48 h-64 sm:w-64 sm:h-80 md:w-80 md:h-96 lg:w-96 lg:h-[28rem] rounded-t-lg overflow-hidden ring-4 ring-darcula-green ring-offset-4 ring-offset-darcula-bg shadow-2xl shadow-darcula-green/30">
              {winnerAvatar ? (
                <img
                  src={winnerAvatar}
                  alt={winnerName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-darcula-green to-darcula-blue flex items-center justify-center">
                  <span className="text-darcula-text-bright text-6xl sm:text-7xl md:text-8xl font-bold">
                    {initials}
                  </span>
                </div>
              )}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-4">
                <div className="text-darcula-text-bright text-xl sm:text-2xl font-bold">{winnerName}</div>
                <div className="text-darcula-green text-lg">{winnerPoints} {tCommon('points')}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Section */}
        {stats.totalMatches > 0 && (
          <div className="mt-12 w-full max-w-2xl">
            <h3 className="text-2xl font-bold text-darcula-text-bright mb-6">{t('stats')}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Most Played Game */}
              {stats.mostPlayedGame && (
                <div className="bg-darcula-surface/80 backdrop-blur-sm border border-darcula-border rounded-lg p-4">
                  <div className="text-darcula-text-muted text-sm mb-1">{t('mostPlayedGame')}</div>
                  <div className="text-darcula-text-bright text-xl font-bold">{stats.mostPlayedGame.name}</div>
                  <div className="text-darcula-blue text-sm">{t('timesPlayed', { count: stats.mostPlayedGame.count })}</div>
                </div>
              )}

              {/* Least Played Game */}
              {stats.leastPlayedGame && stats.leastPlayedGame.name !== stats.mostPlayedGame?.name && (
                <div className="bg-darcula-surface/80 backdrop-blur-sm border border-darcula-border rounded-lg p-4">
                  <div className="text-darcula-text-muted text-sm mb-1">{t('leastPlayedGame')}</div>
                  <div className="text-darcula-text-bright text-xl font-bold">{stats.leastPlayedGame.name}</div>
                  <div className="text-darcula-orange text-sm">{t('timesPlayed', { count: stats.leastPlayedGame.count })}</div>
                </div>
              )}

              {/* Winner's Best Game */}
              {stats.winnerBestGame && (
                <div className="bg-darcula-surface/80 backdrop-blur-sm border border-darcula-green/30 rounded-lg p-4">
                  <div className="text-darcula-text-muted text-sm mb-1">{t('winnerBestGame')}</div>
                  <div className="text-darcula-green text-xl font-bold">{stats.winnerBestGame.name}</div>
                  <div className="text-darcula-green/70 text-sm">{t('wins', { count: stats.winnerBestGame.count })}</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Other participants (losers) */}
        <div className="mt-16 w-full max-w-4xl mb-8">
          <div className="flex flex-wrap justify-center gap-6">
            {participants
              .filter((p) => p.playerName !== winnerName)
              .map((participant) => {
                const participantInitials = participant.playerName
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .toUpperCase()
                  .slice(0, 2)

                // Calculate rank (number of players with more points + 1)
                const rank = participants.filter((p) => p.points > participant.points).length + 1
                const ordinalSuffix = (n: number) => {
                  const s = ['th', 'st', 'nd', 'rd']
                  const v = n % 100
                  return n + (s[(v - 20) % 10] || s[v] || s[0])
                }

                return (
                  <div
                    key={participant.playerId}
                    className="idle-sway opacity-60"
                    style={{ '--sway-duration': `${swayDuration}s`, '--bounce-duration': `${bounceDuration}s` } as React.CSSProperties}
                  >
                    <div className="idle-bounce">
                      <div className="relative w-24 h-32 sm:w-32 sm:h-40 md:w-40 md:h-48 lg:w-48 lg:h-56 rounded-t-lg overflow-hidden ring-1 ring-darcula-border">
                        {participant.playerAvatar ? (
                          <img
                            src={participant.playerAvatar}
                            alt={participant.playerName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-darcula-surface to-darcula-elevated flex items-center justify-center">
                            <span className="text-darcula-text-bright text-2xl sm:text-3xl md:text-4xl font-bold">
                              {participantInitials}
                            </span>
                          </div>
                        )}
                        {/* Position badge */}
                        <div className="absolute top-2 left-2 bg-black/70 px-3 py-1 rounded text-darcula-text-bright text-base sm:text-lg md:text-xl lg:text-2xl font-bold">
                          {ordinalSuffix(rank)}
                        </div>
                        {/* Clapping gif */}
                        <img
                          src="/clapping.gif"
                          alt=""
                          className="absolute bottom-10 right-1 w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 lg:w-16 lg:h-16 -scale-x-100"
                        />
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-2">
                          <div className="text-darcula-text-bright text-sm sm:text-base font-medium truncate">{participant.playerName}</div>
                          <div className="text-darcula-text-muted text-xs sm:text-sm">
                            {participant.points} {tCommon('pts')}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
          </div>
        </div>
      </div>
    </div>
  )
}
