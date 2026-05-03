from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict, Any, Literal
import os
import httpx
import json
from datetime import datetime, timezone

app = FastAPI(title="AI Advice API")

# Allow requests from local frontend dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:4173", "http://localhost:4173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Rol seçenekleri ve sistem talimatları
ROLE_INSTRUCTIONS = {
    "assistant": (
        "Sen pratik bir akıllı ev asistanısın. KESİNLİKLE yapay zeka gibi konuşma (Merhaba, "
        "İşte önerilerim gibi giriş/çıkış cümleleri YASAK). Direkt konuya gir. Tek cümleyle sorunu özetle "
        "ve 2-3 maddelik çok kısa, anında uygulanabilir çözümler sun. Samimi ve net ol."
    ),
    "data_analyst": (
        "Sen bir VERİ ANALİSTİ ve enerji trendleri uzmanısın. Verilen enerji tüketim anomalisini istatistiksel ve "
        "analitik açıdan yaklaş. Şunları ver: (1) Bu anomalinin istatistiksel anlamı (z-score, standart sapma), "
        "(2) Tarihi verilerle karşılaştırması (eğer pattern varsa), (3) Tahmin edilen devam etme olasılığı, "
        "(4) Enerji yönetimi için çıkarılacak veriye dayalı sonuçlar. Sayılar ve yüzdeleri kullan, kesin ol."
    ),
    "energy_expert": (
        "Sen bir ENERJI YÖNETIMI ve emPower uzmanısın. Binalar/evler için enerji verimlilik stratejileri geliştiren "
        "danışman varsayıl. Verilen anomaliyi şöyle analiz et: (1) Enerji verimliliği perspektifinden sebepleri, "
        "(2) Uzun vadeli maliyet etkileri (kWh × fiyat), (3) Karbonit ayak izi etkisi, (4) Yavaş ve hızlı "
        "iyileştirme önerileri. Pratik ve ekonomik çözümler sun. Fatura tasarrufu ve çevre bilinci vurgu yapı."
    ),
    "technician": (
        "Sen bir TEKNİK SERVİS UZMANISN. Cihaz arızalarını teşhis etmek ve onarımak için eğitilmiş. "
        "Verilen anomaliyi şöyle işle: (1) En olası 4 teknik arızanın sırasını (olasılıktan yüksekten düşüğe), "
        "her biri için semptomlar, (2) Hızlı teşhis adımları (kullanıcı yapabilir), (3) Onarımdan önce kendi başına "
        "yapması gereken safety kontroller, (4) Servis çağrılması gerekiyorsa hangi detayları açıklaması gerektiğini söyle. "
        "Teknik ama güvenlik bilinci taşıyabilir çıkmazlar yak. Net talimatlar ver."
    ),
    "budget_advisor": (
        "Sen bir BÜTÇE VE MALİYET DANIŞMANI. Hanelerin enerji giderleri üzerine uzman. "
        "Verilen anomaliyi şöyle analiz et: (1) Bu anomalinin aylık/yıllık enerji faturasına etkisi (Türkiye tarife 4,5 TL/kWh), "
        "(2) Cihaz değişiminden tasarruf ile yatırım karşılaştırması, (3) Geri ödeme süresi (payback period), "
        "(4) İçinde devlet destekleri/krediler varsa onları da gözet. Somut para rakamları kullan, gerçekçi ol."
    ),
}

# Tuple of allowed roles
ALLOWED_ROLES = tuple(ROLE_INSTRUCTIONS.keys())


class ExpectedRange(BaseModel):
    min: Optional[float]
    max: Optional[float]


class AnomalyAlertIn(BaseModel):
    type: str
    powerValue: float
    expectedRange: Optional[ExpectedRange]
    message: Optional[str] = None
    deviceType: Optional[str] = None
    deviceName: Optional[str] = None


class ConsentRecordIn(BaseModel):
    accepted: bool
    consentVersion: str
    acceptedAt: str
    anonUserId: str
    optionalAnalytics: bool = False


def normalize_device_type(device_type: Optional[str], device_name: Optional[str]) -> str:
    raw = (device_type or '').strip().lower()
    if raw in {'ac', 'fridge', 'washer', 'oven', 'heater', 'lighting'}:
        return raw

    name = (device_name or '').strip().lower()
    if 'fırın' in name or 'firin' in name:
        return 'oven'
    if 'buzdolabı' in name or 'buzdolabi' in name:
        return 'fridge'
    if 'çamaşır' in name or 'camasir' in name:
        return 'washer'
    if 'ısıtıcı' in name or 'isitici' in name:
        return 'heater'
    if 'aydınlat' in name or 'aydinlat' in name:
        return 'lighting'
    return 'ac'


def get_device_label(device_type: str) -> str:
    return {
        'ac': 'klima',
        'fridge': 'buzdolabı',
        'washer': 'çamaşır makinesi',
        'oven': 'fırın',
        'heater': 'ısıtıcı',
        'lighting': 'aydınlatma',
    }.get(device_type, 'cihaz')


def build_role_specific_prompt(role: str, anomaly: AnomalyAlertIn, device_label: str) -> tuple[str, str]:
    """Buid role-specific system instruction and prompt"""
    
    base_info = (
        f"Cihaz: {device_label}\n"
        f"Anomali Türü: {anomaly.type}\n"
        f"Anlık Güç: {anomaly.powerValue}W\n"
        f"Beklenen Aralık: {anomaly.expectedRange.min if anomaly.expectedRange else 'N/A'}W - "
        f"{anomaly.expectedRange.max if anomaly.expectedRange else 'N/A'}W\n"
        f"Mesaj: {anomaly.message or 'Tanımlanmadı'}"
    )
    
    if role == "assistant":
        system = (
            "Sen pratik bir akıllı ev asistanısın. KESINLIKLE yapay zeka cevap ver, 'Merhaba' veya "
            "'İşte önerilerim' gibi giriş/çıkış cümleleri YASAK. Direkt konuya gir. "
            "Sorunu tek cümleyle özetle ve 2-3 maddelik çok kısa, anında uygulanabilir çözümler sun. "
            "Samimi, net, pratik ol. Sadece Türkçe."
        )
        prompt = (
            f"Şu enerji anomalisine pratik çözümler sun:\n\n{base_info}\n\n"
            "Sorunu bir cümleyle özetle, sonra 2-3 maddelik çözüm ver. Kısa ve net."
        )
    
    elif role == "data_analyst":
        system = (
            "Sen bir VERİ ANALİSTİ ve enerji trendleri uzmanısın. Anomaliyi istatistiksel ve "
            "matematiksel açıdan analiz et. Z-score, standart sapma, olasılık yüzdeleri kullan. "
            "Sayıları ve oranları açık yaz. Historik karşılaştırma, trend analizi yap. "
            "Kesin, matematiksel, bilimsel ton. Sadece Türkçe."
        )
        prompt = (
            f"Bu anomaliyi VERİ ANALİTİK açıdan analiz et:\n\n{base_info}\n\n"
            "Şunları yap:\n"
            "1. Anomalinin istatistiksel anlamını açık (z-score, standart sapma baz al)\n"
            "2. Normalden sapma yüzdesini hesapla\n"
            "3. Bu pattern'in tekrarlanma olasılığını % ile ver\n"
            "4. Anomali devam ederse enerji tahminini ver\n"
            "Sayılar ve % kullan, kesin ol."
        )
    
    elif role == "energy_expert":
        system = (
            "Sen bir ENERJI YÖNETIMI ve verimlilik danışmanısın. Binalarda enerji stratejisi geliştirirsin. "
            "Anomaliyi enerji verimliliği, maliyet, tasarruf, karbonit ayak izi açılarından incele. "
            "Para rakamları (₺, TL) ve enerji (kWh) birlikleri kullan. Uzun vadeli etkiyi söyle. "
            "Pratik, ekonomik çözümler sun. Sadece Türkçe."
        )
        prompt = (
            f"Bu anomaliyi ENERJİ VERİMLİLİĞİ açısından analiz et:\n\n{base_info}\n\n"
            "Şunları yap:\n"
            "1. Sebepleri verimlilik perspektifinden açıkla\n"
            "2. Günlük/aylık enerji ve maliyet artışını hesapla (4,5 TL/kWh, günde 8 saat çalışma baz al)\n"
            "3. Yıllık fatura artışını ver (₺ cinsinden)\n"
            "4. Çevre etkisini ve CO2 ayak izini söyle\n"
            "5. Hızlı ve yavaş iyileştirme önerileri ver\n"
            "Gerçekçi, ekonomik, somut rakamlar kullan."
        )
    
    elif role == "technician":
        system = (
            "Sen bir TEKNİK SERVİS UZMANISSIN. Elektrikli cihazları teşhis ve onarırsın. "
            "Anomaliyi teknik açıdan incele. Olası arızaları olasılığa göre sırala. "
            "Kullanıcının yapabileceği test adımları, safety protokolleri ver. "
            "Servis çağırma kriterleri açık yaz. Teknik ama anlaşılır, güvenlik öncelikli. "
            "Sadece Türkçe."
        )
        prompt = (
            f"Bu anomaliyi TEKNİK olarak teşhis et:\n\n{base_info}\n\n"
            "Şunları yap:\n"
            "1. En olası 3 teknik arızayı olasılık sırasıyla listele, her biri için semptomlar yaz\n"
            "2. Kullanıcının hemen yapabileceği 3 teşhis adımı ver (güvenli)\n"
            "3. Onarımdan önce yapılması gereken safety kontroller list et\n"
            "4. Servis çağırılması gereken belirtileri söyle\n"
            "Net, adım adım, güvenlik bilinci taşı."
        )
    
    elif role == "budget_advisor":
        system = (
            "Sen bir BÜTÇE ve MALİYET DANIŞMANISSIN. Hanelerin enerji giderlerini yönetirsin. "
            "Anomaliyi ekonomik açıdan analiz et. Para rakamları (₺, TL), ROI, geri ödeme süresi kullan. "
            "Devlet destekleri, krediler hakkında bilgi ver. Gerçekçi, kesin, finansal aksiyonerble. "
            "Sadece Türkçe."
        )
        prompt = (
            f"Bu anomaliyi BÜTÇE açısından analiz et:\n\n{base_info}\n\n"
            "Şunları yap:\n"
            "1. Bu anomalinin günlük/aylık/yıllık fatura artışını ₺ cinsinden hesapla (4,5 TL/kWh)\n"
            "2. Cihaz değişiyle ne kadar tasarruf yapılabilir % ile ver\n"
            "3. Yeni cihazın maliyeti vs tasarrufu karşılaştır (örneğin: cihaz 3000₺, 2 yılda çıkar)\n"
            "4. Payback period (geri ödeme süresi) hesapla\n"
            "5. Devlet GREEN desteği/kredisi varsa söyle\n"
            "Somut para rakamları, ROI, kesin projeksiyonlar kullan."
        )
    
    else:
        # Fallback to assistant
        system = ROLE_INSTRUCTIONS["assistant"]
        prompt = f"Enerji anomalisine pratik çözümler sun:\n\n{base_info}"
    
    return system, prompt


def build_demo_advice(device_type: str, anomaly_type: str) -> str:
    device_label = get_device_label(device_type)

    if device_type == 'oven':
        if anomaly_type == 'spike':
            return (
                f"⚠️ **{device_label.title()} Ani Güç Sıçraması**\n"
                "Fırın rezistansı veya termostat kısa süreli aşırı yük çekmiş olabilir.\n\n"
                "**Hızlı Çözümler:**\n"
                "1. **Sıcaklığı Kontrol Edin:** Gereğinden yüksek ayar yapmadığından emin ol.\n"
                "2. **Kapak Contasını Kontrol Et:** Isı kaçağı varsa cihaz daha fazla çalışır.\n"
                "3. Tekrarlarsa rezistans/termostat için servis çağır."
            )
        if anomaly_type == 'threshold_exceeded':
            return (
                f"⚠️ **{device_label.title()} Sürekli Yüksek Tüketim**\n"
                "Fırın uzun süre yüksek güçte çalışıyor; ön ısıtma, fan veya yalıtım sorunu olabilir.\n\n"
                "**Hızlı Çözümler:**\n"
                "1. **Ön Isıtmayı Kısalt:** Gereksiz uzun ön ısıtmadan kaçın.\n"
                "2. **Kapak Açma-Sıkma Yapma:** Sıcaklık kaybı güç tüketimini artırır.\n"
                "3. Fan/rezistans ayarını ve iç temizlik durumunu kontrol et."
            )
        return (
            f"⚠️ **{device_label.title()} Olağandışı Tüketim**\n"
            "Fırın normal kullanım düzeninin dışında çalışıyor olabilir.\n\n"
            "**Hızlı Çözümler:**\n"
            "1. Cihazı kısa süre kapatıp yeniden başlat.\n"
            "2. İç haznede birikmiş kir veya engel olup olmadığını kontrol et.\n"
            "3. Sorun sürerse teknik servis çağır."
        )

    if device_type == 'washer':
        if anomaly_type == 'spike':
            return (
                f"⚠️ **{device_label.title()} Ani Güç Sıçraması**\n"
                "Motor veya ısıtıcı kısa süreli fazla yük çekmiş olabilir.\n\n"
                "**Hızlı Çözümler:**\n"
                "1. Yük dengesini kontrol et.\n"
                "2. Filtre ve tahliye hattını temizle.\n"
                "3. Tekrarlarsa servis çağır."
            )
        if anomaly_type == 'threshold_exceeded':
            return (
                f"⚠️ **{device_label.title()} Sürekli Yüksek Tüketim**\n"
                "Yıkama programı, su ısıtma veya tambur yükü cihazı zorlayabilir.\n\n"
                "**Hızlı Çözümler:**\n"
                "1. Daha kısa/ekonomik program seç.\n"
                "2. Fazla çamaşır yüklemediğinden emin ol.\n"
                "3. Filtre ve pompayı kontrol et."
            )
        return (
            f"⚠️ **{device_label.title()} Olağandışı Tüketim**\n"
            "Motor ya da su pompası beklenmedik şekilde zorlanıyor olabilir.\n\n"
            "**Hızlı Çözümler:**\n"
            "1. Makineyi durdurup yükü azalt.\n"
            "2. Drenaj/tahliye filtresini temizle.\n"
            "3. Sorun sürerse servis çağır."
        )

    if device_type == 'fridge':
        if anomaly_type == 'spike':
            return (
                f"⚠️ **{device_label.title()} Ani Güç Sıçraması**\n"
                "Kompresör kısa süreli aşırı yüklenmiş olabilir.\n\n"
                "**Hızlı Çözümler:**\n"
                "1. Kapı contası ve kapı kapanışını kontrol et.\n"
                "2. Arka ızgarayı tozdan temizle.\n"
                "3. Tekrarlarsa servis çağır."
            )
        if anomaly_type == 'threshold_exceeded':
            return (
                f"⚠️ **{device_label.title()} Sürekli Yüksek Tüketim**\n"
                "Soğutma yükü artmış olabilir ya da cihaz verimsiz çalışıyor olabilir.\n\n"
                "**Hızlı Çözümler:**\n"
                "1. Kapı açılma sıklığını azalt.\n"
                "2. Arka kısmı havalandır.\n"
                "3. Termostatı orta seviyeye al."
            )
        return (
            f"⚠️ **{device_label.title()} Olağandışı Tüketim**\n"
            "Kompresör döngüsü veya defrost sistemi beklenmedik şekilde çalışıyor olabilir.\n\n"
            "**Hızlı Çözümler:**\n"
            "1. Cihazın etrafında boşluk bırak.\n"
            "2. Kapı contalarını kontrol et.\n"
            "3. Sorun devam ederse servis çağır."
        )

    if device_type == 'heater':
        if anomaly_type == 'spike':
            return (
                f"⚠️ **{device_label.title()} Ani Güç Sıçraması**\n"
                "Rezistans veya sıcaklık kontrolü kısa süreli fazla yük çekmiş olabilir.\n\n"
                "**Hızlı Çözümler:**\n"
                "1. Isı ayarını düşür.\n"
                "2. Cihazın önünü kapatan nesneleri kaldır.\n"
                "3. Tekrarlarsa servis çağır."
            )
        if anomaly_type == 'threshold_exceeded':
            return (
                f"⚠️ **{device_label.title()} Sürekli Yüksek Tüketim**\n"
                "Cihaz uzun süre maksimuma yakın çalışıyor olabilir.\n\n"
                "**Hızlı Çözümler:**\n"
                "1. Oda sıcaklığı ayarını biraz yükselt.\n"
                "2. Oda yalıtımını kontrol et.\n"
                "3. Termostatı ve fan modunu kontrol et."
            )
        return (
            f"⚠️ **{device_label.title()} Olağandışı Tüketim**\n"
            "Isıtıcı verimsiz çalışıyor veya sensör okuması sapmış olabilir.\n\n"
            "**Hızlı Çözümler:**\n"
            "1. Cihazı kapatıp yeniden başlat.\n"
            "2. Hava giriş/çıkışını temiz tut.\n"
            "3. Sorun sürerse servis çağır."
        )

    if device_type == 'lighting':
        if anomaly_type == 'spike':
            return (
                f"⚠️ **{device_label.title()} Ani Güç Sıçraması**\n"
                "LED sürücüsü veya bağlantı hattında geçici bir problem olabilir.\n\n"
                "**Hızlı Çözümler:**\n"
                "1. Bağlantıları kontrol et.\n"
                "2. Uyumsuz dimmer varsa devre dışı bırak.\n"
                "3. Tekrarlarsa elektrikçi çağır."
            )
        if anomaly_type == 'threshold_exceeded':
            return (
                f"⚠️ **{device_label.title()} Sürekli Yüksek Tüketim**\n"
                "Aydınlatma devresi beklenenden fazla enerji tüketiyor olabilir.\n\n"
                "**Hızlı Çözümler:**\n"
                "1. Gereksiz açık kalan ışıkları kapat.\n"
                "2. Daha verimli ampul kullan.\n"
                "3. Sürücü/trafoyu kontrol et."
            )
        return (
            f"⚠️ **{device_label.title()} Olağandışı Tüketim**\n"
            "Bağlantı veya sürücü tarafında beklenmeyen bir yük var.\n\n"
            "**Hızlı Çözümler:**\n"
            "1. Devreyi kısa süre kapatıp test et.\n"
            "2. Bağlantı gevşekliği var mı kontrol et.\n"
            "3. Sorun sürerse uzman çağır."
        )

    if anomaly_type == 'spike':
        return (
            f"⚠️ **{device_label.title()} Ani Güç Sıçraması**\n"
            "Kompresör kısa süreli zorlanmış veya şebekede dalgalanma olabilir.\n\n"
            "**Hızlı Çözümler:**\n"
            "1. Filtreleri temizle.\n"
            "2. Voltajı sabitle.\n"
            "3. Tekrarlarsa servisi arayın."
        )
    if anomaly_type == 'threshold_exceeded':
        return (
            f"⚠️ **{device_label.title()} Sürekli Yüksek Tüketim**\n"
            "Hedef sıcaklık çok düşük ayarlanmış ya da cihaz uzun süre yükte kalmış olabilir.\n\n"
            "**Hızlı Çözümler:**\n"
            "1. Dereceyi 24-25°C aralığına yükselt.\n"
            "2. Kapı/pencere sızıntılarını kapat.\n"
            "3. Fanı otomatik moda al."
        )
    return (
        f"⚠️ **{device_label.title()} Beklenmeyen Tüketim**\n"
        "Dış ünite tıkanıklığı veya cihaz verimsiz çalışıyor olabilir.\n\n"
        "**Hızlı Çözümler:**\n"
        "1. Cihazı kısa süre kapatıp dinlendir.\n"
        "2. Hava akışını engelleyen nesneleri kaldır.\n"
        "3. Servis çağır."
    )


@app.post("/ai/advice")
async def get_ai_advice(
    anomaly: AnomalyAlertIn,
    role: str = Query("assistant", description="AI rolü: assistant, data_analyst, energy_expert, technician, budget_advisor")
) -> Dict[str, Any]:
    """Return role-specific advice from Groq Llama API"""

    # Validate role
    role = role.lower().strip()
    if role not in ROLE_INSTRUCTIONS:
        role = "assistant"

    # Get API key - TRY both env var names and .env.local file
    api_key = os.getenv("GROQ_API_KEY") or os.getenv("VITE_GROQ_API_KEY")
    
    # If not in environ, try .env.local file
    if not api_key:
        env_file = "/home/huseyin/hecaton_yarısma/ai-energy-monitoring-app/.env.local"
        print(f"[DEBUG] ENV vars empty, reading from {env_file}")
        try:
            with open(env_file, 'r') as f:
                for line in f:
                    if line.startswith("VITE_GROQ_API_KEY") or line.startswith("GROQ_API_KEY"):
                        api_key = line.split("=", 1)[1].strip().strip('"').strip("'")
                        print(f"[DEBUG] Groq key found from file: {api_key[:20]}...")
                        break
        except Exception as e:
            print(f"[DEBUG] Error reading .env.local: {e}")
    else:
        print(f"[DEBUG] Groq key from environ: {api_key[:20]}...")

    device_type = normalize_device_type(anomaly.deviceType, anomaly.deviceName)
    device_label = get_device_label(device_type)

    # Build role-specific prompts
    system_instruction, user_prompt = build_role_specific_prompt(role, anomaly, device_label)

    # If no API key, return demo
    if not api_key:
        print(f"[DEBUG] NO API KEY - returning demo")
        return {
            "advice": build_demo_advice(device_type, anomaly.type),
            "demo": True,
            "role": role,
            "reason": "No API key found"
        }

    # Call Groq API with role-specific settings
    url = "https://api.groq.com/openai/v1/chat/completions"

    # Adjust temp and tokens by role
    if role == "data_analyst":
        temp = 0.4  # More precise for math
        tokens = 1000
    elif role == "energy_expert":
        temp = 0.6
        tokens = 1200
    elif role == "technician":
        temp = 0.5
        tokens = 1000
    elif role == "budget_advisor":
        temp = 0.4  # Precise for money
        tokens = 1000
    else:  # assistant
        temp = 0.7
        tokens = 800

    payload = {
        "model": "llama-3.3-70b-versatile",
        "messages": [
            {"role": "system", "content": system_instruction},
            {"role": "user", "content": user_prompt},
        ],
        "temperature": temp,
        "max_tokens": tokens,
        "top_p": 0.95
    }

    try:
        async with httpx.AsyncClient(timeout=25.0) as client:
            r = await client.post(
                url,
                json=payload,
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {api_key}",
                },
            )

        if r.status_code == 200:
            data = r.json()
            try:
                advice_text = data.get("choices", [])[0].get("message", {}).get("content", "").strip()
                if advice_text:
                    return {
                        "advice": advice_text,
                        "demo": False,
                        "role": role,
                        "from": "Groq Llama 3.3"
                    }
            except (IndexError, KeyError, AttributeError):
                pass
        elif r.status_code == 429:
            return {
                "advice": build_demo_advice(device_type, anomaly.type),
                "demo": True,
                "role": role,
                "reason": "API quota exceeded"
            }
        else:
            error_details = r.text[:200] if r.text else f"HTTP {r.status_code}"
            print(f"Groq API error {r.status_code}: {error_details}")

    except Exception as e:
        print(f"Groq API call failed: {str(e)}")

    # Fallback to demo
    return {
        "advice": build_demo_advice(device_type, anomaly.type),
        "demo": True,
        "role": role,
        "reason": "API failed"
    }


@app.post("/consent/record")
async def record_consent(consent: ConsentRecordIn) -> Dict[str, Any]:
    """Store KVKK consent using anonymous user id only."""
    if not consent.accepted:
        raise HTTPException(status_code=400, detail="Consent must be accepted")

    record = {
        "accepted": True,
        "consentVersion": consent.consentVersion,
        "acceptedAt": consent.acceptedAt,
        "anonUserId": consent.anonUserId,
        "optionalAnalytics": consent.optionalAnalytics,
        "recordedAt": datetime.now(timezone.utc).isoformat(),
    }

    output_file = "/tmp/evimcepte_kvkk_consents.jsonl"
    with open(output_file, "a", encoding="utf-8") as f:
        f.write(json.dumps(record, ensure_ascii=False) + "\n")

    return {"ok": True, "stored": True}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("public.backend-reference.ai_advice_server:app", host="0.0.0.0", port=8001, reload=True)
