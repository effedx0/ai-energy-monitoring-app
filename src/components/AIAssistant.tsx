import { useState } from 'react';
import { Sparkles, RefreshCw, AlertTriangle, Zap, TrendingDown, TrendingUp, Activity, ShieldAlert, ChevronDown } from 'lucide-react';
import { AnomalyAlert } from '../types';

interface AIAssistantProps {
  latestAnomaly: AnomalyAlert | null;
}

type AIRole = 'assistant' | 'data_analyst' | 'energy_expert' | 'technician' | 'budget_advisor';

const ROLE_LABELS: Record<AIRole, { label: string; description: string }> = {
  assistant:     { label: '🏠 Akıllı Asistan',  description: 'Pratik öneriler' },
  data_analyst:  { label: '📊 Veri Analitiği',  description: 'İstatistiksel analiz' },
  energy_expert: { label: '⚡ Enerji Uzmanı',   description: 'Verimlilik & maliyet' },
  technician:    { label: '🔧 Teknik Servis',    description: 'Teşhis & onarım' },
  budget_advisor:{ label: '💰 Bütçe Danışmanı', description: 'Maliyet analizi' },
};

// APK'da import.meta.env calismaz — key buraya yazilir
const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY || '';

function getAnomalyMeta(type: AnomalyAlert['type']) {
  switch (type) {
    case 'spike':           return { icon: Zap,          label: 'Ani Artis',        color: 'text-yellow-400', bg: 'bg-yellow-400/10', border: 'border-yellow-400/30' };
    case 'sustained_high':  return { icon: TrendingUp,   label: 'Surekli Yuksek',   color: 'text-red-400',    bg: 'bg-red-400/10',    border: 'border-red-400/30' };
    case 'sustained_low':   return { icon: TrendingDown, label: 'Surekli Dusuk',    color: 'text-blue-400',   bg: 'bg-blue-400/10',   border: 'border-blue-400/30' };
    case 'threshold_exceeded': return { icon: ShieldAlert, label: 'Esik Asildi',    color: 'text-orange-400', bg: 'bg-orange-400/10', border: 'border-orange-400/30' };
    case 'unusual_pattern': return { icon: Activity,     label: 'Olagandisi',       color: 'text-purple-400', bg: 'bg-purple-400/10', border: 'border-purple-400/30' };
    default:                return { icon: AlertTriangle,label: 'Anomali',          color: 'text-gray-400',   bg: 'bg-gray-400/10',   border: 'border-gray-400/30' };
  }
}

function getAnomalyContext(anomaly: AnomalyAlert): string {
  const base = `Cihaz: ${anomaly.deviceName} (${anomaly.deviceType})\nAnlik Guc: ${anomaly.powerValue}W\nNormal Aralik: ${anomaly.expectedRange.min}W - ${anomaly.expectedRange.max}W\nSiddet: ${anomaly.severity === 'critical' ? 'KRITIK' : 'UYARI'}\nMesaj: ${anomaly.message}`;
  switch (anomaly.type) {
    case 'spike':             return `${base}\nDurum: ANI GUC ARTISI tespit edildi. Fiziksel nedenler, tekrar riski, hasar senaryosu.`;
    case 'sustained_high':    return `${base}\nDurum: Guc beklenen ust sinirin (${anomaly.expectedRange.max}W) ustunde UZUN SURE kaldi. Bakim eksikligi, filtre tikanikligi, sogutma sorunu.`;
    case 'sustained_low':     return `${base}\nDurum: Guc beklenen alt sinirin (${anomaly.expectedRange.min}W) altinda UZUN SURE kaldi. Sensor arizasi, devre sorunu.`;
    case 'threshold_exceeded':return `${base}\nDurum: Maksimum ESIK ASILDI. Sigorta/koruma devreleri tetiklenebilir. Yangın ve isinma riski.`;
    case 'unusual_pattern':   return `${base}\nDurum: OLAGANDISI tuketim deseni. Termostat arizasi, kontrol karti sorunu, sensor guvenilirligi.`;
    default:                  return base;
  }
}

function buildCombinedPrompt(anomaly: AnomalyAlert, role: AIRole): { system: string; user: string } {
  const context = getAnomalyContext(anomaly);
  const systems: Record<AIRole, string> = {
    assistant:     'Sen bir ev enerji asistanısın. Türkçe, sade ve anlaşılır yaz. Gereksiz giriş cümlesi kullanma, direkt konuya gir.',
    data_analyst:  'Sen bir enerji veri analistisin. Türkçe, sayısal yorumlar ve istatistiksel tespitler odaklı yaz. Gereksiz giriş cümlesi kullanma.',
    energy_expert: 'Sen bir enerji verimliliği uzmanısın. Türkçe, 4,5 TL/kWh tarifiyle maliyet hesapları dahil pratik öneriler ver. Gereksiz giriş cümlesi kullanma.',
    technician:    'Sen deneyimli bir elektrik teknikerisisin. Türkçe, teknik teşhis ve yapılması gerekenler odaklı yaz. Gereksiz giriş cümlesi kullanma.',
    budget_advisor:'Sen bir bütçe danışmanısın. Türkçe, 4,5 TL/kWh ile somut maliyet rakamları ve tasarruf önerileri ver. Gereksiz giriş cümlesi kullanma.',
  };
  const focuses: Record<AIRole, string> = {
    assistant:     'Aşağıdaki anomaliyi analiz et. Kullanıcının ne yapması gerektiğini madde madde açıkla:',
    data_analyst:  'Aşağıdaki anomalinin istatistiksel analizini madde madde yap:',
    energy_expert: 'Aşağıdaki anomalinin enerji ve maliyet etkisini analiz et, önerilerini madde madde yaz:',
    technician:    'Aşağıdaki anomalinin teknik teşhisini yap, yapılması gerekenleri madde madde yaz:',
    budget_advisor:'Aşağıdaki anomalinin mali etkisini hesapla, önerilerini madde madde yaz:',
  };
  return { system: systems[role], user: `${focuses[role]}\n\n${context}` };
}

function formatAdviceText(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-bold">$1</strong>')
    .replace(/^(\d+\.)\s/gm, '<span class="text-green-300 font-semibold">$1</span> ');
}

export function AIAssistant({ latestAnomaly }: AIAssistantProps) {
  const [loading, setLoading] = useState(false);
  const [advice, setAdvice] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<AIRole>('assistant');
  const [showRoleMenu, setShowRoleMenu] = useState(false);

  const getAIAdvice = async () => {
    if (!latestAnomaly) return;
    setLoading(true);
    setAdvice('');
    setError('');

    const { system, user } = buildCombinedPrompt(latestAnomaly, selectedRole);

    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'HTTP-Referer': 'https://energywatch.app',
          'X-Title': 'EnergyWatch',
        },
        body: JSON.stringify({
          model: 'openrouter/auto',
          max_tokens: 500,
          temperature: 0.5,
          messages: [
            { role: 'system', content: system },
            { role: 'user',   content: user },
          ],
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData?.error?.message || `HTTP ${res.status}`);
      }

      const data = await res.json();
      setAdvice(data?.choices?.[0]?.message?.content || 'Yanit alinamadi.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Bilinmeyen hata';
      setError(`API hatasi: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  const meta = latestAnomaly ? getAnomalyMeta(latestAnomaly.type) : null;
  const Icon = meta?.icon ?? AlertTriangle;

  return (
    <div className="bg-gradient-to-br from-green-800 via-slate-900 to-emerald-800 text-white rounded-2xl p-4 sm:p-6 shadow-xl shadow-green-500/20 border border-green-500/30 w-full flex flex-col overflow-visible">
      <div className="flex items-center justify-between mb-4 w-full gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="bg-green-500/20 p-2 rounded-xl border border-green-400/30 flex-shrink-0">
            <Sparkles className="w-5 h-5 text-green-300 animate-pulse" />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-sm sm:text-base text-green-100 truncate">{ROLE_LABELS[selectedRole].label}</h3>
            <p className="text-[10px] text-green-300/70">{ROLE_LABELS[selectedRole].description}</p>
          </div>
        </div>
        <div className="relative flex-shrink-0">
          <button
            onClick={() => setShowRoleMenu(!showRoleMenu)}
            className="bg-green-600/30 hover:bg-green-600/50 border border-green-500/30 text-white text-xs font-semibold px-3 py-2 rounded-lg flex items-center gap-1.5 transition-all"
          >
            <span className="hidden sm:inline">Rol</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showRoleMenu ? 'rotate-180' : ''}`} />
          </button>
          {showRoleMenu && (
            <div className="absolute right-0 top-full mt-2 bg-slate-900 border border-green-500/30 rounded-xl shadow-lg z-50 min-w-max">
              {(Object.entries(ROLE_LABELS) as [AIRole, typeof ROLE_LABELS['assistant']][]).map(([role, { label }]) => (
                <button
                  key={role}
                  onClick={() => { setSelectedRole(role); setShowRoleMenu(false); setAdvice(''); }}
                  className={`block w-full text-left px-4 py-2.5 text-sm font-medium transition-colors ${selectedRole === role ? 'bg-green-600/30 text-green-100 border-l-2 border-green-500' : 'text-green-200/70 hover:bg-white/5 hover:text-green-100'}`}
                >{label}</button>
              ))}
            </div>
          )}
        </div>
      </div>

      {!latestAnomaly ? (
        <div className="flex flex-col items-center justify-center py-6 text-center text-green-200/50 w-full">
          <AlertTriangle className="w-8 h-8 mb-2 opacity-30" />
          <p className="text-sm">Analiz edilecek bir anomali henuz yok.</p>
        </div>
      ) : (
        <div className="space-y-4 w-full">
          <div className="bg-white/10 border border-white/10 rounded-xl p-3 flex justify-between items-center w-full gap-2">
            <div className="min-w-0 flex items-center gap-2">
              <div className={`p-1.5 rounded-lg ${meta?.bg} border ${meta?.border} flex-shrink-0`}>
                <Icon className={`w-4 h-4 ${meta?.color}`} />
              </div>
              <div className="min-w-0">
                <span className={`text-[10px] uppercase font-bold tracking-wider block ${meta?.color}`}>{meta?.label}</span>
                <h4 className="text-sm font-semibold truncate text-white">{latestAnomaly.message}</h4>
              </div>
            </div>
            <button
              onClick={getAIAdvice}
              disabled={loading}
              className="bg-green-600 hover:bg-green-500 disabled:bg-green-800/50 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-lg shadow-green-600/30 flex items-center gap-1.5 flex-shrink-0 transition-all hover:scale-105 active:scale-95"
            >
              {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              {advice ? 'Yeniden Analiz' : 'Cozum Bul'}
            </button>
          </div>

          {error && (
            <div className="bg-red-900/40 border border-red-500/30 rounded-xl p-3 text-sm text-red-300">⚠️ {error}</div>
          )}

          {loading && (
            <div className="bg-slate-800/80 border border-slate-700/50 rounded-xl p-4 space-y-2 animate-pulse">
              <div className="h-3 bg-slate-700 rounded w-3/4" />
              <div className="h-3 bg-slate-700 rounded w-full" />
              <div className="h-3 bg-slate-700 rounded w-5/6" />
              <div className="h-3 bg-slate-700 rounded w-2/3" />
            </div>
          )}

          {advice && !loading && (
            <div className="bg-slate-800/80 border border-slate-700/50 rounded-xl p-4 w-full">
              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-700/50">
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${meta?.bg} ${meta?.color} border ${meta?.border}`}>{meta?.label}</span>
                <span className="text-[10px] text-slate-500">{ROLE_LABELS[selectedRole].label}</span>
              </div>
              <div
                className="text-sm text-slate-200 leading-relaxed"
                style={{ whiteSpace: 'pre-wrap', overflowWrap: 'break-word', wordBreak: 'break-word' }}
                dangerouslySetInnerHTML={{ __html: formatAdviceText(advice) }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
