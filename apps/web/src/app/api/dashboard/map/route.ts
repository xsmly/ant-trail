import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const commodity = request.nextUrl.searchParams.get('commodity') || 'Beras'
  const dateStr = request.nextUrl.searchParams.get('date')

  try {
    const regions = await prisma.region.findMany()
    
    // Get latest supply-demand per region for the commodity
    const commodityData = await prisma.commodity.findFirst({
      where: { name: { contains: commodity } },
    })

    if (!commodityData) {
      return NextResponse.json({ error: 'Commodity not found' }, { status: 404 })
    }

    const mapData = await Promise.all(regions.map(async (region) => {
      const latestSD = await prisma.supplyDemandSnapshot.findFirst({
        where: {
          regionId: region.id,
          commodityId: commodityData.id,
          ...(dateStr ? { snapshotDate: { lte: new Date(dateStr) } } : {}),
        },
        orderBy: { snapshotDate: 'desc' },
      })

      const latestPrice = await prisma.priceObservation.findFirst({
        where: {
          regionId: region.id,
          commodityId: commodityData.id,
        },
        orderBy: { observationDate: 'desc' },
      })

      const prevPrice = await prisma.priceObservation.findFirst({
        where: {
          regionId: region.id,
          commodityId: commodityData.id,
          observationDate: {
            lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
        orderBy: { observationDate: 'desc' },
      })

      const signal = await prisma.inflationSignal.findFirst({
        where: {
          regionId: region.id,
          commodityId: commodityData.id,
        },
        orderBy: { signalDate: 'desc' },
      })

      const priceChange = latestPrice && prevPrice
        ? ((latestPrice.price - prevPrice.price) / prevPrice.price) * 100
        : 0

      return {
        regionId: region.id,
        province: region.province,
        cityRegency: region.cityRegency,
        latitude: region.latitude,
        longitude: region.longitude,
        islandGroup: region.islandGroup,
        status: latestSD?.status || 'unknown',
        supply: latestSD?.estimatedSupply || 0,
        demand: latestSD?.estimatedDemand || 0,
        gap: latestSD?.gap || 0,
        currentPrice: latestPrice?.price || 0,
        priceChange,
        riskLevel: signal?.riskLevel || 'low',
      }
    }))

    return NextResponse.json({
      commodity: commodityData.name,
      regions: mapData,
    })
  } catch (error) {
    console.error('Map data error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
