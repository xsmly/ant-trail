import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

// ============================================================
// REGIONS - 15 key Indonesian regions across major islands
// ============================================================
const regions = [
  { province: 'DKI Jakarta', cityRegency: 'Jakarta Pusat', regionType: 'kota', latitude: -6.1751, longitude: 106.8650, islandGroup: 'Jawa' },
  { province: 'Jawa Barat', cityRegency: 'Bandung', regionType: 'kota', latitude: -6.9175, longitude: 107.6191, islandGroup: 'Jawa' },
  { province: 'Jawa Tengah', cityRegency: 'Semarang', regionType: 'kota', latitude: -6.9666, longitude: 110.4196, islandGroup: 'Jawa' },
  { province: 'Jawa Timur', cityRegency: 'Surabaya', regionType: 'kota', latitude: -7.2575, longitude: 112.7521, islandGroup: 'Jawa' },
  { province: 'DI Yogyakarta', cityRegency: 'Yogyakarta', regionType: 'kota', latitude: -7.7956, longitude: 110.3695, islandGroup: 'Jawa' },
  { province: 'Banten', cityRegency: 'Serang', regionType: 'kota', latitude: -6.1103, longitude: 106.1512, islandGroup: 'Jawa' },
  { province: 'Sumatera Utara', cityRegency: 'Medan', regionType: 'kota', latitude: 3.5952, longitude: 98.6722, islandGroup: 'Sumatera' },
  { province: 'Sumatera Selatan', cityRegency: 'Palembang', regionType: 'kota', latitude: -2.9761, longitude: 104.7754, islandGroup: 'Sumatera' },
  { province: 'Lampung', cityRegency: 'Bandar Lampung', regionType: 'kota', latitude: -5.3971, longitude: 105.2668, islandGroup: 'Sumatera' },
  { province: 'Kalimantan Selatan', cityRegency: 'Banjarmasin', regionType: 'kota', latitude: -3.3194, longitude: 114.5907, islandGroup: 'Kalimantan' },
  { province: 'Kalimantan Timur', cityRegency: 'Samarinda', regionType: 'kota', latitude: -0.4948, longitude: 117.1436, islandGroup: 'Kalimantan' },
  { province: 'Sulawesi Selatan', cityRegency: 'Makassar', regionType: 'kota', latitude: -5.1477, longitude: 119.4327, islandGroup: 'Sulawesi' },
  { province: 'Bali', cityRegency: 'Denpasar', regionType: 'kota', latitude: -8.6500, longitude: 115.2167, islandGroup: 'Bali-NusaTenggara' },
  { province: 'Nusa Tenggara Barat', cityRegency: 'Mataram', regionType: 'kota', latitude: -8.5833, longitude: 116.1167, islandGroup: 'Bali-NusaTenggara' },
  { province: 'Papua', cityRegency: 'Jayapura', regionType: 'kota', latitude: -2.5916, longitude: 140.6690, islandGroup: 'Papua' },
]

// ============================================================
// COMMODITIES - 5 key food commodities
// ============================================================
const commodities = [
  { name: 'Beras', category: 'pokok', unit: 'kg' },
  { name: 'Cabai Merah', category: 'bumbu', unit: 'kg' },
  { name: 'Bawang Merah', category: 'bumbu', unit: 'kg' },
  { name: 'Minyak Goreng', category: 'minyak', unit: 'liter' },
  { name: 'Gula', category: 'gula', unit: 'kg' },
]

// Base prices per commodity (Rp) and volatility
const basePrices: Record<string, { base: number, volatility: number }> = {
  'Beras': { base: 14500, volatility: 0.08 },
  'Cabai Merah': { base: 55000, volatility: 0.35 },
  'Bawang Merah': { base: 38000, volatility: 0.25 },
  'Minyak Goreng': { base: 18000, volatility: 0.06 },
  'Gula': { base: 16500, volatility: 0.10 },
}

// Regional price multipliers (some regions have higher costs)
const regionPriceMultipliers = [
  1.15,  // Jakarta - higher
  1.00,  // Bandung
  0.95,  // Semarang - lower, production area
  0.92,  // Surabaya - production hub
  0.98,  // Yogyakarta
  1.02,  // Serang
  1.08,  // Medan
  1.00,  // Palembang
  0.97,  // Bandar Lampung
  1.05,  // Banjarmasin
  1.12,  // Samarinda - remote
  1.06,  // Makassar
  1.10,  // Denpasar - island
  1.08,  // Mataram
  1.35,  // Jayapura - very remote
]

// Supply-demand profiles per region (surplus/deficit tendencies)
const supplyDemandProfiles: Record<number, Record<string, 'surplus' | 'deficit' | 'balanced'>> = {
  0: { 'Beras': 'deficit', 'Cabai Merah': 'deficit', 'Bawang Merah': 'deficit', 'Minyak Goreng': 'deficit', 'Gula': 'deficit' }, // Jakarta
  1: { 'Beras': 'balanced', 'Cabai Merah': 'surplus', 'Bawang Merah': 'balanced', 'Minyak Goreng': 'balanced', 'Gula': 'deficit' },
  2: { 'Beras': 'surplus', 'Cabai Merah': 'surplus', 'Bawang Merah': 'surplus', 'Minyak Goreng': 'balanced', 'Gula': 'balanced' }, // Semarang
  3: { 'Beras': 'surplus', 'Cabai Merah': 'balanced', 'Bawang Merah': 'surplus', 'Minyak Goreng': 'surplus', 'Gula': 'surplus' }, // Surabaya
  4: { 'Beras': 'balanced', 'Cabai Merah': 'surplus', 'Bawang Merah': 'balanced', 'Minyak Goreng': 'deficit', 'Gula': 'balanced' },
  5: { 'Beras': 'balanced', 'Cabai Merah': 'balanced', 'Bawang Merah': 'deficit', 'Minyak Goreng': 'balanced', 'Gula': 'deficit' },
  6: { 'Beras': 'deficit', 'Cabai Merah': 'deficit', 'Bawang Merah': 'deficit', 'Minyak Goreng': 'surplus', 'Gula': 'balanced' }, // Medan
  7: { 'Beras': 'surplus', 'Cabai Merah': 'balanced', 'Bawang Merah': 'balanced', 'Minyak Goreng': 'surplus', 'Gula': 'balanced' }, // Palembang
  8: { 'Beras': 'surplus', 'Cabai Merah': 'surplus', 'Bawang Merah': 'balanced', 'Minyak Goreng': 'balanced', 'Gula': 'surplus' }, // Lampung
  9: { 'Beras': 'surplus', 'Cabai Merah': 'deficit', 'Bawang Merah': 'deficit', 'Minyak Goreng': 'balanced', 'Gula': 'deficit' },
  10: { 'Beras': 'deficit', 'Cabai Merah': 'deficit', 'Bawang Merah': 'deficit', 'Minyak Goreng': 'balanced', 'Gula': 'deficit' }, // Samarinda
  11: { 'Beras': 'surplus', 'Cabai Merah': 'balanced', 'Bawang Merah': 'surplus', 'Minyak Goreng': 'deficit', 'Gula': 'balanced' }, // Makassar
  12: { 'Beras': 'deficit', 'Cabai Merah': 'balanced', 'Bawang Merah': 'deficit', 'Minyak Goreng': 'deficit', 'Gula': 'deficit' }, // Denpasar
  13: { 'Beras': 'surplus', 'Cabai Merah': 'surplus', 'Bawang Merah': 'balanced', 'Minyak Goreng': 'deficit', 'Gula': 'deficit' }, // Mataram
  14: { 'Beras': 'deficit', 'Cabai Merah': 'deficit', 'Bawang Merah': 'deficit', 'Minyak Goreng': 'deficit', 'Gula': 'deficit' }, // Jayapura
}

function generatePrice(basePrice: number, volatility: number, multiplier: number, dayIndex: number, trend: number): number {
  const seasonal = Math.sin((dayIndex / 30) * Math.PI * 2) * volatility * 0.3
  const noise = (Math.random() - 0.5) * volatility * 0.4
  const trendFactor = trend * (dayIndex / 180)
  const price = basePrice * multiplier * (1 + seasonal + noise + trendFactor)
  return Math.round(price / 100) * 100
}

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// ============================================================
// POLICY INTERVENTIONS
// ============================================================
const policyInterventions = [
  { regionIdx: 0, title: 'Operasi Pasar Beras Jakarta Pusat', category: 'operasi_pasar', summary: 'Distribusi beras medium ke 42 pasar tradisional di Jakarta Pusat dengan harga Rp 10.500/kg. Berhasil menurunkan harga rata-rata 8% dalam 2 minggu.', effectiveness: 82, tags: 'beras,operasi_pasar,distribusi' },
  { regionIdx: 0, title: 'Subsidi Angkutan Cabai dari Jawa Tengah', category: 'subsidi_distribusi', summary: 'Pemda DKI mensubsidi biaya angkutan cabai merah dari sentra produksi di Brebes. Menurunkan harga cabai 15% di pasar induk Kramat Jati.', effectiveness: 75, tags: 'cabai_merah,subsidi,logistik' },
  { regionIdx: 1, title: 'Monitoring Stok Real-time Bandung', category: 'monitoring_stok', summary: 'Implementasi sistem monitoring stok harian di 25 pasar tradisional Bandung. Meningkatkan akurasi prediksi kebutuhan 30%.', effectiveness: 70, tags: 'monitoring,digital,semua_komoditas' },
  { regionIdx: 2, title: 'Kerjasama Distribusi Semarang-Solo', category: 'kerja_sama', summary: 'Perjanjian kerjasama distribusi beras dan bawang merah antara Semarang dan Solo. Efisiensi logistik meningkat 20%.', effectiveness: 88, tags: 'beras,bawang_merah,kerjasama,logistik' },
  { regionIdx: 3, title: 'Gudang Buffer Stock Surabaya', category: 'monitoring_stok', summary: 'Pembangunan 3 gudang buffer stock kapasitas 500 ton untuk stabilisasi harga beras di Jawa Timur.', effectiveness: 85, tags: 'beras,buffer_stock,gudang' },
  { regionIdx: 3, title: 'Operasi Pasar Minyak Goreng Surabaya', category: 'operasi_pasar', summary: 'Operasi pasar minyak goreng kemasan di 30 titik distribusi. Stok dijual dengan harga HET Rp 14.000/liter.', effectiveness: 78, tags: 'minyak_goreng,operasi_pasar,HET' },
  { regionIdx: 4, title: 'Program Tani Muda Yogyakarta', category: 'kerja_sama', summary: 'Pelatihan 200 petani muda untuk meningkatkan produktivitas cabai dan bawang merah di Sleman dan Bantul.', effectiveness: 65, tags: 'cabai_merah,bawang_merah,pelatihan,petani' },
  { regionIdx: 6, title: 'Subsidi Distribusi Beras Medan', category: 'subsidi_distribusi', summary: 'Subsidi ongkos kirim beras dari Palembang dan Lampung ke Medan. Menurunkan disparitas harga 12%.', effectiveness: 72, tags: 'beras,subsidi,distribusi,lintas_provinsi' },
  { regionIdx: 7, title: 'Stabilisasi Harga Gula Palembang', category: 'operasi_pasar', summary: 'Kerjasama dengan PTPN untuk mendistribusikan gula kristal putih dengan harga stabil di 28 pasar.', effectiveness: 80, tags: 'gula,operasi_pasar,BUMN' },
  { regionIdx: 8, title: 'Sentra Logistik Pangan Lampung', category: 'kerja_sama', summary: 'Pembangunan sentra logistik pangan terpadu di Lampung sebagai hub distribusi Sumatera bagian selatan.', effectiveness: 90, tags: 'logistik,hub,infrastruktur,semua_komoditas' },
  { regionIdx: 9, title: 'Monitoring Harga Digital Banjarmasin', category: 'monitoring_stok', summary: 'Aplikasi monitoring harga real-time di 15 pasar Banjarmasin. Data diupdate 3x sehari.', effectiveness: 68, tags: 'monitoring,digital,harga' },
  { regionIdx: 10, title: 'Subsidi Angkutan Laut Samarinda', category: 'subsidi_distribusi', summary: 'Subsidi kapal pengangkut pangan dari Surabaya ke Samarinda. Menurunkan biaya logistik 25%.', effectiveness: 76, tags: 'logistik,laut,subsidi,lintas_pulau' },
  { regionIdx: 11, title: 'Kerjasama Pangan Makassar-NTB', category: 'kerja_sama', summary: 'Kerjasama distribusi beras dan jagung antara Makassar dan Mataram. Volume perdagangan naik 40%.', effectiveness: 83, tags: 'beras,kerjasama,lintas_pulau' },
  { regionIdx: 12, title: 'Operasi Pasar Bawang Merah Bali', category: 'operasi_pasar', summary: 'Operasi pasar bawang merah menjelang musim upacara keagamaan. Stok didatangkan dari Brebes dan Nganjuk.', effectiveness: 74, tags: 'bawang_merah,operasi_pasar,musiman' },
  { regionIdx: 13, title: 'Program Intensifikasi Padi NTB', category: 'kerja_sama', summary: 'Program intensifikasi padi di Lombok. Produktivitas meningkat 15% dengan varietas unggul baru.', effectiveness: 87, tags: 'beras,produksi,intensifikasi,petani' },
  { regionIdx: 14, title: 'Subsidi Angkutan Udara Papua', category: 'subsidi_distribusi', summary: 'Subsidi angkutan udara bahan pangan pokok ke wilayah pedalaman Papua. Menjangkau 12 kabupaten terpencil.', effectiveness: 60, tags: 'semua_komoditas,subsidi,udara,terpencil' },
  { regionIdx: 0, title: 'Toko Tani Indonesia Jakarta', category: 'operasi_pasar', summary: 'Pembukaan 15 outlet Toko Tani Indonesia di Jakarta untuk menjual produk pertanian langsung dari petani.', effectiveness: 71, tags: 'semua_komoditas,retail,petani' },
  { regionIdx: 2, title: 'Cold Storage Cabai Semarang', category: 'monitoring_stok', summary: 'Investasi cold storage 200 ton untuk menjaga kualitas dan memperpanjang umur simpan cabai merah.', effectiveness: 79, tags: 'cabai_merah,cold_storage,infrastruktur' },
  { regionIdx: 4, title: 'Sistem Resi Gudang Yogyakarta', category: 'monitoring_stok', summary: 'Implementasi sistem resi gudang untuk beras di DIY. Petani bisa menyimpan dan menjual saat harga baik.', effectiveness: 73, tags: 'beras,resi_gudang,petani,stabilisasi' },
  { regionIdx: 6, title: 'Pasar Lelang Cabai Medan', category: 'operasi_pasar', summary: 'Pembentukan pasar lelang cabai di Medan untuk transparansi harga dan efisiensi distribusi.', effectiveness: 67, tags: 'cabai_merah,pasar_lelang,transparansi' },
  { regionIdx: 11, title: 'Buffer Stock Bawang Merah Makassar', category: 'monitoring_stok', summary: 'Penyediaan buffer stock bawang merah 100 ton di Makassar untuk stabilisasi harga di Sulawesi Selatan.', effectiveness: 77, tags: 'bawang_merah,buffer_stock,stabilisasi' },
  { regionIdx: 3, title: 'Kemitraan Petani-Industri Surabaya', category: 'kerja_sama', summary: 'Kemitraan 500 petani dengan industri pengolahan pangan di Surabaya. Jaminan harga dan off-take agreement.', effectiveness: 84, tags: 'semua_komoditas,kemitraan,industri,petani' },
  { regionIdx: 8, title: 'Early Warning System Lampung', category: 'monitoring_stok', summary: 'Sistem peringatan dini berbasis cuaca dan pola tanam untuk prediksi produksi pangan di Lampung.', effectiveness: 71, tags: 'semua_komoditas,early_warning,cuaca,prediksi' },
  { regionIdx: 5, title: 'Distribusi Langsung Petani-Pasar Serang', category: 'subsidi_distribusi', summary: 'Program distribusi langsung dari petani ke pasar tradisional di Serang, menghilangkan 2 layer tengkulak.', effectiveness: 81, tags: 'semua_komoditas,distribusi,efisiensi' },
  { regionIdx: 12, title: 'Kerjasama Impor Gula Bali', category: 'kerja_sama', summary: 'Kerjasama dengan importir untuk stabilisasi harga gula di Bali menjelang musim pariwisata puncak.', effectiveness: 69, tags: 'gula,impor,pariwisata,stabilisasi' },
]

async function main() {
  console.log('🌱 Starting seed...')

  // Clean existing data
  await prisma.ingestionJob.deleteMany()
  await prisma.inflationSignal.deleteMany()
  await prisma.logisticsRoute.deleteMany()
  await prisma.supplyDemandSnapshot.deleteMany()
  await prisma.priceObservation.deleteMany()
  await prisma.policyIntervention.deleteMany()
  await prisma.user.deleteMany()
  await prisma.commodity.deleteMany()
  await prisma.region.deleteMany()

  console.log('📍 Seeding regions...')
  const createdRegions = []
  for (const r of regions) {
    const created = await prisma.region.create({ data: r })
    createdRegions.push(created)
  }

  console.log('🌾 Seeding commodities...')
  const createdCommodities = []
  for (const c of commodities) {
    const created = await prisma.commodity.create({ data: c })
    createdCommodities.push(created)
  }

  console.log('👤 Seeding users...')
  const passwordHash = await bcrypt.hash('demo123', 10)
  const users = [
    { name: 'Admin Pusat', email: 'admin@anttrail.id', passwordHash, role: 'super_admin', regionId: null },
    { name: 'Analis Pangan', email: 'analyst@anttrail.id', passwordHash, role: 'analyst', regionId: null },
    { name: 'Pemda Jakarta', email: 'pemda.jakarta@anttrail.id', passwordHash, role: 'pemda_viewer', regionId: createdRegions[0].id },
    { name: 'Pemda Surabaya', email: 'pemda.surabaya@anttrail.id', passwordHash, role: 'pemda_viewer', regionId: createdRegions[3].id },
    { name: 'Pemda Medan', email: 'pemda.medan@anttrail.id', passwordHash, role: 'pemda_viewer', regionId: createdRegions[6].id },
  ]
  for (const u of users) {
    await prisma.user.create({ data: u })
  }

  // Generate 180 days of price data
  console.log('💰 Seeding price observations (180 days × 15 regions × 5 commodities)...')
  const startDate = new Date('2025-10-08')
  const priceData: Array<{
    regionId: number, commodityId: number, observationDate: Date, price: number, source: string
  }> = []

  // Trend factors per commodity (positive = rising)
  const trendFactors: Record<string, number> = {
    'Beras': 0.05,
    'Cabai Merah': 0.15,
    'Bawang Merah': 0.08,
    'Minyak Goreng': 0.03,
    'Gula': 0.06,
  }

  for (let day = 0; day < 180; day++) {
    const date = new Date(startDate)
    date.setDate(date.getDate() + day)

    for (let ri = 0; ri < createdRegions.length; ri++) {
      for (let ci = 0; ci < createdCommodities.length; ci++) {
        const commodity = createdCommodities[ci]
        const bp = basePrices[commodity.name]
        const price = generatePrice(
          bp.base,
          bp.volatility,
          regionPriceMultipliers[ri],
          day,
          trendFactors[commodity.name]
        )
        priceData.push({
          regionId: createdRegions[ri].id,
          commodityId: commodity.id,
          observationDate: date,
          price,
          source: 'seed',
        })
      }
    }
  }

  // Batch insert prices
  const BATCH_SIZE = 500
  for (let i = 0; i < priceData.length; i += BATCH_SIZE) {
    await prisma.priceObservation.createMany({
      data: priceData.slice(i, i + BATCH_SIZE),
    })
    if (i % 5000 === 0) console.log(`  ...inserted ${i}/${priceData.length} prices`)
  }
  console.log(`  ✅ ${priceData.length} price observations created`)

  // Generate weekly supply-demand snapshots
  console.log('📊 Seeding supply-demand snapshots...')
  const sdData: Array<{
    regionId: number, commodityId: number, snapshotDate: Date,
    estimatedSupply: number, estimatedDemand: number, gap: number, status: string
  }> = []

  for (let week = 0; week < 26; week++) {
    const date = new Date(startDate)
    date.setDate(date.getDate() + week * 7)

    for (let ri = 0; ri < createdRegions.length; ri++) {
      for (let ci = 0; ci < createdCommodities.length; ci++) {
        const commodity = createdCommodities[ci]
        const profile = supplyDemandProfiles[ri][commodity.name]

        let supply: number, demand: number
        const baseDemand = 1000 + Math.random() * 2000 // tons

        if (profile === 'surplus') {
          supply = baseDemand * (1.15 + Math.random() * 0.25)
          demand = baseDemand
        } else if (profile === 'deficit') {
          supply = baseDemand * (0.6 + Math.random() * 0.25)
          demand = baseDemand
        } else {
          supply = baseDemand * (0.95 + Math.random() * 0.10)
          demand = baseDemand
        }

        supply = Math.round(supply)
        demand = Math.round(demand)
        const gap = supply - demand
        const status = gap > demand * 0.05 ? 'surplus' : gap < -demand * 0.05 ? 'deficit' : 'balanced'

        sdData.push({
          regionId: createdRegions[ri].id,
          commodityId: commodity.id,
          snapshotDate: date,
          estimatedSupply: supply,
          estimatedDemand: demand,
          gap,
          status,
        })
      }
    }
  }

  for (let i = 0; i < sdData.length; i += BATCH_SIZE) {
    await prisma.supplyDemandSnapshot.createMany({
      data: sdData.slice(i, i + BATCH_SIZE),
    })
  }
  console.log(`  ✅ ${sdData.length} supply-demand snapshots created`)

  // Generate logistics routes
  console.log('🚛 Seeding logistics routes...')
  const routeReasons = [
    'Kapasitas surplus tinggi di {src}, wilayah {dst} mengalami defisit akut. Jalur darat tersedia dan efisien.',
    'Jarak relatif dekat ({dist} km). {src} memiliki stok berlebih yang dapat dialihkan ke {dst}.',
    'Urgensi tinggi di {dst} karena harga naik {pct}% dalam 2 minggu terakhir. {src} bisa memenuhi kebutuhan.',
    '{src} adalah hub distribusi utama dengan infrastruktur logistik memadai untuk melayani {dst}.',
    'Prioritas tinggi: {dst} menunjukkan tren kenaikan harga dan supply gap melebar. {src} optimal berdasarkan skor gabungan.',
  ]

  for (const commodity of createdCommodities) {
    // Find surplus and deficit regions
    const surplusRegions = createdRegions.filter((_, i) => supplyDemandProfiles[i][commodity.name] === 'surplus')
    const deficitRegions = createdRegions.filter((_, i) => supplyDemandProfiles[i][commodity.name] === 'deficit')

    for (const dest of deficitRegions) {
      for (const src of surplusRegions) {
        const dist = haversineDistance(src.latitude, src.longitude, dest.latitude, dest.longitude)
        const maxDist = 3000
        const distanceScore = Math.max(0, 1 - dist / maxDist)
        const capacityScore = 0.6 + Math.random() * 0.4
        const urgencyScore = 0.5 + Math.random() * 0.5
        const routeScore = 0.5 + Math.random() * 0.5

        const finalScore = 0.35 * capacityScore + 0.25 * distanceScore + 0.20 * urgencyScore + 0.20 * routeScore

        const reasonTemplate = routeReasons[Math.floor(Math.random() * routeReasons.length)]
        const reason = reasonTemplate
          .replace('{src}', `${src.cityRegency}`)
          .replace('{dst}', `${dest.cityRegency}`)
          .replace('{dist}', Math.round(dist).toString())
          .replace('{pct}', (5 + Math.round(Math.random() * 15)).toString())

        await prisma.logisticsRoute.create({
          data: {
            sourceRegionId: src.id,
            destinationRegionId: dest.id,
            commodityId: commodity.id,
            routeScore: Math.round(routeScore * 100) / 100,
            distanceScore: Math.round(distanceScore * 100) / 100,
            capacityScore: Math.round(capacityScore * 100) / 100,
            urgencyScore: Math.round(urgencyScore * 100) / 100,
            finalScore: Math.round(finalScore * 100) / 100,
            recommendationReason: reason,
          },
        })
      }
    }
  }
  console.log('  ✅ Logistics routes created')

  // Generate inflation signals
  console.log('⚠️ Seeding inflation signals...')
  for (const region of createdRegions) {
    for (const commodity of createdCommodities) {
      const ri = createdRegions.indexOf(region)
      const bp = basePrices[commodity.name]
      const currentPrice = bp.base * regionPriceMultipliers[ri] * (1 + (Math.random() * 0.1))

      // Higher forecast for deficit regions
      const isDeficit = supplyDemandProfiles[ri][commodity.name] === 'deficit'
      const forecastMultiplier = isDeficit ? 1.05 + Math.random() * 0.15 : 1.0 + Math.random() * 0.08
      const forecastPrice = currentPrice * forecastMultiplier
      const changePercent = ((forecastPrice - currentPrice) / currentPrice) * 100

      let riskLevel: string
      let reason: string
      if (changePercent > 10) {
        riskLevel = 'high'
        reason = `Proyeksi kenaikan ${changePercent.toFixed(1)}% dalam 4 minggu. ${isDeficit ? 'Wilayah defisit dengan supply gap melebar.' : 'Tren kenaikan harga konsisten.'} Volatilitas tinggi terdeteksi.`
      } else if (changePercent > 5) {
        riskLevel = 'medium'
        reason = `Proyeksi kenaikan ${changePercent.toFixed(1)}% dalam 4 minggu. ${isDeficit ? 'Gap supply-demand perlu diwaspadai.' : 'Tren harga moderat naik.'} Perlu monitoring ketat.`
      } else {
        riskLevel = 'low'
        reason = `Harga relatif stabil. Proyeksi kenaikan ${changePercent.toFixed(1)}% masih dalam batas wajar. Supply memadai.`
      }

      // Create signals for last 4 weeks
      for (let w = 0; w < 4; w++) {
        const signalDate = new Date()
        signalDate.setDate(signalDate.getDate() - w * 7)

        await prisma.inflationSignal.create({
          data: {
            regionId: region.id,
            commodityId: commodity.id,
            signalDate,
            currentPrice: Math.round(currentPrice - w * Math.random() * 500),
            forecastPrice: Math.round(forecastPrice - w * Math.random() * 300),
            riskLevel,
            signalReason: reason,
          },
        })
      }
    }
  }
  console.log('  ✅ Inflation signals created')

  // Seed policy interventions
  console.log('📋 Seeding policy interventions...')
  for (const pi of policyInterventions) {
    await prisma.policyIntervention.create({
      data: {
        regionId: createdRegions[pi.regionIdx].id,
        title: pi.title,
        category: pi.category,
        summary: pi.summary,
        effectivenessScore: pi.effectiveness,
        tags: pi.tags,
      },
    })
  }
  console.log('  ✅ Policy interventions created')

  // Seed ingestion jobs
  console.log('📁 Seeding ingestion jobs...')
  const jobStatuses = ['completed', 'completed', 'completed', 'failed', 'completed']
  for (let i = 0; i < 5; i++) {
    const started = new Date()
    started.setDate(started.getDate() - (5 - i) * 2)
    const finished = new Date(started)
    finished.setMinutes(finished.getMinutes() + 3 + Math.floor(Math.random() * 10))

    await prisma.ingestionJob.create({
      data: {
        sourceName: ['harga_pangan_nasional.csv', 'supply_demand_q1.csv', 'kebijakan_daerah.csv', 'harga_realtime_api.json', 'stok_bulog.csv'][i],
        status: jobStatuses[i],
        startedAt: started,
        finishedAt: jobStatuses[i] === 'failed' ? null : finished,
        rowCount: jobStatuses[i] === 'failed' ? 0 : 500 + Math.floor(Math.random() * 2000),
        errorLog: jobStatuses[i] === 'failed' ? 'Connection timeout: API harga pangan tidak merespons setelah 30 detik' : null,
      },
    })
  }
  console.log('  ✅ Ingestion jobs created')

  console.log('\n✅ Seed completed successfully!')
  console.log('📊 Summary:')
  console.log(`  - ${regions.length} regions`)
  console.log(`  - ${commodities.length} commodities`)
  console.log(`  - ${users.length} users`)
  console.log(`  - ${priceData.length} price observations`)
  console.log(`  - ${sdData.length} supply-demand snapshots`)
  console.log(`  - ${policyInterventions.length} policy interventions`)
  console.log('\n🔑 Demo credentials:')
  console.log('  admin@anttrail.id / demo123 (super_admin)')
  console.log('  analyst@anttrail.id / demo123 (analyst)')
  console.log('  pemda.jakarta@anttrail.id / demo123 (pemda_viewer)')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
