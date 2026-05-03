"""
EnerjiWatch - FastAPI Backend Referans Kodu
============================================

Bu dosya hackathon'da kullanabileceğiniz FastAPI backend yapısını gösterir.

Kurulum:
    pip install fastapi uvicorn pandas scikit-learn openai python-dotenv

Çalıştırma:
    uvicorn fastapi_example:app --reload --host 0.0.0.0 --port 8000
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import random
import math

# OpenAI API (isteğe bağlı - doğal dil öneriler için)
# import openai
# openai.api_key = "your-api-key"

app = FastAPI(
    title="EnerjiWatch API",
    description="Akıllı Klima Enerji Takip ve Analiz API",
    version="1.0.0"
)

# CORS ayarları (frontend bağlantısı için)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Production'da specific domain kullanın
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============ Modeller ============

class ACUnit(BaseModel):
    id: str
    name: str
    btu: int
    cop: float
    brand: str


class SimulationConfig(BaseModel):
    ac_unit: ACUnit
    base_indoor_temp: float = 28.0
    base_outdoor_temp: float = 32.0
    target_temp: float = 24.0
    electricity_price: float = 2.64


class EnergyReading(BaseModel):
    timestamp: datetime
    hour: int
    indoor_temp: float
    outdoor_temp: float
    target_temp: float
    power_consumption: float
    is_running: bool
    mode: str


class Alert(BaseModel):
    id: str
    type: str  # warning, critical, info, suggestion
    title: str
    message: str
    timestamp: datetime
    icon: str


class AnalysisResult(BaseModel):
    readings: List[EnergyReading]
    alerts: List[Alert]
    total_energy: float
    estimated_cost: float
    efficiency_score: float


# ============ Simülasyon Fonksiyonları ============

def get_outdoor_temp(hour: int, base_temp: float) -> float:
    """Günün saatine göre dış sıcaklık profili"""
    temp_curve = [
        -4, -5, -5, -6, -5, -3, 0, 3, 5, 7, 8, 9,
        9, 10, 10, 9, 7, 5, 3, 1, 0, -1, -2, -3
    ]
    return base_temp + temp_curve[hour] + random.uniform(-1, 1)


def calculate_energy(is_running: bool, btu: int, cop: float, 
                     indoor_temp: float, target_temp: float) -> float:
    """Klima enerji tüketimi hesaplama"""
    if not is_running:
        return 0.02 + random.uniform(0, 0.03)
    
    temp_diff = abs(indoor_temp - target_temp)
    load_factor = min(temp_diff / 5, 1)
    base_power = (btu / cop) / 1000
    
    return base_power * load_factor * random.uniform(0.85, 1.15)


def simulate_24_hours(config: SimulationConfig) -> List[EnergyReading]:
    """24 saatlik klima simülasyonu"""
    readings = []
    current_indoor = config.base_indoor_temp
    ac_capacity = config.ac_unit.btu / 3412
    
    for hour in range(24):
        outdoor_temp = get_outdoor_temp(hour, config.base_outdoor_temp)
        
        # Termostat davranışı (histerizis)
        hysteresis = 1.5
        is_running = True
        mode = "cooling"
        
        if current_indoor < config.target_temp - hysteresis:
            is_running = False
            mode = "idle"
        elif current_indoor > config.target_temp + hysteresis:
            is_running = True
            mode = "cooling"
        
        # Gece modu
        if hour >= 23 or hour < 6:
            if current_indoor < config.target_temp + 2:
                is_running = False
                mode = "idle"
        
        # Sıcaklık güncelleme
        heat_gain = (outdoor_temp - current_indoor) * 0.05
        cooling = -ac_capacity * 0.1 if is_running else 0
        current_indoor += heat_gain + cooling + random.uniform(-0.15, 0.15)
        
        # Enerji tüketimi
        power = calculate_energy(
            is_running, config.ac_unit.btu, config.ac_unit.cop,
            current_indoor, config.target_temp
        )
        
        readings.append(EnergyReading(
            timestamp=datetime(2024, 1, 1, hour),
            hour=hour,
            indoor_temp=round(current_indoor, 1),
            outdoor_temp=round(outdoor_temp, 1),
            target_temp=config.target_temp,
            power_consumption=round(power, 2),
            is_running=is_running,
            mode=mode
        ))
    
    return readings


def detect_anomalies(readings: List[EnergyReading]) -> List[int]:
    """Z-Score ile anomali tespiti"""
    energies = [r.power_consumption for r in readings]
    mean = sum(energies) / len(energies)
    std_dev = math.sqrt(sum((x - mean) ** 2 for x in energies) / len(energies))
    
    anomalies = []
    for i, reading in enumerate(energies):
        if std_dev > 0:
            z_score = abs((reading - mean) / std_dev)
            if z_score > 2:
                anomalies.append(i)
    
    return anomalies


def generate_ai_alerts(readings: List[EnergyReading], 
                       anomaly_indices: List[int]) -> List[Alert]:
    """AI destekli uyarı ve öneriler oluştur"""
    alerts = []
    now = datetime.now()
    
    # Anomali uyarıları
    energies = [r.power_consumption for r in readings if r.power_consumption > 0.1]
    avg_energy = sum(energies) / len(energies) if energies else 0
    
    for idx in anomaly_indices:
        reading = readings[idx]
        if reading.power_consumption > avg_energy:
            percent = ((reading.power_consumption - avg_energy) / avg_energy) * 100
            alerts.append(Alert(
                id=f"anomaly-{idx}",
                type="critical" if percent > 50 else "warning",
                title=f"{reading.hour:02d}:00 saatinde anormal tüketim",
                message=f"Normalden %{percent:.0f} fazla enerji tüketimi tespit edildi.",
                timestamp=now,
                icon="⚠️"
            ))
    
    # Yüksek sıcaklık uyarısı
    max_outdoor = max(r.outdoor_temp for r in readings)
    if max_outdoor > 35:
        alerts.append(Alert(
            id="high-temp",
            type="info",
            title="Yüksek dış sıcaklık",
            message=f"Dış sıcaklık {max_outdoor:.1f}°C'ye ulaştı.",
            timestamp=now,
            icon="🌡️"
        ))
    
    # Tasarruf önerileri
    total_energy = sum(r.power_consumption for r in readings)
    if total_energy > 15:
        alerts.append(Alert(
            id="savings",
            type="suggestion",
            title="Tasarruf önerisi",
            message="Hedef sıcaklığı 1-2°C artırarak %10-15 tasarruf sağlayabilirsiniz.",
            timestamp=now,
            icon="💡"
        ))
    
    # Gece modu önerisi
    night_energy = sum(r.power_consumption for r in readings 
                       if r.hour >= 23 or r.hour < 6)
    if night_energy > total_energy * 0.15:
        alerts.append(Alert(
            id="night-mode",
            type="suggestion",
            title="Gece modu önerisi",
            message="Gece saatlerinde uyku modu kullanarak tasarruf edebilirsiniz.",
            timestamp=now,
            icon="🌙"
        ))
    
    return alerts


# ============ API Endpoints ============

@app.get("/")
async def root():
    return {
        "app": "EnerjiWatch API",
        "version": "1.0.0",
        "endpoints": {
            "/api/simulate": "POST - 24 saatlik simülasyon çalıştır",
            "/api/analyze": "POST - Enerji analizi ve AI önerileri",
            "/api/models": "GET - Desteklenen klima modelleri",
            "/api/health": "GET - Sağlık kontrolü"
        }
    }


@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now()}


@app.get("/api/models")
async def get_ac_models():
    """Desteklenen klima modellerini listele"""
    return [
        {"id": "1", "name": "Bosch Climate 3000i", "btu": 12000, "cop": 3.5, "brand": "Bosch"},
        {"id": "2", "name": "Daishi Ururu Sarara", "btu": 18000, "cop": 4.2, "brand": "Daikin"},
        {"id": "3", "name": "Midea Xtreme Save", "btu": 24000, "cop": 3.8, "brand": "Midea"},
        {"id": "4", "name": "Samsung WindFree", "btu": 12000, "cop": 4.0, "brand": "Samsung"},
        {"id": "5", "name": "LG DUALCOOL", "btu": 18000, "cop": 3.9, "brand": "LG"},
    ]


@app.post("/api/simulate")
async def simulate(config: SimulationConfig):
    """24 saatlik klima simülasyonu çalıştır"""
    try:
        readings = simulate_24_hours(config)
        return {
            "readings": readings,
            "total_energy": sum(r.power_consumption for r in readings),
            "config": config
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/analyze")
async def analyze(config: SimulationConfig):
    """Enerji analizi ve AI önerileri"""
    try:
        # Simülasyon
        readings = simulate_24_hours(config)
        
        # Anomali tespiti
        anomaly_indices = detect_anomalies(readings)
        
        # Anomalileri işaretle (gerçek uygulamada DB'ye kaydedilir)
        for idx in anomaly_indices:
            readings[idx]  # Burada anomali bilgisi eklenebilir
        
        # AI uyarıları
        alerts = generate_ai_alerts(readings, anomaly_indices)
        
        # İstatistikler
        total_energy = sum(r.power_consumption for r in readings)
        estimated_cost = total_energy * config.electricity_price
        
        # Verimlilik skoru
        max_possible = 30  # kWh
        efficiency = max(0, min(100, 100 - (total_energy / max_possible) * 100))
        
        return AnalysisResult(
            readings=readings,
            alerts=alerts,
            total_energy=round(total_energy, 2),
            estimated_cost=round(estimated_cost, 2),
            efficiency_score=round(efficiency)
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============ OpenAI Entegrasyonu (Opsiyonel) ============

# @app.post("/api/ai-advice")
# async def get_ai_advice(config: SimulationConfig):
#     """OpenAI ile doğal dilde öneriler"""
#     readings = simulate_24_hours(config)
#     anomaly_indices = detect_anomalies(readings)
#     
#     # Prompt oluştur
#     energy_data = [
#         {"hour": r.hour, "energy": r.power_consumption, "temp": r.indoor_temp}
#         for r in readings
#     ]
#     
#     prompt = f"""
#     Bir ev kliması enerji tüketim verisini analiz et:
#     - Toplam tüketim: {sum(r.power_consumption for r in readings):.1f} kWh
#     - Anomali sayısı: {len(anomaly_indices)}
#     - Klima modeli: {config.ac_unit.name} ({config.ac_unit.btu} BTU)
#     - Hedef sıcaklık: {config.target_temp}°C
#     
#     Kullanıcıya pratik tasarruf önerileri sun (Türkçe, madde madde).
#     """
#     
#     response = openai.ChatCompletion.create(
#         model="gpt-3.5-turbo",
#         messages=[
#             {"role": "system", "content": "Sen bir enerji verimliliği uzmanısın."},
#             {"role": "user", "content": prompt}
#         ],
#         max_tokens=500
#     )
#     
#     return {"advice": response.choices[0].message.content}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
