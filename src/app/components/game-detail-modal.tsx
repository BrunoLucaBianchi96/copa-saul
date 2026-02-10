'use client'

import { useTranslations } from 'next-intl'
import type { Game } from '@/lib/games'

interface GameDetailModalProps {
  game: Game
  gradientColors: string
  onClose: () => void
}

export function GameDetailModal({ game, gradientColors, onClose }: GameDetailModalProps) {
  const t = useTranslations('games')
  const tCommon = useTranslations('common')

  return (
    <div
      className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-darcula-surface border border-darcula-border rounded-lg max-w-lg w-full max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header image / gradient */}
        <div className="relative h-48 w-full">
          {game.imageUrl ? (
            <img
              src={game.imageUrl}
              alt={game.name}
              className="w-full h-full object-cover rounded-t-lg"
            />
          ) : (
            <div className={`w-full h-full bg-gradient-to-br ${gradientColors} rounded-t-lg flex items-center justify-center`}>
              <span className="text-darcula-text-bright text-6xl font-bold">
                {game.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)}
              </span>
            </div>
          )}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-4">
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
              {t.has(`${game.id}.description`) ? t(`${game.id}.description`) : t('noDescription')}
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-darcula-text-muted uppercase tracking-wide mb-1">
              {t('howToPlayLabel')}
            </h3>
            <p className="text-darcula-text">
              {t.has(`${game.id}.howToPlay`) ? t(`${game.id}.howToPlay`) : t('noHowToPlay')}
            </p>
          </div>

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
