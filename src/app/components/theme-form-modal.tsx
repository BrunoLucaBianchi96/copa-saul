'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import type { Theme } from '@/lib/themes'

interface ThemeFormModalProps {
  // Provide a theme to edit; omit to create a new one.
  theme?: Theme
  isOpen: boolean
  onClose: () => void
}

const SOUNDBITE_SLOTS = [
  { key: 'onBan', label: 'On ban' },
  { key: 'onPick', label: 'On pick' },
  { key: 'onGameSelected', label: 'On game selected' },
  { key: 'onWinnerChosen', label: 'On winner chosen' },
] as const
type SoundbiteKey = (typeof SOUNDBITE_SLOTS)[number]['key']

interface SlotState {
  existingUrl: string | null // kept across save unless a new file is chosen
  fileName: string | null // newly selected file's name (display only)
  offset: string
  volume: string
}

const emptySlot = (): SlotState => ({ existingUrl: null, fileName: null, offset: '', volume: '' })

const inputClass =
  'w-full px-3 py-2 bg-darcula-elevated border border-darcula-border rounded text-darcula-text placeholder-darcula-text-muted focus:outline-none focus:border-darcula-blue'
const labelClass = 'block text-sm text-darcula-text-muted mb-1'

export function ThemeFormModal({ theme, isOpen, onClose }: ThemeFormModalProps) {
  const router = useRouter()
  const isEdit = !!theme

  const [name, setName] = useState('')
  const [bpm, setBpm] = useState('')
  const [division, setDivision] = useState('1')
  const [audioOffset, setAudioOffset] = useState('')
  const [normalizeVolume, setNormalizeVolume] = useState('')
  const [backgroundSize, setBackgroundSize] = useState<'cover' | 'contain' | 'repeat'>('cover')
  const [priorityPlayer, setPriorityPlayer] = useState('')
  const [priorityRound, setPriorityRound] = useState('')
  const [active, setActive] = useState(true)

  const [audioPreview, setAudioPreview] = useState<string | null>(null)
  const [bgPreview, setBgPreview] = useState<string | null>(null)
  const [slots, setSlots] = useState<Record<SoundbiteKey, SlotState>>({
    onBan: emptySlot(),
    onPick: emptySlot(),
    onGameSelected: emptySlot(),
    onWinnerChosen: emptySlot(),
  })

  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const audioRef = useRef<HTMLInputElement>(null)
  const bgRef = useRef<HTMLInputElement>(null)
  const slotRefs = {
    onBan: useRef<HTMLInputElement>(null),
    onPick: useRef<HTMLInputElement>(null),
    onGameSelected: useRef<HTMLInputElement>(null),
    onWinnerChosen: useRef<HTMLInputElement>(null),
  }

  // Sync form state whenever the target theme changes (or we switch to create).
  useEffect(() => {
    setName(theme?.name ?? '')
    setBpm(theme?.bpm != null ? String(theme.bpm) : '')
    setDivision(theme?.division != null ? String(theme.division) : '1')
    setAudioOffset(theme?.audioOffset != null ? String(theme.audioOffset) : '')
    setNormalizeVolume(theme?.normalizeVolume != null ? String(theme.normalizeVolume) : '')
    setBackgroundSize(theme?.backgroundSize ?? 'cover')
    setPriorityPlayer(theme?.priorityPlayer ?? '')
    setPriorityRound(theme?.priorityRound != null ? String(theme.priorityRound) : '')
    setActive(theme?.active ?? true)
    setAudioPreview(theme?.audioFile ?? null)
    setBgPreview(theme?.backgroundImage ?? null)
    setSlots({
      onBan: slotFrom(theme, 'onBan'),
      onPick: slotFrom(theme, 'onPick'),
      onGameSelected: slotFrom(theme, 'onGameSelected'),
      onWinnerChosen: slotFrom(theme, 'onWinnerChosen'),
    })
    if (audioRef.current) audioRef.current.value = ''
    if (bgRef.current) bgRef.current.value = ''
    Object.values(slotRefs).forEach((r) => r.current && (r.current.value = ''))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme, isOpen])

  function slotFrom(t: Theme | undefined, key: SoundbiteKey): SlotState {
    const sb = t?.soundbites?.[key]
    if (!sb) return emptySlot()
    return {
      existingUrl: sb.path,
      fileName: null,
      offset: sb.offset != null ? String(sb.offset) : '',
      volume: sb.volume != null ? String(sb.volume) : '',
    }
  }

  function handleAudioChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) setAudioPreview(URL.createObjectURL(file))
  }
  function handleBgChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => setBgPreview(reader.result as string)
      reader.readAsDataURL(file)
    }
  }
  function handleSlotFile(key: SoundbiteKey, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    setSlots((s) => ({ ...s, [key]: { ...s[key], fileName: file ? file.name : null } }))
  }
  function setSlotField(key: SoundbiteKey, field: 'offset' | 'volume', value: string) {
    setSlots((s) => ({ ...s, [key]: { ...s[key], [field]: value } }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    if (!bpm.trim() || Number.isNaN(parseInt(bpm, 10))) {
      toast.error('BPM is required and must be a number.')
      return
    }

    setSaving(true)
    const formData = new FormData()
    formData.append('name', name.trim())
    formData.append('bpm', bpm.trim())
    formData.append('division', division.trim() || '1')
    formData.append('audioOffset', audioOffset.trim())
    formData.append('normalizeVolume', normalizeVolume.trim())
    formData.append('backgroundSize', backgroundSize)
    formData.append('priorityPlayer', priorityPlayer.trim())
    formData.append('priorityRound', priorityRound.trim())
    formData.append('active', String(active))

    const audioFile = audioRef.current?.files?.[0]
    if (audioFile) formData.append('audio', audioFile)
    else if (theme?.audioFile) formData.append('audioUrl', theme.audioFile)

    const bgFile = bgRef.current?.files?.[0]
    if (bgFile) formData.append('backgroundImage', bgFile)
    else if (theme?.backgroundImage) formData.append('backgroundImageUrl', theme.backgroundImage)

    for (const { key } of SOUNDBITE_SLOTS) {
      const file = slotRefs[key].current?.files?.[0]
      if (file) formData.append(`soundbite_${key}`, file)
      else if (slots[key].existingUrl) formData.append(`soundbite_${key}_url`, slots[key].existingUrl!)
      formData.append(`soundbite_${key}_offset`, slots[key].offset.trim())
      formData.append(`soundbite_${key}_volume`, slots[key].volume.trim())
    }

    try {
      const res = await fetch(isEdit ? `/api/themes/${theme!.id}` : '/api/themes', {
        method: isEdit ? 'PATCH' : 'POST',
        body: formData,
      })
      if (res.ok) {
        onClose()
        router.refresh()
      } else {
        const data = await res.json().catch(() => ({}))
        toast.error(data.error || 'Failed to save theme')
      }
    } catch {
      toast.error('Network error')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!isEdit) return
    if (!confirm(`Remove "${theme!.name}"? It stays on historical matches but won't be assigned to new ones.`)) {
      return
    }
    setDeleting(true)
    try {
      const res = await fetch(`/api/themes/${theme!.id}`, { method: 'DELETE' })
      if (res.ok) {
        onClose()
        router.refresh()
      } else {
        const data = await res.json().catch(() => ({}))
        toast.error(data.error || 'Failed to remove theme')
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
          {isEdit ? `Edit ${theme!.name}` : 'Add Theme'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={labelClass}>Name</label>
            <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} autoFocus />
            {isEdit && (
              <p className="text-xs text-darcula-text-muted mt-1">
                Slug id <code className="text-darcula-blue">{theme!.id}</code> is locked to protect match references.
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <label className={labelClass}>BPM</label>
              <input className={inputClass} type="number" value={bpm} onChange={(e) => setBpm(e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>Division</label>
              <input className={inputClass} type="number" value={division} onChange={(e) => setDivision(e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>Audio offset (ms)</label>
              <input className={inputClass} type="number" value={audioOffset} onChange={(e) => setAudioOffset(e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>Volume ×</label>
              <input className={inputClass} type="number" step="0.1" value={normalizeVolume} onChange={(e) => setNormalizeVolume(e.target.value)} placeholder="1" />
            </div>
          </div>

          {/* Audio */}
          <div>
            <label className={labelClass}>Audio track</label>
            <input ref={audioRef} type="file" accept="audio/*" onChange={handleAudioChange} className="text-sm text-darcula-text-muted" />
            {audioPreview && <audio controls src={audioPreview} className="mt-2 w-full h-9" />}
          </div>

          {/* Background image */}
          <div className="flex items-start gap-4">
            <div
              className="w-28 h-20 rounded bg-darcula-elevated border-2 border-dashed border-darcula-border flex items-center justify-center cursor-pointer hover:border-darcula-blue overflow-hidden flex-shrink-0"
              onClick={() => bgRef.current?.click()}
              style={
                bgPreview
                  ? {
                      backgroundImage: `url(${bgPreview})`,
                      backgroundSize: backgroundSize === 'repeat' ? 'auto 100%' : backgroundSize,
                      backgroundPosition: 'center',
                      backgroundRepeat: backgroundSize === 'repeat' ? 'repeat-x' : 'no-repeat',
                    }
                  : undefined
              }
            >
              {!bgPreview && <span className="text-darcula-text-muted text-xs">Background</span>}
            </div>
            <input ref={bgRef} type="file" accept="image/*" onChange={handleBgChange} className="hidden" />
            <div className="flex-1">
              <button type="button" onClick={() => bgRef.current?.click()} className="text-sm text-darcula-blue hover:underline">
                {bgPreview ? 'Change background' : 'Upload background'}
              </button>
              <div className="mt-2">
                <label className={labelClass}>Background size</label>
                <select className={inputClass} value={backgroundSize} onChange={(e) => setBackgroundSize(e.target.value as 'cover' | 'contain' | 'repeat')}>
                  <option value="cover">cover</option>
                  <option value="contain">contain</option>
                  <option value="repeat">repeat</option>
                </select>
              </div>
            </div>
          </div>

          {/* Soundbites */}
          <div>
            <label className={labelClass}>Soundbites</label>
            <div className="space-y-3">
              {SOUNDBITE_SLOTS.map(({ key, label }) => (
                <div key={key} className="border border-darcula-border rounded p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-darcula-text">{label}</span>
                    {slots[key].existingUrl && !slots[key].fileName && (
                      <a href={slots[key].existingUrl!} target="_blank" rel="noreferrer" className="text-xs text-darcula-blue hover:underline">
                        current
                      </a>
                    )}
                  </div>
                  <input
                    ref={slotRefs[key]}
                    type="file"
                    accept="audio/*"
                    onChange={(e) => handleSlotFile(key, e)}
                    className="text-sm text-darcula-text-muted"
                  />
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    <input
                      className={inputClass}
                      type="number"
                      placeholder="offset (ms)"
                      value={slots[key].offset}
                      onChange={(e) => setSlotField(key, 'offset', e.target.value)}
                    />
                    <input
                      className={inputClass}
                      type="number"
                      step="0.1"
                      placeholder="volume ×"
                      value={slots[key].volume}
                      onChange={(e) => setSlotField(key, 'volume', e.target.value)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Priority rule */}
          <div>
            <label className={labelClass}>Priority</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <input
                  className={inputClass}
                  value={priorityPlayer}
                  onChange={(e) => setPriorityPlayer(e.target.value)}
                  placeholder="Player name (substring, e.g. Lucho)"
                />
              </div>
              <input
                className={inputClass}
                type="number"
                value={priorityRound}
                onChange={(e) => setPriorityRound(e.target.value)}
                placeholder="round (optional)"
              />
            </div>
            <p className="text-xs text-darcula-text-muted mt-1">
              When a match includes a player whose name contains this text (and, if set, in this round),
              prefer this theme over the normal rotation.
            </p>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="w-4 h-4 accent-darcula-blue" />
            <span className="text-sm text-darcula-text">Active (assignable in new tournaments)</span>
          </label>

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
