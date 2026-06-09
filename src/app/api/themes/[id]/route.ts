import { NextResponse } from 'next/server'
import { requireHost } from '@/lib/session'
import { updateTheme, softDeleteTheme, isCustomThemeId } from '@/lib/themes-db'
import { db } from '@/db'
import { themes } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { parseThemeForm } from '@/lib/theme-form'

// Whether a DB theme row exists for this id (excludes the hardcoded customs).
async function dbThemeExists(id: string): Promise<boolean> {
  const rows = await db.select({ id: themes.id }).from(themes).where(eq(themes.id, id))
  return rows.length > 0
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const auth = await requireHost()
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: 403 })
  }

  // The custom-renderer themes live in code and can't be edited/deleted.
  if (isCustomThemeId(params.id)) {
    return NextResponse.json({ error: 'Built-in themes cannot be modified' }, { status: 400 })
  }
  if (!(await dbThemeExists(params.id))) {
    return NextResponse.json({ error: 'Theme not found' }, { status: 404 })
  }

  const formData = await request.formData()
  let parsed
  try {
    parsed = await parseThemeForm(formData)
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 })
  }

  // The slug id is immutable; everything else may change.
  const updated = await updateTheme(params.id, parsed)
  return NextResponse.json(updated)
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const auth = await requireHost()
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: 403 })
  }

  if (isCustomThemeId(params.id)) {
    return NextResponse.json({ error: 'Built-in themes cannot be removed' }, { status: 400 })
  }
  if (!(await dbThemeExists(params.id))) {
    return NextResponse.json({ error: 'Theme not found' }, { status: 404 })
  }

  // Soft delete only — the row survives so historical matches referencing this
  // theme id keep resolving its data.
  await softDeleteTheme(params.id)
  return NextResponse.json({ success: true })
}
