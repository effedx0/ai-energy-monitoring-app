import { PowerReading } from '../types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

interface RealtimeChartProps {
  data: PowerReading[];
  maxPower: number;
  deviceName: string;
}

export function RealtimeChart({ data, maxPower, deviceName }: RealtimeChartProps) {
  // Grafik için veri hazırla (son 60 veri noktası)
  const chartData = data.slice(-60).map((reading, index) => ({
    time: index,
    power: reading.power,
    isAnomaly: reading.isAnomaly,
    label: new Date(reading.timestamp).toLocaleTimeString('tr-TR', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    })
  }));
  
  // Anomali noktaları
  const anomalyPoints = chartData.filter(d => d.isAnomaly);
  
  // Ortalama güç
  const avgPower = data.length > 0 
    ? Math.round(data.reduce((sum, d) => sum + d.power, 0) / data.length)
    : 0;
  
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.[0]) return null;
    
    const value = payload[0].value;
    const isAnomaly = payload[0].payload.isAnomaly;
    
    return (
      <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
        <p className="font-semibold text-gray-900 dark:text-white">
          {value} Watt
        </p>
        <p className="text-sm text-gray-500">
          {(value / 1000).toFixed(2)} kW
        </p>
        {isAnomaly && (
          <p className="text-sm text-red-500 font-medium mt-1">⚠️ Anomali!</p>
        )}
      </div>
    );
  };

  return (
    <div className="w-full min-w-0 bg-white dark:bg-gray-800 rounded-2xl p-4 sm:p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          {deviceName} • Gerçek Zamanlı Güç Tüketimi
        </h3>
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <span>Güç</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
            <span>Ortalama: {avgPower}W</span>
          </div>
          {anomalyPoints.length > 0 && (
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
              <span className="text-red-500">Anomali: {anomalyPoints.length}</span>
            </div>
          )}
        </div>
      </div>
      
      <div className="h-[250px] sm:h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis 
              dataKey="label"
              tick={{ fontSize: 10 }}
              interval={10}
              stroke="#9ca3af"
            />
            <YAxis 
              tick={{ fontSize: 10 }}
              stroke="#9ca3af"
              domain={[0, maxPower * 1.1]}
              label={{ 
                value: 'Watt', 
                angle: -90, 
                position: 'insideLeft',
                style: { fontSize: 10 }
              }}
            />
            <Tooltip content={<CustomTooltip />} />
            
            {/* Ortalama çizgisi */}
            <ReferenceLine 
              y={avgPower} 
              stroke="#9ca3af" 
              strokeDasharray="5 5"
              label={{ value: 'Ort', position: 'right', fontSize: 10 }}
            />
            
            {/* Anomali çizgileri */}
            {anomalyPoints.map((point, i) => (
              <ReferenceLine
                key={i}
                x={point.time}
                stroke="#ef4444"
                strokeWidth={2}
                strokeDasharray="3 3"
              />
            ))}
            
            {/* Ana çizgi */}
            <Line 
              type="monotone" 
              dataKey="power" 
              stroke="#3b82f6" 
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: '#3b82f6' }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      
      {/* Son anomali uyarısı */}
      {anomalyPoints.length > 0 && (
        <div className="mt-3 p-2 bg-red-50 dark:bg-red-900/20 rounded-lg flex items-center gap-2">
          <span className="text-red-500 animate-pulse">⚠️</span>
          <span className="text-xs text-red-600 dark:text-red-400">
            Son anomali: {anomalyPoints[anomalyPoints.length - 1].label} - {anomalyPoints[anomalyPoints.length - 1].power} Watt
          </span>
        </div>
      )}
    </div>
  );
}
