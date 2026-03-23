import type { CardFormValues, CardPalette, WalletCard } from "@/types/card";
import { cardToFormValues } from "@/types/card";

export type SharedCardPayload = {
  version: 1;
  values: CardFormValues;
  palette: CardPalette;
};

export function createSharedCardPayload(card: WalletCard): SharedCardPayload {
  return {
    version: 1,
    values: cardToFormValues(card),
    palette: card.palette,
  };
}

export function encodeSharedCardPayload(payload: SharedCardPayload) {
  return encodeURIComponent(JSON.stringify(payload));
}

export function decodeSharedCardPayload(encodedPayload?: string | string[]) {
  if (!encodedPayload) return null;
  const raw = Array.isArray(encodedPayload)
    ? encodedPayload[0]
    : encodedPayload;

  try {
    const parsed = JSON.parse(
      decodeURIComponent(raw),
    ) as Partial<SharedCardPayload>;
    if (parsed.version !== 1 || !parsed.values || !parsed.palette) {
      return null;
    }
    return parsed as SharedCardPayload;
  } catch {
    return null;
  }
}
