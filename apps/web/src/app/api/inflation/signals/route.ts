import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { forecastInflation } from '@/lib/analytics'

export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const params = request.nextUrl.searchParams
  const commodityId = params.get('commodity_id')
  const regionId = params.get('region_id')

  try {
    const where: Record<string, unknown> = {}
    if (commodityId) where.commodityId = parseInt(commodityId)
    if (regionId) where.regionId = parseInt(regionId)

    // Get stored signals
    const signals = await prisma.inflationSignal.findMany({
      where,
      include: { region: true, commodity: true },
      orderBy: [{ riskLevel: 'desc' }, { signalDate: 'desc' }],
      distinct: ['regionId', 'commodityId'],
    })

    // Generate live forecasts for requested commodity
    const forecasts = []
    if (commodityId) {
      const cid = parseInt(commodityId)
      const regions = regionId
        ? [await prisma.region.findUnique({ where: { id: parseInt(regionId) } })]
        : await prisma.region.findMany()

      for (const region of regions) {
        if (!region) continue
        const prices = await prisma.priceObservation.findMany({
          where: {
            regionId: region.id,
            commodityId: cid,
          },
          orderBy: { observationDate: 'asc' },
          select: { observationDate: true, price: true },
        })

        if (prices.length > 14) {
          const forecast = forecastInflation(
            prices.map(p => ({ date: p.observationDate.toISOString().split('T')[0], price: p.price })),
            4
          )

          forecasts.push({
            regionId: region.id,
            region: `${region.cityRegency}, ${region.province}`,
            commodityId: cid,
            forecast: forecast.forecastPrices,
            riskLevel: forecast.riskLevel,
            changePercent: forecast.changePercent,
            reason: forecast.reason,
            historicalPrices: prices.slice(-30).map(p => ({
              date: p.observationDate.toISOString().split('T')[0],
              price: p.price,
            })),
          })
        }
      }
    }

    return NextResponse.json({
      signals: signals.map(s => ({
        id: s.id,
        region: `${s.region.cityRegency}, ${s.region.province}`,
        regionId: s.regionId,
        commodity: s.commodity.name,
        commodityId: s.commodityId,
        currentPrice: s.currentPrice,
        forecastPrice: s.forecastPrice,
        riskLevel: s.riskLevel,
        reason: s.signalReason,
        date: s.signalDate,
      })),
      forecasts,
      total: signals.length,
    })
  } catch (error) {
    console.error('Inflation signals error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
