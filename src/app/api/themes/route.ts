import { NextResponse } from 'next/server'
import { requireHost } from '@/lib/session'
import { createTheme, getThemeById, getManageableThemes } from '@/lib/themes-db'
import { slugify } from '@/lib/games-db'
import { parseThemeForm } from '@/lib/theme-form'

// Manageable DB themes — host only (the management UI). Custom themes are merged
// in client-side from CUSTOM_THEMES.
export async function GET() {
  const auth = await requireHost()
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: 403 })
  }
  const themes = await getManageableThemes()
  return NextResponse.json({ themes })
}

export async function POST(request: Request) {
  const auth = await requireHost()
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: 403 })
  }

  const formData = await request.formData()
  let parsed
  try {
    parsed = await parseThemeForm(formData)
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 })
  }

  if (!parsed.name) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  }
  if (parsed.bpm === undefined) {
    return NextResponse.json({ error: 'BPM is required' }, { status: 400 })
  }

  // Derive an immutable slug id from the name; ensure it is unique (this also
  // rejects collisions with the hardcoded custom theme ids).
  const id = slugify(parsed.name)
  if (!id) {
    return NextResponse.json({ error: 'Could not derive a valid id from the name' }, { status: 400 })
  }
  if (await getThemeById(id)) {
    return NextResponse.json({ error: `A theme with id "${id}" already exists` }, { status: 409 })
  }

  const theme = await createTheme({ ...parsed, id, name: parsed.name, bpm: parsed.bpm })
  return NextResponse.json(theme)
}
