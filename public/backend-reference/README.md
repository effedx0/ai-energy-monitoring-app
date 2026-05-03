# EnerjiWatch - FastAPI Backend

## 🚀 Hızlı Başlangıç

### 1. Ortam Kurulumu

```bash
# Sanal ortam oluştur
python -m venv venv

# Aktive et (Linux/Mac)
source venv/bin/activate

# Aktive et (Windows)
venv\Scripts\activate

# Bağımlılıkları yükle
pip install fastapi uvicorn pandas scikit-learn python-dotenv
```

### 2. API'yi Başlatma

```bash
# Development modu
uvicorn fastapi_example:app --reload --host 0.0.0.0 --port 8000

# Production modu
uvicorn fastapi_example:app --host 0.0.0.0 --port 8000 --workers 4
```

### 3. API Dokümantasyonu

Swagger UI: http://localhost:8000/docs
ReDoc: http://localhost:8000/redoc

## 📡 API Endpoints

### GET /api/health
Sunucu sağlık kontrolü

### GET /api/models
Desteklenen klima modellerini listeler

### POST /api/simulate
24 saatlik klima simülasyonu çalıştırır

**Request Body:**
```json
{
  "ac_unit": {
    "id": "1",
    "name": "Bosch Climate 3000i",
    "btu": 12000,
    "cop": 3.5,
    "brand": "Bosch"
  },
  "base_indoor_temp": 28,
  "base_outdoor_temp": 32,
  "target_temp": 24,
  "electricity_price": 2.64
}
```

### POST /api/analyze
Enerji analizi ve AI önerileri

**Response:**
```json
{
  "readings": [...],
  "alerts": [...],
  "total_energy": 12.5,
  "estimated_cost": 33.0,
  "efficiency_score": 75
}
```

## 🐍 Python Klima Enerji Modelleme

### Temel Formüller

```
Enerji Tüketimi (kWh) = (BTU / COP) / 1000 × Yük Faktörü × Çalışma Süresi

Yük Faktörü = min(|İç Sıcaklık - Hedef Sıcaklık| / 5, 1)
```

### BTU ve COP Değerleri

| Marka | Model | BTU | COP |
|-------|-------|-----|-----|
| Bosch | Climate 3000i | 12,000 | 3.5 |
| Daikin | Ururu Sarara | 18,000 | 4.2 |
| Midea | Xtreme Save | 24,000 | 3.8 |
| Samsung | WindFree | 12,000 | 4.0 |
| LG | DUALCOOL | 18,000 | 3.9 |

### Anomali Tespiti (Z-Score)

```python
z_score = (value - mean) / std_dev

# |z_score| > 2 ise anomali
```

## 🔗 Frontend Bağlantısı

React uygulamanızdan API'yi çağırmak için:

```typescript
// src/api/enerjiwatch.ts
const API_BASE = 'http://localhost:8000';

export async function analyzeEnergy(config: SimulationConfig) {
  const response = await fetch(`${API_BASE}/api/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config)
  });
  return response.json();
}
```

## 📊 Veri Seti Önerileri

Gerçek veri ile eğitmek isterseniz:

1. **Kaggle**: "Residential Energy Consumption" veri seti
2. **UCI ML**: "Individual household electric power consumption"
3. **ASHRAE**: HVAC performans verileri

## 🤖 OpenAI Entegrasyonu

```bash
pip install openai
```

`.env` dosyası:
```
OPENAI_API_KEY=your-api-key-here
```

## 🚀 Deployment

### Docker
```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["uvicorn", "fastapi_example:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Railway / Render
1. GitHub'a push edin
2. Railway.app veya Render.com'da yeni proje oluşturun
3. Build command: `pip install -r requirements.txt`
4. Start command: `uvicorn fastapi_example:app --host 0.0.0.0 --port $PORT`

## 📝 Hackathon İpuçları

1. **Hızlı Demo**: Frontend'deki simülasyon yeterli, backend'i sonra entegre edin
2. **Veri Görselleştirme**: Recharts veya Chart.js kullanın
3. **Mobil Uyumluluk**: PWA desteği ekleyin
4. **AI Öneriler**: Basit kurallar + OpenAI API karışımı kullanın
5. **Sunum**: Canlı demo + teknik açıklama hazırlayın
