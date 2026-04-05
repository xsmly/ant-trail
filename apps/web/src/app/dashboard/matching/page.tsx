'use client'

import { useEffect, useState, useCallback } from 'react'
import { formatNumber, statusColor } from '@/lib/format'

interface MatchData {
  sourceRegion: string
  destinationRegion: string
  commodity: string
  distance: number
  surplus: number
  deficit: number
  scores: {
    supplyCapacityScore: number
    distanceScore: number
    urgencyScore: number
    priceStabilityScore: number
  }
  finalScore: number
  reason: string
}

interface SDData {
  summary: { total: number; surplus: number; deficit: number; balanced: number }
  data: Array<{
    id: number
    region: string
    commodity: string
    supply: number
    demand: number
    gap: number
    gapPercent: string
    status: string
  }>
}

export default function MatchingPage() {
  const [matches, setMatches] = useState<MatchData[]>([])
  const [sdData, setSdData] = useState<SDData | null>(null)
  const [loading, setLoading] = useState(true)
  const [commodityId, setCommodityId] = useState('1')
  const [selectedMatch, setSelectedMatch] = useState<MatchData | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [matchRes, sdRes] = await Promise.all([
        fetch(`/api/supply-demand/matches?commodity_id=${commodityId}`),
        fetch(`/api/supply-demand?commodity_id=${commodityId}`),
      ])
      if (matchRes.ok) {
        const matchJson = await matchRes.json()
        setMatches(matchJson.matches)
      }
      if (sdRes.ok) {
        setSdData(await sdRes.json())
      }
    } catch (err) {
      console.error('Failed to fetch:', err)
    }
    setLoading(false)
  }, [commodityId])

  useEffect(() => { fetchData() }, [fetchData])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Matching Demand-Supply</h1>
          <p className="text-sm text-slate-500 mt-1">Rekomendasi distribusi dari wilayah surplus ke wilayah defisit</p>
        </div>
        <select value={commodityId} onChange={e => setCommodityId(e.target.value)} className="input-field w-48 text-sm">
          <option value="1">Beras</option>
          <option value="2">Cabai Merah</option>
          <option value="3">Bawang Merah</option>
          <option value="4">Minyak Goreng</option>
          <option value="5">Gula</option>
        </select>
      </div>

      {/* Summary Cards */}
      {sdData && (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="kpi-card">
            <div className="text-xs text-slate-500 mb-1">Total Wilayah</div>
            <div className="text-xl font-bold">{sdData.summary.total}</div>
          </div>
          <div className="kpi-card border-l-4 border-green-500">
            <div className="text-xs text-green-600 mb-1">Surplus</div>
            <div className="text-xl font-bold text-green-700">{sdData.summary.surplus}</div>
          </div>
          <div className="kpi-card border-l-4 border-red-500">
            <div className="text-xs text-red-600 mb-1">Defisit</div>
            <div className="text-xl font-bold text-red-700">{sdData.summary.deficit}</div>
          </div>
          <div className="kpi-card border-l-4 border-blue-500">
            <div className="text-xs text-blue-600 mb-1">Seimbang</div>
            <div className="text-xl font-bold text-blue-700">{sdData.summary.balanced}</div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Supply-Demand Table */}
        <div className="dashboard-card overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h3 className="font-semibold text-slate-800">Status Wilayah</h3>
          </div>
          <div className="max-h-[500px] overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center text-slate-400">Memuat...</div>
            ) : (
              <table className="w-full">
                <thead className="sticky top-0">
                  <tr>
                    <th className="table-header">Wilayah</th>
                    <th className="table-header text-right">Gap</th>
                    <th className="table-header text-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {sdData?.data.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="table-cell text-sm">{item.region.split(',')[0]}</td>
                      <td className="table-cell text-right text-sm font-medium">
                        {formatNumber(item.gap)} <span className="text-xs text-slate-400">({item.gapPercent}%)</span>
                      </td>
                      <td className="table-cell text-center">
                        <span className={`badge ${statusColor(item.status)}`}>
                          {item.status === 'surplus' ? '↑ Surplus' : item.status === 'deficit' ? '↓ Defisit' : '= Seimbang'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Matching Recommendations */}
        <div className="lg:col-span-2 dashboard-card overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-semibold text-slate-800">Rekomendasi Distribusi</h3>
            <span className="text-xs text-slate-500">{matches.length} rute</span>
          </div>
          <div className="max-h-[500px] overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center text-slate-400">Memuat rekomendasi...</div>
            ) : matches.length === 0 ? (
              <div className="p-8 text-center text-slate-400">Tidak ada rekomendasi matching</div>
            ) : (
              <div className="divide-y divide-slate-50">
                {matches.slice(0, 20).map((m, i) => (
                  <div
                    key={i}
                    className="px-5 py-3 hover:bg-slate-50 cursor-pointer transition-colors"
                    onClick={() => setSelectedMatch(m)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded">
                          {m.sourceRegion.split(',')[0]}
                        </span>
                        <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                        </svg>
                        <span className="text-sm font-medium text-red-700 bg-red-50 px-2 py-0.5 rounded">
                          {m.destinationRegion.split(',')[0]}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                          m.finalScore >= 0.7 ? 'bg-green-100 text-green-700' :
                          m.finalScore >= 0.4 ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {(m.finalScore * 100).toFixed(0)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      <span>📏 {formatNumber(m.distance)} km</span>
                      <span>📦 Surplus: {formatNumber(m.surplus)} ton</span>
                      <span>📉 Defisit: {formatNumber(m.deficit)} ton</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Selected Match Detail */}
      {selectedMatch && (
        <div className="dashboard-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-800">Detail Rekomendasi</h3>
            <button onClick={() => setSelectedMatch(null)} className="text-slate-400 hover:text-slate-600">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="text-center">
                  <div className="text-sm font-bold text-green-700">{selectedMatch.sourceRegion}</div>
                  <div className="text-xs text-green-500">Supplier (Surplus)</div>
                </div>
                <div className="flex-1 border-t-2 border-dashed border-slate-300 relative">
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-2 text-xs text-slate-500">
                    {formatNumber(selectedMatch.distance)} km
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-sm font-bold text-red-700">{selectedMatch.destinationRegion}</div>
                  <div className="text-xs text-red-500">Penerima (Defisit)</div>
                </div>
              </div>

              <div className="space-y-3">
                {[
                  { label: 'Kapasitas Supply', score: selectedMatch.scores.supplyCapacityScore, weight: '35%' },
                  { label: 'Kedekatan Jarak', score: selectedMatch.scores.distanceScore, weight: '25%' },
                  { label: 'Urgensi', score: selectedMatch.scores.urgencyScore, weight: '20%' },
                  { label: 'Stabilitas Harga', score: selectedMatch.scores.priceStabilityScore, weight: '20%' },
                ].map((s, i) => (
                  <div key={i}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-slate-600">{s.label} <span className="text-slate-400">({s.weight})</span></span>
                      <span className="font-medium">{(s.score * 100).toFixed(0)}%</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${s.score >= 0.7 ? 'bg-green-500' : s.score >= 0.4 ? 'bg-yellow-500' : 'bg-red-500'}`}
                        style={{ width: `${s.score * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
                <div className="text-xs font-semibold text-green-800 mb-1">Skor Final: {(selectedMatch.finalScore * 100).toFixed(0)}/100</div>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-slate-700 mb-2">Alasan Rekomendasi</h4>
              <div className="bg-slate-50 rounded-lg p-4 text-sm text-slate-600 leading-relaxed">
                {selectedMatch.reason}
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="bg-green-50 rounded-lg p-3">
                  <div className="text-xs text-green-600">Volume Surplus</div>
                  <div className="text-lg font-bold text-green-700">{formatNumber(selectedMatch.surplus)} ton</div>
                </div>
                <div className="bg-red-50 rounded-lg p-3">
                  <div className="text-xs text-red-600">Volume Defisit</div>
                  <div className="text-lg font-bold text-red-700">{formatNumber(selectedMatch.deficit)} ton</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
