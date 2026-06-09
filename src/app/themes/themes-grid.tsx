'use client'

import { useState, useRef } from 'react'
import type { Theme } from '@/lib/themes'
import { ThemeFormModal } from '@/app/components/theme-form-modal'

interface ThemesGridProps {
  themes: Theme[] // editable DB themes
  builtins: Theme[] // read-only custom-renderer themes
}

// A single theme tile: background thumbnail, name/bpm, and an audio preview.
function ThemeCard({
  theme,
  builtin,
  onClick,
}: {
  theme: Theme
  builtin?: boolean
  onClick?: () => void
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [playing, setPlaying] = useState(false)

  function togglePlay(e: React.MouseEvent) {
    e.stopPropagation()
    if (!theme.audioFile) return
    if (!audioRef.current) {
      audioRef.current = new Audio(theme.audioFile)
      audioRef.current.volume = 0.3 * (theme.normalizeVolume ?? 1)
      if (theme.audioOffset) audioRef.current.currentTime = theme.audioOffset / 1000
      audioRef.current.onended = () => setPlaying(false)
    }
    if (playing) {
      audioRef.current.pause()
      setPlaying(false)
    } else {
      audioRef.current.play().catch(() => setPlaying(false))
      setPlaying(true)
    }
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={`relative w-full aspect-[3/4] rounded-lg overflow-hidden border border-darcula-border text-left transition-colors ${
        onClick ? 'hover:border-darcula-blue cursor-pointer' : 'cursor-default'
      }`}
      style={
        theme.backgroundImage
          ? {
              backgroundImage: `linear-gradient(to bottom, rgba(30,31,34,0.3) 0%, rgba(30,31,34,0.95) 100%), url(${theme.backgroundImage})`,
              backgroundSize: theme.backgroundSize === 'repeat' ? 'auto 100%' : theme.backgroundSize || 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: theme.backgroundSize === 'repeat' ? 'repeat-x' : 'no-repeat',
            }
          : { background: 'linear-gradient(135deg, #3c3f41 0%, #2b2b2b 100%)' }
      }
    >
      {builtin && (
        <span className="absolute top-2 left-2 text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-darcula-bg/70 text-darcula-text-muted">
          Built-in
        </span>
      )}
      {theme.audioFile && (
        <span
          onClick={togglePlay}
          className="absolute top-2 right-2 w-8 h-8 rounded-full bg-darcula-bg/70 hover:bg-darcula-bg flex items-center justify-center text-darcula-text-bright"
          title={playing ? 'Pause' : 'Preview'}
        >
          {playing ? (
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 5h4v14H6zM14 5h4v14h-4z" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </span>
      )}
      <div className="absolute bottom-0 left-0 right-0 p-3">
        <div className="text-sm font-semibold text-darcula-text-bright leading-tight">{theme.name}</div>
        <div className="text-xs text-darcula-text-muted">{theme.bpm} BPM</div>
      </div>
    </button>
  )
}

export function ThemesGrid({ themes, builtins }: ThemesGridProps) {
  const [editTheme, setEditTheme] = useState<Theme | null>(null)
  const [creating, setCreating] = useState(false)

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="flex justify-center">
          <button
            onClick={() => setCreating(true)}
            title="Add theme"
            className="w-full aspect-[3/4] rounded-lg border-2 border-dashed border-darcula-text-muted/50 bg-transparent flex items-center justify-center text-darcula-text-muted hover:border-darcula-text-muted hover:text-darcula-text transition-colors"
          >
            <svg className="w-1/2 h-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>

        {themes.map((theme) => (
          <div key={theme.id} className="flex justify-center">
            <ThemeCard theme={theme} onClick={() => setEditTheme(theme)} />
          </div>
        ))}

        {builtins.map((theme) => (
          <div key={theme.id} className="flex justify-center opacity-80">
            <ThemeCard theme={theme} builtin />
          </div>
        ))}
      </div>

      <ThemeFormModal isOpen={creating} onClose={() => setCreating(false)} />
      <ThemeFormModal theme={editTheme ?? undefined} isOpen={editTheme !== null} onClose={() => setEditTheme(null)} />
    </>
  )
}
