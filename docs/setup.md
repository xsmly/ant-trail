# Ant Trail - Panduan Setup Lokal

## Prasyarat
- Node.js 18+ (rekomendasi: 20 LTS)
- npm 9+
- Git

## Quick Start (3 Command)

```bash
# 1. Clone dan install
git clone <repo-url> ant-trail
cd ant-trail/apps/web
npm install

# 2. Setup database dan seed data
cp .env.example .env
npx prisma db push
npx tsx prisma/seed.ts

# 3. Jalankan aplikasi
npm run dev
```

Buka http://localhost:3000

## Akun Demo

| Email | Password | Role | Akses |
|-------|----------|------|-------|
| admin@anttrail.id | demo123 | Super Admin | Semua fitur |
| analyst@anttrail.id | demo123 | Analis | Dashboard + analisis |
| pemda.jakarta@anttrail.id | demo123 | Pemda Viewer | Data Jakarta |
| pemda.surabaya@anttrail.id | demo123 | Pemda Viewer | Data Surabaya |
| pemda.medan@anttrail.id | demo123 | Pemda Viewer | Data Medan |

## Setup Detail

### 1. Environment Variables

Salin `.env.example` ke `.env`:
```bash
cp .env.example .env
```

Isi variabel:
```env
DATABASE_URL="file:./dev.db"          # SQLite (default)
JWT_SECRET="ganti-dengan-secret-anda"  # Untuk produksi
```

### 2. Database

**SQLite (Default - Tanpa Install Tambahan):**
```bash
npx prisma db push    # Buat tabel
npx tsx prisma/seed.ts # Isi data demo
```

**PostgreSQL (Opsional - Untuk Produksi):**
```bash
# Ubah DATABASE_URL di .env:
DATABASE_URL="postgresql://user:password@localhost:5432/anttrail"

npx prisma db push
npx tsx prisma/seed.ts
```

### 3. Jalankan Development Server

```bash
npm run dev
```

### 4. Build Produksi

```bash
npm run build
npm run start
```

## Setup dengan Docker Compose

```bash
cd infra/docker
docker compose up -d
```

Ini akan menjalankan:
- PostgreSQL di port 5432
- Next.js app di port 3000
- Python analytics di port 8001

## Data yang Di-seed

Setelah seed, database berisi:
- **15 wilayah** utama Indonesia (lintas pulau)
- **5 komoditas**: Beras, Cabai Merah, Bawang Merah, Minyak Goreng, Gula
- **13.500 data harga** (180 hari × 15 wilayah × 5 komoditas)
- **1.950 snapshot** supply-demand (26 minggu)
- **25 kebijakan** daerah
- **300 sinyal inflasi**
- **5 riwayat ingestion**
- **5 user** demo

## Upload Data Baru

### Via Dashboard Admin
1. Login sebagai `admin@anttrail.id`
2. Buka `/dashboard/admin`
3. Pilih tipe data (Harga / Supply-Demand)
4. Upload file CSV

### Format CSV Harga
```csv
region_id,commodity_id,date,price,source
1,1,2026-04-01,15200,csv_upload
```

### Format CSV Supply-Demand
```csv
region_id,commodity_id,date,supply,demand
1,1,2026-04-01,800,2200
```

### Sample File
Lihat `data/seeds/sample_prices.csv` dan `data/seeds/sample_supply_demand.csv`

## Reset Database

```bash
# Hapus database dan seed ulang
rm -f prisma/dev.db
npx prisma db push
npx tsx prisma/seed.ts
```

## Troubleshooting

### Port 3000 sudah dipakai
```bash
fuser -k 3000/tcp
# atau
npx kill-port 3000
```

### Prisma error
```bash
npx prisma generate
npx prisma db push --force-reset
npx tsx prisma/seed.ts
```

### Module not found
```bash
rm -rf node_modules
npm install
```
