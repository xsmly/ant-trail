# 🐜 Ant Trail — Platform Ketahanan Pangan Indonesia

> Dashboard keputusan untuk digitalisasi ketahanan pangan lintas daerah di Indonesia.
> Membaca pola harga, mismatch supply-demand, risiko inflasi, dan rekomendasi distribusi.

![Next.js](https://img.shields.io/badge/Next.js-14-black) ![TypeScript](https://img.shields.io/badge/TypeScript-5-blue) ![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748) ![Tailwind](https://img.shields.io/badge/Tailwind-CSS-38B2AC)

---

## ✨ Fitur Utama

| Modul | Deskripsi | Status |
|-------|-----------|--------|
| 🔐 Auth & Role | Login, 3 role (admin/analyst/pemda), proteksi route | ✅ |
| 📊 Dashboard Nasional | KPI cards, alert, ringkasan kondisi pangan | ✅ |
| 💰 Monitoring Harga | Line chart, filter wilayah/tanggal, WoW/MoM, tabel | ✅ |
| 🔄 Matching S/D | Tabel surplus-defisit, rekomendasi distribusi + skor | ✅ |
| 🗺️ Smart Logistics | Peta Indonesia, marker status, rute rekomendasi | ✅ |
| ⚠️ Early Warning Inflasi | Forecast 4 minggu, confidence band, risk label | ✅ |
| 📋 Kebijakan Daerah | Katalog intervensi, tag, skor efektivitas | ✅ |
| ⚙️ Admin Ingestion | Upload CSV, run ETL, riwayat job | ✅ |

## 🚀 Quick Start (3 Command)

```bash
cd apps/web
npm install
cp .env.example .env
npx prisma db push && npx tsx prisma/seed.ts
npm run dev
```

Buka **http://localhost:3000**

## 🔑 Akun Demo

| Email | Password | Role |
|-------|----------|------|
| `admin@anttrail.id` | `demo123` | Super Admin |
| `analyst@anttrail.id` | `demo123` | Analis |
| `pemda.jakarta@anttrail.id` | `demo123` | Pemda Viewer |

## 📁 Struktur Proyek

```
ant-trail/
├── apps/
│   ├── web/                  # Next.js 14 full-stack app
│   │   ├── src/
│   │   │   ├── app/          # App Router pages + API routes
│   │   │   ├── components/   # React components
│   │   │   └── lib/          # Utilities, auth, analytics engine
│   │   ├── prisma/           # Schema + seed
│   │   └── public/           # Static assets
│   └── analytics/            # Python FastAPI (optional)
├── packages/                 # Shared packages
├── infra/docker/             # Docker Compose + Dockerfiles
├── data/seeds/               # Sample CSV files
└── docs/                     # Documentation
```

## 📐 Stack Teknologi

- **Frontend**: Next.js 14 (App Router), React 18, Tailwind CSS
- **Charts**: Recharts
- **Maps**: Leaflet + OpenStreetMap
- **Backend**: Next.js Route Handlers (REST API)
- **Database**: SQLite (dev) / PostgreSQL (prod) via Prisma ORM
- **Auth**: JWT (jose) + bcryptjs
- **Analytics**: Built-in TypeScript engine + optional Python (FastAPI)

## 🗄️ Model Data

9 tabel utama:

| Tabel | Deskripsi |
|-------|-----------|
| `regions` | 15 wilayah utama Indonesia |
| `commodities` | 5 komoditas (beras, cabai, bawang, minyak goreng, gula) |
| `price_observations` | 13.500 data harga (180 hari) |
| `supply_demand_snapshots` | 1.950 snapshot mingguan |
| `logistics_routes` | Rute rekomendasi distribusi |
| `inflation_signals` | Sinyal & forecast inflasi |
| `policy_interventions` | 25 kebijakan daerah |
| `users` | 5 user demo |
| `ingestion_jobs` | Riwayat ingestion |

## 🧮 Algoritma Analytics

### Demand-Supply Matching
```
final_score = 0.35 × kapasitas_supply + 0.25 × jarak + 0.20 × urgensi + 0.20 × stabilitas_harga
```

### Inflation Forecast
- Weighted Moving Average dengan exponential decay
- Confidence band: ±1.96σ√t
- Output: forecast 4 minggu + risk label (low/medium/high)

### Risk Scoring (0-100)
- Kenaikan harga (0-25)
- Gap supply-demand (0-25)
- Volatilitas harga (0-25)
- Frekuensi alert (0-25)

## 🌐 API Endpoints

| Method | Path | Deskripsi |
|--------|------|-----------|
| GET | `/api/health` | Health check |
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/logout` | Logout |
| GET | `/api/auth/me` | Current user |
| GET | `/api/dashboard/summary` | KPI dashboard |
| GET | `/api/dashboard/map` | Data peta |
| GET | `/api/dashboard/alerts` | Alert terkini |
| GET | `/api/prices` | Data harga + WoW/MoM |
| GET | `/api/supply-demand` | Status supply-demand |
| GET | `/api/supply-demand/matches` | Rekomendasi matching |
| GET | `/api/logistics/routes` | Rute logistik |
| GET | `/api/inflation/signals` | Sinyal + forecast inflasi |
| POST | `/api/inflation/recompute` | Hitung ulang sinyal |
| GET | `/api/policies` | Katalog kebijakan |
| POST | `/api/policies/import` | Import kebijakan |
| POST | `/api/admin/upload-csv` | Upload CSV |
| POST | `/api/admin/run-etl` | Jalankan ETL |
| GET | `/api/admin/ingestion-jobs` | Riwayat ingestion |

## 🐳 Docker

```bash
cd infra/docker
docker compose up -d
```

## 📖 Dokumentasi Lengkap

- [Panduan Setup](docs/setup.md)
- [API Documentation](docs/api.md)
- [Architecture](docs/architecture.md)

## 📸 Halaman

| Halaman | Path |
|---------|------|
| Login | `/login` |
| Dashboard Nasional | `/dashboard` |
| Monitoring Harga | `/dashboard/prices` |
| Matching S/D | `/dashboard/matching` |
| Smart Logistics | `/dashboard/logistics` |
| Early Warning | `/dashboard/inflation` |
| Kebijakan Daerah | `/dashboard/policies` |
| Admin & Ingestion | `/dashboard/admin` |

---

**Ant Trail** — Prototype Dashboard Keputusan Ketahanan Pangan Indonesia 🇮🇩
