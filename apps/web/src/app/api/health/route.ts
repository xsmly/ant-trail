import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const regionCount = await prisma.region.count()
    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected',
      regions: regionCount,
      version: process.env.NEXT_PUBLIC_APP_VERSION || '0.1.0',
    })
  } catch (error) {
    return NextResponse.json(
      { status: 'unhealthy', error: String(error) },
      { status: 503 }
    )
  }
}
