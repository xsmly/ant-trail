import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { forecastInflation, computeMatchScore, haversineDistance } from '@/lib/analytics'

export async function POST() {
  const session = await getSession()
  if (!session || session.role !== 'super_admin') {
    return NextResponse.json({ error: 'Unauthorized - Admin only' }, { status: 401 })
  }

  try {
    const job = await prisma.ingestionJob.create({
      data: {
        sourceName: 'etl_refresh',
        status: 'running',
        startedAt: new Date(),
      },
    })

    let processedCount = 0

    // 1. Recompute inflation signals
    const regions = await prisma.region.findMany()
    const commodities = await prisma.commodity.findMany()

    for (const region of regions) {
      for (const commodity of commodities) {
        const prices = await prisma.priceObservation.findMany({
          where: { regionId: region.id, commodityId: commodity.id },
          orderBy: { observationDate: 'asc' },
        })

        if (prices.length < 14) continue

        const forecast = forecastInflation(
          prices.map(p => ({ date: p.observationDate.toISOString().split('T')[0], price: p.price })),
          4
        )

        await prisma.inflationSignal.updateMany({
          where: { regionId: region.id, commodityId: commodity.id },
          data: {
            currentPrice: prices[prices.length - 1].price,
            forecastPrice: forecast.forecastPrices.length > 0
              ? forecast.forecastPrices[forecast.forecastPrices.length - 1].price
              : prices[prices.length - 1].price,
            riskLevel: forecast.riskLevel,
            signalReason: forecast.reason,
            signalDate: new Date(),
          },
        })
        processedCount++
      }
    }

    // 2. Recompute logistics routes
    await prisma.logisticsRoute.deleteMany()
    const snapshots = await prisma.supplyDemandSnapshot.findMany({
      include: { region: true, commodity: true },
      orderBy: { snapshotDate: 'desc' },
      distinct: ['regionId', 'commodityId'],
    })

    const surplusSnapshots = snapshots.filter(s => s.status === 'surplus')
    const deficitSnapshots = snapshots.filter(s => s.status === 'deficit')

    for (const deficit of deficitSnapshots) {
      const suppliers = surplusSnapshots.filter(
        s => s.commodityId === deficit.commodityId && s.regionId !== deficit.regionId
      )

      for (const surplus of suppliers) {
        const distance = haversineDistance(
          surplus.region.latitude, surplus.region.longitude,
          deficit.region.latitude, deficit.region.longitude
        )

        const result = computeMatchScore({
          supplyGap: surplus.gap,
          demandGap: Math.abs(deficit.gap),
          distance,
          priceChange7d: 5,
          supplierMinStock: 0.5,
        })

        await prisma.logisticsRoute.create({
          data: {
            sourceRegionId: surplus.regionId,
            destinationRegionId: deficit.regionId,
            commodityId: surplus.commodityId,
            routeScore: result.breakdown.priceStabilityScore,
            distanceScore: result.breakdown.distanceScore,
            capacityScore: result.breakdown.supplyCapacityScore,
            urgencyScore: result.breakdown.urgencyScore,
            finalScore: result.finalScore,
            recommendationReason: `Auto-generated: ${surplus.region.cityRegency} → ${deficit.region.cityRegency} untuk ${surplus.commodity.name}. Skor: ${result.finalScore}`,
          },
        })
        processedCount++
      }
    }

    await prisma.ingestionJob.update({
      where: { id: job.id },
      data: {
        status: 'completed',
        finishedAt: new Date(),
        rowCount: processedCount,
      },
    })

    return NextResponse.json({
      success: true,
      jobId: job.id,
      processed: processedCount,
      message: `ETL refresh selesai. ${processedCount} item diproses.`,
    })
  } catch (error) {
    console.error('ETL error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
