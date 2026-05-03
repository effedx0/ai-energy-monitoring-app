import { useState } from 'react';
import { ShieldCheck, FileText, Lock } from 'lucide-react';
import { KVKK_CONSENT_VERSION } from '../utils/privacy';

type KvkkConsentGateProps = {
  onAccept: (input: { optionalAnalytics: boolean }) => void;
};

const AYDINLATMA_METNI = [
  'EvimCepte uygulamasında enerji izleme ve anomali analizi hizmeti sunulmaktadır.',
  'Bu kapsamda işlenen veriler cihaz tüketim verileri, zaman damgaları ve sistem kullanım olayları ile sınırlıdır.',
  'Kimliği doğrudan belirleyen ad, soyad, telefon, e-posta gibi kişisel veriler varsayılan akışta talep edilmez.',
  'Sistemde kullanıcı işlemleri anonim kullanıcı kimliği ile ilişkilendirilir.',
  'Veriler hizmetin sunulması, güvenlik, hata giderme ve yasal yükümlülüklerin yerine getirilmesi amaçlarıyla işlenir.',
  'Opsiyonel analitik izni verilirse kullanım kalitesini iyileştirmek amacıyla anonim ölçümler toplanabilir.',
  'KVKK kapsamındaki haklarınızı kullanmak için proje sorumlusu ile iletişime geçebilirsiniz.',
];

export function KvkkConsentGate({ onAccept }: KvkkConsentGateProps) {
  const [showText, setShowText] = useState(false);
  const [ackTextRead, setAckTextRead] = useState(false);
  const [acceptMandatory, setAcceptMandatory] = useState(false);
  const [acceptOptionalAnalytics, setAcceptOptionalAnalytics] = useState(false);

  const canContinue = ackTextRead && acceptMandatory;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-green-100 dark:border-green-900/40 shadow-sm p-5 sm:p-6 max-w-3xl mx-auto">
      <div className="flex items-start gap-3">
        <div className="bg-green-100 dark:bg-green-900/40 p-2 rounded-xl">
          <ShieldCheck className="w-5 h-5 text-green-700 dark:text-green-300" />
        </div>
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100">KVKK Onayı Gerekli</h2>
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
            Enerji verilerini işleyebilmemiz için aydınlatma metnini okuyup onay vermeniz gerekir.
          </p>
          <p className="text-xs text-gray-400 mt-1">Sürüm: {KVKK_CONSENT_VERSION}</p>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        <button
          type="button"
          onClick={() => setShowText(prev => !prev)}
          className="w-full sm:w-auto inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium bg-green-50 hover:bg-green-100 text-green-700 dark:bg-green-900/30 dark:hover:bg-green-900/50 dark:text-green-300 border border-green-200 dark:border-green-800"
        >
          <FileText className="w-4 h-4" />
          {showText ? 'Aydınlatma Metnini Gizle' : 'Aydınlatma Metnini Gör'}
        </button>

        {showText && (
          <div className="max-h-56 overflow-y-auto rounded-xl border border-gray-200 dark:border-gray-700 p-3 bg-gray-50 dark:bg-gray-900/40 text-sm text-gray-700 dark:text-gray-200 space-y-2">
            {AYDINLATMA_METNI.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
        )}
      </div>

      <div className="mt-4 space-y-3">
        <label className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-200">
          <input
            type="checkbox"
            checked={ackTextRead}
            onChange={(e) => setAckTextRead(e.target.checked)}
            className="mt-0.5"
          />
          <span>Aydınlatma metnini okudum ve bilgilendirildim.</span>
        </label>

        <label className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-200">
          <input
            type="checkbox"
            checked={acceptMandatory}
            onChange={(e) => setAcceptMandatory(e.target.checked)}
            className="mt-0.5"
          />
          <span>Gerekli veri işleme faaliyetlerine KVKK kapsamında açık rıza veriyorum.</span>
        </label>

        <label className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-200">
          <input
            type="checkbox"
            checked={acceptOptionalAnalytics}
            onChange={(e) => setAcceptOptionalAnalytics(e.target.checked)}
            className="mt-0.5"
          />
          <span>Opsiyonel: Anonim kullanım analitiği paylaşımını kabul ediyorum.</span>
        </label>
      </div>

      <div className="mt-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="inline-flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <Lock className="w-3.5 h-3.5" />
          Veriler anonim kimlik ile saklanır.
        </div>

        <button
          type="button"
          disabled={!canContinue}
          onClick={() => onAccept({ optionalAnalytics: acceptOptionalAnalytics })}
          className="w-full sm:w-auto px-4 py-2 rounded-xl text-sm font-semibold bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Onayla ve Devam Et
        </button>
      </div>
    </div>
  );
}
