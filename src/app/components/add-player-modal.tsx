'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'

interface AddPlayerModalProps {
  isOpen: boolean
  onClose: () => void
}

export function AddPlayerModal({ isOpen, onClose }: AddPlayerModalProps) {
  const router = useRouter()
  const t = useTranslations('player')
  const tCommon = useTranslations('common')
  const tErrors = useTranslations('errors')
  const [name, setName] = useState('')
  const [preview, setPreview] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

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

    const file = fileInputRef.current?.files?.[0]
    if (file) {
      formData.append('avatar', file)
    }

    try {
      const res = await fetch('/api/players', {
        method: 'POST',
        body: formData,
      })

      if (res.ok) {
        setName('')
        setPreview(null)
        if (fileInputRef.current) fileInputRef.current.value = ''
        onClose()
        router.refresh()
      } else {
        alert(tErrors('failedToCreatePlayer'))
      }
    } catch {
      alert(tErrors('networkError'))
    } finally {
      setSaving(false)
    }
  }

  function handleClose() {
    setName('')
    setPreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={handleClose}>
      <div
        className="bg-darcula-surface border border-darcula-border rounded-lg p-6 w-full max-w-md mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-semibold text-darcula-text-bright mb-4">{t('addPlayer')}</h2>

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
                <svg className="w-8 h-8 text-darcula-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
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
              {t('uploadPhoto')}
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
              autoFocus
            />
          </div>

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
              {saving ? tCommon('processing') : t('addPlayer')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
