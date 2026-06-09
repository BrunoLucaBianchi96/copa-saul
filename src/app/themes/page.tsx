import { redirect } from 'next/navigation'
import { getManageableThemes } from '@/lib/themes-db'
import { CUSTOM_THEMES } from '@/lib/themes'
import { getSession, isHost as checkIsHost } from '@/lib/session'
import { ThemesGrid } from './themes-grid'

export const dynamic = 'force-dynamic'

// Global pick-ban theme management — host only. Simple themes live in the DB and
// are fully editable; the three custom-renderer themes (balatro/matrix/gta-4)
// are shown read-only as built-ins.
export default async function ThemesPage() {
  if (!checkIsHost(await getSession())) redirect('/')

  const themes = await getManageableThemes()

  return (
    <main className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-darcula-text-bright mt-2">Themes</h1>
        <p className="text-darcula-text-muted">
          {themes.length + CUSTOM_THEMES.length} pick-ban themes
        </p>
      </div>

      <ThemesGrid themes={themes} builtins={CUSTOM_THEMES} />
    </main>
  )
}
