import { DailyStats as DailyStatsType } from '../types';
import { Zap, TrendingUp, Clock, DollarSign, AlertTriangle, Battery } from 'lucide-react';

interface DailyStatsProps {
  stats: DailyStatsType;
}

export function DailyStats({ stats }: DailyStatsProps) {
  const cards = [
    {
      title: 'Toplam Tüketim',
      value: `${stats.totalEnergy.toFixed(2)} kWh`,
      icon: Zap,
      color: 'bg-blue-500',
      lightBg: 'bg-blue-50 dark:bg-blue-900/20'
    },
    {
      title: 'Tahmini Maliyet',
      value: `₺${stats.totalCost.toFixed(2)}`,
      icon: DollarSign,
      color: 'bg-green-500',
      lightBg: 'bg-green-50 dark:bg-green-900/20'
    },
    {
      title: 'Ortalama Güç',
      value: `${stats.avgPower} W`,
      icon: Battery,
      color: 'bg-purple-500',
      lightBg: 'bg-purple-50 dark:bg-purple-900/20'
    },
    {
      title: 'Pik Güç',
      value: `${stats.peakPower} W`,
      icon: TrendingUp,
      color: 'bg-orange-500',
      lightBg: 'bg-orange-50 dark:bg-orange-900/20'
    },
    {
      title: 'Çalışma Süresi',
      value: `${stats.uptime.toFixed(1)} saat`,
      icon: Clock,
      color: 'bg-cyan-500',
      lightBg: 'bg-cyan-50 dark:bg-cyan-900/20'
    },
    {
      title: 'Anomali Sayısı',
      value: `${stats.anomalyCount}`,
      icon: AlertTriangle,
      color: stats.anomalyCount > 0 ? 'bg-red-500' : 'bg-gray-400',
      lightBg: stats.anomalyCount > 0 ? 'bg-red-50 dark:bg-red-900/20' : 'bg-gray-50 dark:bg-gray-800'
    }
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {cards.map((card, index) => (
        <div key={index} className={`${card.lightBg} rounded-xl p-3 sm:p-4`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider">
              {card.title}
            </span>
            <div className={`${card.color} p-1.5 rounded-lg`}>
              <card.icon className="w-3 h-3 text-white" />
            </div>
          </div>
          <p className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
            {card.value}
          </p>
        </div>
      ))}
    </div>
  );
}
