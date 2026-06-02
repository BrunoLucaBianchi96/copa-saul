'use client'

import { useTranslations } from 'next-intl'
import { Avatar } from '@/app/components/avatar'
import { type DashboardStandingRow } from '@/lib/dashboard'

interface AnimatedLeaderboardProps {
  standings: DashboardStandingRow[]
}

// Row height in px — used both for the container height and each row's
// translateY offset, so rows slide between ranks instead of snapping.
const ROW_HEIGHT = 64

export function AnimatedLeaderboard({ standings }: AnimatedLeaderboardProps) {
  const t = useTranslations('home')
  const tCommon = useTranslations('common')

  // Rank by points-sorted order (server already sorts desc(points)).
  const rankByPlayer = new Map<number, number>()
  standings.forEach((s, i) => rankByPlayer.set(s.playerId, i))

  // Render rows in a STABLE DOM order (by playerId) so React never reorders the
  // nodes; the visual order is driven purely by the translateY transform.
  const stableRows = [...standings].sort((a, b) => a.playerId - b.playerId)

  return (
    <section className="bg-darcula-surface rounded-lg shadow-lg border border-darcula-border p-6 h-full">
      <h2 className="text-xl font-semibold text-darcula-text mb-4">{t('leaderboard')}</h2>
      {standings.length === 0 ? (
        <p className="text-darcula-text-muted">{t('noPlayersRegistered')}</p>
      ) : (
        <div className="relative" style={{ height: standings.length * ROW_HEIGHT }}>
          {stableRows.map((s) => {
            const rank = rankByPlayer.get(s.playerId) ?? 0
            return (
              <div
                key={s.playerId}
                className="absolute left-0 right-0 flex items-center gap-3 px-2 border-b border-darcula-border"
                style={{
                  height: ROW_HEIGHT,
                  transform: `translateY(${rank * ROW_HEIGHT}px)`,
                  transition: 'transform 600ms cubic-bezier(0.22, 1, 0.36, 1)',
                }}
              >
                <span
                  className={`w-7 text-center text-lg font-bold tabular-nums ${
                    rank === 0
                      ? 'text-darcula-yellow'
                      : rank === 1
                        ? 'text-darcula-text-bright'
                        : rank === 2
                          ? 'text-darcula-orange'
                          : 'text-darcula-text-muted'
                  }`}
                >
                  {rank + 1}
                </span>
                <Avatar src={s.playerAvatar} name={s.playerName} size="md" />
                <span
                  className={`flex-1 truncate font-medium ${
                    s.retired ? 'line-through text-darcula-text-muted' : 'text-darcula-text'
                  }`}
                >
                  {s.playerName}
                  {s.retired && (
                    <span className="ml-2 text-darcula-red text-xs no-underline">
                      ({t('retired')})
                    </span>
                  )}
                </span>
                <span className="text-right font-bold text-darcula-text-bright tabular-nums">
                  {s.points}
                  <span className="ml-1 text-xs font-normal text-darcula-text-muted">
                    {tCommon('pts')}
                  </span>
                </span>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
