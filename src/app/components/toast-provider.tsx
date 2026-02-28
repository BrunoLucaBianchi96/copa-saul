'use client'

import { Toaster } from 'sonner'

export function ToastProvider() {
  return (
    <Toaster
      position="bottom-left"
      duration={3000}
      closeButton={false}
      toastOptions={{
        style: {
          background: '#3C3F41',
          color: '#A9B7C6',
          border: '1px solid #515151',
        },
      }}
    />
  )
}
