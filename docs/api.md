# Ant Trail - API Documentation

## Base URL
```
Local:      http://localhost:3000/api
Production: https://anttrail.example.com/api
```

## Authentication

Semua endpoint (kecuali `/api/health` dan `/api/auth/login`) memerlukan cookie `ant-trail-token`.

### POST /api/auth/login
```json
Request:
{
  "email": "admin@anttrail.id",
  "password": "demo123"
}

Response (200):
{
  "success": true,
  "user": {
    "id": 1,
    "name": "Admin Pusat",
    "email": "admin@anttrail.id",
    "role": "super_admin",
    "region": null
  }
}
```

### POST /api/auth/logout
```
Response (200):
{ "success": true }
```

### GET /api/auth/me
```json
Response (200):
{
  "id": 1,
  "name": "Admin Pusat",
  "email": "admin@anttrail.id",
  "role": "super_admin",
  "region": null,
  "regionId": null
}
```

---

## Dashboard

### GET /api/dashboard/summary
Query: `?commodity=Beras` (optional)

```json
Response:
{
  "kpi": {
    "totalCommodities": 5,
    "surplusRegions": 8,
    "deficitRegions": 5,
    "inflationAlerts": 3,
    "logisticsRiskIndex": 45
  },
  "topAlerts": [...],
  "priceSummary": [...]
}
```

### GET /api/dashboard/map
Query: `?commodity=Beras&date=2026-04-01`

```json
Response:
{
  "commodity": "Beras",
  "regions": [
    {
      "regionId": 1,
      "province": "DKI Jakarta",
      "cityRegency": "Jakarta Pusat",
      "latitude": -6.1751,
      "longitude": 106.865,
      "status": "deficit",
      "supply": 800,
      "demand": 2200,
      "gap": -1400,
      "currentPrice": 15200,
      "priceChange": 2.3,
      "riskLevel": "high"
    }
  ]
}
```

### GET /api/dashboard/alerts
```json
Response:
{
  "alerts": [
    {
      "id": 1,
      "region": "Jakarta Pusat, DKI Jakarta",
      "commodity": "Cabai Merah",
      "riskLevel": "high",
      "currentPrice": 62000,
      "forecastPrice": 71500,
      "changePercent": "15.3",
      "reason": "...",
      "date": "2026-04-01"
    }
  ],
  "total": 10
}
```

---

## Harga

### GET /api/prices
Query: `?commodity_id=1&region_id=1&from=2026-01-01&to=2026-04-01&page=1&limit=100&search=jakarta`

```json
Response:
{
  "data": [
    {
      "id": 1,
      "region": "Jakarta Pusat",
      "province": "DKI Jakarta",
      "commodity": "Beras",
      "date": "2026-04-01",
      "price": 15200,
      "wow": 2.1,
      "mom": 5.3
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 100,
    "total": 500,
    "totalPages": 5
  }
}
```

---

## Supply-Demand

### GET /api/supply-demand
Query: `?commodity_id=1&date=2026-04-01`

### GET /api/supply-demand/matches
Query: `?commodity_id=1&target_region_id=1`

```json
Response:
{
  "total": 15,
  "matches": [
    {
      "sourceRegion": "Semarang, Jawa Tengah",
      "destinationRegion": "Jakarta Pusat, DKI Jakarta",
      "commodity": "Beras",
      "distance": 450,
      "surplus": 1200,
      "deficit": 1400,
      "scores": {
        "supplyCapacityScore": 0.85,
        "distanceScore": 0.72,
        "urgencyScore": 0.65,
        "priceStabilityScore": 0.78
      },
      "finalScore": 0.76,
      "reason": "Semarang memiliki surplus Beras yang cukup besar (1200 ton). Jarak 450 km relatif dekat dan efisien."
    }
  ]
}
```

---

## Logistik

### GET /api/logistics/routes
Query: `?commodity_id=1`

---

## Inflasi

### GET /api/inflation/signals
Query: `?commodity_id=1&region_id=1`

Returns both stored signals AND live forecasts with confidence bands.

### POST /api/inflation/recompute
Requires: `super_admin` or `analyst` role

---

## Kebijakan

### GET /api/policies
Query: `?region_id=1&category=operasi_pasar&search=beras`

### POST /api/policies/import
Requires: `super_admin` or `analyst` role

---

## Admin

### POST /api/admin/upload-csv
Requires: `super_admin` role
Content-Type: `multipart/form-data`
Fields: `file` (CSV), `type` (prices|supply_demand)

### POST /api/admin/run-etl
Requires: `super_admin` role

### GET /api/admin/ingestion-jobs
Requires: `super_admin` or `analyst` role

---

## Health Check

### GET /api/health
```json
{
  "status": "healthy",
  "timestamp": "2026-04-05T04:49:10.387Z",
  "database": "connected",
  "regions": 15,
  "version": "0.1.0"
}
```
