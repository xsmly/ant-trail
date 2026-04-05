"""
Ant Trail Analytics Service
Provides advanced forecasting, matching, and risk scoring via FastAPI.
This service is optional - the Next.js app has built-in analytics.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import numpy as np
from typing import List, Optional

app = FastAPI(
    title="Ant Trail Analytics",
    description="Layanan analitik lanjutan untuk ketahanan pangan",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class PricePoint(BaseModel):
    date: str
    price: float


class ForecastRequest(BaseModel):
    prices: List[PricePoint]
    weeks_ahead: int = 4


class ForecastResponse(BaseModel):
    forecast: List[dict]
    risk_level: str
    change_percent: float
    reason: str


class MatchRequest(BaseModel):
    supply_gap: float
    demand_gap: float
    distance: float
    price_change_7d: float
    supplier_min_stock: float


class RiskRequest(BaseModel):
    price_change_percent: float
    supply_demand_gap_percent: float
    price_volatility: float
    alert_count: int
    max_alerts: int


@app.get("/health")
def health():
    return {"status": "healthy", "service": "analytics", "version": "0.1.0"}


@app.post("/forecast", response_model=ForecastResponse)
def forecast_inflation(req: ForecastRequest):
    """
    Weighted Moving Average forecast with confidence bands.
    """
    prices = [p.price for p in req.prices]
    n = len(prices)

    if n < 7:
        return ForecastResponse(
            forecast=[],
            risk_level="low",
            change_percent=0,
            reason="Data historis tidak cukup untuk forecast.",
        )

    # Weighted Moving Average
    window = min(14, n)
    weights = np.array([0.9 ** (window - 1 - i) for i in range(window)])
    weights /= weights.sum()
    recent = np.array(prices[-window:])
    wma = float(np.dot(recent, weights))

    # Trend via linear regression on last 30 points
    trend_window = min(30, n)
    trend_prices = np.array(prices[-trend_window:])
    x = np.arange(trend_window)
    slope = float(np.polyfit(x, trend_prices, 1)[0])

    # Volatility
    vol_window = min(30, n)
    vol_prices = np.array(prices[-vol_window:])
    volatility = float(np.std(vol_prices) / np.mean(vol_prices))

    # Generate forecast
    forecasts = []
    from datetime import datetime, timedelta

    last_date = datetime.strptime(req.prices[-1].date, "%Y-%m-%d")
    current_price = prices[-1]

    for w in range(1, req.weeks_ahead + 1):
        fc_date = last_date + timedelta(weeks=w)
        fc_price = wma + slope * w * 7
        confidence = volatility * fc_price * np.sqrt(w) * 1.96
        forecasts.append(
            {
                "date": fc_date.strftime("%Y-%m-%d"),
                "price": round(fc_price),
                "lower": round(fc_price - confidence),
                "upper": round(fc_price + confidence),
            }
        )

    final_price = forecasts[-1]["price"]
    change = ((final_price - current_price) / current_price) * 100

    if change > 10 or volatility > 0.15:
        risk = "high"
        reason = f"Proyeksi kenaikan {change:.1f}% dalam {req.weeks_ahead} minggu. Volatilitas tinggi ({volatility*100:.1f}%). Perlu intervensi segera."
    elif change > 5 or volatility > 0.08:
        risk = "medium"
        reason = f"Proyeksi kenaikan {change:.1f}%. Tren naik terdeteksi. Monitoring intensif disarankan."
    else:
        risk = "low"
        reason = f"Harga relatif stabil. Perubahan {change:.1f}% dalam batas wajar."

    return ForecastResponse(
        forecast=forecasts,
        risk_level=risk,
        change_percent=round(change, 2),
        reason=reason,
    )


@app.post("/match-score")
def compute_match(req: MatchRequest):
    """
    Compute demand-supply match score.
    final_score = 0.35 * supply_capacity + 0.25 * distance + 0.20 * urgency + 0.20 * price_stability
    """
    max_dist = 3000

    supply_capacity = min(1, max(0, req.supply_gap / (req.demand_gap * 1.5)))
    distance_score = max(0, 1 - req.distance / max_dist)
    urgency = min(1, max(0, req.price_change_7d / 20))
    stability = max(0, 1 - abs(req.price_change_7d) / 30)

    penalty = 0.5 if req.supplier_min_stock < 0.2 else 1

    final = (
        0.35 * supply_capacity + 0.25 * distance_score + 0.20 * urgency + 0.20 * stability
    ) * penalty

    return {
        "final_score": round(final, 3),
        "breakdown": {
            "supply_capacity": round(supply_capacity, 3),
            "distance": round(distance_score, 3),
            "urgency": round(urgency, 3),
            "price_stability": round(stability, 3),
        },
    }


@app.post("/risk-score")
def compute_risk(req: RiskRequest):
    """
    Compute regional risk score (0-100).
    """
    price_increase = min(25, max(0, req.price_change_percent * 2.5))
    sd_gap = min(25, max(0, abs(req.supply_demand_gap_percent) * 1.5))
    volatility = min(25, max(0, req.price_volatility * 100))
    alert_freq = min(25, max(0, (req.alert_count / max(1, req.max_alerts)) * 25))

    score = round(price_increase + sd_gap + volatility + alert_freq)
    category = "tinggi" if score >= 70 else "sedang" if score >= 40 else "rendah"

    return {
        "score": score,
        "category": category,
        "factors": {
            "price_increase": round(price_increase, 1),
            "supply_demand_gap": round(sd_gap, 1),
            "price_volatility": round(volatility, 1),
            "alert_frequency": round(alert_freq, 1),
        },
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
