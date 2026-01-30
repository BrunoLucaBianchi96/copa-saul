import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Copa Saul - Tournament Manager',
  description: 'Swiss-system tournament management',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-darcula-bg min-h-screen text-darcula-text">{children}</body>
    </html>
  )
}
