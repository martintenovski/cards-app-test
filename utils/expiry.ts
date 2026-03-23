import type { WalletCard } from "@/types/card";

type ExpiryBadgeTone = "green" | "yellow" | "red";

type ExpiryStatus = {
  tone: ExpiryBadgeTone;
  label: string;
  expiryDate: Date;
  daysUntilExpiry: number;
  isExpired: boolean;
};

type ExpiryStatusOptions = {
  includeSuffix?: boolean;
};

function endOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
}

function parseDisplayDate(value?: string | null) {
  if (!value) return null;
  const match = value.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (!match) return null;
  const parsed = new Date(
    Number(match[3]),
    Number(match[2]) - 1,
    Number(match[1]),
  );
  return Number.isNaN(parsed.getTime()) ? null : endOfDay(parsed);
}

function parseCardExpiry(value?: string | null) {
  if (!value) return null;
  const match = value.match(/^(\d{2})\/(\d{2})$/);
  if (!match) return null;
  const month = Number(match[1]);
  const year = Number(`20${match[2]}`);
  if (month < 1 || month > 12) return null;
  return endOfDay(new Date(year, month, 0));
}

export function getCardExpiryDate(card: WalletCard) {
  if (card.category === "bank") {
    return parseCardExpiry(card.expiry);
  }

  if ("dateOfExpiry" in card) {
    return parseDisplayDate(card.dateOfExpiry);
  }

  return null;
}

export function supportsValidityBadge(card: WalletCard) {
  return card.category === "bank" || card.category === "personal";
}

function formatDurationLabel(totalMonths: number, includeSuffix: boolean) {
  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;
  const parts = [
    years > 0 ? `${years}Y` : null,
    months > 0 ? `${months}M` : null,
  ].filter(Boolean) as string[];

  const label = (parts.length > 0 ? parts : ["1M"]).join(" ");
  return includeSuffix ? `Expires in ${label}` : label;
}

function formatDayLabel(daysUntilExpiry: number, includeSuffix: boolean) {
  const label = `${daysUntilExpiry}D`;
  return includeSuffix ? `Expires in ${label}` : label;
}

export function getExpiryStatus(
  card: WalletCard,
  now = new Date(),
  options: ExpiryStatusOptions = {},
): ExpiryStatus | null {
  const expiryDate = getCardExpiryDate(card);
  if (!expiryDate) return null;

  const includeSuffix = options.includeSuffix ?? true;
  const msUntilExpiry = expiryDate.getTime() - now.getTime();
  const daysUntilExpiry = Math.ceil(msUntilExpiry / (1000 * 60 * 60 * 24));
  const isExpired = msUntilExpiry < 0;

  if (isExpired) {
    return {
      tone: "red",
      label: "Expired",
      expiryDate,
      daysUntilExpiry,
      isExpired,
    };
  }

  if (daysUntilExpiry <= 14) {
    return {
      tone: "red",
      label: formatDayLabel(daysUntilExpiry, includeSuffix),
      expiryDate,
      daysUntilExpiry,
      isExpired,
    };
  }

  if (daysUntilExpiry <= 30) {
    return {
      tone: "yellow",
      label: formatDayLabel(daysUntilExpiry, includeSuffix),
      expiryDate,
      daysUntilExpiry,
      isExpired,
    };
  }

  const monthsLeft = Math.max(1, Math.round(daysUntilExpiry / 30));
  return {
    tone: "green",
    label: formatDurationLabel(monthsLeft, includeSuffix),
    expiryDate,
    daysUntilExpiry,
    isExpired,
  };
}

export function formatExpiryDateForNotification(date: Date) {
  return date.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
