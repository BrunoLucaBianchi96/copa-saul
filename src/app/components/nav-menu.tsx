'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useGamepad, claimGamepadForModal, releaseGamepadForModal, type GamepadDirection } from '@/app/hooks/useGamepad'

export type NavMenuItem =
  | { label: string; href: string }
  | { label: string; onAction: () => void; variant?: 'danger' }

interface NavMenuProps {
  items: NavMenuItem[]
  onClose: () => void
}

export function NavMenu({ items, onClose }: NavMenuProps) {
  const router = useRouter()
  const [focusIndex, setFocusIndex] = useState(0)
  const mountedAt = useRef(Date.now())

  useEffect(() => {
    claimGamepadForModal()
    return () => releaseGamepadForModal()
  }, [])

  function selectItem(index: number) {
    const item = items[index]
    if ('href' in item) {
      onClose()
      router.push(item.href)
    } else {
      // Call action before closing — some actions (e.g. requestFullscreen)
      // need the user activation which state updates may consume
      item.onAction()
      onClose()
    }
  }

  useGamepad({
    onButtonPress: (button) => {
      // Ignore presses within 250ms of mount — the button that opened the menu
      // is likely still held down and would immediately close it
      if (Date.now() - mountedAt.current < 250) return

      if (button === 'cross') {
        selectItem(focusIndex)
      } else if (button === 'circle' || button === 'options') {
        onClose()
      }
    },
    onDirection: (dir: GamepadDirection) => {
      if (dir === 'up') {
        setFocusIndex((prev) => (prev > 0 ? prev - 1 : items.length - 1))
      } else if (dir === 'down') {
        setFocusIndex((prev) => (prev < items.length - 1 ? prev + 1 : 0))
      }
    },
    modal: true,
  })

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100]">
      <div className="bg-darcula-surface border border-darcula-border rounded-lg p-4 min-w-[200px] mx-4">
        <div className="flex flex-col gap-1">
          {items.map((item, i) => {
            const isDanger = 'variant' in item && item.variant === 'danger'
            return (
              <button
                key={'href' in item ? item.href : item.label}
                onClick={() => selectItem(i)}
                className={`text-left px-4 py-2 rounded transition ${
                  i === focusIndex
                    ? isDanger
                      ? 'bg-darcula-red/20 text-darcula-red border border-darcula-red'
                      : 'bg-darcula-blue/20 text-darcula-text-bright border border-darcula-blue'
                    : isDanger
                      ? 'text-darcula-red hover:bg-darcula-border border border-transparent'
                      : 'text-darcula-text hover:bg-darcula-border border border-transparent'
                }`}
              >
                {item.label}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
