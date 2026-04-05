import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function GET() {
  const session = await getSession()
  if (!session || !['super_admin', 'analyst'].includes(session.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const jobs = await prisma.ingestionJob.findMany({
      orderBy: { startedAt: 'desc' },
      take: 50,
    })

    return NextResponse.json({
      total: jobs.length,
      jobs: jobs.map(j => ({
        id: j.id,
        sourceName: j.sourceName,
        status: j.status,
        startedAt: j.startedAt,
        finishedAt: j.finishedAt,
        rowCount: j.rowCount,
        errorLog: j.errorLog,
        duration: j.finishedAt
          ? Math.round((j.finishedAt.getTime() - j.startedAt.getTime()) / 1000)
          : null,
      })),
    })
  } catch (error) {
    console.error('Ingestion jobs error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
