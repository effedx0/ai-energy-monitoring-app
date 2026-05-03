import { DEVICES } from '../utils/devices';
import { Device } from '../types';

interface PerDeviceSummaryProps {
  devices?: Device[];
  energies: Record<string, number>;
  currentPowers: Record<string, number>;
  price: number;
}

export function PerDeviceSummary({ devices = DEVICES, energies, currentPowers, price }: PerDeviceSummaryProps) {
  return (
    <div className="mt-4 bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700">
      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">Cihaz Bazlı Enerji & Maliyet</h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {devices.map(d => {
          const energy = energies[d.id] ?? 0; // kWh
          const cost = energy * price;
          const currentW = currentPowers[d.id] ?? 0;
          return (
            <div key={d.id} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-900/30 border border-gray-100 dark:border-gray-700">
              <div className="text-2xl">{d.icon}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <div className="font-medium text-sm text-gray-900 dark:text-white truncate">{d.name}</div>
                  <div className="text-xs text-gray-500">{d.type}</div>
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="col-span-1 p-2 bg-white dark:bg-gray-800 rounded-md shadow-sm">
                    <div className="text-[10px] text-gray-500">Anlık</div>
                    <div className="font-semibold text-sm">{Math.round(currentW)} W</div>
                  </div>
                  <div className="col-span-1 p-2 bg-white dark:bg-gray-800 rounded-md shadow-sm">
                    <div className="text-[10px] text-gray-500">Enerji</div>
                    <div className="font-semibold text-sm">{energy.toFixed(2)} kWh</div>
                  </div>
                  <div className="col-span-1 p-2 bg-white dark:bg-gray-800 rounded-md shadow-sm">
                    <div className="text-[10px] text-gray-500">Maliyet</div>
                    <div className="font-semibold text-sm">₺{cost.toFixed(2)}</div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
