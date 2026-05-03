
https://drive.google.com/drive/folders/1HnKms5XNGgbwv4frTeNUEWKpcDAq-5Iv?usp=sharing


# EnerjiWatch Project Notes

## Amaç
EnerjiWatch, cihazların güç tüketimini gerçek zamanlı izleyen ve eşik tabanlı anomali tespiti yapan bir arayüzdür.

## Mevcut Durum
- Veri seti kullanılmıyor.
- Anomali tespiti, cihazın normal çalışma değerine göre yapılıyor.
- %25 üst/alt sapma ve belirli süre devam etme koşulu var.
- Klimada ısıtma ve soğutma modu çalışıyor.
- Tüm cihazlar sekme gibi seçilebilir durumda.
- Cihazlar artık birbirinden bağımsız çalışma durumuna sahip.
- Klima için ayrı ayarlar korunuyor; diğer cihazlarda çalışma durumu seçilebiliyor.
- Toplam enerji için ayrı bir görünüm ve grafik eklendi.

## Desteklenen Cihazlar
- Klima
- Buzdolabı
- Çamaşır Makinesi
- Fırın
- Isıtıcı
- Aydınlatma

## Anomali Mantığı
- Cihaz için bir baz güç değeri tanımlanır.
- Ölçülen güç bu baz değerin dışına çıkarsa sapma oluşur.
- Sapma %25 sınırını aşarsa ve birkaç ölçüm sürerse anomali üretilir.
- Manuel anomali butonu kısa süreli ama belirgin bir güç patlaması üretir.

## Butonlar
- **Anomali Simüle Et**: Birkaç ölçüm boyunca 3.0–4.0 kW aralığında güç üretir.
- **Pik Harcama Yap**: Tek seferlik yüksek yük oluşturur.

## Çalışma Durumu Mantığı
- Klima: sıcaklık, dış sıcaklık, mod ve fan hızına göre çalışır.
- Buzdolabı, çamaşır makinesi, fırın, ısıtıcı, aydınlatma: Otomatik / Bekleme / Aktif / Yoğun durumları ayrı ayrı yönetilir.
- Bir cihazın çalışma durumu değiştiğinde diğer cihazlar etkilenmez.
- Aktif ve yoğun durumlarda cihazın anlık watt tüketimi yükselir.

## Yeni Görünümler
- **Cihaz Görünümü**: Seçili cihazın anlık güç grafiği, sayaçları ve uyarıları.
- **Toplam Enerji**: Tüm cihazların toplam anlık tüketimi, toplam enerji grafiği ve tahmini maliyet.

## Önemli Dosyalar
- [src/App.tsx](src/App.tsx) — Ana akış ve simülasyon döngüsü
- [src/utils/devices.ts](src/utils/devices.ts) — Cihaz profilleri, güç hesapları, anomali mantığı
- [src/types/index.ts](src/types/index.ts) — Tip tanımları
- [src/components/DeviceSelector.tsx](src/components/DeviceSelector.tsx) — Cihaz sekmeleri
- [src/components/PowerGauge.tsx](src/components/PowerGauge.tsx) — Anlık güç göstergesi
- [src/components/RealtimeChart.tsx](src/components/RealtimeChart.tsx) — Zaman serisi grafik
- [src/components/AnomalyAlerts.tsx](src/components/AnomalyAlerts.tsx) — Uyarılar
- [src/components/AIAssistant.tsx](src/components/AIAssistant.tsx) — AI analiz alanı

## Çalıştırma
- Build: `npm run build`
- Dev mod, bu ortamda Node sürümü nedeniyle sorun çıkarabiliyor.
- Uygulama şu anda derlenmiş haliyle statik sunucudan çalıştırılıyor.

## Notlar
- Rastgele dalgalanmalar azaltıldı.
- Isıtma modu, sıcaklık hedefi yükseldiğinde devreye giriyor.
- Grafiklerdeki dalgalanma minimumda tutuldu.
- Cihaz eklemek için önce profile değerleri tanımlanmalı, sonra UI tarafında sekme olarak görünmeli.

## Sonraki Adımlar
- Her cihaz için ayrı davranış profili eklemek
- Çamaşır makinesi, fırın gibi cihazlara özel çalışma mantığı yazmak
- Gerçek zamanlı veri akışını daha modüler hale getirmek
- Anomali eşiklerini cihaz bazında özelleştirmek
- Toplam enerji görünümüne cihaz bazlı filtre eklemek
- Cihaz çalışma durumlarını daha görsel etiketlerle göstermek
