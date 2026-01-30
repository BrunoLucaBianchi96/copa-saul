import { cookies } from 'next/headers'

export type Role = 'host' | 'player'

const SESSION_COOKIE = 'copa-saul-session'

export async function getSession(): Promise<Role | null> {
  const cookieStore = await cookies()
  const session = cookieStore.get(SESSION_COOKIE)
  if (!session?.value) return null
  const role = session.value as Role
  if (role !== 'host' && role !== 'player') return null
  return role
}

export async function setSession(role: Role): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, role, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 1 week
  })
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE)
}

export function isHost(role: Role | null): boolean {
  return role === 'host'
}

export async function requireHost(): Promise<{ authorized: true } | { authorized: false; error: string }> {
  const role = await getSession()
  if (!role) {
    return { authorized: false, error: 'Not authenticated' }
  }
  if (role !== 'host') {
    return { authorized: false, error: 'Host access required' }
  }
  return { authorized: true }
}
