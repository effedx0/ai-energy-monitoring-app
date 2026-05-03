import { useState, useEffect } from 'react';
import { AnomalyAlert } from '../types';
import { AlertTriangle, X, Bell, BellOff } from 'lucide-react';

interface AnomalyAlertsProps {
  alerts: AnomalyAlert[];
  onDismiss: (id: string) => void;
  selectedAlertId?: string | null;
  onSelectAlert?: (alert: AnomalyAlert) => void;
}

export function AnomalyAlerts({ alerts, onDismiss, selectedAlertId, onSelectAlert }: AnomalyAlertsProps) {
  const [isMuted, setIsMuted] = useState(false);
  const [showAll, setShowAll] = useState(false);
  
  // Bildirim sesi (basit beep)
  useEffect(() => {
    if (alerts.length > 0 && !isMuted) {
      const latest = alerts[0];
      if (!latest.dismissed && latest.severity === 'critical') {
        // Browser notification
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('EvimCepte Anomali Uyarısı!', {
            body: latest.message,
            icon: '/icon-192.svg'
          });
        }
      }
    }
  }, [alerts, isMuted]);
  
  const activeAlerts = alerts.filter(a => !a.dismissed);
  const displayAlerts = showAll ? activeAlerts : activeAlerts.slice(0, 3);
  
  if (activeAlerts.length === 0) {
    return (
      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-2xl p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-100 dark:bg-green-800 rounded-xl">
            <span className="text-xl">✅</span>
          </div>
          <div>
            <h4 className="font-medium text-green-800 dark:text-green-200">
              Sistem Normal
            </h4>
            <p className="text-sm text-green-600 dark:text-green-300">
              Anormal enerji tüketimi tespit edilmedi.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Bell className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
              {activeAlerts.length}
            </span>
          </div>
          <h3 className="font-semibold text-gray-900 dark:text-white">
            Anomali Uyarıları
          </h3>
        </div>
        <button
          onClick={() => setIsMuted(!isMuted)}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          title={isMuted ? 'Bildirimleri Aç' : 'Bildirimleri Kapat'}
        >
          {isMuted ? (
            <BellOff className="w-4 h-4 text-gray-400" />
          ) : (
            <Bell className="w-4 h-4 text-blue-500" />
          )}
        </button>
      </div>
      
      {/* Alerts list */}
      <div className="p-4 space-y-3">
        {displayAlerts.map((alert) => (
          <div
            key={alert.id}
            onClick={() => onSelectAlert?.(alert)}
            className={`relative p-3 rounded-xl border cursor-pointer transition-all transform hover:scale-[1.02] ${
              selectedAlertId === alert.id
                ? 'ring-2 ring-blue-500 shadow-md'
                : 'hover:shadow-sm'
            } ${
              alert.severity === 'critical'
                ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                : 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800'
            }`}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDismiss(alert.id);
              }}
              className="absolute top-2 right-2 p-1 hover:bg-black/5 rounded"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
            
            <div className="flex gap-3">
              <div className={`p-2 rounded-lg ${
                alert.severity === 'critical'
                  ? 'bg-red-100 dark:bg-red-800'
                  : 'bg-orange-100 dark:bg-orange-800'
              }`}>
                <AlertTriangle className={`w-5 h-5 ${
                  alert.severity === 'critical' ? 'text-red-500' : 'text-orange-500'
                } ${alert.severity === 'critical' ? 'animate-pulse' : ''}`} />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className={`font-medium text-sm ${
                    alert.severity === 'critical'
                      ? 'text-red-800 dark:text-red-200'
                      : 'text-orange-800 dark:text-orange-200'
                  }`}>
                    {alert.deviceName}
                  </h4>
                  <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${
                    alert.severity === 'critical'
                      ? 'bg-red-200 text-red-700 dark:bg-red-800 dark:text-red-300'
                      : 'bg-orange-200 text-orange-700 dark:bg-orange-800 dark:text-orange-300'
                  }`}>
                      {alert.type === 'spike' ? 'Ani Artış' : 
                      alert.type === 'threshold_exceeded' ? 'Eşik Aşıldı' :
                      alert.type === 'sustained_high' ? 'Sürekli Yüksek' :
                      alert.type === 'sustained_low' ? 'Sürekli Düşük' : 'Olağandışı'}
                  </span>
                </div>
                
                <p className={`text-xs mt-1 ${
                  alert.severity === 'critical'
                    ? 'text-red-600 dark:text-red-300'
                    : 'text-orange-600 dark:text-orange-300'
                }`}>
                  {alert.message}
                </p>
                
                <div className="flex items-center gap-4 mt-2 text-[10px] text-gray-500">
                  <span>Güç: {alert.powerValue}W</span>
                  <span>Beklenen: {alert.expectedRange.min}-{alert.expectedRange.max}W</span>
                  <span>{new Date(alert.timestamp).toLocaleTimeString('tr-TR')}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
        
        {activeAlerts.length > 3 && (
          <button
            onClick={() => setShowAll(!showAll)}
            className="w-full text-center text-sm text-blue-500 hover:text-blue-600 py-2"
          >
            {showAll ? 'Daha az göster' : `${activeAlerts.length - 3} uyarı daha göster`}
          </button>
        )}
      </div>
    </div>
  );
}
