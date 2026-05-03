import { ACState } from '../types';
import type { DeviceType } from '../types';

interface PowerGaugeProps {
  power: number;
  maxPower: number;
  acState: ACState;
  deviceType: DeviceType;
  deviceName: string;
}

export function PowerGauge({ power, maxPower, acState, deviceType, deviceName }: PowerGaugeProps) {
  const percentage = Math.min((power / maxPower) * 100, 100);
  const isRunning = deviceType === 'ac' ? acState.isRunning : power > 0;
  
  // Renk belirleme
  const getColor = () => {
    if (percentage < 30) return { text: 'text-green-500', bg: 'bg-green-500', glow: 'shadow-green-500/50' };
    if (percentage < 60) return { text: 'text-yellow-500', bg: 'bg-yellow-500', glow: 'shadow-yellow-500/50' };
    if (percentage < 80) return { text: 'text-orange-500', bg: 'bg-orange-500', glow: 'shadow-orange-500/50' };
    return { text: 'text-red-500', bg: 'bg-red-500', glow: 'shadow-red-500/50' };
  };
  
  const color = getColor();
  
  // kW dönüşümü
  const powerKW = (power / 1000).toFixed(2);
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          Anlık Güç Tüketimi
        </h3>
        <div className={`px-3 py-1 rounded-full text-xs font-medium ${
          isRunning
            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
            : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
        }`}>
          {isRunning ? '● Çalışıyor' : '○ Beklemede'}
        </div>
      </div>
      <div className="text-xs text-gray-400 dark:text-gray-500 mb-3">
        Aktif cihaz: <span className="font-medium text-gray-600 dark:text-gray-300">{deviceName}</span> ({deviceType})
      </div>
      
      {/* Ana gösterge */}
      <div className="text-center mb-6">
        <div className={`text-6xl sm:text-7xl font-bold ${color.text} transition-colors`}>
          {powerKW}
        </div>
        <div className="text-2xl text-gray-400 dark:text-gray-500 mt-1">kW</div>
        <div className="text-sm text-gray-500 dark:text-gray-400 mt-2">
          {power} Watt
        </div>
      </div>
      
      {/* Progress bar */}
      <div className="relative h-4 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden mb-4">
        <div 
          className={`absolute inset-y-0 left-0 ${color.bg} rounded-full transition-all duration-500 ease-out`}
          style={{ width: `${percentage}%` }}
        >
          <div className={`absolute inset-0 ${color.bg} opacity-50 animate-pulse`}></div>
        </div>
      </div>
      
      {/* Durum bilgileri */}
      <div className="grid grid-cols-2 gap-3">
        {deviceType === 'ac' ? (
          <>
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
              <div className="text-xs text-gray-500 dark:text-gray-400">İç Değer</div>
              <div className="text-lg font-semibold text-gray-900 dark:text-white">
                {acState.currentTemp}°C
              </div>
              <div className="text-xs text-gray-400">Hedef: {acState.targetTemp}°C</div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
              <div className="text-xs text-gray-500 dark:text-gray-400">Çalışma Durumu</div>
              <div className="text-lg font-semibold text-gray-900 dark:text-white">
                %{acState.compressorLoad}
              </div>
              <div className="text-xs text-gray-400 capitalize">{acState.mode === 'cooling' ? 'Soğutma' : acState.mode === 'heating' ? 'Isıtma' : 'Bekleme'}</div>
            </div>
          </>
        ) : (
          <>
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
              <div className="text-xs text-gray-500 dark:text-gray-400">Anlık Ortalama</div>
              <div className="text-lg font-semibold text-gray-900 dark:text-white">
                {power}W
              </div>
              <div className="text-xs text-gray-400">{powerKW} kW</div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
              <div className="text-xs text-gray-500 dark:text-gray-400">Yük Seviyesi</div>
              <div className="text-lg font-semibold text-gray-900 dark:text-white">
                %{Math.round(percentage)}
              </div>
              <div className="text-xs text-gray-400">Cihaza göre anlık tüketim</div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
