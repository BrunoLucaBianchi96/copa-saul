'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import type { Game } from '@/lib/games'

interface GameFormModalProps {
  // Provide a game to edit; omit to create a new one.
  game?: Game
  isOpen: boolean
  onClose: () => void
}

const inputClass =
  'w-full px-3 py-2 bg-darcula-elevated border border-darcula-border rounded text-darcula-text placeholder-darcula-text-muted focus:outline-none focus:border-darcula-blue'
const labelClass = 'block text-sm text-darcula-text-muted mb-1'

export function GameFormModal({ game, isOpen, onClose }: GameFormModalProps) {
  const router = useRouter()
  const isEdit = !!game

  const [name, setName] = useState('')
  const [descriptionEn, setDescriptionEn] = useState('')
  const [descriptionEs, setDescriptionEs] = useState('')
  const [howToPlayEn, setHowToPlayEn] = useState('')
  const [howToPlayEs, setHowToPlayEs] = useState('')
  const [imageFit, setImageFit] = useState<'cover' | 'contain'>('cover')
  const [videoUrl, setVideoUrl] = useState('')
  const [videoStart, setVideoStart] = useState('')
  const [steamAppId, setSteamAppId] = useState('')
  const [defaultLaunchUrl, setDefaultLaunchUrl] = useState('')
  const [launchable, setLaunchable] = useState(false)
  const [active, setActive] = useState(true)
  const [controls, setControls] = useState('')
  const [preview, setPreview] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Sync form state whenever the target game changes (or we switch to create).
  useEffect(() => {
    setName(game?.name ?? '')
    setDescriptionEn(game?.descriptionEn ?? '')
    setDescriptionEs(game?.descriptionEs ?? '')
    setHowToPlayEn(game?.howToPlayEn ?? '')
    setHowToPlayEs(game?.howToPlayEs ?? '')
    setImageFit(game?.imageFit === 'contain' ? 'contain' : 'cover')
    setVideoUrl(game?.videoUrl ?? '')
    setVideoStart(game?.videoStart != null ? String(game.videoStart) : '')
    setSteamAppId(game?.steamAppId != null ? String(game.steamAppId) : '')
    setDefaultLaunchUrl(game?.defaultLaunchUrl ?? '')
    setLaunchable(game?.launchable ?? false)
    setActive(game?.active ?? true)
    setControls(game?.controls ? JSON.stringify(game.controls, null, 2) : '')
    setPreview(game?.imageUrl ?? null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [game, isOpen])

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => setPreview(reader.result as string)
      reader.readAsDataURL(file)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return

    // Validate the controls JSON up front for a clear error.
    if (controls.trim()) {
      try {
        JSON.parse(controls)
      } catch {
        toast.error('Controls must be valid JSON (an array of { label, buttons }).')
        return
      }
    }

    setSaving(true)
    const formData = new FormData()
    formData.append('name', name.trim())
    formData.append('descriptionEn', descriptionEn)
    formData.append('descriptionEs', descriptionEs)
    formData.append('howToPlayEn', howToPlayEn)
    formData.append('howToPlayEs', howToPlayEs)
    formData.append('imageFit', imageFit)
    formData.append('videoUrl', videoUrl)
    formData.append('videoStart', videoStart)
    formData.append('steamAppId', steamAppId)
    formData.append('defaultLaunchUrl', defaultLaunchUrl)
    formData.append('launchable', String(launchable))
    formData.append('active', String(active))
    formData.append('controls', controls.trim())
    const file = fileInputRef.current?.files?.[0]
    if (file) formData.append('image', file)

    try {
      const res = await fetch(isEdit ? `/api/games/${game!.id}` : '/api/games', {
        method: isEdit ? 'PATCH' : 'POST',
        body: formData,
      })
      if (res.ok) {
        onClose()
        router.refresh()
      } else {
        const data = await res.json().catch(() => ({}))
        toast.error(data.error || 'Failed to save game')
      }
    } catch {
      toast.error('Network error')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!isEdit) return
    if (!confirm(`Remove "${game!.name}"? It stays on historical matches but won't appear in new tournaments.`)) {
      return
    }
    setDeleting(true)
    try {
      const res = await fetch(`/api/games/${game!.id}`, { method: 'DELETE' })
      if (res.ok) {
        onClose()
        router.refresh()
      } else {
        toast.error('Failed to remove game')
      }
    } catch {
      toast.error('Network error')
    } finally {
      setDeleting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-darcula-surface border border-darcula-border rounded-lg p-6 w-full max-w-2xl max-h-[85vh] overflow-y-auto">
        <h2 className="text-xl font-semibold text-darcula-text-bright mb-4">
          {isEdit ? `Edit ${game!.name}` : 'Add Game'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={labelClass}>Name</label>
            <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} autoFocus />
            {isEdit && (
              <p className="text-xs text-darcula-text-muted mt-1">
                Slug id <code className="text-darcula-blue">{game!.id}</code> is locked to protect match references.
              </p>
            )}
          </div>

          {/* Image */}
          <div className="flex items-center gap-4">
            <div
              className="w-20 h-20 rounded bg-darcula-elevated border-2 border-dashed border-darcula-border flex items-center justify-center cursor-pointer hover:border-darcula-blue overflow-hidden flex-shrink-0"
              onClick={() => fileInputRef.current?.click()}
            >
              {preview ? (
                <img src={preview} alt="" className={`w-full h-full ${imageFit === 'contain' ? 'object-contain' : 'object-cover'}`} />
              ) : (
                <span className="text-darcula-text-muted text-xs">Image</span>
              )}
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
            <div className="flex-1">
              <button type="button" onClick={() => fileInputRef.current?.click()} className="text-sm text-darcula-blue hover:underline">
                {preview ? 'Change image' : 'Upload image'}
              </button>
              <div className="mt-2">
                <label className={labelClass}>Image fit</label>
                <select className={inputClass} value={imageFit} onChange={(e) => setImageFit(e.target.value as 'cover' | 'contain')}>
                  <option value="cover">cover</option>
                  <option value="contain">contain</option>
                </select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Description (EN)</label>
              <textarea className={inputClass} rows={3} value={descriptionEn} onChange={(e) => setDescriptionEn(e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>Description (ES)</label>
              <textarea className={inputClass} rows={3} value={descriptionEs} onChange={(e) => setDescriptionEs(e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>How to play (EN)</label>
              <textarea className={inputClass} rows={3} value={howToPlayEn} onChange={(e) => setHowToPlayEn(e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>How to play (ES)</label>
              <textarea className={inputClass} rows={3} value={howToPlayEs} onChange={(e) => setHowToPlayEs(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Video URL</label>
              <input className={inputClass} value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="https://www.youtube.com/watch?v=..." />
            </div>
            <div>
              <label className={labelClass}>Video start (seconds)</label>
              <input className={inputClass} type="number" value={videoStart} onChange={(e) => setVideoStart(e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>Steam App ID</label>
              <input className={inputClass} type="number" value={steamAppId} onChange={(e) => setSteamAppId(e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>Default launch URL</label>
              <input className={inputClass} value={defaultLaunchUrl} onChange={(e) => setDefaultLaunchUrl(e.target.value)} placeholder="steam://rungameid/..." />
            </div>
          </div>

          <div className="flex flex-wrap gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={launchable} onChange={(e) => setLaunchable(e.target.checked)} className="w-4 h-4 accent-darcula-blue" />
              <span className="text-sm text-darcula-text">Launchable</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="w-4 h-4 accent-darcula-blue" />
              <span className="text-sm text-darcula-text">Active (selectable in new tournaments)</span>
            </label>
          </div>

          <div>
            <label className={labelClass}>Controls (JSON array of {'{ label, buttons }'})</label>
            <textarea
              className={`${inputClass} font-mono text-xs`}
              rows={6}
              value={controls}
              onChange={(e) => setControls(e.target.value)}
              placeholder='[{ "label": "Jump", "buttons": ["PS-COLOR-CROSS"] }]'
            />
          </div>

          <div className="flex gap-3 pt-2">
            {isEdit && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting || saving}
                className="px-4 py-2 border border-darcula-red/50 text-darcula-red rounded hover:bg-darcula-red/10 transition disabled:opacity-50"
              >
                {deleting ? 'Removing…' : 'Remove'}
              </button>
            )}
            <div className="flex-1" />
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-darcula-elevated border border-darcula-border rounded text-darcula-text hover:bg-darcula-border transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim() || saving}
              className="px-4 py-2 bg-darcula-blue text-darcula-bg rounded hover:bg-darcula-blue/80 transition disabled:opacity-50"
            >
              {saving ? 'Saving…' : isEdit ? 'Save' : 'Add'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
