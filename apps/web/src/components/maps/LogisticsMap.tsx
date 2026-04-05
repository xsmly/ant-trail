'use client'

import { useEffect, useRef } from 'react'
import L from 'leaflet'

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

interface RouteData {
  id: number
  sourceRegion: { id: number; name: string; latitude: number; longitude: number }
  destinationRegion: { id: number; name: string; latitude: number; longitude: number }
  commodity: string
  scores: { route: number; distance: number; capacity: number; urgency: number; final: number }
  reason: string
}

interface LogisticsMapProps {
  regions: MapRegion[]
  routes: RouteData[]
  selectedRoute: RouteData | null
  onSelectRoute: (route: RouteData) => void
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'surplus': return '#22c55e'
    case 'deficit': return '#ef4444'
    case 'balanced': return '#3b82f6'
    default: return '#94a3b8'
  }
}

export default function LogisticsMap({ regions, routes, selectedRoute, onSelectRoute }: LogisticsMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)

  useEffect(() => {
    if (!mapRef.current) return

    // Clean up existing map
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove()
      mapInstanceRef.current = null
    }

    const map = L.map(mapRef.current, {
      zoomControl: true,
      attributionControl: true,
    }).setView([-2.5, 118], 5)

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
      maxZoom: 18,
    }).addTo(map)

    // Add region markers
    regions.forEach(region => {
      const color = getStatusColor(region.status)
      const marker = L.circleMarker([region.latitude, region.longitude], {
        radius: 8,
        fillColor: color,
        color: '#fff',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.8,
      }).addTo(map)

      const priceStr = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(region.currentPrice)

      marker.bindPopup(`
        <div style="font-family: Inter, sans-serif; min-width: 180px;">
          <div style="font-weight: 700; font-size: 14px; margin-bottom: 4px;">${region.cityRegency}</div>
          <div style="font-size: 12px; color: #64748b; margin-bottom: 8px;">${region.province}</div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span style="font-size: 11px; color: #64748b;">Status</span>
            <span style="font-size: 12px; font-weight: 600; color: ${color}; text-transform: capitalize;">${region.status}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span style="font-size: 11px; color: #64748b;">Harga</span>
            <span style="font-size: 12px; font-weight: 600;">${priceStr}</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span style="font-size: 11px; color: #64748b;">Risiko</span>
            <span style="font-size: 12px; font-weight: 600; color: ${region.riskLevel === 'high' ? '#ef4444' : region.riskLevel === 'medium' ? '#eab308' : '#22c55e'};">${region.riskLevel}</span>
          </div>
        </div>
      `)
    })

    // Draw route lines
    routes.slice(0, 15).forEach(route => {
      const isSelected = selectedRoute?.id === route.id
      const line = L.polyline(
        [
          [route.sourceRegion.latitude, route.sourceRegion.longitude],
          [route.destinationRegion.latitude, route.destinationRegion.longitude],
        ],
        {
          color: isSelected ? '#f59e0b' : '#f59e0b',
          weight: isSelected ? 4 : 2,
          opacity: isSelected ? 1 : 0.4,
          dashArray: isSelected ? undefined : '6, 4',
        }
      ).addTo(map)

      line.on('click', () => onSelectRoute(route))

      line.bindPopup(`
        <div style="font-family: Inter, sans-serif; min-width: 200px;">
          <div style="font-weight: 700; font-size: 13px; margin-bottom: 6px;">
            ${route.sourceRegion.name.split(',')[0]} → ${route.destinationRegion.name.split(',')[0]}
          </div>
          <div style="font-size: 11px; color: #64748b; margin-bottom: 4px;">
            🌾 ${route.commodity} · ⭐ Skor: ${(route.scores.final * 100).toFixed(0)}
          </div>
        </div>
      `)

      // Arrow marker at midpoint
      const midLat = (route.sourceRegion.latitude + route.destinationRegion.latitude) / 2
      const midLng = (route.sourceRegion.longitude + route.destinationRegion.longitude) / 2

      L.circleMarker([midLat, midLng], {
        radius: 3,
        fillColor: '#f59e0b',
        color: '#f59e0b',
        weight: 1,
        fillOpacity: isSelected ? 1 : 0.5,
      }).addTo(map)
    })

    mapInstanceRef.current = map

    return () => {
      map.remove()
      mapInstanceRef.current = null
    }
  }, [regions, routes, selectedRoute, onSelectRoute])

  return <div ref={mapRef} className="h-full w-full" />
}
