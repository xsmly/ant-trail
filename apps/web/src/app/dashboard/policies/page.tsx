'use client'

import { useEffect, useState, useCallback } from 'react'

interface Policy {
  id: number
  region: string
  regionId: number
  title: string
  category: string
  categoryLabel: string
  summary: string
  effectivenessScore: number
  tags: string[]
  createdAt: string
}

const categoryIcons: Record<string, string> = {
  operasi_pasar: '🏪',
  subsidi_distribusi: '🚛',
  monitoring_stok: '📊',
  kerja_sama: '🤝',
}

const categoryColors: Record<string, string> = {
  operasi_pasar: 'bg-blue-100 text-blue-700',
  subsidi_distribusi: 'bg-purple-100 text-purple-700',
  monitoring_stok: 'bg-emerald-100 text-emerald-700',
  kerja_sama: 'bg-amber-100 text-amber-700',
}

export default function PoliciesPage() {
  const [policies, setPolicies] = useState<Policy[]>([])
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState('')
  const [search, setSearch] = useState('')
  const [selectedPolicy, setSelectedPolicy] = useState<Policy | null>(null)
  const [categories, setCategories] = useState<Record<string, number>>({})

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (category) params.set('category', category)
      if (search) params.set('search', search)

      const res = await fetch(`/api/policies?${params}`)
      if (res.ok) {
        const json = await res.json()
        setPolicies(json.data)
        setCategories(json.categories)
      }
    } catch (err) {
      console.error('Failed to fetch:', err)
    }
    setLoading(false)
  }, [category, search])

  useEffect(() => { fetchData() }, [fetchData])

  function effectivenessColor(score: number): string {
    if (score >= 80) return 'text-green-700 bg-green-50'
    if (score >= 60) return 'text-yellow-700 bg-yellow-50'
    return 'text-red-700 bg-red-50'
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Kebijakan Daerah</h1>
        <p className="text-sm text-slate-500 mt-1">Katalog intervensi kebijakan pangan dan pembelajaran antardaerah</p>
      </div>

      {/* Category Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { key: 'operasi_pasar', label: 'Operasi Pasar', icon: '🏪' },
          { key: 'subsidi_distribusi', label: 'Subsidi Distribusi', icon: '🚛' },
          { key: 'monitoring_stok', label: 'Monitoring Stok', icon: '📊' },
          { key: 'kerja_sama', label: 'Kerja Sama', icon: '🤝' },
        ].map(c => (
          <button
            key={c.key}
            onClick={() => setCategory(category === c.key ? '' : c.key)}
            className={`kpi-card text-left transition-all ${
              category === c.key ? 'ring-2 ring-green-500 bg-green-50' : ''
            }`}
          >
            <div className="text-xl mb-2">{c.icon}</div>
            <div className="text-lg font-bold text-slate-800">{categories[c.key] || 0}</div>
            <div className="text-xs text-slate-500">{c.label}</div>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="dashboard-card p-4">
        <div className="flex gap-3">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cari kebijakan, daerah, tag..."
            className="input-field flex-1 text-sm"
          />
          {category && (
            <button onClick={() => setCategory('')} className="btn-secondary text-sm">
              Reset Filter
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Policy List */}
        <div className="dashboard-card overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-semibold text-slate-800">Daftar Kebijakan</h3>
            <span className="text-xs text-slate-500">{policies.length} kebijakan</span>
          </div>
          <div className="max-h-[600px] overflow-y-auto divide-y divide-slate-50">
            {loading ? (
              <div className="p-8 text-center text-slate-400">Memuat...</div>
            ) : policies.length === 0 ? (
              <div className="p-8 text-center text-slate-400">Tidak ada kebijakan ditemukan</div>
            ) : (
              policies.map((p) => (
                <div
                  key={p.id}
                  onClick={() => setSelectedPolicy(p)}
                  className={`px-5 py-4 cursor-pointer transition-colors ${
                    selectedPolicy?.id === p.id ? 'bg-green-50 border-l-4 border-green-500' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-slate-800 line-clamp-1">{p.title}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{p.region}</div>
                    </div>
                    <div className={`ml-3 px-2 py-1 rounded text-xs font-bold ${effectivenessColor(p.effectivenessScore)}`}>
                      {p.effectivenessScore}%
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`badge text-xs ${categoryColors[p.category] || 'bg-gray-100 text-gray-700'}`}>
                      {categoryIcons[p.category]} {p.categoryLabel}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Policy Detail */}
        <div className="dashboard-card p-6">
          {selectedPolicy ? (
            <div className="space-y-5">
              <div>
                <span className={`badge text-xs ${categoryColors[selectedPolicy.category] || 'bg-gray-100 text-gray-700'}`}>
                  {categoryIcons[selectedPolicy.category]} {selectedPolicy.categoryLabel}
                </span>
                <h3 className="text-lg font-bold text-slate-800 mt-2">{selectedPolicy.title}</h3>
                <p className="text-sm text-slate-500 mt-1">📍 {selectedPolicy.region}</p>
              </div>

              {/* Effectiveness */}
              <div>
                <div className="text-sm font-medium text-slate-600 mb-2">Skor Efektivitas</div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        selectedPolicy.effectivenessScore >= 80 ? 'bg-green-500' :
                        selectedPolicy.effectivenessScore >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${selectedPolicy.effectivenessScore}%` }}
                    />
                  </div>
                  <span className="text-sm font-bold text-slate-700">{selectedPolicy.effectivenessScore}%</span>
                </div>
              </div>

              {/* Summary */}
              <div>
                <div className="text-sm font-medium text-slate-600 mb-2">Ringkasan</div>
                <div className="bg-slate-50 rounded-lg p-4 text-sm text-slate-600 leading-relaxed">
                  {selectedPolicy.summary}
                </div>
              </div>

              {/* Tags */}
              <div>
                <div className="text-sm font-medium text-slate-600 mb-2">Tag</div>
                <div className="flex flex-wrap gap-2">
                  {selectedPolicy.tags.map((tag, i) => (
                    <span key={i} className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full text-xs">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Comparable regions hint */}
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="text-xs font-semibold text-blue-800 mb-1">💡 Pembelajaran</div>
                <p className="text-xs text-blue-600">
                  Kebijakan ini bisa menjadi referensi untuk daerah lain dengan kondisi serupa.
                  Skor efektivitas {selectedPolicy.effectivenessScore}% menunjukkan
                  {selectedPolicy.effectivenessScore >= 80 ? ' dampak sangat baik' :
                   selectedPolicy.effectivenessScore >= 60 ? ' dampak cukup baik' : ' perlu evaluasi lebih lanjut'}.
                </p>
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-400 text-sm min-h-[300px]">
              Pilih kebijakan untuk melihat detail
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
