// Cihaz türleri
export type DeviceType = 'ac' | 'fridge' | 'washer' | 'oven' | 'heater' | 'lighting';
export type DeviceOperationState = 'auto' | 'standby' | 'active' | 'boost';

export interface Device {
  id: string;
  name: string;
  type: DeviceType;
  icon: string;
  isActive: boolean;
  isAvailable: boolean; // Hackathon'da sadece klima
  maxPower: number; // Watt
  normalMinWatt?: number; // Watt - normal çalışma alt sınırı
  normalMaxWatt?: number; // Watt - normal çalışma üst sınırı
  idleWatt?: number; // Watt - bekleme / düşük yük
  anomalyHighWatt?: number; // Watt - yüksek anomali seviyesi
  anomalyLowWatt?: number; // Watt - düşük anomali seviyesi
  baselinePower?: number; // Watt - normal çalışma ortalaması
  standbyPower?: number; // Watt - bekleme tüketimi
  tolerancePct?: number; // % - eşik toleransı
  sustainTicks?: number; // Kaç ölçüm boyunca sürerse anomali sayılacak
  brand?: string;
  model?: string;
}

// Anlık güç tüketimi
export interface PowerReading {
  timestamp: Date;
  deviceId: string;
  power: number; // Watt cinsinden anlık güç
  voltage: number; // Volt
  current: number; // Amper
  powerFactor: number;
  isAnomaly: boolean;
}

// Saatlik özet
export interface HourlyConsumption {
  hour: string;
  energy: number; // kWh
  avgPower: number; // Watt
  peakPower: number; // Watt
  anomalyCount: number;
}

// Anomali uyarısı
export interface AnomalyAlert {
  id: string;
  deviceId: string;
  deviceName: string;
  deviceType: DeviceType;
  timestamp: Date;
  type: 'spike' | 'sustained_high' | 'sustained_low' | 'unusual_pattern' | 'threshold_exceeded';
  severity: 'warning' | 'critical';
  message: string;
  powerValue: number;
  expectedRange: { min: number; max: number };
  dismissed: boolean;
}

// Günlük istatistikler
export interface DailyStats {
  totalEnergy: number; // kWh
  totalCost: number; // TL
  avgPower: number; // Watt
  peakPower: number; // Watt
  peakTime: string;
  anomalyCount: number;
  uptime: number; // saat
}

// Simülasyon konfigürasyonu
export interface SimulationConfig {
  deviceId: string;
  targetTemp: number;
  outdoorTemp: number;
  mode: 'cooling' | 'heating' | 'auto';
  fanSpeed: 'low' | 'medium' | 'high' | 'auto';
  electricityPrice: number; // TL/kWh
  deviceStatus: DeviceOperationState;
}

// Klima özel durum
export interface ACState {
  isRunning: boolean;
  currentTemp: number;
  targetTemp: number;
  compressorLoad: number; // 0-100%
  mode: 'cooling' | 'heating' | 'fan' | 'idle';
  fanSpeed: number; // RPM
  refrigerantPressure: number; // bar
}

// Dataset yapısı (CSV export için)
export interface EnergyDatasetRow {
  timestamp: string;
  deviceId: string;
  deviceType: DeviceType;
  power_watts: number;
  voltage: number;
  current_amps: number;
  power_factor: number;
  indoor_temp: number;
  outdoor_temp: number;
  is_anomaly: boolean;
  anomaly_type: string | null;
}

// Bildirim ayarları
export interface NotificationSettings {
  enabled: boolean;
  soundEnabled: boolean;
  anomalyThreshold: number; // Watt - bu değeri aşarsa bildirim
  cooldownMinutes: number; // Aynı cihaz için bekleme süresi
}
