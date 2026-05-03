# EvimCepte - Mobil Uygulama Kurulum Rehberi

EvimCepte uygulaması artık Capacitor kullanarak iOS ve Android'de çalıştırılabilir!

## Kurulu Paketler

- **Capacitor 6.2.1**: CrossPlatform mobil framework
- **iOS Support**: Xcode projesi kurulmuştur
- **Android Support**: Gradle projesi kurulmuştur
- **React + Vite**: Web asset'ler otomatik sync edilir

## Gereksinimler

### iOS İçin
- macOS cihazı
- Xcode 14+
- CocoaPods: `sudo gem install cocoapods`
- iOS Deployment Target: 13.0+

### Android İçin
- Android Studio
- Android SDK 24+ (API 24)
- Java Development Kit (JDK) 11+
- Gradle 7.0+

## Hızlı Başlangıç

### 1. Build Et ve Sync Yap
```bash
npm run build
# Bu komut otomatik olarak:
# - Web assets'leri derler
# - iOS ve Android klasörlerine kopyalar
# - Native projeleri sync eder
```

### 2. iOS Geliştirme

#### Xcode'da Aç
```bash
npm run cap:ios
```

#### Veya Manuel
```bash
npx cap open ios
```

Xcode'da:
1. Proje dosyasını seç
2. Team ID ve Bundle ID ayarla
3. Simulator veya cihazda çalıştır (Cmd + R)

### 3. Android Geliştirme

#### Android Studio'da Aç
```bash
npm run cap:android
```

#### Veya Manuel
```bash
npx cap open android
```

Android Studio'da:
1. Proje yükle
2. Emülatör veya cihazı bağla
3. Run butonuna tıkla

## Build İçin Production

### iOS Production Build
```bash
npm run mobile:build:ios
```

### Android Production Build (APK)
```bash
npm run mobile:build:android
```

## İçeriği Güncellemek

Web uygulamasında değişiklik yaptıktan sonra:

```bash
npm run build
# Veya manuel sync:
npx cap sync
```

Bu, tüm değişiklikleri native projelere kopyalar.

## Proje Yapısı

```
ai-energy-monitoring-app/
├── src/                      # React kaynak kodları
├── dist/                     # Compiled web assets
├── ios/                      # iOS Xcode projesi
│   └── App/
│       ├── App.xcworkspace/  # Xcode workspace
│       └── App/
│           ├── public/       # Web assets
│           └── Podfile       # CocoaPods bağımlılıkları
├── android/                  # Android Studio projesi
│   ├── app/
│   │   ├── src/main/
│   │   │   └── assets/public/  # Web assets
│   │   └── build.gradle       # Gradle configuration
│   └── settings.gradle
├── capacitor.config.ts       # Capacitor konfigürasyonu
└── package.json
```

## Capacitor Konfigürasyonu

`capacitor.config.ts` dosyasında:
- **appId**: `com.enerjiwatch.evimcepte`
- **appName**: `EvimCepte`
- **webDir**: `dist` (build output)

## Plugins (İsteğe Bağlı)

Gelecekte ek plugin ekleyebilirsiniz:

```bash
npm install @capacitor/camera
npx cap sync
```

Mevcut plugins:
- Core: Ready (bilgilendirme vs)
- Web: Full support

## Troubleshooting

### Bağlantı Sorunu
```bash
npx cap sync
npx cap build ios    # iOS
npx cap build android # Android
```

### Asset'ler Güncellenmedi
```bash
npm run build
npx cap sync
```

### iOS: CocoaPods Hatası
```bash
cd ios/App
pod install --repo-update
cd ../..
```

### Android: Gradle Sync Hatası
- Android Studio'dan "Sync Now" butonuna tıkla

## Kontrol Listesi

- [ ] `npm install` tamamlandı
- [ ] `npm run build` başarılı
- [ ] iOS ve Android klasörleri varsa
- [ ] `capacitor.config.ts` doğru
- [ ] Xcode / Android Studio kurulu
- [ ] iOS: Team ID ayarlandı
- [ ] Emülatör / cihaz hazır

## İleri Konular

### Platform-Spesifik Kod
```typescript
import { Capacitor } from '@capacitor/core';

if (Capacitor.isNativePlatform()) {
  console.log('Running on:', Capacitor.getPlatform()); // 'ios' | 'android'
}
```

### Native API Erişimi
```typescript
import { App } from '@capacitor/app';

App.addListener('backButton', () => {
  // Android back button
});
```

## Kaynaklar

- [Capacitor Docs](https://capacitorjs.com)
- [Capacitor iOS Guide](https://capacitorjs.com/docs/ios)
- [Capacitor Android Guide](https://capacitorjs.com/docs/android)
- [Xcode Documentation](https://developer.apple.com/xcode/)
- [Android Studio Guide](https://developer.android.com/studio)

## Destek

Sorunlarla karşılaşırsanız:
1. `npm run build` komutunu tekrar çalıştırın
2. Platformlara sync yapın: `npx cap sync`
3. Terminal output'unu kontrol edin

---

**Başarılı build'ler!** 🍏 📱
