import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const alerts = await prisma.inflationSignal.findMany({
      where: { riskLevel: { in: ['high', 'medium'] } },
      orderBy: [{ riskLevel: 'desc' }, { signalDate: 'desc' }],
      take: 20,
      include: { region: true, commodity: true },
    })

    return NextResponse.json({
      alerts: alerts.map(a => ({
        id: a.id,
        region: `${a.region.cityRegency}, ${a.region.province}`,
        regionId: a.regionId,
        commodity: a.commodity.name,
        commodityId: a.commodityId,
        riskLevel: a.riskLevel,
        currentPrice: a.currentPrice,
        forecastPrice: a.forecastPrice,
        changePercent: ((a.forecastPrice - a.currentPrice) / a.currentPrice * 100).toFixed(1),
        reason: a.signalReason,
        date: a.signalDate,
      })),
      total: alerts.length,
    })
  } catch (error) {
    console.error('Alerts error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
