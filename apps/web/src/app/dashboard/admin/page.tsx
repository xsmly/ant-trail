'use client'

import { useEffect, useState, useCallback } from 'react'
import { formatDateTime } from '@/lib/format'

interface IngestionJob {
  id: number
  sourceName: string
  status: string
  startedAt: string
  finishedAt: string | null
  rowCount: number
  errorLog: string | null
  duration: number | null
}

export default function AdminPage() {
  const [jobs, setJobs] = useState<IngestionJob[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [running, setRunning] = useState(false)
  const [message, setMessage] = useState('')
  const [uploadType, setUploadType] = useState('prices')

  const fetchJobs = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/ingestion-jobs')
      if (res.ok) {
        const json = await res.json()
        setJobs(json.jobs)
      }
    } catch (err) {
      console.error('Failed to fetch jobs:', err)
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchJobs() }, [fetchJobs])

  async function handleUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setUploading(true)
    setMessage('')

    const formData = new FormData(e.currentTarget)
    formData.set('type', uploadType)

    try {
      const res = await fetch('/api/admin/upload-csv', {
        method: 'POST',
        body: formData,
      })
      const json = await res.json()
      if (res.ok) {
        setMessage(`✅ ${json.message}`)
        fetchJobs()
      } else {
        setMessage(`❌ ${json.error}`)
      }
    } catch {
      setMessage('❌ Gagal mengupload file')
    }
    setUploading(false)
  }

  async function handleRunETL() {
    setRunning(true)
    setMessage('')

    try {
      const res = await fetch('/api/admin/run-etl', { method: 'POST' })
      const json = await res.json()
      if (res.ok) {
        setMessage(`✅ ${json.message}`)
        fetchJobs()
      } else {
        setMessage(`❌ ${json.error}`)
      }
    } catch {
      setMessage('❌ Gagal menjalankan ETL')
    }
    setRunning(false)
  }

  async function handleRecompute() {
    setRunning(true)
    setMessage('')

    try {
      const res = await fetch('/api/inflation/recompute', { method: 'POST' })
      const json = await res.json()
      if (res.ok) {
        setMessage(`✅ ${json.message}`)
      } else {
        setMessage(`❌ ${json.error}`)
      }
    } catch {
      setMessage('❌ Gagal recompute')
    }
    setRunning(false)
  }

  const statusColors: Record<string, string> = {
    completed: 'bg-green-100 text-green-700',
    running: 'bg-blue-100 text-blue-700',
    pending: 'bg-yellow-100 text-yellow-700',
    failed: 'bg-red-100 text-red-700',
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Admin & Ingestion</h1>
        <p className="text-sm text-slate-500 mt-1">Upload data CSV, jalankan ETL, dan monitor status ingestion</p>
      </div>

      {message && (
        <div className={`p-4 rounded-lg border text-sm ${
          message.startsWith('✅') ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'
        }`}>
          {message}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upload CSV */}
        <div className="dashboard-card p-6">
          <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            Upload CSV
          </h3>

          <form onSubmit={handleUpload} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Tipe Data</label>
              <select value={uploadType} onChange={e => setUploadType(e.target.value)} className="input-field text-sm">
                <option value="prices">Harga Pangan</option>
                <option value="supply_demand">Supply-Demand</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">File CSV</label>
              <input
                type="file"
                name="file"
                accept=".csv"
                className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
                required
              />
            </div>

            <div className="bg-slate-50 rounded-lg p-3 text-xs text-slate-500">
              <div className="font-medium mb-1">Format CSV yang diterima:</div>
              {uploadType === 'prices' ? (
                <code>region_id, commodity_id, date, price, source</code>
              ) : (
                <code>region_id, commodity_id, date, supply, demand</code>
              )}
            </div>

            <button type="submit" disabled={uploading} className="btn-primary w-full text-sm">
              {uploading ? 'Mengupload...' : 'Upload & Proses'}
            </button>
          </form>
        </div>

        {/* Actions */}
        <div className="dashboard-card p-6">
          <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Aksi
          </h3>

          <div className="space-y-4">
            <div className="p-4 bg-slate-50 rounded-lg">
              <div className="text-sm font-medium text-slate-700 mb-1">Refresh Analytics (ETL)</div>
              <p className="text-xs text-slate-500 mb-3">
                Menghitung ulang semua sinyal inflasi, rute logistik, dan skor matching berdasarkan data terbaru.
              </p>
              <button onClick={handleRunETL} disabled={running} className="btn-primary text-sm">
                {running ? 'Memproses...' : '🔄 Jalankan ETL'}
              </button>
            </div>

            <div className="p-4 bg-slate-50 rounded-lg">
              <div className="text-sm font-medium text-slate-700 mb-1">Recompute Sinyal Inflasi</div>
              <p className="text-xs text-slate-500 mb-3">
                Hitung ulang forecast harga dan label risiko untuk semua wilayah dan komoditas.
              </p>
              <button onClick={handleRecompute} disabled={running} className="btn-secondary text-sm">
                {running ? 'Memproses...' : '⚠️ Recompute Inflasi'}
              </button>
            </div>

            <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
              <div className="text-xs font-medium text-amber-800 mb-1">💡 Tips</div>
              <p className="text-xs text-amber-600">
                Setelah upload data baru, jalankan ETL untuk memperbarui semua perhitungan analytics.
                Proses ini membutuhkan waktu beberapa detik.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Ingestion History */}
      <div className="dashboard-card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-semibold text-slate-800">Riwayat Ingestion</h3>
          <button onClick={fetchJobs} className="text-sm text-green-600 hover:text-green-700 font-medium">
            Refresh
          </button>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center text-slate-400">Memuat...</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr>
                  <th className="table-header">ID</th>
                  <th className="table-header">Sumber</th>
                  <th className="table-header text-center">Status</th>
                  <th className="table-header text-right">Baris</th>
                  <th className="table-header">Mulai</th>
                  <th className="table-header">Durasi</th>
                  <th className="table-header">Error</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job) => (
                  <tr key={job.id} className="hover:bg-slate-50">
                    <td className="table-cell text-xs font-mono">#{job.id}</td>
                    <td className="table-cell text-sm font-medium">{job.sourceName}</td>
                    <td className="table-cell text-center">
                      <span className={`badge ${statusColors[job.status] || 'bg-gray-100 text-gray-700'}`}>
                        {job.status}
                      </span>
                    </td>
                    <td className="table-cell text-right text-sm">{job.rowCount.toLocaleString('id-ID')}</td>
                    <td className="table-cell text-xs">{formatDateTime(job.startedAt)}</td>
                    <td className="table-cell text-xs">
                      {job.duration !== null ? `${job.duration}s` : '-'}
                    </td>
                    <td className="table-cell text-xs text-red-500 max-w-[200px] truncate">
                      {job.errorLog || '-'}
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
