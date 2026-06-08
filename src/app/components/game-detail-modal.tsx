'use client'

import React from 'react'
import { useTranslations, useLocale } from 'next-intl'
import type { Game } from '@/lib/games'
import { parseControlNotation, getControllerIconPath, type ParsedControl } from '@/lib/controller-icons'

function ButtonIcon({ parsed }: { parsed: ParsedControl }) {
  return (
    <span className="inline-flex flex-col items-center gap-0.5">
      <img
        src={getControllerIconPath(parsed.platform, parsed.button)}
        alt={`${parsed.platform} ${parsed.button}`}
        className="w-10 h-10"
      />
      {parsed.hold && (
        <span className="text-[10px] leading-none text-darcula-text-muted font-semibold uppercase">
          hold
        </span>
      )}
    </span>
  )
}

interface GameDetailModalProps {
  game: Game
  gradientColors: string
  onClose: () => void
}

export function GameDetailModal({ game, gradientColors, onClose }: GameDetailModalProps) {
  const t = useTranslations('games')
  const tCommon = useTranslations('common')
  const locale = useLocale()

  // Description / how-to-play text now lives on the game object (DB-backed),
  // selected by the active locale.
  const description = locale === 'es' ? game.descriptionEs : game.descriptionEn
  const howToPlay = locale === 'es' ? game.howToPlayEs : game.howToPlayEn

  return (
    <div
      className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-darcula-surface border border-darcula-border rounded-lg w-full max-w-[853px] max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header video / image / gradient */}
        <div className={`relative w-full ${game.videoUrl ? 'h-[480px]' : 'h-48'}`}>
          {game.videoUrl ? (() => {
            const videoId = new URL(game.videoUrl).searchParams.get('v') ?? ''
            const startParam = game.videoStart ? `&start=${game.videoStart}` : ''
            return (
              <iframe
                className="w-full h-full rounded-t-lg"
                src={`https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&controls=0&loop=1&vq=large&playlist=${videoId}${startParam}`}
                allow="autoplay; encrypted-media"
                allowFullScreen
              />
            )
          })() : game.imageUrl ? (
            <img
              src={game.imageUrl}
              alt={game.name}
              className={`w-full h-full ${game.imageFit === 'contain' ? 'object-contain' : 'object-cover'} rounded-t-lg`}
            />
          ) : (
            <div className={`w-full h-full bg-gradient-to-br ${gradientColors} rounded-t-lg flex items-center justify-center`}>
              <span className="text-darcula-text-bright text-6xl font-bold">
                {game.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)}
              </span>
            </div>
          )}
          <div className="absolute inset-0 z-10" />
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-4 z-10">
            <h2 className="text-2xl font-bold text-darcula-text-bright">{game.name}</h2>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-darcula-text-muted uppercase tracking-wide mb-1">
              {t('descriptionLabel')}
            </h3>
            <p className="text-darcula-text">
              {description || t('noDescription')}
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-darcula-text-muted uppercase tracking-wide mb-1">
              {t('howToPlayLabel')}
            </h3>
            <p className="text-darcula-text">
              {howToPlay || t('noHowToPlay')}
            </p>
          </div>

          {game.controls && game.controls.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-darcula-text-muted uppercase tracking-wide mb-2">
                {t('controlsLabel')}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr_auto] gap-x-4 md:gap-y-3 items-center">
                {game.controls.map((entry, i) => (
                  <React.Fragment key={i}>
                    <span className="text-darcula-text text-sm break-words min-w-0 mt-3 md:mt-0">{entry.label}</span>
                    <div className="flex items-center gap-1.5 shrink-0 mb-3 md:mb-0">
                      {entry.buttons.map((notation, j) => {
                        if (notation === '+') {
                          return <span key={j} className="text-darcula-text-muted text-sm font-bold">+</span>
                        }

                        const parsed = parseControlNotation(notation)
                        if (!parsed) return <span key={j} className="text-darcula-text-muted text-xs">{notation}</span>

                        return (
                          <span key={j} className="inline-flex items-center gap-1.5">
                            {Array.isArray(parsed) ? (
                              <span className="inline-flex items-center gap-1">
                                <span className="text-darcula-text-muted text-sm">(</span>
                                {parsed.map((p, k) => (
                                  <span key={k} className="inline-flex items-center gap-1">
                                    {k > 0 && <span className="text-darcula-text-muted text-xs italic">o</span>}
                                    <ButtonIcon parsed={p} />
                                  </span>
                                ))}
                                <span className="text-darcula-text-muted text-sm">)</span>
                              </span>
                            ) : (
                              <ButtonIcon parsed={parsed} />
                            )}
                          </span>
                        )
                      })}
                    </div>
                  </React.Fragment>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={onClose}
            className="w-full py-2 bg-darcula-border hover:bg-darcula-selection text-darcula-text-bright rounded transition-colors"
          >
            {tCommon('close')}
          </button>
        </div>
      </div>
    </div>
  )
}
