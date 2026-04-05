'use client'

import { useEffect, useState, useCallback } from 'react'
import { formatCurrency, formatPercent, formatDate } from '@/lib/format'
import dynamic from 'next/dynamic'

const PriceChart = dynamic(() => import('@/components/charts/PriceChart'), { ssr: false })

interface PriceData {
  id: number
  region: string
  province: string
  regionId: number
  commodity: string
  commodityId: number
  date: string
  price: number
  wow: number | null
  mom: number | null
}

export default function PricesPage() {
  const [data, setData] = useState<PriceData[]>([])
  const [loading, setLoading] = useState(true)
  const [commodityId, setCommodityId] = useState('1')
  const [regionId, setRegionId] = useState('')
  const [dateFrom, setDateFrom] = useState('2025-12-01')
  const [dateTo, setDateTo] = useState('2026-04-05')
  const [search, setSearch] = useState('')

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (commodityId) params.set('commodity_id', commodityId)
      if (regionId) params.set('region_id', regionId)
      if (dateFrom) params.set('from', dateFrom)
      if (dateTo) params.set('to', dateTo)
      params.set('limit', '500')

      const res = await fetch(`/api/prices?${params}`)
      if (res.ok) {
        const json = await res.json()
        setData(json.data)
      }
    } catch (err) {
      console.error('Failed to fetch prices:', err)
    }
    setLoading(false)
  }, [commodityId, regionId, dateFrom, dateTo])

  useEffect(() => { fetchData() }, [fetchData])

  const filteredData = search
    ? data.filter(d =>
        d.region.toLowerCase().includes(search.toLowerCase()) ||
        d.commodity.toLowerCase().includes(search.toLowerCase())
      )
    : data

  // Prepare chart data - aggregate by date for chart
  const chartData = data.reduce((acc, d) => {
    const dateStr = new Date(d.date).toISOString().split('T')[0]
    if (!acc[dateStr]) acc[dateStr] = { date: dateStr, prices: [] }
    acc[dateStr].prices.push(d.price)
    return acc
  }, {} as Record<string, { date: string; prices: number[] }>)

  const chartSeries = Object.values(chartData)
    .map(d => ({
      date: d.date,
      avg: Math.round(d.prices.reduce((a, b) => a + b, 0) / d.prices.length),
      min: Math.min(...d.prices),
      max: Math.max(...d.prices),
    }))
    .sort((a, b) => a.date.localeCompare(b.date))

  const regions = [
    { id: '', label: 'Semua Wilayah' },
    { id: '1', label: 'Jakarta Pusat' },
    { id: '2', label: 'Bandung' },
    { id: '3', label: 'Semarang' },
    { id: '4', label: 'Surabaya' },
    { id: '5', label: 'Yogyakarta' },
    { id: '6', label: 'Serang' },
    { id: '7', label: 'Medan' },
    { id: '8', label: 'Palembang' },
    { id: '9', label: 'Bandar Lampung' },
    { id: '10', label: 'Banjarmasin' },
    { id: '11', label: 'Samarinda' },
    { id: '12', label: 'Makassar' },
    { id: '13', label: 'Denpasar' },
    { id: '14', label: 'Mataram' },
    { id: '15', label: 'Jayapura' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Monitoring Harga</h1>
        <p className="text-sm text-slate-500 mt-1">Pantau harga komoditas pangan per wilayah</p>
      </div>

      {/* Filters */}
      <div className="dashboard-card p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Komoditas</label>
            <select value={commodityId} onChange={e => setCommodityId(e.target.value)} className="input-field text-sm">
              <option value="1">Beras</option>
              <option value="2">Cabai Merah</option>
              <option value="3">Bawang Merah</option>
              <option value="4">Minyak Goreng</option>
              <option value="5">Gula</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Wilayah</label>
            <select value={regionId} onChange={e => setRegionId(e.target.value)} className="input-field text-sm">
              {regions.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Dari Tanggal</label>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="input-field text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Sampai Tanggal</label>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="input-field text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Cari</label>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Cari wilayah..."
              className="input-field text-sm"
            />
          </div>
        </div>
      </div>

      {/* Chart */}
      {chartSeries.length > 0 && (
        <div className="dashboard-card p-5">
          <h3 className="font-semibold text-slate-800 mb-4">Tren Harga (Rata-rata, Min, Max)</h3>
          <PriceChart data={chartSeries} />
        </div>
      )}

      {/* Table */}
      <div className="dashboard-card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-semibold text-slate-800">Data Harga</h3>
          <span className="text-xs text-slate-500">{filteredData.length} data</span>
        </div>
        <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
          {loading ? (
            <div className="p-8 text-center text-slate-400">Memuat data...</div>
          ) : (
            <table className="w-full">
              <thead className="sticky top-0 z-10">
                <tr>
                  <th className="table-header">Tanggal</th>
                  <th className="table-header">Wilayah</th>
                  <th className="table-header">Komoditas</th>
                  <th className="table-header text-right">Harga</th>
                  <th className="table-header text-right">WoW</th>
                  <th className="table-header text-right">MoM</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.slice(0, 100).map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="table-cell text-xs">{formatDate(item.date)}</td>
                    <td className="table-cell">
                      <div className="text-sm font-medium">{item.region}</div>
                      <div className="text-xs text-slate-400">{item.province}</div>
                    </td>
                    <td className="table-cell">{item.commodity}</td>
                    <td className="table-cell text-right font-medium">{formatCurrency(item.price)}</td>
                    <td className="table-cell text-right">
                      {item.wow !== null ? (
                        <span className={item.wow > 0 ? 'text-red-600' : item.wow < 0 ? 'text-green-600' : 'text-slate-500'}>
                          {formatPercent(item.wow)}
                        </span>
                      ) : <span className="text-slate-300">-</span>}
                    </td>
                    <td className="table-cell text-right">
                      {item.mom !== null ? (
                        <span className={item.mom > 0 ? 'text-red-600' : item.mom < 0 ? 'text-green-600' : 'text-slate-500'}>
                          {formatPercent(item.mom)}
                        </span>
                      ) : <span className="text-slate-300">-</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
