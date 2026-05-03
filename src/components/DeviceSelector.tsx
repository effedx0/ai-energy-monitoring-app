import { Device } from '../types';
import { ChevronRight } from 'lucide-react';

interface DeviceSelectorProps {
  devices: Device[];
  selectedDevice: string;
  onSelect: (deviceId: string) => void;
}

export function DeviceSelector({ devices, selectedDevice, onSelect }: DeviceSelectorProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wider">
        Cihaz Seçimi
      </h3>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {devices.map((device) => (
          <button
            key={device.id}
            onClick={() => onSelect(device.id)}
            className={`
              min-w-[150px] flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all
              ${selectedDevice === device.id
                ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-500 shadow-md'
                : 'bg-gray-50 dark:bg-gray-700 border-transparent hover:border-gray-300 dark:hover:border-gray-600'
              }
            `}
          >
            <span className="text-2xl shrink-0">{device.icon}</span>
            <div className="min-w-0 text-left">
              <div className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate">
                {device.name}
              </div>
              <div className="text-[10px] text-gray-400 uppercase tracking-wide">
                {device.type}
              </div>
              <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                {device.normalMinWatt ?? 0}-{device.normalMaxWatt ?? device.maxPower}W • idle {device.idleWatt ?? 0}W
              </div>
            </div>
            {selectedDevice === device.id && (
              <ChevronRight className="w-4 h-4 text-blue-500 ml-auto shrink-0" />
            )}
          </button>
        ))}
      </div>
      <p className="text-xs text-gray-400 dark:text-gray-500 mt-3">
        * Tüm cihaz sekmeleri aktif. Seçtiğiniz cihaza göre tüketim görünümü değişir.
      </p>
    </div>
  );
}
