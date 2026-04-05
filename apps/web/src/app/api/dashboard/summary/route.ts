import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const commodity = request.nextUrl.searchParams.get('commodity')

  try {
    // Total commodities monitored
    const totalCommodities = await prisma.commodity.count()

    // Get latest supply-demand data
    const latestSnapshots = await prisma.supplyDemandSnapshot.findMany({
      where: commodity ? {
        commodity: { name: { contains: commodity } }
      } : undefined,
      orderBy: { snapshotDate: 'desc' },
      take: 100,
      distinct: ['regionId', 'commodityId'],
      include: { region: true, commodity: true },
    })

    const surplusRegions = new Set(
      latestSnapshots.filter(s => s.status === 'surplus').map(s => s.regionId)
    ).size
    const deficitRegions = new Set(
      latestSnapshots.filter(s => s.status === 'deficit').map(s => s.regionId)
    ).size

    // Inflation alerts
    const highAlerts = await prisma.inflationSignal.findMany({
      where: {
        riskLevel: 'high',
        ...(commodity ? { commodity: { name: { contains: commodity } } } : {}),
      },
      distinct: ['regionId'],
    })

    // Risk index calculation (avg of high risk signals)
    const allSignals = await prisma.inflationSignal.findMany({
      where: commodity ? { commodity: { name: { contains: commodity } } } : undefined,
      orderBy: { signalDate: 'desc' },
      distinct: ['regionId', 'commodityId'],
    })

    const riskMap: Record<string, number> = { low: 1, medium: 2, high: 3 }
    const avgRisk = allSignals.length > 0
      ? allSignals.reduce((sum, s) => sum + (riskMap[s.riskLevel] || 1), 0) / allSignals.length
      : 1
    const logisticsRiskIndex = Math.round((avgRisk / 3) * 100)

    // Recent price trends
    const recentPrices = await prisma.priceObservation.groupBy({
      by: ['commodityId'],
      _avg: { price: true },
      _max: { price: true },
      _min: { price: true },
      where: {
        observationDate: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        },
      },
    })

    // Top alerts
    const topAlerts = await prisma.inflationSignal.findMany({
      where: { riskLevel: { in: ['high', 'medium'] } },
      orderBy: { signalDate: 'desc' },
      take: 5,
      include: { region: true, commodity: true },
    })

    return NextResponse.json({
      kpi: {
        totalCommodities,
        surplusRegions,
        deficitRegions,
        inflationAlerts: highAlerts.length,
        logisticsRiskIndex,
      },
      topAlerts: topAlerts.map(a => ({
        id: a.id,
        region: `${a.region.cityRegency}, ${a.region.province}`,
        commodity: a.commodity.name,
        riskLevel: a.riskLevel,
        reason: a.signalReason,
        currentPrice: a.currentPrice,
        forecastPrice: a.forecastPrice,
        date: a.signalDate,
      })),
      priceSummary: recentPrices,
    })
  } catch (error) {
    console.error('Dashboard summary error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
