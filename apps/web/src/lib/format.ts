/**
 * Format utilities for Indonesian locale
 */

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

export function formatNumber(value: number, decimals = 0): string {
  return new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)
}

export function formatPercent(value: number, decimals = 1): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(decimals)}%`
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('id-ID', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(date))
}

export function formatDateShort(date: string | Date): string {
  return new Intl.DateTimeFormat('id-ID', {
    month: 'short',
    day: 'numeric',
  }).format(new Date(date))
}

export function formatDateTime(date: string | Date): string {
  return new Intl.DateTimeFormat('id-ID', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

export function riskColor(level: string): string {
  switch (level) {
    case 'high': return 'text-red-600 bg-red-50 border-red-200'
    case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
    case 'low': return 'text-green-600 bg-green-50 border-green-200'
    default: return 'text-gray-600 bg-gray-50 border-gray-200'
  }
}

export function statusColor(status: string): string {
  switch (status) {
    case 'surplus': return 'text-green-700 bg-green-100'
    case 'deficit': return 'text-red-700 bg-red-100'
    case 'balanced': return 'text-blue-700 bg-blue-100'
    default: return 'text-gray-700 bg-gray-100'
  }
}

export function riskBadge(level: string): string {
  switch (level) {
    case 'high': return '🔴 Tinggi'
    case 'medium': return '🟡 Sedang'
    case 'low': return '🟢 Rendah'
    default: return '⚪ N/A'
  }
}
