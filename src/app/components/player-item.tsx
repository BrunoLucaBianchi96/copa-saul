'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import type { Player } from '@/db/schema'
import { Avatar } from './avatar'
import { EditPlayerModal } from './edit-player-modal'

interface PlayerItemProps {
  player: Player
  isHost: boolean
}

export function PlayerItem({ player, isHost }: PlayerItemProps) {
  const router = useRouter()
  const t = useTranslations('player')
  const tErrors = useTranslations('errors')
  const [deleting, setDeleting] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)

  async function handleDelete(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()

    if (!confirm(t('confirmDeletePlayer', { name: player.name }))) {
      return
    }

    setDeleting(true)
    const res = await fetch(`/api/players/${player.id}`, { method: 'DELETE' })
    if (res.ok) {
      router.refresh()
    } else {
      alert(tErrors('failedToDeletePlayer'))
      setDeleting(false)
    }
  }

  function handleClick() {
    if (isHost) {
      setShowEditModal(true)
    }
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <div
          onClick={handleClick}
          className={`flex-1 p-2 bg-darcula-elevated rounded text-darcula-text flex items-center gap-3 border border-darcula-border ${
            isHost ? 'cursor-pointer hover:bg-darcula-border transition-colors' : ''
          }`}
        >
          <Avatar src={player.avatarUrl} name={player.name} size="sm" />
          <div className="flex flex-col">
            <span>{player.name}</span>
            {player.nickname && (
              <span className="text-xs text-darcula-text-muted">"{player.nickname}"</span>
            )}
          </div>
        </div>

        {isHost && (
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="p-2 bg-darcula-elevated rounded border border-darcula-border text-darcula-text-muted hover:text-darcula-red hover:border-darcula-red transition-colors disabled:opacity-50"
            title={t('deletePlayer')}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        )}
      </div>

      {isHost && (
        <EditPlayerModal
          player={player}
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
        />
      )}
    </>
  )
}
