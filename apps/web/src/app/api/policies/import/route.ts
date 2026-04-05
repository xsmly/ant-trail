import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session || !['super_admin', 'analyst'].includes(session.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { policies } = body

    if (!Array.isArray(policies) || policies.length === 0) {
      return NextResponse.json({ error: 'Data kebijakan tidak valid' }, { status: 400 })
    }

    let imported = 0
    for (const p of policies) {
      if (!p.regionId || !p.title || !p.category || !p.summary) continue
      await prisma.policyIntervention.create({
        data: {
          regionId: p.regionId,
          title: p.title,
          category: p.category,
          summary: p.summary,
          effectivenessScore: p.effectivenessScore || 0,
          tags: p.tags || '',
          sourceUrl: p.sourceUrl || '',
        },
      })
      imported++
    }

    return NextResponse.json({
      success: true,
      message: `Berhasil mengimpor ${imported} kebijakan`,
      imported,
    })
  } catch (error) {
    console.error('Policy import error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
