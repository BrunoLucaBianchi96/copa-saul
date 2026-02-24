'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { PlayerCard } from '@/app/components/player-card'
import { Avatar } from '@/app/components/avatar'

interface EditProfileFormProps {
  playerId: number
  editToken: string
  initialName: string
  initialNickname: string
  initialAvatarUrl: string | null
}

export function EditProfileForm({
  playerId,
  editToken,
  initialName,
  initialNickname,
  initialAvatarUrl,
}: EditProfileFormProps) {
  const router = useRouter()
  const t = useTranslations('editProfile')
  const tPlayer = useTranslations('player')
  const tErrors = useTranslations('errors')
  const [name, setName] = useState(initialName)
  const [nickname, setNickname] = useState(initialNickname)
  const [preview, setPreview] = useState<string | null>(initialAvatarUrl)
  const [skipBgRemoval, setSkipBgRemoval] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Build display name for preview
  const displayName = nickname
    ? `${name.split(' ')[0]} '${nickname}' ${name.split(' ').slice(1).join(' ')}`.trim()
    : name

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
    setSaved(false)

    const formData = new FormData()
    formData.append('name', name.trim())
    formData.append('nickname', nickname.trim())
    formData.append('editToken', editToken)

    const file = fileInputRef.current?.files?.[0]
    if (file) {
      formData.append('avatar', file)
    }
    if (skipBgRemoval) {
      formData.append('skipBgRemoval', 'true')
    }

    try {
      const res = await fetch(`/api/players/${playerId}`, {
        method: 'PATCH',
        body: formData,
      })

      if (res.ok) {
        setSaved(true)
        router.refresh()
      } else {
        alert(tErrors('failedToUpdatePlayer'))
      }
    } catch {
      alert(tErrors('networkError'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Player card preview */}
      <div className="flex justify-center">
        <PlayerCard
          name={displayName}
          avatar={preview}
          className="w-48 h-64"
          nameClassName="text-base"
          initialsClassName="text-4xl"
        />
      </div>

      {/* Edit form */}
      <form onSubmit={handleSubmit} className="bg-darcula-surface border border-darcula-border rounded-lg p-6 space-y-4">
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
            {tPlayer('changePhoto')}
          </button>
        </div>

        {/* Name input */}
        <div>
          <label htmlFor="playerName" className="block text-sm text-darcula-text-muted mb-1">
            {tPlayer('playerName')}
          </label>
          <input
            id="playerName"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={tPlayer('enterPlayerName')}
            className="w-full px-3 py-2 bg-darcula-elevated border border-darcula-border rounded text-darcula-text placeholder-darcula-text-muted focus:outline-none focus:border-darcula-blue"
          />
        </div>

        {/* Nickname input */}
        <div>
          <label htmlFor="playerNickname" className="block text-sm text-darcula-text-muted mb-1">
            {tPlayer('nickname')} <span className="text-darcula-text-muted/50">({tPlayer('optional')})</span>
          </label>
          <input
            id="playerNickname"
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder={tPlayer('enterNickname')}
            className="w-full px-3 py-2 bg-darcula-elevated border border-darcula-border rounded text-darcula-text placeholder-darcula-text-muted focus:outline-none focus:border-darcula-blue"
          />
          <p className="text-xs text-darcula-text-muted mt-1">{tPlayer('nicknameHint')}</p>
        </div>

        {/* Skip background removal */}
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={skipBgRemoval}
            onChange={(e) => setSkipBgRemoval(e.target.checked)}
            className="w-4 h-4 accent-darcula-blue"
          />
          <span className="text-sm text-darcula-text-muted">{tPlayer('skipBgRemoval')}</span>
        </label>

        {/* Save button */}
        <button
          type="submit"
          disabled={!name.trim() || saving}
          className="w-full px-4 py-2 bg-darcula-blue text-darcula-bg rounded hover:bg-darcula-blue/80 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? t('saving') : t('save')}
        </button>

        {saved && (
          <p className="text-center text-darcula-green text-sm">{t('savedSuccessfully')}</p>
        )}
      </form>
    </div>
  )
}
