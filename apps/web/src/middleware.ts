import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'ant-trail-demo-secret-key-change-in-production'
)

async function verifyTokenEdge(token: string) {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return payload
  } catch {
    return null
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip public paths entirely
  if (
    pathname === '/login' ||
    pathname.startsWith('/api/auth/') ||
    pathname === '/api/health' ||
    pathname.startsWith('/_next') ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  // Dashboard pages need auth
  if (pathname.startsWith('/dashboard')) {
    const token = request.cookies.get('ant-trail-token')?.value
    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    const session = await verifyTokenEdge(token)
    if (!session) {
      const response = NextResponse.redirect(new URL('/login', request.url))
      response.cookies.delete('ant-trail-token')
      return response
    }

    // Admin-only check
    if (pathname.startsWith('/dashboard/admin') && session.role !== 'super_admin') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*'],
}
