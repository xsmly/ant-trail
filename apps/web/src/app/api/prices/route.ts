import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const params = request.nextUrl.searchParams
  const commodityId = params.get('commodity_id')
  const regionId = params.get('region_id')
  const from = params.get('from')
  const to = params.get('to')
  const page = parseInt(params.get('page') || '1')
  const limit = parseInt(params.get('limit') || '100')
  const search = params.get('search')

  try {
    const where: Record<string, unknown> = {}
    if (commodityId) where.commodityId = parseInt(commodityId)
    if (regionId) where.regionId = parseInt(regionId)
    if (from || to) {
      where.observationDate = {
        ...(from ? { gte: new Date(from) } : {}),
        ...(to ? { lte: new Date(to) } : {}),
      }
    }

    const [observations, total] = await Promise.all([
      prisma.priceObservation.findMany({
        where,
        include: {
          region: true,
          commodity: true,
        },
        orderBy: { observationDate: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.priceObservation.count({ where }),
    ])

    // Calculate WoW and MoM changes
    const enriched = await Promise.all(observations.map(async (obs) => {
      const weekAgo = new Date(obs.observationDate)
      weekAgo.setDate(weekAgo.getDate() - 7)
      const monthAgo = new Date(obs.observationDate)
      monthAgo.setMonth(monthAgo.getMonth() - 1)

      const [prevWeek, prevMonth] = await Promise.all([
        prisma.priceObservation.findFirst({
          where: {
            regionId: obs.regionId,
            commodityId: obs.commodityId,
            observationDate: { lte: weekAgo },
          },
          orderBy: { observationDate: 'desc' },
        }),
        prisma.priceObservation.findFirst({
          where: {
            regionId: obs.regionId,
            commodityId: obs.commodityId,
            observationDate: { lte: monthAgo },
          },
          orderBy: { observationDate: 'desc' },
        }),
      ])

      return {
        id: obs.id,
        region: `${obs.region.cityRegency}`,
        province: obs.region.province,
        regionId: obs.regionId,
        commodity: obs.commodity.name,
        commodityId: obs.commodityId,
        date: obs.observationDate,
        price: obs.price,
        source: obs.source,
        wow: prevWeek ? ((obs.price - prevWeek.price) / prevWeek.price * 100) : null,
        mom: prevMonth ? ((obs.price - prevMonth.price) / prevMonth.price * 100) : null,
      }
    }))

    // Filter by search if provided
    const filtered = search
      ? enriched.filter(e =>
          e.region.toLowerCase().includes(search.toLowerCase()) ||
          e.commodity.toLowerCase().includes(search.toLowerCase())
        )
      : enriched

    return NextResponse.json({
      data: filtered,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Prices error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
