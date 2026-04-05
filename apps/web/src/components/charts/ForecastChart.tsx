'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, ComposedChart, ReferenceLine } from 'recharts'

interface ForecastChartProps {
  historical: Array<{ date: string; price: number }>
  forecast: Array<{ date: string; price: number; lower: number; upper: number }>
}

function formatRupiah(value: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(value)
}

function formatDateShort(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('id-ID', { month: 'short', day: 'numeric' })
}

export default function ForecastChart({ historical, forecast }: ForecastChartProps) {
  // Merge historical and forecast into one dataset
  const histData = historical.map(h => ({
    date: h.date,
    actual: h.price,
    forecast: null as number | null,
    upper: null as number | null,
    lower: null as number | null,
  }))

  // Add last historical point to forecast for continuity
  const lastHistorical = historical[historical.length - 1]
  const forecastData = forecast.map(f => ({
    date: f.date,
    actual: null as number | null,
    forecast: f.price,
    upper: f.upper,
    lower: f.lower,
  }))

  // Bridge point
  if (lastHistorical) {
    forecastData.unshift({
      date: lastHistorical.date,
      actual: null,
      forecast: lastHistorical.price,
      upper: lastHistorical.price,
      lower: lastHistorical.price,
    })
  }

  const allData = [...histData, ...forecastData]

  const dividerDate = lastHistorical?.date

  return (
    <ResponsiveContainer width="100%" height={300}>
      <ComposedChart data={allData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis
          dataKey="date"
          tickFormatter={formatDateShort}
          tick={{ fontSize: 11, fill: '#94a3b8' }}
          tickLine={false}
          interval={Math.max(Math.floor(allData.length / 8), 1)}
        />
        <YAxis
          tickFormatter={(v) => `${(v/1000).toFixed(0)}rb`}
          tick={{ fontSize: 11, fill: '#94a3b8' }}
          tickLine={false}
          axisLine={false}
          width={60}
        />
        <Tooltip
          formatter={(value: unknown, name: string) => {
            const v = value as number | null
            if (v === null || v === undefined) return ['-', name]
            const labels: Record<string, string> = {
              actual: 'Harga Aktual',
              forecast: 'Proyeksi',
              upper: 'Batas Atas',
              lower: 'Batas Bawah',
            }
            return [formatRupiah(v), labels[name] || name]
          }}
          labelFormatter={(label) => formatDateShort(label)}
          contentStyle={{
            backgroundColor: 'white',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            fontSize: '12px',
          }}
        />
        {dividerDate && (
          <ReferenceLine
            x={dividerDate}
            stroke="#94a3b8"
            strokeDasharray="4 4"
            label={{ value: 'Forecast →', position: 'top', fontSize: 10, fill: '#94a3b8' }}
          />
        )}
        <Area type="monotone" dataKey="upper" fill="#fef3c7" stroke="none" fillOpacity={0.5} />
        <Area type="monotone" dataKey="lower" fill="white" stroke="none" fillOpacity={1} />
        <Line
          type="monotone"
          dataKey="actual"
          stroke="#16a34a"
          strokeWidth={2}
          dot={false}
          connectNulls={false}
        />
        <Line
          type="monotone"
          dataKey="forecast"
          stroke="#f59e0b"
          strokeWidth={2}
          strokeDasharray="6 3"
          dot={{ r: 3, fill: '#f59e0b' }}
          connectNulls={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  )
}
