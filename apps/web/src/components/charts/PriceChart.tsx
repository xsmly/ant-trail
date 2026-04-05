'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, ComposedChart } from 'recharts'

interface PriceChartProps {
  data: Array<{
    date: string
    avg: number
    min: number
    max: number
  }>
}

function formatRupiah(value: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

function formatDateShort(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('id-ID', { month: 'short', day: 'numeric' })
}

export default function PriceChart({ data }: PriceChartProps) {
  return (
    <ResponsiveContainer width="100%" height={350}>
      <ComposedChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis
          dataKey="date"
          tickFormatter={formatDateShort}
          tick={{ fontSize: 11, fill: '#94a3b8' }}
          tickLine={false}
          axisLine={{ stroke: '#e2e8f0' }}
          interval={Math.max(Math.floor(data.length / 10), 1)}
        />
        <YAxis
          tickFormatter={(v) => `${(v/1000).toFixed(0)}rb`}
          tick={{ fontSize: 11, fill: '#94a3b8' }}
          tickLine={false}
          axisLine={false}
          width={60}
        />
        <Tooltip
          formatter={(value: number, name: string) => [formatRupiah(value), name === 'avg' ? 'Rata-rata' : name === 'min' ? 'Minimum' : 'Maksimum']}
          labelFormatter={(label) => `Tanggal: ${formatDateShort(label)}`}
          contentStyle={{
            backgroundColor: 'white',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            fontSize: '12px',
          }}
        />
        <Area
          type="monotone"
          dataKey="max"
          fill="#dcfce7"
          stroke="none"
          fillOpacity={0.4}
        />
        <Area
          type="monotone"
          dataKey="min"
          fill="white"
          stroke="none"
          fillOpacity={1}
        />
        <Line
          type="monotone"
          dataKey="avg"
          stroke="#16a34a"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, fill: '#16a34a' }}
        />
        <Line
          type="monotone"
          dataKey="max"
          stroke="#86efac"
          strokeWidth={1}
          strokeDasharray="4 2"
          dot={false}
        />
        <Line
          type="monotone"
          dataKey="min"
          stroke="#86efac"
          strokeWidth={1}
          strokeDasharray="4 2"
          dot={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  )
}
