'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import type { Tournament } from '@/db/schema'
import { ConfirmModal } from './confirm-modal'

interface TournamentItemProps {
  tournament: Tournament
  isHost: boolean
}

export function TournamentItem({ tournament, isHost }: TournamentItemProps) {
  const router = useRouter()
  const t = useTranslations('tournament')
  const tStatus = useTranslations('status')
  const tErrors = useTranslations('errors')
  const [deleting, setDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  function handleDelete(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    setShowDeleteConfirm(true)
  }

  async function confirmDelete() {
    setShowDeleteConfirm(false)
    setDeleting(true)
    const res = await fetch(`/api/tournaments/${tournament.id}`, { method: 'DELETE' })
    if (res.ok) {
      router.refresh()
    } else {
      toast.error(tErrors('failedToDelete'))
      setDeleting(false)
    }
  }

  const tCommon = useTranslations('common')

  return (
    <>
      {showDeleteConfirm && (
        <ConfirmModal
          message={t('confirmDeleteTournament', { name: tournament.name })}
          confirmLabel={tCommon('delete')}
          cancelLabel={tCommon('cancel')}
          onConfirm={confirmDelete}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
      <div className="flex items-stretch gap-2">
      <Link
        href={`/tournaments/${tournament.id}`}
        className="flex-1 p-4 bg-darcula-elevated rounded hover:bg-darcula-border transition border border-darcula-border"
      >
        <div className="flex justify-between items-center">
          <span className="font-medium text-darcula-text-bright">{tournament.name}</span>
          <span
            className={`text-sm px-2 py-1 rounded ${
              tournament.status === 'active'
                ? 'bg-darcula-green/20 text-darcula-green'
                : tournament.status === 'overtime'
                  ? 'bg-darcula-orange/20 text-darcula-orange font-semibold'
                  : tournament.status === 'completed'
                    ? 'bg-darcula-elevated text-darcula-text-muted'
                    : 'bg-darcula-orange/20 text-darcula-orange'
            }`}
          >
            {tStatus(tournament.status)}
          </span>
        </div>
        <p className="text-sm text-darcula-text-muted mt-1">
          {tournament.status === 'overtime'
            ? t(tournament.overtimeRound === 2 ? 'final' : 'semifinal')
            : t('roundOf', { current: tournament.currentRound, total: tournament.rounds })}
        </p>
      </Link>

      {isHost && (
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="px-3 bg-darcula-elevated rounded border border-darcula-border text-darcula-text-muted hover:text-darcula-red hover:border-darcula-red transition-colors disabled:opacity-50"
          title={t('deleteTournament')}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      )}
    </div>
    </>
  )
}
