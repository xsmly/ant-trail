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

    const routes = await prisma.logisticsRoute.findMany({
      where,
      include: {
        sourceRegion: true,
        destinationRegion: true,
        commodity: true,
      },
      orderBy: { finalScore: 'desc' },
      take: 30,
    })

    return NextResponse.json({
      total: routes.length,
      routes: routes.map(r => ({
        id: r.id,
        sourceRegion: {
          id: r.sourceRegionId,
          name: `${r.sourceRegion.cityRegency}, ${r.sourceRegion.province}`,
          latitude: r.sourceRegion.latitude,
          longitude: r.sourceRegion.longitude,
        },
        destinationRegion: {
          id: r.destinationRegionId,
          name: `${r.destinationRegion.cityRegency}, ${r.destinationRegion.province}`,
          latitude: r.destinationRegion.latitude,
          longitude: r.destinationRegion.longitude,
        },
        commodity: r.commodity.name,
        commodityId: r.commodityId,
        scores: {
          route: r.routeScore,
          distance: r.distanceScore,
          capacity: r.capacityScore,
          urgency: r.urgencyScore,
          final: r.finalScore,
        },
        reason: r.recommendationReason,
      })),
    })
  } catch (error) {
    console.error('Logistics routes error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
