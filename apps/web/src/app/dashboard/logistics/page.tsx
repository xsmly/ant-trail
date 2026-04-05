'use client'

import { useEffect, useState, useCallback } from 'react'
import { formatNumber } from '@/lib/format'
import dynamic from 'next/dynamic'

const LogisticsMap = dynamic(() => import('@/components/maps/LogisticsMap'), { ssr: false })

interface RouteData {
  id: number
  sourceRegion: { id: number; name: string; latitude: number; longitude: number }
  destinationRegion: { id: number; name: string; latitude: number; longitude: number }
  commodity: string
  scores: { route: number; distance: number; capacity: number; urgency: number; final: number }
  reason: string
}

interface MapRegion {
  regionId: number
  cityRegency: string
  province: string
  latitude: number
  longitude: number
  status: string
  currentPrice: number
  riskLevel: string
}

export default function LogisticsPage() {
  const [routes, setRoutes] = useState<RouteData[]>([])
  const [mapData, setMapData] = useState<MapRegion[]>([])
  const [loading, setLoading] = useState(true)
  const [commodityId, setCommodityId] = useState('1')
  const [selectedRoute, setSelectedRoute] = useState<RouteData | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [routeRes, mapRes] = await Promise.all([
        fetch(`/api/logistics/routes?commodity_id=${commodityId}`),
        fetch(`/api/dashboard/map?commodity=${['Beras','Cabai Merah','Bawang Merah','Minyak Goreng','Gula'][parseInt(commodityId)-1]}`),
      ])
      if (routeRes.ok) setRoutes((await routeRes.json()).routes)
      if (mapRes.ok) setMapData((await mapRes.json()).regions)
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
          <h1 className="text-2xl font-bold text-slate-800">Smart Logistics</h1>
          <p className="text-sm text-slate-500 mt-1">Visualisasi peta & rekomendasi rute distribusi pangan</p>
        </div>
        <select value={commodityId} onChange={e => setCommodityId(e.target.value)} className="input-field w-48 text-sm">
          <option value="1">Beras</option>
          <option value="2">Cabai Merah</option>
          <option value="3">Bawang Merah</option>
          <option value="4">Minyak Goreng</option>
          <option value="5">Gula</option>
        </select>
      </div>

      {/* Map */}
      <div className="dashboard-card overflow-hidden" style={{ height: '450px' }}>
        {loading ? (
          <div className="h-full flex items-center justify-center text-slate-400">Memuat peta...</div>
        ) : (
          <LogisticsMap
            regions={mapData}
            routes={routes}
            selectedRoute={selectedRoute}
            onSelectRoute={setSelectedRoute}
          />
        )}
      </div>

      {/* Legend */}
      <div className="dashboard-card p-4">
        <div className="flex items-center gap-6 text-xs">
          <span className="font-medium text-slate-600">Legenda:</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-green-500" /> Surplus</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-red-500" /> Defisit</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-blue-500" /> Seimbang</span>
          <span className="flex items-center gap-1.5"><span className="w-6 h-0.5 bg-amber-500" /> Rute Rekomendasi</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Route List */}
        <div className="dashboard-card overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h3 className="font-semibold text-slate-800">Rute Rekomendasi</h3>
          </div>
          <div className="max-h-[400px] overflow-y-auto divide-y divide-slate-50">
            {routes.slice(0, 15).map((r) => (
              <div
                key={r.id}
                onClick={() => setSelectedRoute(r)}
                className={`px-5 py-3 cursor-pointer transition-colors ${
                  selectedRoute?.id === r.id ? 'bg-green-50 border-l-4 border-green-500' : 'hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-green-700">{r.sourceRegion.name.split(',')[0]}</span>
                  <span className="text-slate-400">→</span>
                  <span className="text-sm font-medium text-red-700">{r.destinationRegion.name.split(',')[0]}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-500">
                  <span>🌾 {r.commodity}</span>
                  <span>⭐ Skor: {(r.scores.final * 100).toFixed(0)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Route Detail */}
        <div className="dashboard-card p-5">
          {selectedRoute ? (
            <>
              <h3 className="font-semibold text-slate-800 mb-4">Detail Rute</h3>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex-1 text-center p-3 bg-green-50 rounded-lg">
                    <div className="text-xs text-green-600">Asal</div>
                    <div className="text-sm font-bold text-green-700">{selectedRoute.sourceRegion.name}</div>
                  </div>
                  <svg className="w-6 h-6 text-slate-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                  <div className="flex-1 text-center p-3 bg-red-50 rounded-lg">
                    <div className="text-xs text-red-600">Tujuan</div>
                    <div className="text-sm font-bold text-red-700">{selectedRoute.destinationRegion.name}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Skor Rute', value: selectedRoute.scores.route },
                    { label: 'Skor Jarak', value: selectedRoute.scores.distance },
                    { label: 'Skor Kapasitas', value: selectedRoute.scores.capacity },
                    { label: 'Skor Urgensi', value: selectedRoute.scores.urgency },
                  ].map((s, i) => (
                    <div key={i} className="bg-slate-50 rounded-lg p-3">
                      <div className="text-xs text-slate-500">{s.label}</div>
                      <div className="text-lg font-bold text-slate-700">{(s.value * 100).toFixed(0)}%</div>
                      <div className="mt-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div className="h-full bg-green-500 rounded-full" style={{ width: `${s.value * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                  <div className="text-xs font-semibold text-amber-800 mb-1">
                    Skor Final: {(selectedRoute.scores.final * 100).toFixed(0)}/100
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-slate-700 mb-2">Alasan Pemilihan Rute</h4>
                  <div className="bg-slate-50 rounded-lg p-4 text-sm text-slate-600 leading-relaxed">
                    {selectedRoute.reason}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-400 text-sm">
              Klik rute di daftar atau peta untuk melihat detail
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
