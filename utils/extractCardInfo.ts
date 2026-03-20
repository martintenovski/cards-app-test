export type ExtractedCardInfo = {
  cardNumber: string | null;
  expiry: string | null;
  name: string | null;
  bank: string | null;
  rawText: string;
  hasUsefulData: boolean;
  errorMessage: string | null;
};

const KNOWN_BANKS = ['VISA', 'MASTERCARD', 'AMEX', 'NLB', 'SPARKASSE', 'REVOLUT', 'PAYPAL', 'BINANCE'] as const;

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

function normalizeCardNumber(value?: string) {
  if (!value) return null;
  const digits = value.replace(/[^\d]/g, '');
  if (digits.length !== 16) return null;
  return digits.match(/.{1,4}/g)?.join(' ') ?? digits;
}

function normalizeExpiry(value?: string) {
  if (!value) return null;
  return value.trim();
}

function normalizeName(value?: string) {
  if (!value) return null;
  const normalized = normalizeWhitespace(value.toUpperCase());
  return normalized || null;
}

export function extractCardInfo(rawText: string): ExtractedCardInfo {
  const text = rawText ?? '';
  const normalizedText = text.replace(/\r/g, '\n');

  const cardNumber = normalizeCardNumber(
    normalizedText.match(/\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}/)?.[0]
  );

  const expiry = normalizeExpiry(
    normalizedText.match(/\b(0[1-9]|1[0-2])\/(\d{2}|\d{4})\b/)?.[0]
  );

  const name = normalizeName(
    normalizedText.match(/\b[A-Z]{2,}\s[A-Z]{2,}(?:\s[A-Z]{2,})?\b/)?.[0]
  );

  const upperText = normalizedText.toUpperCase();
  const bank = KNOWN_BANKS.find((knownBank) => upperText.includes(knownBank)) ?? null;

  const hasUsefulData = Boolean(cardNumber || expiry || name || bank);

  return {
    cardNumber,
    expiry,
    name,
    bank,
    rawText: text,
    hasUsefulData,
    errorMessage: hasUsefulData
      ? null
      : 'Could not read card. Try better lighting or hold it flatter.',
  };
}

export { KNOWN_BANKS };
