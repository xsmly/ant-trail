'use client'

import { useEffect, useState, useCallback } from 'react'
import { formatCurrency, formatPercent, riskBadge, riskColor } from '@/lib/format'
import dynamic from 'next/dynamic'

const ForecastChart = dynamic(() => import('@/components/charts/ForecastChart'), { ssr: false })

interface Signal {
  id: number
  region: string
  regionId: number
  commodity: string
  commodityId: number
  currentPrice: number
  forecastPrice: number
  riskLevel: string
  reason: string
  date: string
}

interface Forecast {
  regionId: number
  region: string
  commodityId: number
  forecast: Array<{ date: string; price: number; lower: number; upper: number }>
  riskLevel: string
  changePercent: number
  reason: string
  historicalPrices: Array<{ date: string; price: number }>
}

export default function InflationPage() {
  const [signals, setSignals] = useState<Signal[]>([])
  const [forecasts, setForecasts] = useState<Forecast[]>([])
  const [loading, setLoading] = useState(true)
  const [commodityId, setCommodityId] = useState('2') // Cabai merah (high volatility)
  const [selectedForecast, setSelectedForecast] = useState<Forecast | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/inflation/signals?commodity_id=${commodityId}`)
      if (res.ok) {
        const json = await res.json()
        setSignals(json.signals)
        setForecasts(json.forecasts)
        if (json.forecasts.length > 0) {
          setSelectedForecast(json.forecasts[0])
        }
      }
    } catch (err) {
      console.error('Failed to fetch:', err)
    }
    setLoading(false)
  }, [commodityId])

  useEffect(() => { fetchData() }, [fetchData])

  const highRisk = signals.filter(s => s.riskLevel === 'high')
  const mediumRisk = signals.filter(s => s.riskLevel === 'medium')
  const lowRisk = signals.filter(s => s.riskLevel === 'low')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Early Warning Inflasi</h1>
          <p className="text-sm text-slate-500 mt-1">Proyeksi kenaikan harga dan sinyal risiko 2-4 minggu ke depan</p>
        </div>
        <select value={commodityId} onChange={e => setCommodityId(e.target.value)} className="input-field w-48 text-sm">
          <option value="1">Beras</option>
          <option value="2">Cabai Merah</option>
          <option value="3">Bawang Merah</option>
          <option value="4">Minyak Goreng</option>
          <option value="5">Gula</option>
        </select>
      </div>

      {/* Risk Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="kpi-card border-l-4 border-red-500">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-red-600 mb-1">Risiko Tinggi</div>
              <div className="text-2xl font-bold text-red-700">{highRisk.length}</div>
              <div className="text-xs text-red-500 mt-1">wilayah</div>
            </div>
            <span className="text-3xl">🔴</span>
          </div>
        </div>
        <div className="kpi-card border-l-4 border-yellow-500">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-yellow-600 mb-1">Risiko Sedang</div>
              <div className="text-2xl font-bold text-yellow-700">{mediumRisk.length}</div>
              <div className="text-xs text-yellow-500 mt-1">wilayah</div>
            </div>
            <span className="text-3xl">🟡</span>
          </div>
        </div>
        <div className="kpi-card border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-green-600 mb-1">Risiko Rendah</div>
              <div className="text-2xl font-bold text-green-700">{lowRisk.length}</div>
              <div className="text-xs text-green-500 mt-1">wilayah</div>
            </div>
            <span className="text-3xl">🟢</span>
          </div>
        </div>
      </div>

      {/* Forecast Chart */}
      {selectedForecast && (
        <div className="dashboard-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-slate-800">
                Forecast Harga — {selectedForecast.region}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Proyeksi {selectedForecast.forecast.length} minggu ke depan dengan confidence band
              </p>
            </div>
            <div className={`badge border ${riskColor(selectedForecast.riskLevel)}`}>
              {riskBadge(selectedForecast.riskLevel)} · {formatPercent(selectedForecast.changePercent)}
            </div>
          </div>
          <ForecastChart
            historical={selectedForecast.historicalPrices}
            forecast={selectedForecast.forecast}
          />
          <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-200 text-sm text-amber-800">
            <strong>Analisis:</strong> {selectedForecast.reason}
          </div>
        </div>
      )}

      {/* Signals Table & Region Selector */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Region Forecast Selector */}
        <div className="dashboard-card overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h3 className="font-semibold text-slate-800">Forecast per Wilayah</h3>
          </div>
          <div className="max-h-[400px] overflow-y-auto divide-y divide-slate-50">
            {forecasts.map((f) => (
              <div
                key={f.regionId}
                onClick={() => setSelectedForecast(f)}
                className={`px-5 py-3 cursor-pointer transition-colors ${
                  selectedForecast?.regionId === f.regionId ? 'bg-green-50 border-l-4 border-green-500' : 'hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-slate-700">{f.region.split(',')[0]}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{formatPercent(f.changePercent)}</div>
                  </div>
                  <span className={`badge ${
                    f.riskLevel === 'high' ? 'badge-danger' : f.riskLevel === 'medium' ? 'badge-warning' : 'badge-safe'
                  }`}>
                    {f.riskLevel === 'high' ? '🔴' : f.riskLevel === 'medium' ? '🟡' : '🟢'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* All Signals Table */}
        <div className="lg:col-span-2 dashboard-card overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h3 className="font-semibold text-slate-800">Sinyal Inflasi</h3>
          </div>
          <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center text-slate-400">Memuat...</div>
            ) : (
              <table className="w-full">
                <thead className="sticky top-0">
                  <tr>
                    <th className="table-header">Wilayah</th>
                    <th className="table-header text-right">Harga Saat Ini</th>
                    <th className="table-header text-right">Proyeksi</th>
                    <th className="table-header text-center">Risiko</th>
                  </tr>
                </thead>
                <tbody>
                  {signals.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => {
                      const f = forecasts.find(fc => fc.regionId === s.regionId)
                      if (f) setSelectedForecast(f)
                    }}>
                      <td className="table-cell">
                        <div className="text-sm font-medium">{s.region.split(',')[0]}</div>
                      </td>
                      <td className="table-cell text-right text-sm">{formatCurrency(s.currentPrice)}</td>
                      <td className="table-cell text-right">
                        <span className="text-sm font-medium">{formatCurrency(s.forecastPrice)}</span>
                        <div className="text-xs text-red-500">
                          {formatPercent(((s.forecastPrice - s.currentPrice) / s.currentPrice) * 100)}
                        </div>
                      </td>
                      <td className="table-cell text-center">
                        <span className={`badge ${
                          s.riskLevel === 'high' ? 'badge-danger' : s.riskLevel === 'medium' ? 'badge-warning' : 'badge-safe'
                        }`}>
                          {riskBadge(s.riskLevel)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
