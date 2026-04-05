import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'ant-trail-demo-secret-key-change-in-production'
)

export interface SessionPayload {
  userId: number
  email: string
  name: string
  role: 'super_admin' | 'analyst' | 'pemda_viewer'
  regionId: number | null
}

export async function createToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(JWT_SECRET)
}

export async function verifyToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return payload as unknown as SessionPayload
  } catch {
    return null
  }
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get('ant-trail-token')?.value
  if (!token) return null
  return verifyToken(token)
}

export function hasRole(session: SessionPayload, roles: string[]): boolean {
  return roles.includes(session.role)
}

export function canAccessRegion(session: SessionPayload, regionId: number): boolean {
  if (session.role === 'super_admin' || session.role === 'analyst') return true
  return session.regionId === regionId
}
