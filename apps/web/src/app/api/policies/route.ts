import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const params = request.nextUrl.searchParams
  const regionId = params.get('region_id')
  const category = params.get('category')
  const search = params.get('search')

  try {
    const where: Record<string, unknown> = {}
    if (regionId) where.regionId = parseInt(regionId)
    if (category) where.category = category

    let policies = await prisma.policyIntervention.findMany({
      where,
      include: { region: true },
      orderBy: { effectivenessScore: 'desc' },
    })

    if (search) {
      const q = search.toLowerCase()
      policies = policies.filter(p =>
        p.title.toLowerCase().includes(q) ||
        p.summary.toLowerCase().includes(q) ||
        p.tags.toLowerCase().includes(q) ||
        p.region.cityRegency.toLowerCase().includes(q)
      )
    }

    // Group by category for summary
    const categoryMap: Record<string, number> = {}
    policies.forEach(p => {
      categoryMap[p.category] = (categoryMap[p.category] || 0) + 1
    })

    return NextResponse.json({
      total: policies.length,
      categories: categoryMap,
      data: policies.map(p => ({
        id: p.id,
        region: `${p.region.cityRegency}, ${p.region.province}`,
        regionId: p.regionId,
        title: p.title,
        category: p.category,
        categoryLabel: {
          operasi_pasar: 'Operasi Pasar',
          subsidi_distribusi: 'Subsidi Distribusi',
          monitoring_stok: 'Monitoring Stok',
          kerja_sama: 'Kerja Sama Antardaerah',
        }[p.category] || p.category,
        summary: p.summary,
        effectivenessScore: p.effectivenessScore,
        tags: p.tags.split(',').map(t => t.trim()),
        sourceUrl: p.sourceUrl,
        createdAt: p.createdAt,
      })),
    })
  } catch (error) {
    console.error('Policies error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
