'use client'

import { useState } from 'react'

interface CopyButtonProps {
  text: string
  label: string
  copiedLabel: string
}

export function CopyButton({ text, label, copiedLabel }: CopyButtonProps) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={handleCopy}
      className="px-3 py-1.5 text-sm rounded bg-darcula-elevated border border-darcula-border text-darcula-text hover:bg-darcula-border transition flex-shrink-0"
    >
      {copied ? copiedLabel : label}
    </button>
  )
}
