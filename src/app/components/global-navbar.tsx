'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { useTranslations } from 'next-intl'

const EXCLUDED_PATTERNS = [
  /^\/tournaments\/\d+\/matches\/\d+$/, // pick-ban page
  /^\/balatro-bg$/,
  /^\/matrix-bg-test$/,
  /^\/gta-4-loading-test$/,
]

export function GlobalNavbar({ isHost = false }: { isHost?: boolean }) {
  const pathname = usePathname()
  const router = useRouter()
  const t = useTranslations('auth')
  const tHome = useTranslations('home')
  const tRoster = useTranslations('roster')
  const tGames = useTranslations('games')
  const tBets = useTranslations('bets')
  const tDashboard = useTranslations('dashboard')
  const [loggingOut, setLoggingOut] = useState(false)

  const hidden = EXCLUDED_PATTERNS.some((p) => p.test(pathname))
  if (hidden) return null

  // Extract tournament ID from path if on a tournament sub-page
  const tournamentMatch = pathname.match(/^\/tournaments\/(\d+)/)
  const tournamentId = tournamentMatch?.[1]

  async function handleLogout() {
    setLoggingOut(true)
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      router.refresh()
    } finally {
      // The navbar lives in the root layout, so it persists across
      // router.refresh() without remounting — reset the state ourselves or
      // it stays stuck on "Logging out..." forever (even after re-login).
      setLoggingOut(false)
    }
  }

  return (
    <nav className="w-full bg-darcula-surface border-b border-darcula-border px-4 py-2 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <Link href="/" className="text-darcula-text-bright font-bold text-lg hover:text-darcula-blue transition-colors">
          {tHome('appTitle')}
        </Link>
        {/* Games: hosts manage the global roster (/games); players view the
            current tournament's roster. A player outside a tournament has none. */}
        {isHost ? (
          <>
            <Link
              href="/games"
              className="text-sm text-darcula-text-muted hover:text-darcula-text transition-colors"
            >
              {tGames('games')}
            </Link>
            <Link
              href="/themes"
              className="text-sm text-darcula-text-muted hover:text-darcula-text transition-colors"
            >
              Themes
            </Link>
          </>
        ) : tournamentId ? (
          <Link
            href={`/tournaments/${tournamentId}/games`}
            className="text-sm text-darcula-text-muted hover:text-darcula-text transition-colors"
          >
            {tGames('games')}
          </Link>
        ) : null}
        {tournamentId && (
          <>
            <Link
              href={`/tournaments/${tournamentId}`}
              className="text-sm text-darcula-text-muted hover:text-darcula-text transition-colors"
            >
              {t('tournament')}
            </Link>
            <Link
              href={`/tournaments/${tournamentId}/bets`}
              className="text-sm text-darcula-text-muted hover:text-darcula-text transition-colors"
            >
              {tBets('nav')}
            </Link>
            <Link
              href={`/tournaments/${tournamentId}/roster`}
              className="text-sm text-darcula-text-muted hover:text-darcula-text transition-colors"
            >
              {tRoster('roster')}
            </Link>
            <Link
              href={`/tournaments/${tournamentId}/dashboard`}
              className="text-sm text-darcula-text-muted hover:text-darcula-text transition-colors"
            >
              {tDashboard('nav')}
            </Link>
          </>
        )}
      </div>
      <button
        onClick={handleLogout}
        disabled={loggingOut}
        className="text-sm text-darcula-text-muted hover:text-darcula-text transition-colors disabled:opacity-50"
      >
        {loggingOut ? t('loggingOut') : t('logout')}
      </button>
    </nav>
  )
}
