import { NextResponse } from 'next/server'
import { setSession, type Role } from '@/lib/session'

const HOST_PASSWORD = process.env.HOST_PASSWORD

export async function POST(request: Request) {
  const { role, password } = await request.json()

  if (role !== 'host' && role !== 'player') {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
  }

  if (role === 'host') {
    if (password !== HOST_PASSWORD) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
    }
  }

  await setSession(role as Role)
  return NextResponse.json({ success: true, role })
}
