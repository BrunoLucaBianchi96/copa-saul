import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'

export async function GET() {
  const role = await getSession()
  if (!role) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }
  return NextResponse.json({ role })
}
