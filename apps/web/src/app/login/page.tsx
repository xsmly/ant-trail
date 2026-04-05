'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const demoAccounts = [
  { email: 'admin@anttrail.id', role: 'Super Admin', desc: 'Akses penuh semua fitur' },
  { email: 'analyst@anttrail.id', role: 'Analis', desc: 'Analisis & monitoring' },
  { email: 'pemda.jakarta@anttrail.id', role: 'Pemda Viewer', desc: 'Data wilayah Jakarta' },
]

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Login gagal')
        return
      }

      // Full page redirect to ensure the new cookie is read by server components
      window.location.href = '/dashboard'
    } catch {
      setError('Gagal terhubung ke server')
    } finally {
      setLoading(false)
    }
  }

  function fillDemo(demoEmail: string) {
    setEmail(demoEmail)
    setPassword('demo123')
    setError('')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 flex">
      {/* Left panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-green-700 via-green-800 to-emerald-900 text-white p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <svg className="w-full h-full" viewBox="0 0 800 600">
            {/* Stylized ant trail paths */}
            <path d="M0,300 Q200,100 400,300 T800,300" fill="none" stroke="white" strokeWidth="2" strokeDasharray="8,4" />
            <path d="M0,200 Q200,400 400,200 T800,200" fill="none" stroke="white" strokeWidth="1.5" strokeDasharray="6,3" />
            <path d="M0,400 Q200,200 400,400 T800,400" fill="none" stroke="white" strokeWidth="1" strokeDasharray="4,2" />
            {/* Dots representing regions */}
            {[
              [150, 250], [300, 180], [450, 320], [600, 220], [200, 380],
              [500, 150], [350, 420], [650, 350], [100, 150], [550, 280],
            ].map(([x, y], i) => (
              <circle key={i} cx={x} cy={y} r={4 + (i % 3)} fill="white" opacity={0.3 + (i % 4) * 0.1} />
            ))}
          </svg>
        </div>

        <div className="relative">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Ant Trail</h1>
          </div>
          <p className="text-green-200 text-sm mt-1">Platform Ketahanan Pangan Indonesia</p>
        </div>

        <div className="relative space-y-8">
          <div>
            <h2 className="text-3xl font-bold leading-tight mb-4">
              Dashboard Keputusan<br />
              <span className="text-green-300">Ketahanan Pangan</span>
            </h2>
            <p className="text-green-200 leading-relaxed max-w-md">
              Membaca pola harga pangan, mismatch supply-demand antarwilayah,
              risiko inflasi, dan rekomendasi distribusi lintas daerah di Indonesia.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 max-w-md">
            {[
              { icon: '📊', label: 'Monitoring Harga', desc: '15 wilayah, 5 komoditas' },
              { icon: '🔄', label: 'Matching S/D', desc: 'Surplus ↔ Defisit' },
              { icon: '⚠️', label: 'Early Warning', desc: 'Prediksi inflasi 4 minggu' },
              { icon: '🚛', label: 'Smart Logistics', desc: 'Rekomendasi rute optimal' },
            ].map((f, i) => (
              <div key={i} className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
                <div className="text-lg mb-1">{f.icon}</div>
                <div className="text-sm font-semibold">{f.label}</div>
                <div className="text-xs text-green-300">{f.desc}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative text-green-400 text-xs">
          © 2026 Ant Trail — Prototype Dashboard Ketahanan Pangan
        </div>
      </div>

      {/* Right panel - Login form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Mobile branding */}
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center text-white">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                </svg>
              </div>
              <h1 className="text-xl font-bold text-green-800">Ant Trail</h1>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8">
            <h2 className="text-2xl font-bold text-slate-800 mb-1">Masuk</h2>
            <p className="text-slate-500 text-sm mb-6">Masuk ke dashboard ketahanan pangan</p>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field"
                  placeholder="email@anttrail.id"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field"
                  placeholder="••••••••"
                  required
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full py-2.5 text-sm flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Memproses...
                  </>
                ) : 'Masuk'}
              </button>
            </form>
          </div>

          {/* Demo accounts */}
          <div className="mt-6 bg-white/80 backdrop-blur rounded-xl border border-slate-200 p-5">
            <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <span className="w-5 h-5 bg-amber-100 rounded flex items-center justify-center text-xs">🔑</span>
              Akun Demo
            </h3>
            <div className="space-y-2">
              {demoAccounts.map((acc) => (
                <button
                  key={acc.email}
                  onClick={() => fillDemo(acc.email)}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-green-50 transition-colors border border-transparent hover:border-green-200 group"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-slate-700 group-hover:text-green-700">
                        {acc.email}
                      </div>
                      <div className="text-xs text-slate-500">
                        {acc.role} — {acc.desc}
                      </div>
                    </div>
                    <svg className="w-4 h-4 text-slate-400 group-hover:text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-400 mt-3">Password: <code className="bg-slate-100 px-1.5 py-0.5 rounded">demo123</code></p>
          </div>
        </div>
      </div>
    </div>
  )
}
