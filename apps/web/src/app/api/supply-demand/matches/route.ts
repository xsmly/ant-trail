import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { computeMatchScore, haversineDistance } from '@/lib/analytics'

export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const params = request.nextUrl.searchParams
  const commodityId = params.get('commodity_id')
  const targetRegionId = params.get('target_region_id')

  try {
    const where: Record<string, unknown> = {}
    if (commodityId) where.commodityId = parseInt(commodityId)

    // Get latest snapshots
    const allSnapshots = await prisma.supplyDemandSnapshot.findMany({
      where,
      include: { region: true, commodity: true },
      orderBy: { snapshotDate: 'desc' },
      distinct: ['regionId', 'commodityId'],
    })

    const surplusSnapshots = allSnapshots.filter(s => s.status === 'surplus')
    let deficitSnapshots = allSnapshots.filter(s => s.status === 'deficit')

    if (targetRegionId) {
      deficitSnapshots = deficitSnapshots.filter(s => s.regionId === parseInt(targetRegionId))
    }

    // Generate matches
    const matches = []
    for (const deficit of deficitSnapshots) {
      const potentialSuppliers = surplusSnapshots.filter(
        s => s.commodityId === deficit.commodityId && s.regionId !== deficit.regionId
      )

      for (const surplus of potentialSuppliers) {
        const distance = haversineDistance(
          surplus.region.latitude, surplus.region.longitude,
          deficit.region.latitude, deficit.region.longitude
        )

        // Get recent price data for stability
        const recentPrices = await prisma.priceObservation.findMany({
          where: {
            regionId: surplus.regionId,
            commodityId: surplus.commodityId,
            observationDate: { gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) },
          },
          orderBy: { observationDate: 'desc' },
          take: 14,
        })

        const priceChange7d = recentPrices.length >= 2
          ? ((recentPrices[0].price - recentPrices[recentPrices.length - 1].price) / recentPrices[recentPrices.length - 1].price) * 100
          : 0

        const result = computeMatchScore({
          supplyGap: surplus.gap,
          demandGap: Math.abs(deficit.gap),
          distance,
          priceChange7d,
          supplierMinStock: surplus.estimatedSupply > 0 ? surplus.gap / surplus.estimatedSupply : 0,
        })

        // Generate human-readable reason
        const reasons: string[] = []
        if (result.breakdown.supplyCapacityScore > 0.7) {
          reasons.push(`${surplus.region.cityRegency} memiliki surplus ${surplus.commodity.name} yang cukup besar (${Math.round(surplus.gap)} ton)`)
        }
        if (result.breakdown.distanceScore > 0.6) {
          reasons.push(`Jarak ${Math.round(distance)} km relatif dekat dan efisien`)
        }
        if (result.breakdown.urgencyScore > 0.5) {
          reasons.push(`Urgensi tinggi: kenaikan harga ${priceChange7d.toFixed(1)}% di wilayah defisit`)
        }
        if (result.breakdown.priceStabilityScore > 0.7) {
          reasons.push(`Harga di supplier stabil, mengurangi risiko fluktuasi`)
        }
        if (reasons.length === 0) {
          reasons.push(`Rekomendasi berdasarkan skor gabungan kapasitas, jarak, urgensi, dan stabilitas harga`)
        }

        matches.push({
          sourceRegion: `${surplus.region.cityRegency}, ${surplus.region.province}`,
          sourceRegionId: surplus.regionId,
          destinationRegion: `${deficit.region.cityRegency}, ${deficit.region.province}`,
          destinationRegionId: deficit.regionId,
          commodity: surplus.commodity.name,
          commodityId: surplus.commodityId,
          distance: Math.round(distance),
          surplus: Math.round(surplus.gap),
          deficit: Math.round(Math.abs(deficit.gap)),
          scores: result.breakdown,
          finalScore: result.finalScore,
          reason: reasons.join('. ') + '.',
        })
      }
    }

    // Sort by final score
    matches.sort((a, b) => b.finalScore - a.finalScore)

    return NextResponse.json({
      total: matches.length,
      matches: matches.slice(0, 50), // Top 50
    })
  } catch (error) {
    console.error('Matching error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
