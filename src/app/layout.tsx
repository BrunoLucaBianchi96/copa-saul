import type { Metadata } from 'next'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'
import { GlobalNavbar } from './components/global-navbar'
import './globals.css'

export const metadata: Metadata = {
  title: 'Copa Saul - Tournament Manager',
  description: 'Swiss-system tournament management',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const messages = await getMessages()

  return (
    <html lang="es">
      <body className="bg-darcula-bg min-h-screen text-darcula-text">
        <NextIntlClientProvider messages={messages}>
          <GlobalNavbar />
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
