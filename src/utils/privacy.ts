export const KVKK_CONSENT_VERSION = 'kvkk_v1_2026_05';
export const KVKK_STORAGE_KEY = 'evimcepte_kvkk_consent';

export type KvkkConsentRecord = {
  accepted: true;
  consentVersion: string;
  acceptedAt: string;
  anonUserId: string;
  optionalAnalytics: boolean;
};

export type KvkkConsentInput = {
  optionalAnalytics: boolean;
};

const isBrowser = () => typeof window !== 'undefined' && typeof sessionStorage !== 'undefined';

const createAnonUserId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `anon_${Date.now()}_${Math.random().toString(16).slice(2, 10)}`;
};

export const loadKvkkConsent = (): KvkkConsentRecord | null => {
  if (!isBrowser()) return null;

  const raw = sessionStorage.getItem(KVKK_STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<KvkkConsentRecord>;
    const isValid =
      parsed.accepted === true &&
      parsed.consentVersion === KVKK_CONSENT_VERSION &&
      typeof parsed.acceptedAt === 'string' &&
      typeof parsed.anonUserId === 'string' &&
      typeof parsed.optionalAnalytics === 'boolean';

    return isValid ? (parsed as KvkkConsentRecord) : null;
  } catch {
    return null;
  }
};

export const createKvkkConsentRecord = (input: KvkkConsentInput): KvkkConsentRecord => {
  const existing = loadKvkkConsent();
  return {
    accepted: true,
    consentVersion: KVKK_CONSENT_VERSION,
    acceptedAt: new Date().toISOString(),
    anonUserId: existing?.anonUserId ?? createAnonUserId(),
    optionalAnalytics: input.optionalAnalytics,
  };
};

export const saveKvkkConsent = (record: KvkkConsentRecord) => {
  if (!isBrowser()) return;
  sessionStorage.setItem(KVKK_STORAGE_KEY, JSON.stringify(record));
};
