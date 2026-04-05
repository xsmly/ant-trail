import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { forecastInflation } from '@/lib/analytics'

export async function POST() {
  const session = await getSession()
  if (!session || !['super_admin', 'analyst'].includes(session.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const regions = await prisma.region.findMany()
    const commodities = await prisma.commodity.findMany()
    let updated = 0

    for (const region of regions) {
      for (const commodity of commodities) {
        const prices = await prisma.priceObservation.findMany({
          where: { regionId: region.id, commodityId: commodity.id },
          orderBy: { observationDate: 'asc' },
          select: { observationDate: true, price: true },
        })

        if (prices.length < 14) continue

        const forecast = forecastInflation(
          prices.map(p => ({ date: p.observationDate.toISOString().split('T')[0], price: p.price })),
          4
        )

        const currentPrice = prices[prices.length - 1].price
        const forecastPrice = forecast.forecastPrices.length > 0
          ? forecast.forecastPrices[forecast.forecastPrices.length - 1].price
          : currentPrice

        // Upsert latest signal
        const existing = await prisma.inflationSignal.findFirst({
          where: { regionId: region.id, commodityId: commodity.id },
          orderBy: { signalDate: 'desc' },
        })

        if (existing) {
          await prisma.inflationSignal.update({
            where: { id: existing.id },
            data: {
              signalDate: new Date(),
              currentPrice,
              forecastPrice,
              riskLevel: forecast.riskLevel,
              signalReason: forecast.reason,
            },
          })
        } else {
          await prisma.inflationSignal.create({
            data: {
              regionId: region.id,
              commodityId: commodity.id,
              signalDate: new Date(),
              currentPrice,
              forecastPrice,
              riskLevel: forecast.riskLevel,
              signalReason: forecast.reason,
            },
          })
        }
        updated++
      }
    }

    return NextResponse.json({
      success: true,
      message: `Berhasil recompute ${updated} sinyal inflasi`,
      updated,
    })
  } catch (error) {
    console.error('Recompute error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
