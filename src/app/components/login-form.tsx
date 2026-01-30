'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'

type LoginMode = 'select' | 'host'

export function LoginForm() {
  const router = useRouter()
  const t = useTranslations('auth')
  const [mode, setMode] = useState<LoginMode>('select')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function login(role: 'host' | 'player', pwd?: string) {
    setLoading(true)
    setError('')

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role, password: pwd }),
    })

    if (res.ok) {
      router.refresh()
    } else {
      const data = await res.json()
      setError(data.error || 'Login failed')
      setLoading(false)
    }
  }

  if (mode === 'host') {
    return (
      <div className="bg-darcula-surface rounded-lg shadow-lg border border-darcula-border p-8 max-w-md mx-auto">
        <h2 className="text-2xl font-bold text-darcula-text-bright mb-6 text-center">{t('hostLogin')}</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            login('host', password)
          }}
          className="space-y-4"
        >
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-darcula-text mb-1">
              {t('password')}
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-darcula-elevated border border-darcula-border rounded px-3 py-2 focus:ring-2 focus:ring-darcula-blue focus:border-darcula-blue text-darcula-text placeholder-darcula-text-muted"
              placeholder={t('enterHostPassword')}
              autoFocus
            />
          </div>

          {error && <p className="text-darcula-red text-sm">{error}</p>}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => {
                setMode('select')
                setPassword('')
                setError('')
              }}
              className="flex-1 px-4 py-2 border border-darcula-border rounded hover:bg-darcula-elevated transition text-darcula-text"
            >
              {t('back')}
            </button>
            <button
              type="submit"
              disabled={loading || !password}
              className="flex-1 bg-darcula-blue text-darcula-bg px-4 py-2 rounded hover:bg-darcula-blue/80 transition disabled:opacity-50 font-medium"
            >
              {loading ? t('loggingIn') : t('login')}
            </button>
          </div>
        </form>
      </div>
    )
  }

  return (
    <div className="bg-darcula-surface rounded-lg shadow-lg border border-darcula-border p-8 max-w-md mx-auto">
      <h2 className="text-2xl font-bold text-darcula-text-bright mb-6 text-center">{t('welcomeTitle')}</h2>
      <p className="text-darcula-text-muted mb-6 text-center">{t('chooseHowToJoin')}</p>

      <div className="space-y-3">
        <button
          onClick={() => setMode('host')}
          disabled={loading}
          className="w-full bg-darcula-blue text-darcula-bg px-4 py-3 rounded hover:bg-darcula-blue/80 transition disabled:opacity-50 font-medium"
        >
          {t('loginAsHost')}
        </button>
        <button
          onClick={() => login('player')}
          disabled={loading}
          className="w-full bg-darcula-elevated text-darcula-text px-4 py-3 rounded hover:bg-darcula-border transition disabled:opacity-50 border border-darcula-border"
        >
          {loading ? t('joining') : t('joinAsPlayer')}
        </button>
      </div>

      <p className="text-sm text-darcula-text-muted mt-4 text-center">
        {t('hostDescription')}
      </p>
    </div>
  )
}
