const DOMAIN_TYPOS: Record<string, string> = {
  'gmal.com': 'gmail.com',
  'gmial.com': 'gmail.com',
  'gmil.com': 'gmail.com',
  'gmaill.com': 'gmail.com',
  'gmail.co': 'gmail.com',
  'gmail.cm': 'gmail.com',
  'gnail.com': 'gmail.com',
  'yaho.com': 'yahoo.com',
  'yahooo.com': 'yahoo.com',
  'hotmal.com': 'hotmail.com',
  'outlok.com': 'outlook.com',
};

export function extractApiError(err: any, fallback: string): string {
  const data = err?.response?.data;
  if (data?.data && typeof data.data === 'object' && !Array.isArray(data.data)) {
    const firstFieldMsg = Object.values(data.data).find((v) => typeof v === 'string' && v.trim());
    if (typeof firstFieldMsg === 'string') return firstFieldMsg;
  }
  if (typeof data?.message === 'string' && data.message.trim()) {
    return data.message;
  }
  return fallback;
}

export function suggestEmailFix(rawEmail: string): string | null {
  const trimmed = rawEmail.trim().toLowerCase();
  const atIndex = trimmed.indexOf('@');
  if (atIndex <= 0) return null;
  const local = trimmed.slice(0, atIndex);
  const domain = trimmed.slice(atIndex + 1);
  const correction = DOMAIN_TYPOS[domain];
  return correction ? `${local}@${correction}` : null;
}

export function isValidEmailFormat(rawEmail: string): boolean {
  return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(rawEmail.trim());
}

/** Normalizes LK mobile input to E.164 (+94XXXXXXXXX) when entered via the +94 box or local format. */
export function normalizeLkPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('0') && digits.length === 10) {
    return `+94${digits.substring(1)}`;
  }
  if (digits.length === 9) {
    return `+94${digits}`;
  }
  if (digits.startsWith('94') && digits.length === 11) {
    return `+${digits}`;
  }
  return raw.trim();
}

export function isValidLkPhone(raw: string): boolean {
  const normalized = normalizeLkPhone(raw);
  return /^\+947[0-9]{8}$/.test(normalized) || /^\+94[1-9][0-9]{8}$/.test(normalized) || /^\+?[0-9 ()-]{9,16}$/.test(raw.trim());
}

export function formatCountdown(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = String(seconds % 60).padStart(2, '0');
  return `${mins}:${secs}`;
}
