import { useState, useEffect, useCallback, useRef } from 'react';
import { Header } from './components/Header';
import { DeviceSelector } from './components/DeviceSelector';
import { PowerGauge } from './components/PowerGauge';
import { RealtimeChart } from './components/RealtimeChart';
import { AnomalyAlerts } from './components/AnomalyAlerts';
import { DailyStats } from './components/DailyStats';
import { SettingsPanel } from './components/SettingsPanel';
import { AIAssistant } from './components/AIAssistant';
import { KvkkConsentGate } from './components/KvkkConsentGate';
import {
  PowerReading,
  AnomalyAlert,
  DailyStats as DailyStatsType,
  SimulationConfig,
  ACState,
  Device,
  DeviceOperationState
} from './types';
import {
  DEVICES,
  simulateACState,
  calculateInstantPower,
  checkForAnomaly,
  calculateElectricalValues,
  getDeviceMonitoringProfile,
  type ThresholdAnomalyState
} from './utils/devices';
import { PerDeviceSummary } from './components/PerDeviceSummary';
import {
  createKvkkConsentRecord,
  loadKvkkConsent,
  saveKvkkConsent,
  type KvkkConsentRecord,
} from './utils/privacy';

const createDeviceRecord = <T,>(factory: (device: Device) => T): Record<string, T> => {
  return Object.fromEntries(DEVICES.map(device => [device.id, factory(device)])) as Record<string, T>;
};

const createEmptyAnomalyState = (): ThresholdAnomalyState => ({
  direction: null,
  streak: 0,
  latched: false
});

const clampDelta = (target: number, previous: number, maxStep: number) => {
  const delta = target - previous;
  if (delta > maxStep) return previous + maxStep;
  if (delta < -maxStep) return previous - maxStep;
  return target;
};

const TICK_INTERVAL_MS = 1000;
const SIM_MINUTES_PER_TICK = 5;
const SIM_HOURS_PER_TICK = SIM_MINUTES_PER_TICK / 60;
const MANUAL_ANOMALY_TICKS = 8;

const formatSimulatedTime = (simulatedHourValue: number) => {
  const totalMinutes = ((Math.round(simulatedHourValue * 60) % 1440) + 1440) % 1440;
  const hh = Math.floor(totalMinutes / 60);
  const mm = totalMinutes % 60;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
};

function App() {
  const [kvkkConsent, setKvkkConsent] = useState<KvkkConsentRecord | null>(() => loadKvkkConsent());
  const [selectedDevice, setSelectedDevice] = useState<string>('ac-1');
  const [viewMode, setViewMode] = useState<'device' | 'total'>('device');
  const [isRunning, setIsRunning] = useState(true);
  const [config, setConfig] = useState<SimulationConfig>({
    deviceId: 'ac-1',
    targetTemp: 24,
    outdoorTemp: 32,
    mode: 'auto',
    fanSpeed: 'auto',
    electricityPrice: 2.64,
    deviceStatus: 'auto'
  });

  const [injectAnomaly, setInjectAnomaly] = useState<boolean>(false);
  const [juryBoost, setJuryBoost] = useState<boolean>(false);
  const [simulatedHour, setSimulatedHour] = useState<number>(18);

  const [powerReadingsByDevice, setPowerReadingsByDevice] = useState<Record<string, PowerReading[]>>(
    () => createDeviceRecord(() => [])
  );
  const [systemPowerReadings, setSystemPowerReadings] = useState<PowerReading[]>([]);
  const [deviceStatusByDevice, setDeviceStatusByDevice] = useState<Record<string, DeviceOperationState>>(
    () => createDeviceRecord(() => 'auto')
  );
  const [alerts, setAlerts] = useState<AnomalyAlert[]>([]);
  const [selectedAnomaly, setSelectedAnomaly] = useState<AnomalyAlert | null>(null);
  const [acState, setACState] = useState<ACState>({
    isRunning: false,
    currentTemp: 28,
    targetTemp: 24,
    compressorLoad: 0,
    mode: 'idle',
    fanSpeed: 0,
    refrigerantPressure: 4.5
  });
  const [stats, setStats] = useState<DailyStatsType>({
    totalEnergy: 0,
    totalCost: 0,
    avgPower: 0,
    peakPower: 0,
    peakTime: '--:--',
    anomalyCount: 0,
    uptime: 0
  });
  const [systemStats, setSystemStats] = useState<DailyStatsType>({
    totalEnergy: 0,
    totalCost: 0,
    avgPower: 0,
    peakPower: 0,
    peakTime: '--:--',
    anomalyCount: 0,
    uptime: 0
  });

  const simulationInterval = useRef<number | null>(null);
  const recentPowersByDeviceRef = useRef<Record<string, number[]>>(createDeviceRecord(() => []));
  const anomalyStateByDeviceRef = useRef<Record<string, ThresholdAnomalyState>>(
    createDeviceRecord(() => createEmptyAnomalyState())
  );
  const anomalyBurstTicksByDeviceRef = useRef<Record<string, number>>(createDeviceRecord(() => 0));
  const smoothedPowerByDeviceRef = useRef<Record<string, number>>(createDeviceRecord(() => 0));
  const energyByDeviceRef = useRef<Record<string, number>>(createDeviceRecord(() => 0));
  const deviceStatusByDeviceRef = useRef<Record<string, DeviceOperationState>>(createDeviceRecord(() => 'auto'));
  const systemPowerReadingsRef = useRef<PowerReading[]>([]);
  const systemEnergyRef = useRef<number>(0);
  const [deviceEnergies, setDeviceEnergies] = useState<Record<string, number>>(() => createDeviceRecord(() => 0));
  const currentTempRef = useRef<number>(28);
  const startTimeRef = useRef<Date | null>(null);
  const simulatedHourRef = useRef<number>(18);

  const selectedDeviceData = DEVICES.find(d => d.id === selectedDevice) || DEVICES[0];
  const selectedDeviceReadings = powerReadingsByDevice[selectedDevice] || [];
  const selectedMaxPower = selectedDeviceData.anomalyHighWatt ?? selectedDeviceData.maxPower;
  const selectedDeviceStatus = deviceStatusByDevice[selectedDevice] ?? 'auto';
  const selectedSettingsConfig: SimulationConfig = {
    ...config,
    deviceStatus: selectedDeviceData.type === 'ac' ? 'auto' : selectedDeviceStatus
  };
  const totalPower = DEVICES.reduce((sum, device) => {
    const readings = powerReadingsByDevice[device.id] || [];
    return sum + (readings[readings.length - 1]?.power || 0);
  }, 0);

  const handleSimulateAnomaly = () => {
    anomalyBurstTicksByDeviceRef.current[selectedDevice] = MANUAL_ANOMALY_TICKS;
    setInjectAnomaly(true);
  };


  const handleConfigChange = (nextConfig: SimulationConfig) => {
    const tempDelta = nextConfig.targetTemp - currentTempRef.current;
    let nextMode = nextConfig.mode;

    if (Math.abs(tempDelta) >= 0.5) {
      nextMode = tempDelta > 0 ? 'heating' : 'cooling';
    }

    if (selectedDeviceData.type === 'ac') {
      setConfig({
        ...nextConfig,
        deviceId: selectedDevice,
        deviceStatus: 'auto',
        mode: nextMode
      });
      return;
    }

    const nextStatus = nextConfig.deviceStatus;
    setDeviceStatusByDevice(prev => {
      const updated = { ...prev, [selectedDevice]: nextStatus };
      deviceStatusByDeviceRef.current = updated;
      return updated;
    });

    setConfig(prev => ({
      ...prev,
      deviceId: selectedDevice,
      deviceStatus: nextStatus
    }));
  };

  const resetSimulationState = useCallback(() => {
    setPowerReadingsByDevice(createDeviceRecord(() => []));
    setSystemPowerReadings([]);
    setAlerts([]);
    setSelectedAnomaly(null);
    recentPowersByDeviceRef.current = createDeviceRecord(() => []);
    anomalyStateByDeviceRef.current = createDeviceRecord(() => createEmptyAnomalyState());
    anomalyBurstTicksByDeviceRef.current = createDeviceRecord(() => 0);
    smoothedPowerByDeviceRef.current = createDeviceRecord(() => 0);
    energyByDeviceRef.current = createDeviceRecord(() => 0);
    deviceStatusByDeviceRef.current = createDeviceRecord(() => 'auto');
    setDeviceStatusByDevice(createDeviceRecord(() => 'auto'));
    systemPowerReadingsRef.current = [];
    systemEnergyRef.current = 0;
    currentTempRef.current = config.outdoorTemp - 4;
    simulatedHourRef.current = 18;
    setSimulatedHour(18);
    startTimeRef.current = new Date();
  }, [config.outdoorTemp]);

  const simulationTick = useCallback(() => {
    const now = new Date();
    const nextACState = simulateACState(
      0,
      config.targetTemp,
      config.outdoorTemp,
      currentTempRef.current,
      config.mode
    );

    let nextHour = simulatedHourRef.current + SIM_HOURS_PER_TICK;
    if (nextHour >= 24) nextHour = 0;
    simulatedHourRef.current = nextHour;
    setSimulatedHour(nextHour);

    const nextReadingsByDevice = createDeviceRecord<PowerReading[] | undefined>(() => undefined);
    const nextAlerts: AnomalyAlert[] = [];
    let selectedCurrentPower = 0;
    let totalCurrentPower = 0;

    DEVICES.forEach(device => {
      const profile = getDeviceMonitoringProfile(device);
      const recentPowers = recentPowersByDeviceRef.current[device.id] || [];
      const anomalyState = anomalyStateByDeviceRef.current[device.id] || createEmptyAnomalyState();
      const burstTicks = anomalyBurstTicksByDeviceRef.current[device.id] || 0;
      const isSelected = device.id === selectedDevice;
      const manualAnomalyActive = isSelected && (injectAnomaly || burstTicks > 0);
      const useJuryBoost = isSelected && juryBoost;
      const deviceStatus = device.type === 'ac' ? 'auto' : (deviceStatusByDeviceRef.current[device.id] || 'auto');

      let currentPower = calculateInstantPower(
        device,
        device.type === 'ac' ? nextACState : undefined,
        deviceStatus,
        manualAnomalyActive,
        nextHour,
        useJuryBoost
      );

      // Smooth and ramp-limit sharp transitions to avoid unrealistic one-tick jumps.
      if (!manualAnomalyActive && !useJuryBoost && ['washer', 'oven', 'lighting'].includes(device.type)) {
        const prevSmoothed = smoothedPowerByDeviceRef.current[device.id] || currentPower;
        const smoothingFactor = device.type === 'lighting' ? 0.12 : 0.16;
        const smoothedTarget = prevSmoothed + (currentPower - prevSmoothed) * smoothingFactor;

        const maxStepByType: Record<string, number> = {
          washer: 90,
          oven: 120,
          lighting: 25
        };
        const maxStep = maxStepByType[device.type] ?? 80;
        currentPower = Math.round(clampDelta(smoothedTarget, prevSmoothed, maxStep));
      }

      if (burstTicks > 0) {
        const anomalyPeak = device.anomalyHighWatt ?? Math.round(device.maxPower * 1.2);
        const burstWave = 0.65 + 0.35 * Math.sin(nextHour * Math.PI * 0.5 + device.id.length);
        currentPower = Math.round(Math.max(device.normalMaxWatt ?? device.maxPower, Math.min(anomalyPeak, anomalyPeak * burstWave)));
        anomalyBurstTicksByDeviceRef.current[device.id] = burstTicks - 1;
        if (isSelected && burstTicks - 1 <= 0) {
          setInjectAnomaly(false);
        }
      }

      smoothedPowerByDeviceRef.current[device.id] = currentPower;

      if (isSelected && useJuryBoost) {
        setJuryBoost(false);
      }

      const { isAnomaly, type, baseline, expectedRange } = checkForAnomaly(
        currentPower,
        recentPowers,
        profile,
        anomalyState
      );

      const finalIsAnomaly = manualAnomalyActive || isAnomaly;

      recentPowers.push(currentPower);
      if (recentPowers.length > 60) {
        recentPowers.shift();
      }
      recentPowersByDeviceRef.current[device.id] = recentPowers;

      const electrical = calculateElectricalValues(currentPower);
      const reading: PowerReading = {
        timestamp: now,
        deviceId: device.id,
        power: currentPower,
        voltage: Math.round(electrical.voltage),
        current: electrical.current,
        powerFactor: electrical.powerFactor,
        isAnomaly: finalIsAnomaly
      };

      const previousReadings = powerReadingsByDevice[device.id] || [];
      nextReadingsByDevice[device.id] = [...previousReadings.slice(-299), reading];
      energyByDeviceRef.current[device.id] += (currentPower / 1000) / 3600;

      if (isSelected) {
        selectedCurrentPower = currentPower;
      }
      totalCurrentPower += currentPower;

      if (manualAnomalyActive && burstTicks === MANUAL_ANOMALY_TICKS) {
        const manualExpectedMin = Math.round(profile.baselinePower * 0.75);
        const manualExpectedMax = Math.round(profile.baselinePower * 1.25);
        nextAlerts.push({
          id: `alert-${Date.now()}-${device.id}`,
          deviceId: device.id,
          deviceName: device.name,
          deviceType: device.type,
          timestamp: now,
          type: currentPower > profile.baselinePower ? 'spike' : 'threshold_exceeded',
          severity: 'critical',
          message: `Manuel anomali tetiklendi: anlık güç ${currentPower}W.`,
          powerValue: currentPower,
          expectedRange: { min: manualExpectedMin, max: manualExpectedMax },
          dismissed: false
        });
      } else if (isAnomaly && type) {
        const deviationPct = baseline > 0 ? Math.abs(currentPower - baseline) / baseline : 0;
        const severity = deviationPct >= profile.tolerancePct * 1.5 ? 'critical' : 'warning';

        nextAlerts.push({
          id: `alert-${Date.now()}-${device.id}`,
          deviceId: device.id,
          deviceName: device.name,
          deviceType: device.type,
          timestamp: now,
          type: type as AnomalyAlert['type'],
          severity,
          message:
            type === 'sustained_low'
              ? severity === 'critical'
                ? `Kritik: Güç tüketimi beklenen seviyenin altında uzun süre kaldı (${currentPower}W).`
                : `Uyarı: Güç tüketimi beklenenin altında seyrediyor. Cihaz normal yüküne ulaşamıyor olabilir.`
              : severity === 'critical'
                ? `Kritik: Güç tüketimi beklenen seviyenin üstünde uzun süre kaldı (${currentPower}W).`
                : `Uyarı: Güç tüketimi beklenenin üstünde seyrediyor.`,
          powerValue: currentPower,
          expectedRange,
          dismissed: false
        });
      }
    });

    setPowerReadingsByDevice(nextReadingsByDevice as Record<string, PowerReading[]>);

    const totalReading: PowerReading = {
      timestamp: now,
      deviceId: 'total-system',
      power: totalCurrentPower,
      voltage: 220,
      current: Math.round((totalCurrentPower / 220) * 100) / 100,
      powerFactor: Math.max(0.82, Math.min(0.96, 0.92 - (totalCurrentPower / 10000) * 0.02)),
      isAnomaly: nextAlerts.length > 0
    };

    systemPowerReadingsRef.current = [...systemPowerReadingsRef.current.slice(-299), totalReading];
    setSystemPowerReadings(systemPowerReadingsRef.current);

    if (nextAlerts.length > 0) {
      setAlerts(prev => [...nextAlerts, ...prev].slice(0, 50));
    }

    const selectedReadings = nextReadingsByDevice[selectedDevice] || [];
    if (selectedReadings.length > 0) {
      const avgPower = Math.round(
        selectedReadings.reduce((sum, reading) => sum + reading.power, 0) / selectedReadings.length
      );
      const peakReading = selectedReadings.reduce((peak, reading) =>
        reading.power > peak.power ? reading : peak
      );

      setStats({
        totalEnergy: energyByDeviceRef.current[selectedDevice],
        totalCost: energyByDeviceRef.current[selectedDevice] * config.electricityPrice,
        avgPower,
        peakPower: peakReading.power,
        peakTime: peakReading.timestamp.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
        anomalyCount: alerts.filter(a => !a.dismissed && a.deviceId === selectedDevice).length,
        uptime: startTimeRef.current
          ? (now.getTime() - startTimeRef.current.getTime()) / 3600000
          : 0
      });
    }

    systemEnergyRef.current += totalCurrentPower / 1000 / 3600;
    const systemReadings = systemPowerReadingsRef.current;
    const systemAvgPower = systemReadings.length > 0
      ? Math.round(systemReadings.reduce((sum, reading) => sum + reading.power, 0) / systemReadings.length)
      : 0;
    const systemPeakReading = systemReadings.length > 0 ? systemReadings.reduce((peak, reading) =>
      reading.power > peak.power ? reading : peak,
      totalReading) : totalReading;

    setSystemStats({
      totalEnergy: systemEnergyRef.current,
      totalCost: systemEnergyRef.current * config.electricityPrice,
      avgPower: systemAvgPower,
      peakPower: systemPeakReading.power,
      peakTime: systemPeakReading.timestamp.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
      anomalyCount: alerts.filter(a => !a.dismissed).length,
      uptime: startTimeRef.current
        ? (now.getTime() - startTimeRef.current.getTime()) / 3600000
        : 0
    });

    // update public device energies state (kWh) for UI
    setDeviceEnergies({ ...energyByDeviceRef.current });

    if (selectedDeviceData.type === 'ac') {
      if (nextACState.mode === 'cooling') {
        const coolingRate = 0.08 + (nextACState.compressorLoad / 100) * 0.05;
        currentTempRef.current -= coolingRate;
      } else if (nextACState.mode === 'heating') {
        const heatingRate = 0.08 + (nextACState.compressorLoad / 100) * 0.05;
        currentTempRef.current += heatingRate;
      } else {
        const drift = (config.outdoorTemp - currentTempRef.current) * 0.002;
        currentTempRef.current += drift;
      }

      if (config.mode === 'heating' && currentTempRef.current > config.targetTemp + 2.5) {
        currentTempRef.current = config.targetTemp + 2.5;
      }
      if (config.mode === 'cooling' && currentTempRef.current < config.targetTemp - 2.5) {
        currentTempRef.current = config.targetTemp - 2.5;
      }
    } else {
      setACState({
        isRunning: selectedCurrentPower > (selectedDeviceData.idleWatt ?? 0),
        currentTemp: 0,
        targetTemp: 0,
        compressorLoad: Math.round((selectedCurrentPower / selectedMaxPower) * 100),
        mode: selectedCurrentPower > 0 ? 'fan' : 'idle',
        fanSpeed: 0,
        refrigerantPressure: 0
      });
    }

    if (selectedDeviceData.type === 'ac') {
      setACState(nextACState);
    }
  }, [alerts, config.deviceStatus, config.electricityPrice, config.mode, config.outdoorTemp, config.targetTemp, injectAnomaly, juryBoost, powerReadingsByDevice, selectedDevice, selectedDeviceData.type, selectedMaxPower]);

  const persistConsentRemotely = useCallback(async (record: KvkkConsentRecord) => {
    try {
      await fetch('http://127.0.0.1:8001/consent/record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record)
      });
    } catch {
      // Backend erişilemezse consent local olarak saklanmış olur.
    }
  }, []);

  const handleAcceptKvkk = useCallback((input: { optionalAnalytics: boolean }) => {
    const record = createKvkkConsentRecord(input);
    saveKvkkConsent(record);
    setKvkkConsent(record);
    void persistConsentRemotely(record);
  }, [persistConsentRemotely]);

  useEffect(() => {
    if (kvkkConsent && isRunning) {
      if (!startTimeRef.current) {
        startTimeRef.current = new Date();
      }
      simulationInterval.current = window.setInterval(simulationTick, TICK_INTERVAL_MS);
    } else if (simulationInterval.current) {
      clearInterval(simulationInterval.current);
      simulationInterval.current = null;
    }

    return () => {
      if (simulationInterval.current) {
        clearInterval(simulationInterval.current);
      }
    };
  }, [isRunning, kvkkConsent, simulationTick]);

  useEffect(() => {
    const nextDevice = DEVICES.find(d => d.id === selectedDevice);
    setConfig(prev => ({
      ...prev,
      deviceId: selectedDevice,
      deviceStatus: nextDevice?.type === 'ac' ? 'auto' : (deviceStatusByDeviceRef.current[selectedDevice] || 'auto')
    }));
    setViewMode('device');
  }, [selectedDevice]);

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const handleDismissAlert = (id: string) => {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, dismissed: true } : a));
  };

  const handleToggle = () => {
    setIsRunning(prev => {
      const next = !prev;
      if (next) {
        resetSimulationState();
      }
      return next;
    });
  };

  const currentPower = selectedDeviceReadings.length > 0
    ? selectedDeviceReadings[selectedDeviceReadings.length - 1].power
    : 0;

  const latestActiveAnomaly = [...alerts]
    .filter(alert => !alert.dismissed)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0] || null;
  
  // Use selected anomaly if available, otherwise fall back to latest
  const anomalyForAnalysis = selectedAnomaly || latestActiveAnomaly;

  // compute current powers per device (last reading)
  const currentPowers: Record<string, number> = DEVICES.reduce((acc, d) => {
    const readings = powerReadingsByDevice[d.id] || [];
    acc[d.id] = readings.length > 0 ? readings[readings.length - 1].power : 0;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-slate-900">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {!kvkkConsent && <KvkkConsentGate onAccept={handleAcceptKvkk} />}

        {kvkkConsent && (
        <>
        {isRunning && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm flex items-center justify-between border border-blue-100 dark:border-slate-700/50">
            <div className="flex items-center gap-3">
              <div className="text-2xl animate-pulse">⏰</div>
              <div>
                <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Hızlandırılmış Zaman Simülasyonu</span>
                <div className="text-xl font-bold font-mono text-blue-600 dark:text-blue-400">
                  {formatSimulatedTime(simulatedHour)}
                </div>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] px-2.5 py-1 bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 rounded-full font-bold">
                1 sn = 5 dk
              </span>
              <p className="text-[10px] text-gray-400 mt-1">Her cihaz için ayrı tüketim eğrisi gösterilir.</p>
            </div>
          </div>
        )}

        <DeviceSelector
          devices={DEVICES}
          selectedDevice={selectedDevice}
          onSelect={setSelectedDevice}
        />

        <div className="flex items-center justify-center">
          <div className="inline-flex bg-white dark:bg-gray-800 rounded-2xl p-1 shadow-sm border border-gray-100 dark:border-gray-700">
            <button
              onClick={() => setViewMode('device')}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                viewMode === 'device'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-300'
              }`}
            >
              Cihaz Görünümü
            </button>
            <button
              onClick={() => setViewMode('total')}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                viewMode === 'total'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-300'
              }`}
            >
              Toplam Enerji
            </button>
          </div>
        </div>

        {viewMode === 'device' ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="space-y-6">
            <PowerGauge
              power={currentPower}
              maxPower={selectedMaxPower}
              acState={acState}
              deviceType={selectedDeviceData.type}
              deviceName={selectedDeviceData.name}
            />
            <SettingsPanel
              config={selectedSettingsConfig}
              onChange={handleConfigChange}
              isRunning={isRunning}
              onToggle={handleToggle}
              deviceType={selectedDeviceData.type}
            />

            {isRunning && (
              <div className="space-y-3">
                {injectAnomaly && (
                  <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-2 text-xs text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
                    Anomali modu aktif: seçili cihazın grafiğinde kısa süreli anomali üretilecek.
                  </div>
                )}

                <button
                  onClick={handleSimulateAnomaly}
                  className="w-full bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white font-semibold py-3 px-4 rounded-2xl shadow-lg shadow-red-500/30 flex items-center justify-center gap-2 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
                >
                  🚨 Anomali Simüle Et
                </button>


              </div>
            )}
            </div>

            <div className="lg:col-span-2 space-y-6">
              <AIAssistant latestAnomaly={anomalyForAnalysis} />
              <RealtimeChart
                data={selectedDeviceReadings}
                maxPower={selectedMaxPower}
                deviceName={selectedDeviceData.name}
              />
              <AnomalyAlerts
                alerts={alerts}
                onDismiss={handleDismissAlert}
                selectedAlertId={selectedAnomaly?.id || null}
                onSelectAlert={setSelectedAnomaly}
              />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 sm:p-6 shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Toplam Sistem Enerjisi
                  </h3>
                  <p className="text-xs text-gray-400 mt-1">Tüm cihazların anlık toplam tüketimi</p>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <div className="px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                    Anlık: {totalPower} W
                  </div>
                  <div className="px-3 py-1.5 rounded-xl bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                    Tahmini Maliyet: ₺{systemStats.totalCost.toFixed(2)}
                  </div>
                </div>
              </div>
            </div>
            <RealtimeChart
              data={systemPowerReadings}
              maxPower={DEVICES.reduce((sum, device) => sum + (device.anomalyHighWatt ?? device.maxPower), 0)}
              deviceName="Tüm Cihazlar"
            />
            <PerDeviceSummary energies={deviceEnergies} currentPowers={currentPowers} price={config.electricityPrice} />
            <DailyStats stats={systemStats} />
          </div>
        )}

        {viewMode === 'device' && <DailyStats stats={stats} />}

        <div className="text-center text-xs text-gray-400 dark:text-gray-600 py-4">
          <p>Gerçek zamanlı enerji tüketimi simülasyonu • Her cihaz için ayrı watt eğrisi</p>
          <p className="mt-1">Anomali tespiti: hareketli ortalama + %25 eşik + süre bazlı kontrol</p>
        </div>
        </>
        )}
      </main>
    </div>
  );
}

export default App;
