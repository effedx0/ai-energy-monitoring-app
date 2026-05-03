import { Device, ACState } from '../types';
import type { DeviceOperationState } from '../types';

export interface DeviceMonitoringProfile {
  baselinePower: number;
  standbyPower: number;
  tolerancePct: number;
  alertThresholdPct: number;
  sustainTicks: number;
  baselineWindow: number;
  minSamples: number;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function getDeviceSeed(deviceId: string) {
  return deviceId.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
}

function getDevicePowerWindow(device: Device) {
  const normalMinWatt = device.normalMinWatt ?? device.baselinePower ?? 100;
  const normalMaxWatt = device.normalMaxWatt ?? device.maxPower;
  const idleWatt = device.idleWatt ?? device.standbyPower ?? Math.round(normalMinWatt * 0.35);
  const anomalyHighWatt = device.anomalyHighWatt ?? Math.round(normalMaxWatt * 1.2);
  const anomalyLowWatt = device.anomalyLowWatt ?? Math.max(0, Math.round(idleWatt * 0.5));

  return {
    normalMinWatt,
    normalMaxWatt,
    idleWatt,
    anomalyHighWatt,
    anomalyLowWatt
  };
}

export interface ThresholdAnomalyState {
  direction: 'high' | 'low' | null;
  streak: number;
  latched: boolean;
}

export interface ThresholdAnomalyResult {
  isAnomaly: boolean;
  type: 'sustained_high' | 'sustained_low' | null;
  baseline: number;
  expectedRange: { min: number; max: number };
  direction: 'high' | 'low' | null;
  streak: number;
}

// Desteklenen cihazlar
export const DEVICES: Device[] = [
  {
    id: 'ac-1',
    name: 'Salon Kliması',
    type: 'ac',
    icon: '❄️',
    isActive: true,
    isAvailable: true,
    maxPower: 3500,
    normalMinWatt: 300,
    normalMaxWatt: 1200,
    idleWatt: 120,
    anomalyHighWatt: 1500,
    anomalyLowWatt: 80,
    baselinePower: 750,
    standbyPower: 120,
    tolerancePct: 0.25,
    sustainTicks: 5,
    brand: 'Bosch',
    model: 'Climate 3000i'
  },
  {
    id: 'fridge-1',
    name: 'Buzdolabı',
    type: 'fridge',
    icon: '🧊',
    isActive: false,
    isAvailable: false,
    maxPower: 450,
    normalMinWatt: 80,
    normalMaxWatt: 250,
    idleWatt: 50,
    anomalyHighWatt: 450,
    anomalyLowWatt: 20,
    baselinePower: 165,
    standbyPower: 50,
    tolerancePct: 0.2,
    sustainTicks: 6,
    brand: 'Samsung',
    model: 'RT46K'
  },
  {
    id: 'washer-1',
    name: 'Çamaşır Makinesi',
    type: 'washer',
    icon: '👕',
    isActive: false,
    isAvailable: false,
    maxPower: 2100,
    normalMinWatt: 400,
    normalMaxWatt: 1200,
    idleWatt: 10,
    anomalyHighWatt: 2100,
    anomalyLowWatt: 50,
    baselinePower: 800,
    standbyPower: 10,
    tolerancePct: 0.3,
    sustainTicks: 4,
    brand: 'Bosch',
    model: 'WAX32'
  },
  {
    id: 'oven-1',
    name: 'Fırın',
    type: 'oven',
    icon: '🍳',
    isActive: false,
    isAvailable: false,
    maxPower: 3000,
    normalMinWatt: 1200,
    normalMaxWatt: 2500,
    idleWatt: 5,
    anomalyHighWatt: 3000,
    anomalyLowWatt: 300,
    baselinePower: 1850,
    standbyPower: 5,
    tolerancePct: 0.25,
    sustainTicks: 4,
    brand: 'Bosch',
    model: 'HBF534'
  },
  {
    id: 'heater-1',
    name: 'Isıtıcı',
    type: 'heater',
    icon: '🔥',
    isActive: false,
    isAvailable: false,
    maxPower: 2800,
    normalMinWatt: 1000,
    normalMaxWatt: 2200,
    idleWatt: 5,
    anomalyHighWatt: 2800,
    anomalyLowWatt: 300,
    baselinePower: 1600,
    standbyPower: 5,
    tolerancePct: 0.25,
    sustainTicks: 5,
    brand: 'DeLonghi',
    model: 'Dragon4'
  },
  {
    id: 'light-1',
    name: 'Aydınlatma',
    type: 'lighting',
    icon: '💡',
    isActive: false,
    isAvailable: false,
    maxPower: 300,
    normalMinWatt: 20,
    normalMaxWatt: 150,
    idleWatt: 0,
    anomalyHighWatt: 300,
    anomalyLowWatt: 0,
    baselinePower: 85,
    standbyPower: 0,
    tolerancePct: 0.2,
    sustainTicks: 6,
    brand: 'Philips',
    model: 'Hue'
  }
];

export function getDeviceMonitoringProfile(device: Device): DeviceMonitoringProfile {
  const defaultsByType: Record<Device['type'], DeviceMonitoringProfile> = {
    ac: {
      baselinePower: 750,
      standbyPower: 120,
      tolerancePct: 0.30,
      alertThresholdPct: 0.75,
      sustainTicks: 10,
      baselineWindow: 30,
      minSamples: 10
    },
    fridge: {
      baselinePower: 165,
      standbyPower: 50,
      tolerancePct: 0.25,
      alertThresholdPct: 0.75,
      sustainTicks: 10,
      baselineWindow: 30,
      minSamples: 10
    },
    washer: {
      baselinePower: 800,
      standbyPower: 10,
      tolerancePct: 0.35,
      alertThresholdPct: 0.75,
      sustainTicks: 8,
      baselineWindow: 16,
      minSamples: 8
    },
    oven: {
      baselinePower: 1850,
      standbyPower: 5,
      tolerancePct: 0.30,
      alertThresholdPct: 0.75,
      sustainTicks: 8,
      baselineWindow: 16,
      minSamples: 8
    },
    heater: {
      baselinePower: 1600,
      standbyPower: 5,
      tolerancePct: 0.30,
      alertThresholdPct: 0.75,
      sustainTicks: 9,
      baselineWindow: 20,
      minSamples: 8
    },
    lighting: {
      baselinePower: 85,
      standbyPower: 0,
      tolerancePct: 0.25,
      alertThresholdPct: 0.75,
      sustainTicks: 10,
      baselineWindow: 16,
      minSamples: 8
    }
  };

  const fallback = defaultsByType[device.type];

  return {
    baselinePower: device.baselinePower ?? fallback.baselinePower,
    standbyPower: device.standbyPower ?? fallback.standbyPower,
    tolerancePct: device.tolerancePct ?? fallback.tolerancePct,
    alertThresholdPct: fallback.alertThresholdPct,
    sustainTicks: device.sustainTicks ?? fallback.sustainTicks,
    baselineWindow: fallback.baselineWindow,
    minSamples: fallback.minSamples
  };
}

export function getDevicePowerProfile(device: Device) {
  const window = getDevicePowerWindow(device);
  const monitoring = getDeviceMonitoringProfile(device);

  return {
    ...window,
    ...monitoring
  };
}

export function checkForAnomaly(
  power: number,
  recentPowers: number[],
  profile: DeviceMonitoringProfile,
  state: ThresholdAnomalyState
): ThresholdAnomalyResult {
  const window = recentPowers.slice(-profile.baselineWindow);
  const hasEnoughData = window.length >= profile.minSamples;

  const computedBaseline = hasEnoughData
    ? window.reduce((sum, value) => sum + value, 0) / window.length
    : profile.baselinePower;

  const baseline = Math.max(1, Math.round(computedBaseline));
  const expectedRange = {
    min: Math.round(baseline * (1 - profile.tolerancePct)),
    max: Math.round(baseline * (1 + profile.tolerancePct))
  };

  const alertHigh = Math.round(baseline * (1 + profile.alertThresholdPct));
  const alertLow = Math.round(baseline * (1 - profile.alertThresholdPct));

  const direction = power > alertHigh
    ? 'high'
    : power < alertLow
      ? 'low'
      : null;

  if (!direction) {
    state.direction = null;
    state.streak = 0;
    state.latched = false;
    return {
      isAnomaly: false,
      type: null,
      baseline,
      expectedRange,
      direction: null,
      streak: 0
    };
  }

  if (state.direction !== direction) {
    state.direction = direction;
    state.streak = 1;
    state.latched = false;
  } else {
    state.streak += 1;
  }

  const reachedThreshold = state.streak >= profile.sustainTicks;
  const isNewAnomaly = reachedThreshold && !state.latched;

  if (isNewAnomaly) {
    state.latched = true;
  }

  return {
    isAnomaly: isNewAnomaly,
    type: isNewAnomaly
      ? direction === 'high'
        ? 'sustained_high'
        : 'sustained_low'
      : null,
    baseline,
    expectedRange,
    direction,
    streak: state.streak
  };
}

// Klima durumu simülasyonu
export function simulateACState(
  _elapsedSeconds: number,
  targetTemp: number,
  _outdoorTemp: number,
  currentTemp: number,
  requestedMode: 'cooling' | 'heating' | 'auto' = 'auto'
): ACState {
  // Termostat kontrolü
  const hysteresis = 1.25;
  const isCooling = currentTemp > targetTemp + hysteresis;
  const isHeating = currentTemp < targetTemp - hysteresis;
  
  // Kompresör yükü (sıcaklık farkına göre)
  const tempDiff = Math.abs(currentTemp - targetTemp);
  const loadDemand = Math.max(0, tempDiff - 0.65);
  const compressorLoad = Math.min(100, loadDemand * 28);
  
  // Mod belirleme
  let mode: ACState['mode'] = 'idle';
  if (requestedMode === 'cooling') {
    mode = isCooling || currentTemp > targetTemp ? 'cooling' : 'idle';
  } else if (requestedMode === 'heating') {
    mode = isHeating || currentTemp < targetTemp ? 'heating' : 'idle';
  } else {
    if (isCooling) mode = 'cooling';
    else if (isHeating) mode = 'heating';
  }
  
  // Fan hızı (kompresör yüküne göre)
  const fanSpeed = mode === 'idle' ? 400 : 800 + (compressorLoad * 12);
  
  // Basınç simülasyonu
  const refrigerantPressure = mode === 'idle' ? 4.5 : 15 + (compressorLoad * 0.1);
  
  return {
    isRunning: mode !== 'idle',
    currentTemp: Math.round(currentTemp * 10) / 10,
    targetTemp,
    compressorLoad: Math.round(compressorLoad),
    mode,
    fanSpeed: Math.round(fanSpeed),
    refrigerantPressure: Math.round(refrigerantPressure * 10) / 10
  };
}

// Anlık güç tüketimi hesapla (Watt)
export function calculateInstantPower(
  device: Device,
  acState?: ACState,
  deviceStatus: DeviceOperationState = 'auto',
  isAnomaly: boolean = false,
  simulatedHour: number = 12,
  juryBoost: boolean = false
): number {
  const profile = getDevicePowerProfile(device);
  const { normalMinWatt, normalMaxWatt, idleWatt, anomalyHighWatt, anomalyLowWatt } = profile;
  const amplitude = Math.max(1, normalMaxWatt - normalMinWatt);
  const seed = getDeviceSeed(device.id);
  const phase = (seed % 24) / 3;
  const hourRadians = ((simulatedHour - phase) / 24) * Math.PI * 2;
  const dailyWave = (Math.sin(hourRadians) + 1) / 2;
  const secondaryWave = (Math.sin(hourRadians * 2.4 + seed / 13) + 1) / 2;
  const microWave = (Math.sin(simulatedHour * 5.1 + seed / 7) + 1) / 2;

  let activityLevel = 0.35 + dailyWave * 0.45 + secondaryWave * 0.2;

  switch (device.type) {
    case 'ac':
      if (acState?.mode === 'idle') {
        const idleJitter = 0.985 + secondaryWave * 0.03;
        const idlePower = idleWatt * idleJitter;
        let finalIdle = idlePower;

        if (juryBoost) {
          finalIdle = finalIdle * 1.15 + 10;
        }
        if (isAnomaly) {
          finalIdle = Math.max(finalIdle * 1.4, anomalyHighWatt * 0.65);
        }

        return Math.max(0, Math.round(clamp(finalIdle, anomalyLowWatt, anomalyHighWatt)));
      }

      const compressorLoad = acState?.compressorLoad ?? 0;
      const loadRatio = clamp(compressorLoad / 100, 0, 1);
  const acCurve = Math.pow(loadRatio, 1.8);
  activityLevel = 0.08 + acCurve * 0.92;
      break;
    case 'fridge':
      activityLevel = 0.18 + secondaryWave * 0.22 + microWave * 0.18;
      break;
    case 'washer':
      activityLevel = (simulatedHour >= 7 && simulatedHour <= 10) || (simulatedHour >= 18 && simulatedHour <= 22)
        ? 0.5 + dailyWave * 0.45
        : 0.08 + dailyWave * 0.18;
      break;
    case 'oven':
      activityLevel = (simulatedHour >= 11 && simulatedHour <= 14) || (simulatedHour >= 18 && simulatedHour <= 21)
        ? 0.68 + dailyWave * 0.28
        : 0.12 + dailyWave * 0.12;
      break;
    case 'heater':
      activityLevel = (simulatedHour >= 6 && simulatedHour <= 9) || (simulatedHour >= 19 && simulatedHour <= 23)
        ? 0.62 + dailyWave * 0.3
        : 0.18 + secondaryWave * 0.18;
      break;
    case 'lighting':
      activityLevel = simulatedHour >= 7 && simulatedHour <= 18
        ? 0.08 + dailyWave * 0.12
        : 0.55 + dailyWave * 0.4;
      break;
  }

  if (device.type !== 'ac') {
    if (deviceStatus === 'standby') {
      activityLevel = Math.min(activityLevel, 0.08);
    } else if (deviceStatus === 'active') {
      activityLevel = Math.min(1, activityLevel * 1.18 + 0.12);
    } else if (deviceStatus === 'boost') {
      activityLevel = Math.min(1, activityLevel * 1.42 + 0.2);
    }
  }

  let basePower = idleWatt + amplitude * clamp(activityLevel, 0, 1);

  if (device.type === 'ac') {
    const compressorLoad = acState?.compressorLoad ?? 0;
    const loadRatio = clamp(compressorLoad / 100, 0, 1);
    basePower = idleWatt + (normalMaxWatt - idleWatt) * Math.pow(loadRatio, 1.8);
  }

  if (device.type !== 'ac') {
    const statusMultiplier = deviceStatus === 'boost'
      ? 1.3
      : deviceStatus === 'active'
        ? 1.12
        : deviceStatus === 'standby'
          ? 0.72
          : 1;
    basePower *= statusMultiplier;

    if (device.type === 'washer' && deviceStatus !== 'standby') {
      basePower += 120;
    }
    if (device.type === 'oven' && deviceStatus !== 'standby') {
      basePower += 180;
    }
    if (device.type === 'fridge' && deviceStatus === 'boost') {
      basePower += 70;
    }
  }

  if (device.type !== 'ac' && activityLevel > 0.18) {
    basePower = Math.max(basePower, normalMinWatt);
  }

  // AC için dalgalanmayı çok azalt, diğer cihazlarda hafif oynama bırak
  basePower *= device.type === 'ac'
    ? 0.992 + 0.008 * secondaryWave
    : 0.98 + 0.04 * secondaryWave;

  // Jüri Boost (Butonla harcamayı zorlama)
  if (juryBoost) {
    basePower = basePower * 1.35 + amplitude * 0.35;
  }

  let finalPower = basePower;

  // Anomali ekle
  if (isAnomaly) {
    finalPower = Math.max(finalPower * 1.6, anomalyHighWatt * 0.9);
  }

  const minAllowed = Math.max(0, anomalyLowWatt);
  const maxAllowed = anomalyHighWatt;
  return Math.max(minAllowed, Math.round(clamp(finalPower, minAllowed, maxAllowed)));
}

// Voltaj ve akım hesapla
export function calculateElectricalValues(power: number, voltage: number = 220) {
  const current = power / voltage;
  const normalizedPower = Math.min(1, Math.max(0, power / 3500));
  const powerFactor = 0.92 - normalizedPower * 0.04; // 0.88-0.92 arası, daha stabil
  const voltageDrift = (normalizedPower - 0.5) * 3; // çok küçük voltaj sapması
  
  return {
    voltage: voltage + voltageDrift,
    current: Math.round(current * 100) / 100,
    powerFactor: Math.round(powerFactor * 100) / 100
  };
}
