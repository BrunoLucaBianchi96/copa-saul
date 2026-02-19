'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { type Game, GAME_URLS_STORAGE_KEY } from '@/lib/games'

interface SetupFormProps {
  games: Game[]
}

export function SetupForm({ games }: SetupFormProps) {
  const t = useTranslations('setup')
  const [urls, setUrls] = useState<Record<string, string>>({})
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(GAME_URLS_STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as Record<string, string>
        // Merge with defaults for any games not yet in storage
        const merged: Record<string, string> = {}
        for (const game of games) {
          merged[game.id] = parsed[game.id] ?? game.defaultLaunchUrl ?? ''
        }
        setUrls(merged)
      } else {
        const defaults: Record<string, string> = {}
        for (const game of games) {
          defaults[game.id] = game.defaultLaunchUrl ?? ''
        }
        setUrls(defaults)
      }
    } catch {
      const defaults: Record<string, string> = {}
      for (const game of games) {
        defaults[game.id] = game.defaultLaunchUrl ?? ''
      }
      setUrls(defaults)
    }
  }, [games])

  function updateUrl(gameId: string, value: string) {
    setUrls(prev => ({ ...prev, [gameId]: value }))
    setSaved(false)
  }

  function handleSave() {
    localStorage.setItem(GAME_URLS_STORAGE_KEY, JSON.stringify(urls))
    setSaved(true)
  }

  function handleReset() {
    const defaults: Record<string, string> = {}
    for (const game of games) {
      defaults[game.id] = game.defaultLaunchUrl ?? ''
    }
    setUrls(defaults)
    setSaved(false)
  }

  return (
    <div className="bg-darcula-surface rounded-lg shadow-lg border border-darcula-border p-3 sm:p-6">
      <p className="text-darcula-text-muted text-sm mb-4">
        {t('description')}
      </p>

      <div className="space-y-4">
        {games.map(game => (
          <div
            key={game.id}
            className="bg-darcula-elevated rounded-lg p-3 sm:p-4"
          >
            <div className="flex items-center gap-3 mb-2">
              {game.imageUrl && (
                <img
                  src={game.imageUrl}
                  alt={game.name}
                  className="w-12 h-12 rounded object-cover flex-shrink-0"
                />
              )}
              <div className="flex-1 min-w-0">
                <span className="text-darcula-text font-medium">{game.name}</span>
                {game.steamAppId ? (
                  <span className="ml-2 text-xs text-darcula-text-muted">
                    (Steam ID: {game.steamAppId})
                  </span>
                ) : (
                  <span className="ml-2 text-xs text-darcula-orange">
                    {t('nonSteamGame')}
                  </span>
                )}
              </div>
            </div>
            <input
              type="text"
              value={urls[game.id] ?? ''}
              onChange={e => updateUrl(game.id, e.target.value)}
              placeholder="steam://rungameid/..."
              className="w-full bg-darcula-bg border border-darcula-border rounded px-3 py-2 text-darcula-text text-sm focus:outline-none focus:border-darcula-blue font-mono"
            />
          </div>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap gap-3 items-center justify-between">
        <button
          onClick={handleReset}
          className="px-4 py-2 border border-darcula-border text-darcula-text rounded hover:bg-darcula-elevated transition text-sm"
        >
          {t('resetDefaults')}
        </button>
        <button
          onClick={handleSave}
          className="px-4 py-2 bg-darcula-green text-darcula-bg rounded hover:bg-darcula-green/80 transition font-medium"
        >
          {t('save')}
        </button>
      </div>

      {saved && (
        <div className="mt-4 p-3 bg-darcula-green/10 border border-darcula-green/30 rounded text-darcula-green text-sm text-center">
          {t('savedSuccessfully')}
        </div>
      )}
    </div>
  )
}
