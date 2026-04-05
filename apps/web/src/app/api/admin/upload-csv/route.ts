import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'super_admin') {
    return NextResponse.json({ error: 'Unauthorized - Admin only' }, { status: 401 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const dataType = formData.get('type') as string || 'prices'

    if (!file) {
      return NextResponse.json({ error: 'File tidak ditemukan' }, { status: 400 })
    }

    // Create ingestion job
    const job = await prisma.ingestionJob.create({
      data: {
        sourceName: file.name,
        status: 'running',
        startedAt: new Date(),
      },
    })

    const text = await file.text()
    const lines = text.split('\n').filter(l => l.trim())
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase())

    let rowCount = 0
    const errors: string[] = []

    if (dataType === 'prices') {
      // Expected: region_id, commodity_id, date, price, source
      for (let i = 1; i < lines.length; i++) {
        try {
          const cols = lines[i].split(',').map(c => c.trim())
          const regionId = parseInt(cols[headers.indexOf('region_id')])
          const commodityId = parseInt(cols[headers.indexOf('commodity_id')])
          const date = cols[headers.indexOf('date')] || cols[headers.indexOf('observation_date')]
          const price = parseFloat(cols[headers.indexOf('price')])
          const source = cols[headers.indexOf('source')] || 'csv_upload'

          if (isNaN(regionId) || isNaN(commodityId) || isNaN(price)) {
            errors.push(`Baris ${i + 1}: Data tidak valid`)
            continue
          }

          await prisma.priceObservation.create({
            data: {
              regionId,
              commodityId,
              observationDate: new Date(date),
              price,
              source,
            },
          })
          rowCount++
        } catch (e) {
          errors.push(`Baris ${i + 1}: ${String(e)}`)
        }
      }
    } else if (dataType === 'supply_demand') {
      for (let i = 1; i < lines.length; i++) {
        try {
          const cols = lines[i].split(',').map(c => c.trim())
          const regionId = parseInt(cols[headers.indexOf('region_id')])
          const commodityId = parseInt(cols[headers.indexOf('commodity_id')])
          const date = cols[headers.indexOf('date')] || cols[headers.indexOf('snapshot_date')]
          const supply = parseFloat(cols[headers.indexOf('supply')] || cols[headers.indexOf('estimated_supply')])
          const demand = parseFloat(cols[headers.indexOf('demand')] || cols[headers.indexOf('estimated_demand')])

          if (isNaN(regionId) || isNaN(commodityId) || isNaN(supply) || isNaN(demand)) {
            errors.push(`Baris ${i + 1}: Data tidak valid`)
            continue
          }

          const gap = supply - demand
          const status = gap > demand * 0.05 ? 'surplus' : gap < -demand * 0.05 ? 'deficit' : 'balanced'

          await prisma.supplyDemandSnapshot.create({
            data: {
              regionId,
              commodityId,
              snapshotDate: new Date(date),
              estimatedSupply: supply,
              estimatedDemand: demand,
              gap,
              status,
            },
          })
          rowCount++
        } catch (e) {
          errors.push(`Baris ${i + 1}: ${String(e)}`)
        }
      }
    }

    // Update job
    await prisma.ingestionJob.update({
      where: { id: job.id },
      data: {
        status: errors.length > 0 && rowCount === 0 ? 'failed' : 'completed',
        finishedAt: new Date(),
        rowCount,
        errorLog: errors.length > 0 ? errors.slice(0, 10).join('; ') : null,
      },
    })

    return NextResponse.json({
      success: true,
      jobId: job.id,
      rowCount,
      errors: errors.slice(0, 10),
      message: `Berhasil mengimpor ${rowCount} baris dari ${file.name}`,
    })
  } catch (error) {
    console.error('Upload CSV error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
