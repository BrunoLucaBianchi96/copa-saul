'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Avatar } from '@/app/components/avatar'

interface Player {
  id: number
  name: string
  avatarUrl: string | null
}

interface LoginFormProps {
  players: Player[]
}

type LoginMode = 'select' | 'host' | 'player-select'

export function LoginForm({ players }: LoginFormProps) {
  const router = useRouter()
  const t = useTranslations('auth')
  const [mode, setMode] = useState<LoginMode>('select')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [selectedPlayerId, setSelectedPlayerId] = useState<number | null>(null)

  async function login(role: 'host' | 'player', pwd?: string, playerId?: number) {
    setLoading(true)
    setError('')

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role, password: pwd, playerId }),
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

  if (mode === 'player-select') {
    return (
      <div className="bg-darcula-surface rounded-lg shadow-lg border border-darcula-border p-8 max-w-md mx-auto">
        <h2 className="text-2xl font-bold text-darcula-text-bright mb-6 text-center">{t('selectYourName')}</h2>

        <div className="space-y-2 max-h-80 overflow-y-auto mb-4">
          {players.map((player) => (
            <button
              key={player.id}
              onClick={() => setSelectedPlayerId(player.id)}
              className={`w-full flex items-center gap-3 p-3 rounded transition ${
                selectedPlayerId === player.id
                  ? 'bg-darcula-blue/20 border border-darcula-blue'
                  : 'bg-darcula-elevated border border-darcula-border hover:border-darcula-text-muted'
              }`}
            >
              <Avatar src={player.avatarUrl} name={player.name} size="sm" />
              <span className="text-darcula-text font-medium">{player.name}</span>
            </button>
          ))}
        </div>

        {players.length === 0 && (
          <p className="text-darcula-text-muted text-center mb-4">{t('noPlayersAvailable')}</p>
        )}

        {error && <p className="text-darcula-red text-sm mb-4">{error}</p>}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => {
              setMode('select')
              setSelectedPlayerId(null)
              setError('')
            }}
            className="flex-1 px-4 py-2 border border-darcula-border rounded hover:bg-darcula-elevated transition text-darcula-text"
          >
            {t('back')}
          </button>
          <button
            onClick={() => selectedPlayerId && login('player', undefined, selectedPlayerId)}
            disabled={loading || !selectedPlayerId}
            className="flex-1 bg-darcula-green text-darcula-bg px-4 py-2 rounded hover:bg-darcula-green/80 transition disabled:opacity-50 font-medium"
          >
            {loading ? t('joining') : t('login')}
          </button>
        </div>
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
          onClick={() => setMode('player-select')}
          disabled={loading}
          className="w-full bg-darcula-elevated text-darcula-text px-4 py-3 rounded hover:bg-darcula-border transition disabled:opacity-50 border border-darcula-border"
        >
          {t('joinAsPlayer')}
        </button>
      </div>

      <p className="text-sm text-darcula-text-muted mt-4 text-center">
        {t('hostDescription')}
      </p>
    </div>
  )
}
