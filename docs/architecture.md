# Ant Trail - Arsitektur Sistem

## Gambaran Umum

Ant Trail adalah platform keputusan ketahanan pangan lintas daerah Indonesia. Arsitektur dirancang untuk:
- **Modular**: Frontend, backend, analytics bisa dikembangkan terpisah
- **Resilient**: Bisa jalan tanpa koneksi API eksternal (fallback ke data lokal)
- **Scalable**: Monorepo mendukung penambahan service baru

## Diagram Arsitektur

```
┌─────────────────────────────────────────────────────────┐
│                    Ant Trail Platform                     │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │                 Next.js 14 App                     │   │
│  │                                                    │   │
│  │  ┌────────────┐  ┌────────────┐  ┌─────────────┐ │   │
│  │  │ App Router  │  │ API Routes │  │  Middleware  │ │   │
│  │  │  (Pages)    │  │  (REST)    │  │  (Auth/CORS)│ │   │
│  │  └────────────┘  └────────────┘  └─────────────┘ │   │
│  │                        │                           │   │
│  │  ┌─────────────────────┴──────────────────────┐   │   │
│  │  │           Analytics Engine (TS)             │   │   │
│  │  │  - Demand-Supply Matching                   │   │   │
│  │  │  - Inflation Forecast (WMA)                 │   │   │
│  │  │  - Risk Scoring                             │   │   │
│  │  │  - Policy Similarity                        │   │   │
│  │  └─────────────────────┬──────────────────────┘   │   │
│  │                        │                           │   │
│  │  ┌─────────────────────┴──────────────────────┐   │   │
│  │  │        Prisma ORM + SQLite/PostgreSQL        │   │   │
│  │  │  9 tabel: regions, commodities, prices,      │   │   │
│  │  │  supply_demand, logistics, inflation,         │   │   │
│  │  │  policies, users, ingestion_jobs              │   │   │
│  │  └────────────────────────────────────────────┘   │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│  ┌──────────────────────┐  ┌─────────────────────────┐  │
│  │  Python Analytics    │  │  External Data Sources   │  │
│  │  (FastAPI, optional) │  │  (BPS, PIHPS - Tahap 2) │  │
│  │  - SARIMA forecast   │  │  - Fallback ke CSV local │  │
│  │  - Advanced matching │  │  - Cache di database     │  │
│  └──────────────────────┘  └─────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

## Stack Teknologi

| Layer | Teknologi | Alasan |
|-------|-----------|--------|
| Frontend | Next.js 14, React 18, Tailwind CSS | SSR + SPA, DX terbaik |
| Charts | Recharts | Integrasi React native |
| Maps | Leaflet | Open source, ringan |
| Backend | Next.js Route Handlers | Satu deployment |
| Database | SQLite (dev) / PostgreSQL (prod) | Prisma mendukung keduanya |
| ORM | Prisma | Type-safe, migrasi mudah |
| Auth | JWT (jose) + bcryptjs | Stateless, ringan |
| Analytics | TypeScript (built-in) + Python (optional) | Built-in untuk MVP |

## Model Data

### Entity Relationship

```
regions ─┬── price_observations
         ├── supply_demand_snapshots
         ├── logistics_routes (source & dest)
         ├── inflation_signals
         ├── policy_interventions
         └── users

commodities ─┬── price_observations
             ├── supply_demand_snapshots
             ├── logistics_routes
             └── inflation_signals

ingestion_jobs (standalone)
```

## Algoritma Analytics

### A. Demand-Supply Matching
```
final_score = 0.35 × supply_capacity + 0.25 × distance + 0.20 × urgency + 0.20 × price_stability
```

### B. Inflation Forecast
- Metode: Weighted Moving Average (WMA) dengan exponential decay
- Window: 14 hari
- Confidence band: ±1.96σ√t

### C. Risk Scoring (0-100)
- Kenaikan harga: 0-25 poin
- Gap supply-demand: 0-25 poin
- Volatilitas harga: 0-25 poin
- Frekuensi alert: 0-25 poin

### D. Policy Similarity
- Rule-based matching berdasarkan kategori, tag komoditas, dan efektivitas

## Alur Data

1. **Seed** → Data realistis di-generate saat setup
2. **CSV Upload** → Admin upload via `/dashboard/admin`
3. **ETL** → Recompute sinyal inflasi + rute logistik
4. **API** → Frontend fetch data via REST endpoints
5. **Render** → Chart, tabel, peta ditampilkan ke user
