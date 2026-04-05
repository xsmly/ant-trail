'use client'

import { useEffect, useState } from 'react'
import { formatCurrency, formatNumber, riskBadge } from '@/lib/format'

interface DashboardData {
  kpi: {
    totalCommodities: number
    surplusRegions: number
    deficitRegions: number
    inflationAlerts: number
    logisticsRiskIndex: number
  }
  topAlerts: Array<{
    id: number
    region: string
    commodity: string
    riskLevel: string
    reason: string
    currentPrice: number
    forecastPrice: number
    date: string
  }>
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [commodity, setCommodity] = useState('')

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      try {
        const params = commodity ? `?commodity=${commodity}` : ''
        const res = await fetch(`/api/dashboard/summary${params}`)
        if (res.ok) {
          setData(await res.json())
        }
      } catch (err) {
        console.error('Failed to fetch dashboard:', err)
      }
      setLoading(false)
    }
    fetchData()
  }, [commodity])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-green-200 border-t-green-600 rounded-full animate-spin" />
          <span className="text-sm text-slate-500">Memuat dashboard...</span>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="text-center py-12 text-slate-500">
        Gagal memuat data dashboard
      </div>
    )
  }

  const kpis = [
    {
      label: 'Komoditas Dipantau',
      value: data.kpi.totalCommodities,
      format: (v: number) => formatNumber(v),
      icon: '🌾',
      color: 'from-emerald-500 to-green-600',
      bgColor: 'bg-emerald-50',
    },
    {
      label: 'Wilayah Surplus',
      value: data.kpi.surplusRegions,
      format: (v: number) => formatNumber(v),
      icon: '📈',
      color: 'from-green-500 to-emerald-600',
      bgColor: 'bg-green-50',
    },
    {
      label: 'Wilayah Defisit',
      value: data.kpi.deficitRegions,
      format: (v: number) => formatNumber(v),
      icon: '📉',
      color: 'from-red-500 to-rose-600',
      bgColor: 'bg-red-50',
    },
    {
      label: 'Alert Inflasi',
      value: data.kpi.inflationAlerts,
      format: (v: number) => formatNumber(v),
      icon: '⚠️',
      color: 'from-amber-500 to-yellow-600',
      bgColor: 'bg-amber-50',
    },
    {
      label: 'Indeks Risiko Logistik',
      value: data.kpi.logisticsRiskIndex,
      format: (v: number) => `${v}/100`,
      icon: '🚛',
      color: data.kpi.logisticsRiskIndex > 60 ? 'from-red-500 to-rose-600' : 'from-blue-500 to-indigo-600',
      bgColor: data.kpi.logisticsRiskIndex > 60 ? 'bg-red-50' : 'bg-blue-50',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Dashboard Nasional</h1>
          <p className="text-sm text-slate-500 mt-1">
            Ringkasan kondisi ketahanan pangan Indonesia
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={commodity}
            onChange={(e) => setCommodity(e.target.value)}
            className="input-field w-48 text-sm"
          >
            <option value="">Semua Komoditas</option>
            <option value="Beras">Beras</option>
            <option value="Cabai Merah">Cabai Merah</option>
            <option value="Bawang Merah">Bawang Merah</option>
            <option value="Minyak Goreng">Minyak Goreng</option>
            <option value="Gula">Gula</option>
          </select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {kpis.map((kpi, i) => (
          <div key={i} className="kpi-card">
            <div className="flex items-start justify-between mb-3">
              <span className={`w-10 h-10 ${kpi.bgColor} rounded-lg flex items-center justify-center text-lg`}>
                {kpi.icon}
              </span>
            </div>
            <div className="text-2xl font-bold text-slate-800">{kpi.format(kpi.value)}</div>
            <div className="text-xs text-slate-500 mt-1">{kpi.label}</div>
          </div>
        ))}
      </div>

      {/* Alerts Panel & Quick Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Alert Panel */}
        <div className="lg:col-span-2 dashboard-card">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-semibold text-slate-800 flex items-center gap-2">
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              Alert Terkini
            </h3>
            <a href="/dashboard/inflation" className="text-sm text-green-600 hover:text-green-700 font-medium">
              Lihat Semua →
            </a>
          </div>
          <div className="divide-y divide-slate-50">
            {data.topAlerts.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">
                Tidak ada alert aktif
              </div>
            ) : (
              data.topAlerts.map((alert) => (
                <div key={alert.id} className="px-5 py-3 hover:bg-slate-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`badge ${
                          alert.riskLevel === 'high' ? 'badge-danger' : 'badge-warning'
                        }`}>
                          {riskBadge(alert.riskLevel)}
                        </span>
                        <span className="text-sm font-medium text-slate-700">{alert.commodity}</span>
                        <span className="text-xs text-slate-400">·</span>
                        <span className="text-sm text-slate-500">{alert.region}</span>
                      </div>
                      <p className="text-xs text-slate-500 line-clamp-1">{alert.reason}</p>
                    </div>
                    <div className="text-right ml-4">
                      <div className="text-sm font-medium text-slate-700">{formatCurrency(alert.forecastPrice)}</div>
                      <div className="text-xs text-red-500">
                        dari {formatCurrency(alert.currentPrice)}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick Navigation */}
        <div className="dashboard-card p-5">
          <h3 className="font-semibold text-slate-800 mb-4">Akses Cepat</h3>
          <div className="space-y-3">
            {[
              { href: '/dashboard/prices', icon: '📊', label: 'Monitoring Harga', desc: 'Lihat tren harga komoditas' },
              { href: '/dashboard/matching', icon: '🔄', label: 'Matching S/D', desc: 'Rekomendasi distribusi' },
              { href: '/dashboard/logistics', icon: '🗺️', label: 'Peta Logistik', desc: 'Visualisasi rute pengiriman' },
              { href: '/dashboard/inflation', icon: '⚠️', label: 'Early Warning', desc: 'Prediksi risiko inflasi' },
              { href: '/dashboard/policies', icon: '📋', label: 'Kebijakan Daerah', desc: 'Katalog intervensi' },
            ].map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-green-50 transition-colors group border border-transparent hover:border-green-200"
              >
                <span className="text-xl">{item.icon}</span>
                <div>
                  <div className="text-sm font-medium text-slate-700 group-hover:text-green-700">{item.label}</div>
                  <div className="text-xs text-slate-400">{item.desc}</div>
                </div>
              </a>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100">
            <div className="text-xs text-slate-400 mb-2">Status Sistem</div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full" />
              <span className="text-xs text-slate-600">Database aktif · Data seed tersedia</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
