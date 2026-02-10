import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PUBLIC_PATHS = [
  '/',
  '/balatro-bg',
]

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow public paths
  if (PUBLIC_PATHS.includes(pathname)) {
    return NextResponse.next()
  }

  // Allow API auth routes (login/logout/session)
  if (pathname.startsWith('/api/auth')) {
    return NextResponse.next()
  }

  // Check for session cookie
  const session = request.cookies.get('copa-saul-session')
  if (!session?.value || (session.value !== 'host' && session.value !== 'player')) {
    const loginUrl = new URL('/', request.url)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, images, etc.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|mp3|wav|ogg|woff|woff2|ttf|eot)$).*)',
  ],
}