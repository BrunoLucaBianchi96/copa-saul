'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'

export function RulesInfoButton() {
  const [showModal, setShowModal] = useState(false)
  const t = useTranslations('rules')
  const tCommon = useTranslations('common')

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="p-2 rounded-full bg-darcula-elevated border border-darcula-border text-darcula-text-muted hover:text-darcula-blue hover:border-darcula-blue transition-colors"
        title={t('tournamentRules')}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-darcula-surface border border-darcula-border rounded-lg p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-darcula-text-bright">{t('tournamentRules')}</h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-darcula-text-muted hover:text-darcula-text"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4 text-darcula-text">
              {/* Tournament Format */}
              <section>
                <h3 className="font-semibold text-darcula-blue mb-2">{t('formatTitle')}</h3>
                <p className="text-sm text-darcula-text-muted">{t('formatDescription')}</p>
              </section>

              {/* Pick-Ban Phase */}
              <section>
                <h3 className="font-semibold text-darcula-blue mb-2">{t('pickBanTitle')}</h3>
                <ol className="text-sm text-darcula-text-muted list-decimal list-inside space-y-1">
                  <li>{t('pickBanStep1')}</li>
                  <li>{t('pickBanStep2')}</li>
                  <li>{t('pickBanStep3')}</li>
                  <li>{t('pickBanStep4')}</li>
                </ol>
              </section>

              {/* Scoring */}
              <section>
                <h3 className="font-semibold text-darcula-blue mb-2">{t('scoringTitle')}</h3>
                <p className="text-sm text-darcula-text-muted mb-2">{t('scoringDescription')}</p>
                <ul className="text-sm text-darcula-text-muted list-disc list-inside space-y-1">
                  <li>{t('scoringEqual')}</li>
                  <li>{t('scoringUnderdog')}</li>
                  <li>{t('scoringFavorite')}</li>
                </ul>
              </section>

              {/* Tiebreaker */}
              <section>
                <h3 className="font-semibold text-darcula-blue mb-2">{t('tiebreakerTitle')}</h3>
                <p className="text-sm text-darcula-text-muted">{t('tiebreakerDescription')}</p>
              </section>
            </div>

            <button
              onClick={() => setShowModal(false)}
              className="mt-6 w-full px-4 py-2 bg-darcula-blue text-darcula-bg rounded hover:bg-darcula-blue/80 transition"
            >
              {tCommon('close')}
            </button>
          </div>
        </div>
      )}
    </>
  )
}
