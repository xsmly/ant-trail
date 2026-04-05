/**
 * Analytics engine - demand-supply matching, inflation forecast, risk scoring
 * All calculations done server-side, no external dependencies needed
 */

// ============================================================
// A. Demand-Supply Matching
// ============================================================
export interface MatchScore {
  sourceRegionId: number
  sourceRegionName: string
  destinationRegionId: number
  destinationRegionName: string
  commodityName: string
  supplyCapacityScore: number
  distanceScore: number
  urgencyScore: number
  priceStabilityScore: number
  finalScore: number
  reason: string
}

export function computeMatchScore(params: {
  supplyGap: number        // surplus amount
  demandGap: number        // deficit amount
  distance: number         // km
  priceChange7d: number    // percent change
  supplierMinStock: number // how close to min
}): { finalScore: number; breakdown: Record<string, number> } {
  const maxDist = 3000 // max reasonable distance in Indonesia

  // Supply capacity score: higher surplus = better supplier
  const supplyCapacityScore = Math.min(1, Math.max(0, params.supplyGap / (params.demandGap * 1.5)))

  // Distance score: closer = better
  const distanceScore = Math.max(0, 1 - params.distance / maxDist)

  // Urgency score: bigger price increase = more urgent
  const urgencyScore = Math.min(1, Math.max(0, params.priceChange7d / 20))

  // Price stability score: lower volatility = more stable supplier
  const priceStabilityScore = Math.max(0, 1 - Math.abs(params.priceChange7d) / 30)

  // Penalty for suppliers near minimum stock
  const stockPenalty = params.supplierMinStock < 0.2 ? 0.5 : 1

  const finalScore = (
    0.35 * supplyCapacityScore +
    0.25 * distanceScore +
    0.20 * urgencyScore +
    0.20 * priceStabilityScore
  ) * stockPenalty

  return {
    finalScore: Math.round(finalScore * 100) / 100,
    breakdown: {
      supplyCapacityScore: Math.round(supplyCapacityScore * 100) / 100,
      distanceScore: Math.round(distanceScore * 100) / 100,
      urgencyScore: Math.round(urgencyScore * 100) / 100,
      priceStabilityScore: Math.round(priceStabilityScore * 100) / 100,
    }
  }
}

// ============================================================
// B. Inflation Forecast (Weighted Moving Average)
// ============================================================
export interface ForecastResult {
  forecastPrices: { date: string; price: number; lower: number; upper: number }[]
  riskLevel: 'low' | 'medium' | 'high'
  changePercent: number
  reason: string
}

export function forecastInflation(
  historicalPrices: { date: string; price: number }[],
  weeksAhead: number = 4
): ForecastResult {
  if (historicalPrices.length < 7) {
    return {
      forecastPrices: [],
      riskLevel: 'low',
      changePercent: 0,
      reason: 'Data historis tidak cukup untuk forecast.',
    }
  }

  // Weighted Moving Average with exponential decay
  const sorted = [...historicalPrices].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  const prices = sorted.map(p => p.price)
  const n = prices.length

  // Calculate WMA
  const window = Math.min(14, n)
  const weights = Array.from({ length: window }, (_, i) => Math.pow(0.9, window - 1 - i))
  const totalWeight = weights.reduce((a, b) => a + b, 0)

  const recentPrices = prices.slice(-window)
  const wma = recentPrices.reduce((sum, p, i) => sum + p * weights[i], 0) / totalWeight

  // Calculate trend (slope of last 30 data points)
  const trendWindow = Math.min(30, n)
  const trendPrices = prices.slice(-trendWindow)
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0
  for (let i = 0; i < trendPrices.length; i++) {
    sumX += i
    sumY += trendPrices[i]
    sumXY += i * trendPrices[i]
    sumX2 += i * i
  }
  const slope = (trendPrices.length * sumXY - sumX * sumY) / (trendPrices.length * sumX2 - sumX * sumX)

  // Calculate volatility
  const mean = prices.slice(-30).reduce((a, b) => a + b, 0) / Math.min(30, n)
  const variance = prices.slice(-30).reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / Math.min(30, n)
  const volatility = Math.sqrt(variance) / mean

  // Generate forecast
  const forecastPrices: ForecastResult['forecastPrices'] = []
  const lastDate = new Date(sorted[sorted.length - 1].date)
  const currentPrice = prices[n - 1]

  for (let w = 1; w <= weeksAhead; w++) {
    const forecastDate = new Date(lastDate)
    forecastDate.setDate(forecastDate.getDate() + w * 7)

    const forecast = wma + slope * w * 7
    const confidence = volatility * forecast * Math.sqrt(w) * 1.96
    forecastPrices.push({
      date: forecastDate.toISOString().split('T')[0],
      price: Math.round(forecast),
      lower: Math.round(forecast - confidence),
      upper: Math.round(forecast + confidence),
    })
  }

  const finalForecast = forecastPrices[forecastPrices.length - 1].price
  const changePercent = ((finalForecast - currentPrice) / currentPrice) * 100

  let riskLevel: 'low' | 'medium' | 'high'
  let reason: string

  if (changePercent > 10 || volatility > 0.15) {
    riskLevel = 'high'
    reason = `Proyeksi kenaikan ${changePercent.toFixed(1)}% dalam ${weeksAhead} minggu. Volatilitas tinggi (${(volatility * 100).toFixed(1)}%). Perlu intervensi segera.`
  } else if (changePercent > 5 || volatility > 0.08) {
    riskLevel = 'medium'
    reason = `Proyeksi kenaikan ${changePercent.toFixed(1)}% dalam ${weeksAhead} minggu. Tren naik terdeteksi. Monitoring intensif disarankan.`
  } else {
    riskLevel = 'low'
    reason = `Harga relatif stabil. Proyeksi perubahan ${changePercent.toFixed(1)}% masih dalam batas wajar.`
  }

  return { forecastPrices, riskLevel, changePercent, reason }
}

// ============================================================
// C. Risk Scoring
// ============================================================
export interface RiskScore {
  regionId: number
  score: number
  category: 'rendah' | 'sedang' | 'tinggi'
  factors: {
    priceIncrease: number
    supplyDemandGap: number
    priceVolatility: number
    alertFrequency: number
  }
}

export function computeRiskScore(params: {
  priceChangePercent: number
  supplyDemandGapPercent: number
  priceVolatility: number
  alertCount: number
  maxAlerts: number
}): RiskScore['factors'] & { score: number; category: 'rendah' | 'sedang' | 'tinggi' } {
  // Normalize each factor to 0-25 scale
  const priceIncrease = Math.min(25, Math.max(0, params.priceChangePercent * 2.5))
  const supplyDemandGap = Math.min(25, Math.max(0, Math.abs(params.supplyDemandGapPercent) * 1.5))
  const priceVolatility = Math.min(25, Math.max(0, params.priceVolatility * 100))
  const alertFrequency = Math.min(25, Math.max(0, (params.alertCount / Math.max(1, params.maxAlerts)) * 25))

  const score = Math.round(priceIncrease + supplyDemandGap + priceVolatility + alertFrequency)
  const category = score >= 70 ? 'tinggi' : score >= 40 ? 'sedang' : 'rendah'

  return { score, category, priceIncrease, supplyDemandGap, priceVolatility, alertFrequency }
}

// ============================================================
// D. Policy Similarity (Cosine-like rule-based)
// ============================================================
export function findSimilarPolicies(params: {
  commodityIds: number[]
  regionStatus: string
  pricePattern: 'rising' | 'stable' | 'falling'
  previousCategories: string[]
}, allPolicies: Array<{
  id: number
  regionId: number
  category: string
  tags: string
  effectivenessScore: number
}>): Array<{ policyId: number; similarityScore: number }> {
  return allPolicies.map(policy => {
    let score = 0

    // Category match
    if (params.previousCategories.includes(policy.category)) {
      score += 0.3
    }

    // Tag-based matching
    const tags = policy.tags.split(',').map(t => t.trim())
    const commodityNames: Record<number, string> = { 1: 'beras', 2: 'cabai_merah', 3: 'bawang_merah', 4: 'minyak_goreng', 5: 'gula' }
    const matchingTags = tags.filter(t =>
      params.commodityIds.some(cid => commodityNames[cid]?.includes(t)) ||
      t === 'semua_komoditas'
    )
    score += Math.min(0.3, matchingTags.length * 0.1)

    // Effectiveness bonus
    score += (policy.effectivenessScore / 100) * 0.2

    // Status-based boost
    if (params.regionStatus === 'deficit' && ['operasi_pasar', 'subsidi_distribusi'].includes(policy.category)) {
      score += 0.2
    }

    return { policyId: policy.id, similarityScore: Math.round(Math.min(1, score) * 100) / 100 }
  }).sort((a, b) => b.similarityScore - a.similarityScore)
}

// ============================================================
// Utility: Haversine Distance
// ============================================================
export function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}
