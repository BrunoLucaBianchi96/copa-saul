'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import type { Player } from '@/db/schema'
import { Avatar } from './avatar'

interface EditPlayerModalProps {
  player: Player
  isOpen: boolean
  onClose: () => void
}

export function EditPlayerModal({ player, isOpen, onClose }: EditPlayerModalProps) {
  const router = useRouter()
  const t = useTranslations('player')
  const tCommon = useTranslations('common')
  const tErrors = useTranslations('errors')
  const [name, setName] = useState(player.name)
  const [nickname, setNickname] = useState(player.nickname || '')
  const [preview, setPreview] = useState<string | null>(player.avatarUrl)
  const [skipBgRemoval, setSkipBgRemoval] = useState(false)
  const [saving, setSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Reset form when player changes
  useEffect(() => {
    setName(player.name)
    setNickname(player.nickname || '')
    setPreview(player.avatarUrl)
  }, [player])

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!name.trim()) return

    setSaving(true)

    const formData = new FormData()
    formData.append('name', name.trim())
    formData.append('nickname', nickname.trim())

    const file = fileInputRef.current?.files?.[0]
    if (file) {
      formData.append('avatar', file)
    }
    if (skipBgRemoval) {
      formData.append('skipBgRemoval', 'true')
    }

    try {
      const res = await fetch(`/api/players/${player.id}`, {
        method: 'PATCH',
        body: formData,
      })

      if (res.ok) {
        onClose()
        router.refresh()
      } else {
        toast.error(tErrors('failedToUpdatePlayer'))
      }
    } catch {
      toast.error(tErrors('networkError'))
    } finally {
      setSaving(false)
    }
  }

  function handleClose() {
    setName(player.name)
    setNickname(player.nickname || '')
    setPreview(player.avatarUrl)
    if (fileInputRef.current) fileInputRef.current.value = ''
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-darcula-surface border border-darcula-border rounded-lg p-6 w-full max-w-md mx-4">
        <h2 className="text-xl font-semibold text-darcula-text-bright mb-4">{t('editPlayer')}</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Avatar upload */}
          <div className="flex flex-col items-center gap-3">
            <div
              className="w-24 h-24 rounded-full bg-darcula-elevated border-2 border-dashed border-darcula-border flex items-center justify-center cursor-pointer hover:border-darcula-blue transition-colors overflow-hidden"
              onClick={() => fileInputRef.current?.click()}
            >
              {preview ? (
                <img src={preview} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <Avatar src={null} name={name} size="lg" />
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-sm text-darcula-text-muted hover:text-darcula-text"
            >
              {t('changePhoto')}
            </button>
          </div>

          {/* Name input */}
          <div>
            <label htmlFor="playerName" className="block text-sm text-darcula-text-muted mb-1">
              {t('playerName')}
            </label>
            <input
              id="playerName"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('enterPlayerName')}
              className="w-full px-3 py-2 bg-darcula-elevated border border-darcula-border rounded text-darcula-text placeholder-darcula-text-muted focus:outline-none focus:border-darcula-blue"
            />
          </div>

          {/* Nickname input */}
          <div>
            <label htmlFor="playerNickname" className="block text-sm text-darcula-text-muted mb-1">
              {t('nickname')} <span className="text-darcula-text-muted/50">({t('optional')})</span>
            </label>
            <input
              id="playerNickname"
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder={t('enterNickname')}
              className="w-full px-3 py-2 bg-darcula-elevated border border-darcula-border rounded text-darcula-text placeholder-darcula-text-muted focus:outline-none focus:border-darcula-blue"
            />
            <p className="text-xs text-darcula-text-muted mt-1">{t('nicknameHint')}</p>
          </div>

          {/* Skip background removal */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={skipBgRemoval}
              onChange={(e) => setSkipBgRemoval(e.target.checked)}
              className="w-4 h-4 accent-darcula-blue"
            />
            <span className="text-sm text-darcula-text-muted">{t('skipBgRemoval')}</span>
          </label>

          {/* Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-2 bg-darcula-elevated border border-darcula-border rounded text-darcula-text hover:bg-darcula-border transition"
            >
              {tCommon('cancel')}
            </button>
            <button
              type="submit"
              disabled={!name.trim() || saving}
              className="flex-1 px-4 py-2 bg-darcula-blue text-darcula-bg rounded hover:bg-darcula-blue/80 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? tCommon('processing') : t('saveChanges')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
