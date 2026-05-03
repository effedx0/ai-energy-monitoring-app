import { SimulationConfig, DeviceType, DeviceOperationState } from '../types';
import { Settings, Thermometer, Fan, DollarSign, Power, Gauge } from 'lucide-react';

interface SettingsPanelProps {
  config: SimulationConfig;
  onChange: (config: SimulationConfig) => void;
  isRunning: boolean;
  onToggle: () => void;
  deviceType: DeviceType;
}

export function SettingsPanel({ config, onChange, isRunning, onToggle, deviceType }: SettingsPanelProps) {
  const isAC = deviceType === 'ac';

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 sm:p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-gray-500" />
          <h3 className="font-semibold text-gray-900 dark:text-white">
            Çalışma Parametreleri
          </h3>
        </div>
        
        <button
          onClick={onToggle}
          className={`flex items-center gap-2 px-3 py-1.5 text-xs rounded-xl font-medium transition-all ${
            isRunning
              ? 'bg-red-500/10 text-red-600 hover:bg-red-500/20'
              : 'bg-green-500/10 text-green-600 hover:bg-green-500/20'
          }`}
        >
          <Power className="w-3.5 h-3.5" />
          {isRunning ? 'Akışı Durdur' : 'Akışı Başlat'}
        </button>
      </div>
      <p className="text-xs text-gray-400 mb-4">* Not: Bu değerler cihazın normal çalışma aralığını ve eşik analizini etkiler.</p>
      
      {/* Ayarlar grid */}
      <div className="space-y-4">
        {isAC ? (
          <>
            {/* Hedef sıcaklık */}
            <div className="w-full">
              <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Thermometer className="w-4 h-4" />
                Hedef Sıcaklık
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={16}
                  max={30}
                  step={0.5}
                  value={config.targetTemp}
                  onChange={(e) => onChange({ ...config, targetTemp: Number(e.target.value) })}
                  className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full appearance-none cursor-pointer"
                />
                <span className="w-20 flex-shrink-0 text-center font-mono text-lg font-bold text-blue-500">
                  {config.targetTemp}°C
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Fan hızı */}
              <div>
                <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <Fan className="w-4 h-4" />
                  Fan Hızı
                </label>
                <div className="flex bg-gray-100 dark:bg-gray-700 rounded-xl p-1">
                  {(['low', 'medium', 'high', 'auto'] as const).map((speed) => (
                    <button
                      key={speed}
                      onClick={() => onChange({ ...config, fanSpeed: speed })}
                      className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
                        config.fanSpeed === speed
                          ? 'bg-white dark:bg-gray-600 text-blue-600 shadow-sm'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      {speed === 'low' ? 'Düşük' : speed === 'medium' ? 'Orta' : speed === 'high' ? 'Yüksek' : 'Oto'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Mod */}
              <div>
              <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                ❄️ Çalışma Modu
              </label>
              <div className="flex bg-gray-100 dark:bg-gray-700 rounded-xl p-1">
                {(['cooling', 'heating', 'auto'] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => onChange({ ...config, mode })}
                    className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
                      config.mode === mode
                        ? 'bg-white dark:bg-gray-600 text-blue-600 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {mode === 'cooling' ? 'Soğutma' : mode === 'heating' ? 'Isıtma' : 'Otomatik'}
                  </button>
                ))}
              </div>
            </div>
            </div>
          </>
        ) : (
          <>
            <div className="sm:col-span-2 p-4 rounded-2xl bg-gray-50 dark:bg-gray-700/40 border border-gray-100 dark:border-gray-700">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="text-sm font-semibold text-gray-900 dark:text-white">Çalışma Durumu</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Cihazın tüketim seviyesini belirler</div>
                </div>
                <div className="flex items-center gap-2 text-xs px-2.5 py-1 rounded-full bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300">
                  <Gauge className="w-3.5 h-3.5" />
                  {config.deviceStatus === 'boost' ? 'Yoğun' : config.deviceStatus === 'active' ? 'Aktif' : config.deviceStatus === 'standby' ? 'Beklemede' : 'Otomatik'}
                </div>
              </div>
              <div className="flex bg-gray-100 dark:bg-gray-700 rounded-xl p-1">
                {([
                  ['auto', 'Otomatik'],
                  ['standby', 'Bekleme'],
                  ['active', 'Aktif'],
                  ['boost', 'Yoğun']
                ] as Array<[DeviceOperationState, string]>).map(([status, label]) => (
                  <button
                    key={status}
                    onClick={() => onChange({ ...config, deviceStatus: status })}
                    className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
                      config.deviceStatus === status
                        ? 'bg-white dark:bg-gray-600 text-blue-600 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
      
      {/* Elektrik fiyatı */}
      <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-600 dark:text-gray-400">Elektrik Fiyatı</span>
          </div>
          <div className="flex items-center gap-1">
            <input
              type="number"
              min={0.5}
              max={10}
              step={0.1}
              value={config.electricityPrice}
              onChange={(e) => onChange({ ...config, electricityPrice: Number(e.target.value) })}
              className="w-20 text-right bg-transparent font-mono font-bold text-green-600 focus:outline-none"
            />
            <span className="text-sm text-gray-500">₺/kWh</span>
          </div>
        </div>
      </div>
    </div>
  );
}
