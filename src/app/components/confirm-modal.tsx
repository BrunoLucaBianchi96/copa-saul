'use client'

import { useState, useEffect, useRef } from 'react'
import { useGamepad, claimGamepadForModal, releaseGamepadForModal } from '@/app/hooks/useGamepad'

interface ConfirmModalProps {
  message: string
  confirmLabel: string
  cancelLabel: string
  onConfirm: () => void
  onCancel: () => void
  /** Style variant for the confirm button */
  variant?: 'danger' | 'default'
}

export function ConfirmModal({
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  variant = 'danger',
}: ConfirmModalProps) {
  const [focus, setFocus] = useState<'cancel' | 'confirm'>('cancel')
  const mountedAt = useRef(Date.now())

  useEffect(() => {
    claimGamepadForModal()
    return () => releaseGamepadForModal()
  }, [])

  useGamepad({
    onButtonPress: (button) => {
      // Ignore presses within 250ms of mount — a button from the previous
      // modal/menu may still be held down
      if (Date.now() - mountedAt.current < 250) return

      if (button === 'cross') {
        if (focus === 'confirm') onConfirm()
        else onCancel()
      } else if (button === 'circle') {
        onCancel()
      }
    },
    onDirection: (dir) => {
      if (dir === 'left' || dir === 'right') {
        setFocus((prev) => (prev === 'cancel' ? 'confirm' : 'cancel'))
      }
    },
    modal: true,
  })

  const confirmFocusClass =
    variant === 'danger'
      ? 'border-darcula-red bg-darcula-red/20 text-darcula-red font-medium'
      : 'border-darcula-blue bg-darcula-blue/20 text-darcula-text-bright'
  const confirmUnfocusClass = 'border-darcula-border bg-darcula-elevated text-darcula-text hover:bg-darcula-border'

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100]">
      <div className="bg-darcula-surface border border-darcula-border rounded-lg p-6 max-w-sm mx-4 text-center">
        <p className="text-darcula-text mb-6">{message}</p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className={`flex-1 px-4 py-2 rounded border transition ${
              focus === 'cancel'
                ? 'border-darcula-blue bg-darcula-blue/20 text-darcula-text-bright'
                : 'border-darcula-border bg-darcula-elevated text-darcula-text hover:bg-darcula-border'
            }`}
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 px-4 py-2 rounded border transition ${
              focus === 'confirm' ? confirmFocusClass : confirmUnfocusClass
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
