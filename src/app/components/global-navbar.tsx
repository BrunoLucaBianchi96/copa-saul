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

export function GlobalNavbar() {
  const pathname = usePathname()
  const router = useRouter()
  const t = useTranslations('auth')
  const tHome = useTranslations('home')
  const tBets = useTranslations('bets')
  const tRoster = useTranslations('roster')
  const tGames = useTranslations('games')
  const tDashboard = useTranslations('dashboard')
  const [loggingOut, setLoggingOut] = useState(false)

  const hidden = EXCLUDED_PATTERNS.some((p) => p.test(pathname))
  if (hidden) return null

  // Extract tournament ID from path if on a tournament sub-page
  const tournamentMatch = pathname.match(/^\/tournaments\/(\d+)/)
  const tournamentId = tournamentMatch?.[1]

  async function handleLogout() {
    setLoggingOut(true)
    await fetch('/api/auth/logout', { method: 'POST' })
    router.refresh()
  }

  return (
    <nav className="w-full bg-darcula-surface border-b border-darcula-border px-4 py-2 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <Link href="/" className="text-darcula-text-bright font-bold text-lg hover:text-darcula-blue transition-colors">
          {tHome('appTitle')}
        </Link>
        <Link
          href="/bets"
          className="text-sm text-darcula-text-muted hover:text-darcula-text transition-colors"
        >
          {tBets('myBetsNav')}
        </Link>
        <Link
          href="/games"
          className="text-sm text-darcula-text-muted hover:text-darcula-text transition-colors"
        >
          {tGames('games')}
        </Link>
        {tournamentId && (
          <>
            <Link
              href={`/tournaments/${tournamentId}`}
              className="text-sm text-darcula-text-muted hover:text-darcula-text transition-colors"
            >
              {t('tournament')}
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
