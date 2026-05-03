# 📊 EnerjiWatch Veri Seti Rehberi

## Veri Seti İhtiyacı Var mı?

**Kısa cevap: Hackathon için hayır, sentetik veri yeterli!**

### Neden Sentetik Veri?

| Avantaj | Açıklama |
|---------|----------|
| ⚡ Hızlı | Anında veri üretimi, bekleme yok |
| 🎯 Kontrollü | Anomali oranını ayarlayabilirsiniz |
| 📈 Ölçeklenebilir | İstediğiniz kadar veri üretebilirsiniz |
| 🐛 Test Kolaylığı | Bilinen anomaliler = kolay debug |
| 💰 Ücretsiz | Veri seti lisans sorunu yok |

### Gerçek Veri Seti Ne Zaman Gerekli?

- ML modeli eğitimi için (hackathon sonrası)
- Gerçek dünya validasyonu
- Yatırımcı sunumları

---

## 🚀 Hızlı Başlangıç

### 1. Python Script ile Veri Üretme

```bash
# 24 saatlik veri (1 dakika aralıkla)
python public/backend-reference/generate_dataset.py

# 48 saatlik veri
python public/backend-reference/generate_dataset.py --hours 48

# Özel ayarlarla
python public/backend-reference/generate_dataset.py \
  --hours 24 \
  --interval 60 \
  --target-temp 23 \
  --outdoor-temp 35 \
  --output klima_yaz.csv

# Birden fazla cihaz (gelecek için)
python public/backend-reference/generate_dataset.py --multi-device
```

### 2. Çıktı Formatı (CSV)

```csv
timestamp,device_id,device_type,power_watts,voltage,current_amps,power_factor,indoor_temp,outdoor_temp,is_running,compressor_load,is_anomaly,anomaly_type,cumulative_energy_kwh,estimated_cost_tl
2024-01-01 00:00:00,ac-1,ac,1523.45,218.5,6.97,0.87,28.0,28.2,True,45,False,,0.0254,0.07
2024-01-01 00:01:00,ac-1,ac,2845.12,221.2,12.86,0.89,27.8,28.1,True,78,True,spike,0.0724,0.19
```

### 3. Veri Alanları

| Alan | Tip | Açıklama |
|------|-----|----------|
| `timestamp` | datetime | Ölçüm zamanı |
| `device_id` | string | Cihaz kimliği |
| `device_type` | string | Cihaz tipi (ac, fridge, vb.) |
| `power_watts` | float | Anlık güç (Watt) |
| `voltage` | float | Voltaj (V) |
| `current_amps` | float | Akım (Amper) |
| `power_factor` | float | Güç faktörü (0-1) |
| `indoor_temp` | float | İç sıcaklık (°C) |
| `outdoor_temp` | float | Dış sıcaklık (°C) |
| `is_running` | bool | Çalışma durumu |
| `compressor_load` | int | Kompresör yükü (%) |
| `is_anomaly` | bool | Anomali işareti |
| `anomaly_type` | string | Anomali tipi |
| `cumulative_energy_kwh` | float | Toplam enerji (kWh) |
| `estimated_cost_tl` | float | Tahmini maliyet (₺) |

---

## 📈 Gerçek Veri Seti Kaynakları

Hackathon sonrası veya production için:

### Ücretsiz Veri Setleri

1. **Kaggle - Household Electric Power**
   - https://www.kaggle.com/datasets/uciml/electric-power-consumption-data-set
   - 4 yıllık veri, 1 dakika aralıkla

2. **Kaggle - HVAC Energy**
   - https://www.kaggle.com/datasets/girishvutukuri/hvac-energy-dataset

3. **UCI ML - Individual Household**
   - https://archive.ics.uci.edu/ml/datasets/individual+household+electric+power+consumption

4. **ASHRAE - Great Energy Predictor**
   - https://www.kaggle.com/c/ashrae-great-energy-predictor-iii

### Türkiye'ye Özel

- EPDK (Enerji Piyasası Düzenleme Kurumu) - İstatistikler
- TEİAŞ - Tüketim verileri (genel)
- TEDAŞ - Dağıtım verileri

---

## 🐍 FastAPI ile Veri Seti Kullanımı

### CSV'den Okuma

```python
import pandas as pd
from fastapi import FastAPI

app = FastAPI()

# Veri setini yükle
df = pd.read_csv('enerjiwatch_dataset.csv')
df['timestamp'] = pd.to_datetime(df['timestamp'])

@app.get("/api/data/{device_id}")
async def get_device_data(device_id: str, hours: int = 24):
    """Son X saatlik veriyi döndür"""
    cutoff = df['timestamp'].max() - pd.Timedelta(hours=hours)
    filtered = df[df['device_id'] == device_id]
    filtered = filtered[filtered['timestamp'] > cutoff]
    return filtered.to_dict(orient='records')

@app.get("/api/anomalies/{device_id}")
async def get_anomalies(device_id: str):
    """Anomali verilerini döndür"""
    anomalies = df[(df['device_id'] == device_id) & (df['is_anomaly'] == True)]
    return anomalies.to_dict(orient='records')
```

### Canlı Simülasyon Endpoint

```python
import asyncio
from fastapi.responses import StreamingResponse

@app.get("/api/stream/{device_id}")
async def stream_power(device_id: str):
    """SSE ile gerçek zamanlı veri akışı"""
    
    async def event_generator():
        simulator = ACEnergySimulator()
        while True:
            reading = simulator.simulate_one_step()
            yield f"data: {json.dumps(reading)}\n\n"
            await asyncio.sleep(1)
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream"
    )
```

---

## 🎯 Hackathon Önerileri

### 1. Demo Senaryosu

```
1. Kullanıcı "Başlat" butonuna basar
2. Gerçek zamanlı güç grafiği akmaya başlar
3. 30 saniye sonra anomali simüle edilir
4. Bildirim popup'ı çıkar
5. Kullanıcı ayarları değiştirir
6. Grafik değişimi gösterir
7. Günlük istatistikler güncellenir
```

### 2. Anomali Simülasyon Taktikleri

```javascript
// Frontend'de anomali tetikleme
const shouldInjectAnomaly = () => {
  // %3 olasılıkla anomali
  return Math.random() < 0.03;
};

// Anomali çeşitleri
const anomalyTypes = {
  spike: power => power * 1.5,  // Ani artış
  sustained: power => power * 1.3,  // Sürekli yüksek
  drop: power => power * 0.3,  // Ani düşüş
};
```

### 3. Sunum İçin Veri Hikayesi

```
"Sabah 08:00 - Klima normal çalışıyor, 800W"
"Öğle 13:00 - Dış sıcaklık arttı, 1200W'a çıktı"
"14:23 - ANOMALİ! Kompresör sıkışması, 2500W spike!"
"14:24 - Bildirim gönderildi, kullanıcı uyarıldı"
"14:30 - Kullanıcı klimayı kapattı, sorun çözüldü"
```

---

## 📊 Veri Görselleştirme İpuçları

### Grafik Seçenekleri

| Grafik | Kütüphane | Kullanım |
|--------|-----------|----------|
| Çizgi grafik | Recharts | Gerçek zamanlı güç |
| Area chart | Recharts | Enerji tüketimi |
| Gauge | Özel CSS | Anlık güç göstergesi |
| Heatmap | - | Saatlik tüketim paterni |
| Bar chart | Recharts | Cihaz karşılaştırma |

### Renk Kodlaması

```css
/* Güç seviyeleri */
.low-power { color: #22c55e; }    /* < %30 */
.medium-power { color: #eab308; } /* %30-60 */
.high-power { color: #f97316; }   /* %60-80 */
.critical-power { color: #ef4444; } /* > %80 */
```

---

## ✅ Kontrol Listesi

### Hackathon İçin Hazır mısınız?

- [x] Sentetik veri üreteci (Python script) ✓
- [x] Frontend simülasyon motoru ✓
- [x] Gerçek zamanlı grafik ✓
- [x] Anomali tespiti ✓
- [x] Bildirim sistemi ✓
- [ ] FastAPI backend (opsiyonel)
- [ ] Gerçek veri seti entegrasyonu (opsiyonel)

---

## 💡 Sonuç

**Hackathon için:** 
- Python script ile sentetik veri üretin ✓
- Frontend'de gerçek zamanlı simülasyon kullanın ✓
- Demo sırasında anomaliyi manuel tetikleyin

**Production için:**
- Gerçek sensör verisi veya API
- ML modeli eğitimi
- Veritabanı entegrasyonu

Başarılar! 🚀
