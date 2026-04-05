import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const params = request.nextUrl.searchParams
  const commodityId = params.get('commodity_id')
  const date = params.get('date')

  try {
    const where: Record<string, unknown> = {}
    if (commodityId) where.commodityId = parseInt(commodityId)
    if (date) {
      where.snapshotDate = { lte: new Date(date) }
    }

    // Get latest snapshot per region per commodity
    const snapshots = await prisma.supplyDemandSnapshot.findMany({
      where,
      include: { region: true, commodity: true },
      orderBy: { snapshotDate: 'desc' },
      distinct: ['regionId', 'commodityId'],
    })

    const surplusRegions = snapshots.filter(s => s.status === 'surplus')
    const deficitRegions = snapshots.filter(s => s.status === 'deficit')
    const balancedRegions = snapshots.filter(s => s.status === 'balanced')

    return NextResponse.json({
      summary: {
        total: snapshots.length,
        surplus: surplusRegions.length,
        deficit: deficitRegions.length,
        balanced: balancedRegions.length,
      },
      data: snapshots.map(s => ({
        id: s.id,
        region: `${s.region.cityRegency}, ${s.region.province}`,
        regionId: s.regionId,
        commodity: s.commodity.name,
        commodityId: s.commodityId,
        date: s.snapshotDate,
        supply: s.estimatedSupply,
        demand: s.estimatedDemand,
        gap: s.gap,
        gapPercent: ((s.gap / s.estimatedDemand) * 100).toFixed(1),
        status: s.status,
      })),
    })
  } catch (error) {
    console.error('Supply-demand error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
