import type { CardFormValues, CardPalette, WalletCard } from "@/types/card";
import { cardToFormValues } from "@/types/card";

export const SHARED_CARD_FILE_MIME_TYPE =
  "application/vnd.pocketid.card+json";
export const SHARED_CARD_FILE_EXTENSION = ".pocketid-card.json";

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

export function stringifySharedCardPayload(payload: SharedCardPayload) {
  return JSON.stringify(payload, null, 2);
}

export function parseSharedCardPayload(rawPayload?: string | null) {
  if (!rawPayload) return null;

  const normalizedPayload = rawPayload.replace(/^\uFEFF/, "").trim();

  const parseCandidate = (candidate: string) => {
    const parsed = JSON.parse(candidate) as Partial<SharedCardPayload>;
    if (parsed.version !== 1 || !parsed.values || !parsed.palette) {
      return null;
    }
    return parsed as SharedCardPayload;
  };

  try {
    return parseCandidate(normalizedPayload);
  } catch {
    const firstBrace = normalizedPayload.indexOf("{");
    const lastBrace = normalizedPayload.lastIndexOf("}");

    if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
      return null;
    }

    try {
      return parseCandidate(
        normalizedPayload.slice(firstBrace, lastBrace + 1),
      );
    } catch {
      return null;
    }
  }
}

export function createSharedCardFileName(card: WalletCard) {
  const sanitizedTitle = card.title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);

  return `${sanitizedTitle || "shared-card"}${SHARED_CARD_FILE_EXTENSION}`;
}

export function encodeSharedCardPayload(payload: SharedCardPayload) {
  return encodeURIComponent(JSON.stringify(payload));
}

export function decodeSharedCardPayload(encodedPayload?: string | string[]) {
  if (!encodedPayload) return null;
  const raw = Array.isArray(encodedPayload)
    ? encodedPayload[0]
    : encodedPayload;

  return parseSharedCardPayload(decodeURIComponent(raw));
}
