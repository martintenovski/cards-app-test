import {
  DEFAULT_FORM_VALUES,
  type CardCategory,
  type CardFormValues,
} from "@/types/card";
import type {
  DocumentClassificationResult,
  ExtractedFieldMap,
  OcrLineCandidate,
  OcrProviderResult,
  ScanSide,
  ScanWarning,
} from "@/types/documentScanner";

type ProviderBundle = Partial<Record<ScanSide, OcrProviderResult>>;

type ScoredClassification = DocumentClassificationResult & { score: number };
type ParsedDateLabel = "birth" | "issue" | "expiry" | "other";
type ParsedDateEntry = {
  formatted: string;
  timestamp: number;
  year: number;
  label: ParsedDateLabel;
  lineIndex: number;
};

const CYRILLIC_CHARACTERS_REGEX = /[\u0400-\u04FF\u0500-\u052F]/g;
const DATE_TOKEN_REGEX =
  /\b(?:\d{2}[.\/-]\d{2}[.\/-]\d{2,4}|\d{4}[.\/-]\d{2}[.\/-]\d{2})\b/g;
const DATE_LABEL_PATTERNS: Array<{ label: ParsedDateLabel; pattern: RegExp }> =
  [
    {
      label: "birth",
      pattern: /(?:date of birth|birth date|dob|born|birth|\b3\.)/i,
    },
    {
      label: "issue",
      pattern: /(?:date of issue|issued on|issued|issue date|issuing date|\b4a\.)/i,
    },
    {
      label: "expiry",
      pattern:
        /(?:date of expiry|expiry date|expiration date|expires|exp(?:iry)?|valid until|valid thru|valid to|\b4b\.)/i,
    },
  ];

const PERSONAL_KEYWORDS = {
  // Only truly Passport-specific words. "surname", "given names", "nationality"
  // are printed field labels on ALL personal documents and must not score here.
  passport: ["passport"],
  driving: ["driver", "driving", "licence", "license", "class"],
  identity: [
    "identity card",
    "id card",
    "personal no",
    "id card number",
    "identification card",
    "лична карта",
  ],
};

const CATEGORY_KEYWORDS: Array<{
  category: CardCategory;
  type: string;
  keywords: string[];
}> = [
  {
    category: "bank",
    type: "Debit Card",
    keywords: ["visa", "mastercard", "credit", "debit", "valid thru"],
  },
  {
    category: "personal",
    type: "Passport",
    keywords: PERSONAL_KEYWORDS.passport,
  },
  {
    category: "personal",
    type: "Driving License",
    keywords: PERSONAL_KEYWORDS.driving,
  },
  {
    category: "personal",
    type: "Identity Card",
    keywords: PERSONAL_KEYWORDS.identity,
  },
  {
    category: "insurance",
    type: "Health Insurance",
    keywords: ["insurance", "policy", "member id", "group number"],
  },
  {
    category: "vehicle",
    type: "Vehicle Registration",
    keywords: ["registration", "vin", "plate", "vehicle"],
  },
  {
    category: "access",
    type: "Employee Badge",
    keywords: ["employee", "visitor", "access", "department"],
  },
  {
    category: "club",
    type: "Club Card",
    keywords: ["member", "membership", "loyalty", "club"],
  },
];

const NATIONALITY_CODES = [
  // EU / EEA
  "AUT", "BEL", "BGR", "HRV", "CYP", "CZE", "DNK", "EST",
  "FIN", "FRA", "DEU", "GRC", "HUN", "IRL", "ITA", "LVA",
  "LTU", "LUX", "MLT", "NLD", "POL", "PRT", "ROU", "SVK",
  "SVN", "ESP", "SWE", "ISL", "LIE", "NOR", "CHE",
  // Balkans (non-EU)
  "MKD", "SRB", "BIH", "MNE", "ALB", "XKX",
  // Major world
  "USA", "CAN", "GBR", "AUS", "NZL", "JPN", "KOR", "CHN",
  "IND", "BRA", "MEX", "ARG", "ZAF", "TUR", "RUS", "UKR",
  "ISR", "ARE", "SAU", "EGY", "NGA", "KEN", "SGP", "MYS",
  "IDN", "THA", "PHL", "VNM", "COL", "PER", "CHL",
];

const NAME_REJECTED_KEYWORDS = [
  "identity",
  "passport",
  "license",
  "licence",
  "bank",
  "member",
  "insurance",
  "registration",
  "employee",
  "republic",
  "nationality",
  "address",
];

const BANK_CARD_REJECTED_TERMS = [
  "visa",
  "mastercard",
  "maestro",
  "american express",
  "amex",
  "discover",
  "unionpay",
  "jcb",
  "diners",
  "debit",
  "credit",
  "platinum",
  "gold",
  "classic",
  "standard",
  "signature",
  "infinite",
  "world",
  "elite",
  "business",
  "corporate",
  "prepaid",
  "valid thru",
  "valid through",
  "valid until",
  "expires end",
  "member since",
  "cardholder",
  "card holder",
  "interlink",
  "electron",
  "cirrus",
  "contactless",
  "checking",
  "savings",
  "account",
];

const PERSONAL_DOC_REJECTED_TERMS = [
  "identity card", "id card", "лична карта", "lična karta",
  "driving license", "driving licence", "driver license", "driver licence",
  "permis de conduire", "führerschein", "возачка дозвола", "vozačka dozvola",
  "passport", "passeport", "reisepass", "пасош",
  "republic", "република", "republika", "republic of", "kingdom of",
  "north macedonia", "северна македонија",
  "european union", "united states", "united kingdom",
  "ministry", "ministarstvo", "министерство",
  "surname", "last name", "family name",
  "given name", "given names", "first name",
  "nom", "prénom", "prenom", "nachname", "vorname",
  "prezime", "ime", "фамилија", "име",
  "date of birth", "date of issue", "date of expiry",
  "nationality", "sex", "gender",
  "address", "place of birth",
  "document no", "document number", "personal no", "personal number",
  "card no", "issued by", "authority",
  "valid until", "expires", "class", "categories",
];

const CLUB_CARD_REJECTED_TERMS = [
  "member card", "membership card", "loyalty card", "club card",
  "gym pass", "gym card", "reward card", "rewards card",
  "vip card", "premium card", "loyalty program",
  "membership", "member since",
  "valid", "valid thru", "valid until", "expires", "expiry",
  "member id", "member no", "membership no", "membership number",
  "card number", "barcode", "scan here",
  "terms and conditions", "www", "http",
];

const SURNAME_LABELS = [
  "surname", "last name", "family name",
  "nom", "nom de famille",
  "nachname", "familienname",
  "prezime", "фамилија", "familija",
  "фамилия", "прізвище",
  "cognome", "apellido", "apelido",
  // EU driving license field code 1
  "1.",
];

const GIVEN_NAME_LABELS = [
  "given name", "given names", "first name", "first names", "forename",
  "prénom", "prenom",
  "vorname",
  "ime", "име",
  "имя",
  "nome", "nombre",
  // EU driving license field code 2
  "2.",
];

const DOCUMENT_NUMBER_LABELS = [
  "document no", "document number", "doc no", "doc number",
  "passport no", "passport number",
  "license no", "license number", "licence no", "licence number",
  "card no", "card number",
  "id no", "id number",
  "no.", "nr.", "nr",
  "број", "broj", "numero", "numéro", "nummer",
  "dl no", "dl", "d.l.",
  "permis no",
  // EU driving license field code 5
  "5.",
];

const PERSONAL_ID_LABELS = [
  "personal no", "personal number", "id number", "national id",
  "nin", "embg", "emso", "jmbg", "pin",
  "oib", "pesel", "ssn", "cnp", "bsn",
  "матичен број", "matičen broj", "maticen broj",
  "матични број", "matični broj",
  "единствен матичен број",
  "személyi szám", "rodné číslo",
];

function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function countLatinCharacters(value: string) {
  return value.match(/[A-ZÀ-ÿ]/gi)?.length ?? 0;
}

function countDigits(value: string) {
  return value.match(/\d/g)?.length ?? 0;
}

/**
 * Score how "naturally Latin" a string is by its vowel density.
 * Real Latin words (names, addresses) have ~25–45% vowels.
 * Bilingual-document OCR artefacts (Cyrillic chars mapped to visually similar
 * Latin chars: Н→H, В→B, С→C, Р→P, М→M) produce dense consonant clusters
 * with very few vowels, so they score lower and are deprioritised.
 */
function latinStructureScore(value: string): number {
  const letters = value.replace(/[^A-Za-z]/g, "");
  if (letters.length < 2) return 0;
  const vowels = letters.match(/[AEIOUaeiou]/g)?.length ?? 0;
  const ratio = vowels / letters.length;
  // Reward natural vowel distribution (≥15%); harsh penalty for near-zero
  return ratio >= 0.15 ? ratio : ratio * 0.2;
}

function scoreCandidate(value: string, preferDigits = false) {
  const normalized = normalizeText(value);
  const latinCount = countLatinCharacters(normalized);
  const digitCount = countDigits(normalized);
  const cyrillicCount = value.match(CYRILLIC_CHARACTERS_REGEX)?.length ?? 0;
  const structureBonus = latinStructureScore(normalized) * 20;

  return (
    latinCount * 3 +
    digitCount * (preferDigits ? 2 : 0.5) -
    cyrillicCount * 4 +
    structureBonus
  );
}

function stripCyrillicCharacters(value: string) {
  return value.replace(CYRILLIC_CHARACTERS_REGEX, " ");
}

function normalizeText(value: string) {
  return stripCyrillicCharacters(value).replace(/\s+/g, " ").trim();
}

function normalizeForMatching(value: string) {
  return normalizeText(value).toLowerCase();
}

function compactDigits(value: string) {
  return stripCyrillicCharacters(value).replace(/\D/g, "");
}

function compactCode(value: string) {
  return stripCyrillicCharacters(value)
    .toUpperCase()
    .replace(/[^A-Z0-9/\- ]/g, "")
    .trim();
}

function isNameCandidate(value: string) {
  const cleaned = normalizeText(value)
    .replace(/[^A-ZÀ-ÿ' -]/gi, " ")
    .trim();
  const tokens = cleaned.split(/\s+/).filter(Boolean);
  if (tokens.length < 2 || tokens.length > 4) {
    return false;
  }

  return !NAME_REJECTED_KEYWORDS.some((keyword) =>
    normalizeForMatching(cleaned).includes(keyword),
  );
}

function isBankCardNameCandidate(value: string) {
  if (!isNameCandidate(value)) return false;
  const lower = normalizeForMatching(value);
  return !BANK_CARD_REJECTED_TERMS.some((term) => lower.includes(term));
}

function isPersonalDocNameCandidate(value: string) {
  const cleaned = normalizeText(value)
    .replace(/[^A-ZÀ-ÿ' -]/gi, " ")
    .trim();
  const tokens = cleaned.split(/\s+/).filter(Boolean);
  if (tokens.length < 1 || tokens.length > 4) return false;
  if (countLatinCharacters(cleaned) < 2) return false;
  const lower = normalizeForMatching(cleaned);
  return (
    !NAME_REJECTED_KEYWORDS.some((kw) => lower.includes(kw)) &&
    !PERSONAL_DOC_REJECTED_TERMS.some((term) => lower.includes(term))
  );
}

function isClubCardNameCandidate(value: string) {
  if (!isNameCandidate(value)) return false;
  const lower = normalizeForMatching(value);
  return !CLUB_CARD_REJECTED_TERMS.some((term) => lower.includes(term));
}

function isAddressCandidate(value: string) {
  const normalized = normalizeText(value);
  return (
    normalized.length >= 8 &&
    countLatinCharacters(normalized) >= 4 &&
    /\d/.test(normalized) &&
    !/(address|residence|living place|street)/i.test(normalized)
  );
}

/**
 * When a bilingual document prints both a Cyrillic and a Latin version on the
 * same line, separated by ' / ', prefer the Latin half.
 * e.g. "МВР - СКОПЈЕ / MOI - SKOPJE"  →  "MOI - SKOPJE"
 * e.g. "БУЛ.АСНОМ БР. 42-69 / BUL.ASNOM BR. 42-69"  →  "BUL.ASNOM BR. 42-69"
 * Falls back to the full value if no '/' separator is found.
 */
function preferLatinHalf(value: string): string {
  const idx = value.indexOf(" / ");
  if (idx === -1) return normalizeText(value);
  const left = value.slice(0, idx).trim();
  const right = value.slice(idx + 3).trim();
  // Pick whichever half has more Latin characters
  return countLatinCharacters(right) >= countLatinCharacters(left)
    ? normalizeText(right)
    : normalizeText(left);
}

function isCodeCandidate(value: string) {
  const normalized = compactCode(value);
  return normalized.length >= 4 && normalized.length <= 24;
}

function pickBestCandidate(
  candidates: string[],
  validator?: (value: string) => boolean,
  preferDigits = false,
) {
  return (
    candidates
      .map((candidate) => normalizeText(candidate))
      .filter(Boolean)
      .filter((candidate) => (validator ? validator(candidate) : true))
      .sort(
        (left, right) =>
          scoreCandidate(right, preferDigits) -
          scoreCandidate(left, preferDigits),
      )[0] ?? ""
  );
}

function formatDate(date: Date) {
  const day = `${date.getDate()}`.padStart(2, "0");
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  return `${day}.${month}.${date.getFullYear()}`;
}

function formatExpiry(month: number, year: number) {
  return `${`${month}`.padStart(2, "0")}.${`${year}`.slice(-2)}`;
}

function parseDateCandidate(value: string) {
  const cleaned = normalizeText(value).replace(/\s+/g, "");
  const dotMatch = cleaned.match(/(\d{2})[.\/-](\d{2})[.\/-](\d{2,4})/);
  if (dotMatch) {
    const year =
      dotMatch[3].length === 2
        ? Number(`20${dotMatch[3]}`)
        : Number(dotMatch[3]);
    const parsed = new Date(year, Number(dotMatch[2]) - 1, Number(dotMatch[1]));
    if (Number.isNaN(parsed.getTime())) {
      return null;
    }

    return {
      formatted: formatDate(parsed),
      date: parsed,
    };
  }

  const isoMatch = cleaned.match(/(\d{4})[.\/-](\d{2})[.\/-](\d{2})/);
  if (!isoMatch) {
    return null;
  }

  const parsed = new Date(
    Number(isoMatch[1]),
    Number(isoMatch[2]) - 1,
    Number(isoMatch[3]),
  );
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return {
    formatted: formatDate(parsed),
    date: parsed,
  };
}

function parseDates(text: string) {
  const matches = normalizeText(text).match(DATE_TOKEN_REGEX) ?? [];
  return Array.from(
    new Set(
      matches
        .map((match) => parseDateCandidate(match)?.formatted)
        .filter(Boolean),
    ),
  ) as string[];
}

function detectDateLabel(...values: Array<string | undefined>) {
  for (const value of values) {
    const normalized = normalizeForMatching(value ?? "");
    const matchedLabel = DATE_LABEL_PATTERNS.find(({ pattern }) =>
      pattern.test(normalized),
    );
    if (matchedLabel) {
      return matchedLabel.label;
    }
  }

  return "other" as const;
}

function collectDateEntries(lines: string[]) {
  const entries = lines.flatMap((line, lineIndex) => {
    const matches = normalizeText(line).match(DATE_TOKEN_REGEX) ?? [];
    const label = detectDateLabel(
      line,
      lines[lineIndex - 1],
      lines[lineIndex + 1],
    );

    return matches
      .map((match) => {
        const parsed = parseDateCandidate(match);
        if (!parsed) {
          return null;
        }

        return {
          formatted: parsed.formatted,
          timestamp: parsed.date.getTime(),
          year: parsed.date.getFullYear(),
          label,
          lineIndex,
        } satisfies ParsedDateEntry;
      })
      .filter(Boolean) as ParsedDateEntry[];
  });

  return entries.filter(
    (entry, index, source) =>
      source.findIndex(
        (candidate) => candidate.formatted === entry.formatted,
      ) === index,
  );
}

function pickDateByLabel(entries: ParsedDateEntry[], label: ParsedDateLabel) {
  return entries.find((entry) => entry.label === label)?.formatted ?? "";
}

function pickBirthDate(entries: ParsedDateEntry[]) {
  const now = Date.now();
  const minimumBirthYear = new Date().getFullYear() - 120;
  const maximumBirthYear = new Date().getFullYear() - 10;

  const candidate = entries
    .filter(
      (entry) =>
        entry.year >= minimumBirthYear &&
        entry.year <= maximumBirthYear &&
        entry.timestamp < now,
    )
    .sort((left, right) => left.timestamp - right.timestamp)[0];

  return candidate?.formatted ?? "";
}

function pickExpiryDate(entries: ParsedDateEntry[], excludedDates: string[]) {
  const now = Date.now();
  const candidate = entries
    .filter(
      (entry) =>
        !excludedDates.includes(entry.formatted) &&
        entry.timestamp >= now - 365 * 24 * 60 * 60 * 1000,
    )
    .sort((left, right) => right.timestamp - left.timestamp)[0];

  if (candidate) {
    return candidate.formatted;
  }

  return (
    entries
      .filter((entry) => !excludedDates.includes(entry.formatted))
      .sort((left, right) => right.timestamp - left.timestamp)[0]?.formatted ??
    ""
  );
}

function pickIssueDate(entries: ParsedDateEntry[], excludedDates: string[]) {
  const candidate = entries
    .filter((entry) => !excludedDates.includes(entry.formatted))
    .sort((left, right) => left.timestamp - right.timestamp)[0];

  return candidate?.formatted ?? "";
}

function parseExpiry(text: string) {
  const matches =
    normalizeText(text).match(/\b(\d{2})\s*[\/. -]\s*(\d{2,4})\b/g) ?? [];
  for (const candidate of matches) {
    const match = candidate.match(/(\d{2})\s*[\/. -]\s*(\d{2,4})/);
    if (!match) {
      continue;
    }
    const month = Number(match[1]);
    if (month < 1 || month > 12) {
      continue;
    }

    const normalizedYear =
      match[2].length === 4 ? Number(match[2].slice(-2)) : Number(match[2]);
    return formatExpiry(month, normalizedYear);
  }
  return "";
}

function extractExpiryFromText(...texts: string[]) {
  for (const text of texts) {
    const match = normalizeText(text).match(
      /(?:valid\s*(?:thru|through|until|to)|exp(?:iry|iration)?|expires?)\D{0,14}(\d{2})\s*[\/. -]\s*(\d{2,4})/i,
    );
    if (match) {
      const month = Number(match[1]);
      if (month >= 1 && month <= 12) {
        const normalizedYear =
          match[2].length === 4 ? Number(match[2].slice(-2)) : Number(match[2]);
        return formatExpiry(month, normalizedYear);
      }
    }
  }

  return firstNonEmpty(...texts.map((text) => parseExpiry(text)));
}

function extractAccountNumber(...texts: string[]) {
  for (const text of texts) {
    const match = normalizeText(text).match(
      /(?:account(?:\s*(?:number|no))?|acct(?:ount)?(?:\s*(?:number|no))?)\D{0,12}((?:\d[ -]?){6,20})/i,
    );
    if (!match) {
      continue;
    }

    const digits = compactDigits(match[1]);
    if (digits.length >= 6 && digits.length <= 20) {
      return digits;
    }
  }

  return "";
}

function extractSecurityCode(cardNumber: string, ...texts: string[]) {
  const labeledValue = firstNonEmpty(
    ...texts.map((text) =>
      findByLabel(
        text,
        /(?:cvc2|cvv2|cvc|cvv|cid|security code|sec(?:urity)? code)\s*[:#-]?\s*([0-9]{3,4})/i,
      ),
    ),
  );

  if (labeledValue) {
    return labeledValue;
  }

  // On the back of the card the last 4 digits of the card number are often
  // printed next to the CVV (e.g. "1234 567"). Try to extract the trailing
  // 3-4 digit group after the last-4.
  const cardDigits = cardNumber.replace(/\D/g, "");
  const last4 = cardDigits.length >= 4 ? cardDigits.slice(-4) : "";
  if (last4) {
    const afterLast4 = new RegExp(
      `${escapeRegExp(last4)}\\s*(\\d{3,4})`,
    );
    for (const text of texts) {
      const match = normalizeText(text).match(afterLast4);
      if (match) return match[1];
    }
  }

  // Fallback: standalone 3-4 digit numbers, excluding known false positives
  for (const text of texts) {
    const candidates = (normalizeText(text).match(/\b\d{3,4}\b/g) ?? [])
      .filter((value) => {
        // Exclude the last 4 digits of the card number
        if (last4 && value === last4) return false;
        // Exclude year-like numbers (19xx, 20xx)
        if (/^(?:19|20)\d{2}$/.test(value)) return false;
        // Exclude values that are substrings of the card number
        if (cardDigits && cardDigits.includes(value) && value.length <= 4)
          return false;
        return true;
      });

    // Prefer 3-digit candidates (standard CVV) over 4-digit (AMEX CID)
    const preferred =
      candidates.find((c) => c.length === 3) ?? candidates[0];
    if (preferred) return preferred;
  }

  return "";
}

function parseBankCardNumber(text: string) {
  const candidates = text.match(/(?:\d[ -]?){12,23}/g) ?? [];

  const valid = candidates
    .map((candidate) => compactDigits(candidate))
    .find(
      (digits) =>
        digits.length >= 12 && digits.length <= 19 && passesLuhnCheck(digits),
    );

  if (!valid) {
    return "";
  }

  return valid.match(/.{1,4}/g)?.join("-") ?? valid;
}

function passesLuhnCheck(digits: string) {
  let sum = 0;
  let shouldDouble = false;

  for (let index = digits.length - 1; index >= 0; index -= 1) {
    let digit = Number(digits[index]);
    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }
    sum += digit;
    shouldDouble = !shouldDouble;
  }

  return sum % 10 === 0;
}

function findKeywordLine(lines: string[], keywords: string[]) {
  return lines.find((line) =>
    keywords.some((keyword) => normalizeForMatching(line).includes(keyword)),
  );
}

function findLikelyName(lines: string[]) {
  return pickBestCandidate(
    lines.filter((line) => !/\d/.test(line)),
    isNameCandidate,
  );
}

/**
 * Bank-card-specific holder name extraction using three strategies:
 * 1. Label-based: look near "CARDHOLDER" / "CARD HOLDER" labels
 * 2. Spatial: find name candidates positioned below the card number line
 * 3. Filtered fallback: standard name search with bank-term rejection
 */
function findBankCardHolderName(
  bundle: ProviderBundle,
  frontLines: string[],
  cardNumber: string,
): string {
  // Strategy 1: Label-based extraction
  const labelName = findValueNearLabels(
    frontLines,
    ["cardholder", "card holder", "holder name", "account holder"],
    isBankCardNameCandidate,
  );
  if (labelName) return labelName;

  // Strategy 2: Spatial — find name candidates below the card number line
  const frontOcrLines = bundle.front?.lines ?? [];
  if (cardNumber && frontOcrLines.length > 0) {
    const cardNumDigits = cardNumber.replace(/\D/g, "");
    // Find the OCR line containing the card number
    const cardNumLine = frontOcrLines.find((line) => {
      const lineDigits = line.text.replace(/\D/g, "");
      return (
        lineDigits.length >= 8 &&
        cardNumDigits.startsWith(lineDigits.slice(0, 8))
      );
    });

    if (cardNumLine?.bounds) {
      const cardNumBottom =
        cardNumLine.bounds.y + cardNumLine.bounds.height;
      const candidatesBelow = frontOcrLines
        .filter(
          (line) =>
            line.bounds &&
            line.bounds.y > cardNumBottom - 5 &&
            !/\d/.test(normalizeText(line.text)),
        )
        .sort((a, b) => (a.bounds?.y ?? 0) - (b.bounds?.y ?? 0))
        .map((line) => normalizeText(line.text));

      const spatialName = pickBestCandidate(
        candidatesBelow,
        isBankCardNameCandidate,
      );
      if (spatialName) return spatialName;
    }
  }

  // Strategy 3: Filtered fallback with bank-specific rejection
  return pickBestCandidate(
    frontLines.filter((line) => !/\d/.test(line)),
    isBankCardNameCandidate,
  );
}

/**
 * Word-boundary-aware label matching. For short labels (<=4 chars, e.g. "ime")
 * uses a regex word boundary to avoid substring matches like "prezime".
 * For longer labels, uses simple `.includes()`.
 */
function labelMatchesLine(label: string, line: string): boolean {
  if (label.length <= 4) {
    return new RegExp(`(?:^|\\s|[:#-])${escapeRegExp(label)}(?:$|\\s|[:#-])`, "i").test(line);
  }
  return line.includes(label);
}

/**
 * Spatial-aware label extraction using OCR bounding boxes. Finds a label line
 * by text matching, then looks at OCR lines whose bounding box is directly
 * below (within 3x label height) with horizontal overlap.
 */
function findValueNearOcrLabels(
  ocrLines: OcrLineCandidate[],
  labels: string[],
  validator?: (value: string) => boolean,
): string {
  const normalizedLabels = labels.map((l) => normalizeForMatching(l));
  const inlinePattern = new RegExp(
    `(?:${labels.map((l) => escapeRegExp(l)).join("|")})\\s*[:#-]?\\s*`,
    "i",
  );

  for (const labelLine of ocrLines) {
    const normalizedLine = normalizeForMatching(labelLine.text);
    if (!normalizedLabels.some((lbl) => labelMatchesLine(lbl, normalizedLine))) continue;

    // Attempt 1: inline value (label and value on same line)
    const inlineValue = preferLatinHalf(
      labelLine.text.replace(inlinePattern, " "),
    ).trim();
    if (inlineValue && (!validator || validator(inlineValue))) {
      return inlineValue;
    }

    // Attempt 2: spatial — find lines below this label
    if (!labelLine.bounds) continue;
    const labelBottom = labelLine.bounds.y + labelLine.bounds.height;
    const labelLeft = labelLine.bounds.x;
    const labelRight = labelLine.bounds.x + labelLine.bounds.width;

    const candidatesBelow = ocrLines
      .filter((line) => {
        if (!line.bounds || line === labelLine) return false;
        if (line.bounds.y < labelBottom - 5) return false;
        if (line.bounds.y > labelBottom + labelLine.bounds!.height * 3)
          return false;
        const lineRight = line.bounds.x + line.bounds.width;
        return Math.min(labelRight + 50, lineRight + 50) >
          Math.max(labelLeft, line.bounds.x) - 50;
      })
      .sort((a, b) => (a.bounds?.y ?? 0) - (b.bounds?.y ?? 0));

    for (const candidate of candidatesBelow) {
      const text = preferLatinHalf(candidate.text).trim();
      if (text && (!validator || validator(text))) return text;
    }
  }

  return "";
}

/**
 * Personal-doc-specific name extraction using three strategies:
 * 1. Label-based with multilingual labels + spatial OCR labels
 * 2. Spatial: candidates in top 60% of card front
 * 3. Filtered fallback with personal doc rejection
 */
function findPersonalDocName(
  bundle: ProviderBundle,
  combinedLines: string[],
): string {
  const allOcrLines = [
    ...(bundle.front?.lines ?? []),
    ...(bundle.back?.lines ?? []),
  ];

  // Strategy 1: Label-based extraction with multilingual labels
  const surname = firstNonEmpty(
    findValueNearLabels(
      combinedLines,
      SURNAME_LABELS,
      isPersonalDocNameCandidate,
    ),
    findValueNearOcrLabels(allOcrLines, SURNAME_LABELS, isPersonalDocNameCandidate),
  );
  const givenName = firstNonEmpty(
    findValueNearLabels(
      combinedLines,
      GIVEN_NAME_LABELS,
      isPersonalDocNameCandidate,
    ),
    findValueNearOcrLabels(allOcrLines, GIVEN_NAME_LABELS, isPersonalDocNameCandidate),
  );

  if (givenName || surname) {
    return [givenName, surname].filter(Boolean).join(" ").trim();
  }

  // Strategy 2: Spatial — name is typically in the upper-middle of front side
  const frontOcrLines = bundle.front?.lines ?? [];
  if (frontOcrLines.length > 0) {
    const allY = frontOcrLines
      .filter((l) => l.bounds)
      .map((l) => l.bounds!.y + l.bounds!.height);
    const maxY = Math.max(...allY, 1);

    const spatialCandidates = frontOcrLines
      .filter((line) => line.bounds && line.bounds.y < maxY * 0.6)
      .sort((a, b) => (a.bounds?.y ?? 0) - (b.bounds?.y ?? 0))
      .map((line) => preferLatinHalf(line.text));

    const spatialName = pickBestCandidate(
      spatialCandidates.filter((line) => !/\d/.test(line)),
      isPersonalDocNameCandidate,
    );
    if (spatialName) return spatialName;
  }

  // Strategy 3: Filtered fallback
  return pickBestCandidate(
    combinedLines.filter((line) => !/\d/.test(line)),
    isPersonalDocNameCandidate,
  );
}

/**
 * Improved sex/gender detection with multilingual support.
 * Handles single letters (M/F/X), full words (MALE/FEMALE/МАШКИ/ЖЕНСКИ),
 * and values on the next line after a label.
 */
function extractSexField(combinedText: string): string {
  // Strategy 1: Label + single letter
  const labeledSingle = findByLabel(
    combinedText,
    /(?:sex|gender|пол|spol|geschlecht|sexe)\s*[:#-]?\s*([MFXmfx])\b/i,
  );
  if (labeledSingle) return labeledSingle.toUpperCase();

  // Strategy 2: Label + full word
  const labeledFull = findByLabel(
    combinedText,
    /(?:sex|gender|пол|spol|geschlecht|sexe)\s*[:#-]?\s*(male|female|masculin|f[eé]minin|homme|femme|м(?:ашки)?|ж(?:енски)?|moski|zenski|männlich|weiblich)/i,
  );
  if (labeledFull) {
    const lower = labeledFull.toLowerCase();
    if (/^(?:male|masculin|homme|м(?:ашки)?|moski|m[aä]nnlich)$/.test(lower))
      return "M";
    if (/^(?:female|f[eé]minin|femme|ж(?:енски)?|zenski|weiblich)$/.test(lower))
      return "F";
  }

  // Strategy 3: Value on the next line after the label
  const lines = combinedText.split("\n");
  for (let i = 0; i < lines.length; i++) {
    if (/(?:sex|gender|пол|spol)/i.test(lines[i])) {
      const next = normalizeText(lines[i + 1] ?? "").trim();
      if (/^[MFX]$/i.test(next)) return next.toUpperCase();
      if (/^(?:male|masculin|homme|м(?:ашки)?|moski)$/i.test(next)) return "M";
      if (/^(?:female|f[eé]minin|femme|ж(?:енски)?|zenski)$/i.test(next))
        return "F";
    }
  }

  return "";
}

/**
 * Multi-strategy club name extraction. Skips generic card titles and picks
 * the first substantive non-title line.
 */
function findClubName(
  _bundle: ProviderBundle,
  combinedLines: string[],
): string {
  const titleTerms = [
    "member card", "membership card", "loyalty card", "club card",
    "gym pass", "reward card", "vip card", "premium card",
  ];

  for (const line of combinedLines) {
    const lower = normalizeForMatching(line);
    if (titleTerms.some((t) => lower.includes(t))) continue;
    if (/^\d+$/.test(line.trim())) continue;
    if (line.trim().length < 3) continue;
    return preferLatinHalf(line);
  }

  return combinedLines[0] ?? "";
}

/**
 * Club member name extraction. Label-based first, then filtered fallback
 * that excludes the club name itself.
 */
function findClubMemberName(
  bundle: ProviderBundle,
  combinedLines: string[],
  clubName: string,
): string {
  const allOcrLines = [
    ...(bundle.front?.lines ?? []),
    ...(bundle.back?.lines ?? []),
  ];

  // Strategy 1: Label-based
  const labelName = firstNonEmpty(
    findValueNearLabels(
      combinedLines,
      ["member name", "cardholder", "card holder", "holder name", "name"],
      isClubCardNameCandidate,
    ),
    findValueNearOcrLabels(
      allOcrLines,
      ["member name", "cardholder", "card holder", "holder name", "name"],
      isClubCardNameCandidate,
    ),
  );
  if (labelName) return labelName;

  // Strategy 2: Filtered fallback excluding the club name
  const candidates = combinedLines
    .filter((line) => !/\d/.test(line))
    .filter((line) => {
      if (clubName && normalizeForMatching(line) === normalizeForMatching(clubName))
        return false;
      return true;
    });

  return pickBestCandidate(candidates, isClubCardNameCandidate);
}

/**
 * Tighter member ID extraction. Label-based first, then alphanumeric codes
 * with at least one digit that don't match club name or member name.
 */
function findClubMemberId(
  combinedLines: string[],
  combinedText: string,
  clubName: string,
  memberName: string,
): string {
  // Strategy 1: Label-based
  const labeled = firstNonEmpty(
    findByLabel(
      combinedText,
      /(?:member(?:ship)?\s*(?:id|number|no|#)|card\s*(?:number|no|#))\s*[:#-]?\s*([A-Z0-9\-\/ ]{4,24})/i,
    ),
    findValueNearLabels(
      combinedLines,
      [
        "member id", "membership id", "membership no", "membership number",
        "member no", "member number", "card no", "card number", "card #",
      ],
      isCodeCandidate,
      true,
    ),
  );
  if (labeled) return compactCode(labeled);

  // Strategy 2: Targeted codes excluding known non-ID values
  const knownValues = [clubName, memberName]
    .filter(Boolean)
    .map((v) => normalizeForMatching(v));

  const codeMatches = (combinedText.match(/\b[A-Z0-9][\w\-\/]{4,19}\b/gi) ?? [])
    .map((m) => compactCode(m))
    .filter((code) => {
      if (!isCodeCandidate(code)) return false;
      if (!/\d/.test(code)) return false;
      if (knownValues.includes(normalizeForMatching(code))) return false;
      return true;
    });

  return codeMatches[0] ?? "";
}

function findValueNearLabels(
  lines: string[],
  labels: string[],
  validator?: (value: string) => boolean,
  preferDigits = false,
) {
  const normalizedLabels = labels.map((label) => normalizeForMatching(label));
  const inlinePattern = new RegExp(
    `(?:${labels.map((label) => escapeRegExp(label)).join("|")})\\s*[:#-]?\\s*`,
    "i",
  );

  const candidates = lines.flatMap((line, index) => {
    const normalizedLine = normalizeForMatching(line);
    if (!normalizedLabels.some((label) => labelMatchesLine(label, normalizedLine))) {
      return [];
    }

    return [
      preferLatinHalf(line.replace(inlinePattern, " ")),
      preferLatinHalf(lines[index + 1] ?? ""),
      preferLatinHalf(lines[index + 2] ?? ""),
    ];
  });

  return pickBestCandidate(candidates, validator, preferDigits);
}

function findByLabel(text: string, labelPattern: RegExp) {
  const match = normalizeText(text).match(labelPattern);
  return match?.[1]?.trim() ?? "";
}

function firstNonEmpty(...values: string[]) {
  return values.find(Boolean) ?? "";
}

function setField(
  target: ExtractedFieldMap,
  key: keyof CardFormValues,
  value: string,
  confidence: number,
  provider: OcrProviderResult["provider"],
  sourceSide: ScanSide | "combined",
) {
  const normalized = normalizeText(value);
  if (!normalized) {
    return;
  }

  target[key] = {
    value: normalized,
    confidence: Number(clamp(confidence).toFixed(2)),
    provider,
    sourceSide,
  };
}

function gatherLines(bundle: ProviderBundle) {
  const frontLines =
    bundle.front?.lines
      .map((line) => normalizeText(line.text))
      .filter(Boolean) ?? [];
  const backLines =
    bundle.back?.lines
      .map((line) => normalizeText(line.text))
      .filter(Boolean) ?? [];
  return {
    frontLines,
    backLines,
    combinedLines: [...frontLines, ...backLines].filter(Boolean),
    frontText: normalizeText(bundle.front?.text ?? ""),
    backText: normalizeText(bundle.back?.text ?? ""),
    combinedText: [bundle.front?.text, bundle.back?.text]
      .map((value) => normalizeText(value ?? ""))
      .filter(Boolean)
      .join("\n"),
  };
}

export function classifyDocument(
  bundle: ProviderBundle,
): DocumentClassificationResult {
  const { backLines, combinedLines, combinedText } = gatherLines(bundle);
  const haystack = normalizeForMatching(combinedText);

  // ── 1. Luhn-valid card number (strong bank signal) ───────────────────────
  const bankCardNum = parseBankCardNumber(combinedText);
  if (bankCardNum) {
    return {
      category: "bank",
      type: haystack.includes("credit") ? "Credit Card" : "Debit Card",
      confidence: 0.92,
      matchedKeywords: ["card-number"],
    };
  }

  // ── 4. Keyword fallback ──────────────────────────────────────────────────
  const ranked = CATEGORY_KEYWORDS.map((entry) => {
    const matches = entry.keywords.filter((keyword) =>
      haystack.includes(keyword),
    );
    return {
      category: entry.category,
      type: entry.type,
      matchedKeywords: matches,
      confidence: clamp(0.24 + matches.length * 0.18),
      score: matches.length,
    } satisfies ScoredClassification;
  }).sort((left, right) => right.score - left.score);

  const winner = ranked[0];

  if (!winner || winner.score === 0) {
    return {
      category: "personal",
      type: "Identity Card",
      confidence: 0.32,
      matchedKeywords: [],
    };
  }

  if (winner.category === "bank") {
    const type = haystack.includes("credit") ? "Credit Card" : "Debit Card";
    return { ...winner, type };
  }

  return winner;
}

function extractBankFields(bundle: ProviderBundle, fields: ExtractedFieldMap) {
  const { frontLines, backLines, frontText, backText, combinedText } =
    gatherLines(bundle);
  const provider = bundle.front?.provider ?? bundle.back?.provider ?? "mlkit";
  const frontProvider = bundle.front?.provider ?? provider;
  const backProvider = bundle.back?.provider ?? provider;
  const cardNumber = parseBankCardNumber(combinedText);
  const holderName = findBankCardHolderName(bundle, frontLines, cardNumber);
  const expiry = extractExpiryFromText(frontText, backText, combinedText);
  const cvc = extractSecurityCode(cardNumber, backText, combinedText);
  const accountNumber = extractAccountNumber(backText, combinedText);
  const issuerLine =
    findKeywordLine(frontLines, ["bank", "credit", "debit"]) ??
    frontLines.find(
      (line) => line.length > 3 && !/\d/.test(line) && line !== holderName,
    ) ??
    "";

  setField(fields, "category", "bank", 1, provider, "combined");
  setField(
    fields,
    "type",
    frontText.toLowerCase().includes("credit") ? "Credit Card" : "Debit Card",
    0.82,
    provider,
    "combined",
  );
  setField(fields, "holderName", holderName, 0.86, frontProvider, "front");
  setField(fields, "bankName", issuerLine, 0.72, frontProvider, "front");
  setField(fields, "cardNumber", cardNumber, 0.94, provider, "combined");
  setField(
    fields,
    "expiry",
    expiry,
    0.88,
    provider,
    frontText.includes(expiry) ? "front" : backText ? "back" : "combined",
  );
  setField(
    fields,
    "cvc",
    cvc,
    0.64,
    backProvider,
    backText ? "back" : "combined",
  );
  setField(
    fields,
    "accountNumber",
    accountNumber,
    0.62,
    backProvider,
    backText ? "back" : "combined",
  );
}

// ─── MRZ helpers ─────────────────────────────────────────────────────────────

/** Regex that matches a single MRZ line: all-caps alphanums + '<' filler characters */
const MRZ_LINE_REGEX = /^[A-Z0-9<]{30,44}$/;

/**
 * Map the MRZ document code (first 1-2 chars of line 1) to a readable type.
 * P = Passport, V = Visa, I/A/C = ID card (TD1), D = Driving License (some states)
 */
function mrzDocumentCodeToType(
  documentCode: string | null | undefined,
): string {
  const code = (documentCode ?? "").replace(/<+/g, "").trim().toUpperCase();
  if (code.startsWith("P")) return "Passport";
  if (code.startsWith("V")) return "Visa";
  if (code.startsWith("D")) return "Driving License";
  // I, A, C are TD1 ID cards per ICAO 9303
  return "Identity Card";
}

/**
 * Normalise a raw OCR line into its closest MRZ representation.
 * OCR commonly substitutes the '<' filler character with '-', '_', '.' or
 * drops it entirely. This function reverses those substitutions so the MRZ
 * regex and parser have a clean input to work with.
 */
function normalizeMrzCandidate(raw: string): string {
  return (
    raw
      .toUpperCase()
      // Spaces, hyphens and underscores are the most common OCR substitutes for '<'.
      // IMPORTANT: replace spaces with '<', do NOT strip them — OCR reads '<' filler
      // as a space, so stripping would shorten lines and break the parser entirely.
      .replace(/[ \t\-_]/g, "<")
      // A lone '.' flanked by MRZ-legal chars is also read as '<'
      .replace(/(?<=[A-Z0-9<])\.(?=[A-Z0-9<])/g, "<")
      // Strip anything that is not a valid MRZ character
      .replace(/[^A-Z0-9<]/g, "")
  );
}

/**
 * Attempt to parse `lines` as MRZ.  Accepts 2-line (TD3/TD2) and 3-line (TD1)
 * formats and is tolerant of common OCR artefacts:
 *   • '<' filler replaced by '-' / '_' / '.'
 *   • A single long MRZ line split across two shorter OCR lines
 *   • Lines that are slightly too short (padded to the nearest valid length)
 */
function parseMrzFromLines(_lines: string[]) {
  return null;
}

/** Convert MRZ date string YYMMDD to DD.MM.YYYY */
function mrzDateToFormatted(mrzDate: string | null | undefined) {
  if (!mrzDate || mrzDate.length !== 6) {
    return "";
  }
  const yy = Number(mrzDate.slice(0, 2));
  const mm = Number(mrzDate.slice(2, 4));
  const dd = Number(mrzDate.slice(4, 6));
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) {
    return "";
  }
  // Pivot: years >= 30 are 1930+, else 2000+
  const year = yy >= 30 ? 1900 + yy : 2000 + yy;
  return `${`${dd}`.padStart(2, "0")}.${`${mm}`.padStart(2, "0")}.${year}`;
}

/** Convert MRZ name field (LAST<<FIRST<MIDDLE) into a display full name */
function mrzNameToDisplay(
  lastName: string | null | undefined,
  firstName: string | null | undefined,
) {
  const parts: string[] = [];
  if (firstName) {
    parts.push(firstName.replace(/<+/g, " ").trim());
  }
  if (lastName) {
    parts.push(lastName.replace(/<+/g, " ").trim());
  }
  return parts.join(" ").trim();
}

// ─── End MRZ helpers ─────────────────────────────────────────────────────────

function extractPersonalFields(
  bundle: ProviderBundle,
  classification: DocumentClassificationResult,
  fields: ExtractedFieldMap,
) {
  const { frontLines, backLines, combinedLines } = gatherLines(bundle);
  const provider = bundle.front?.provider ?? bundle.back?.provider ?? "mlkit";

  setField(fields, "category", "personal", 1, provider, "combined");
  setField(
    fields,
    "type",
    classification.type,
    classification.confidence,
    provider,
    "combined",
  );

  // ── Heuristic extraction ─────────────────────────────────────────────────
  // Address and issuer are printed on the card in human-readable text; the MRZ
  // zone never includes them. We always run these regardless of MRZ success.
  const { combinedText } = gatherLines(bundle);

  // Authority / Issuer: label appears as "ISSUED BY", "AUTHORITY", "ИЗДАДЕНА ОД"
  // on bilingual ID cards. The value on the next line is "CYRILLIC / LATIN" —
  // we prefer the Latin half.
  const allLines = [...frontLines, ...backLines];
  const authorityLabelIdx = allLines.findIndex((line) =>
    /(?:authority|issued\s*by|issuer|издадена|издал|izdadena)/i.test(line),
  );
  const rawIssuer =
    authorityLabelIdx >= 0
      ? (allLines[authorityLabelIdx + 1] ?? "")
      : (allLines.find((line) =>
          /(MOI|MUP|MVR|MVD|police|ministry of interior|ministry of the interior)/i.test(
            line,
          ),
        ) ?? "");
  const issuer = preferLatinHalf(rawIssuer);
  if (issuer) setField(fields, "issuer", issuer, 0.78, provider, "back");

  // Address: look for the "ADDRESS" label and prefer the Latin half of each
  // candidate so we get "BUL.ASNOM BR. 42-69" over "БУЛ.АСНОМ БР. 42-69".
  const rawAddress = firstNonEmpty(
    findValueNearLabels(
      [...backLines, ...frontLines],
      [
        "address",
        "adresa",
        "адреса",
        "residence",
        "place of residence",
        "living place",
      ],
      (v) => v.length >= 4,
    ),
    pickBestCandidate([...backLines, ...frontLines], isAddressCandidate),
  );
  const address = preferLatinHalf(rawAddress);
  if (address) setField(fields, "address", address, 0.7, provider, "back");

  // Date of issue is sometimes on the card face but never encoded in MRZ
  const allDateEntries = collectDateEntries(combinedLines);
  const knownDob = fields.dateOfBirth?.value ?? "";
  const knownExpiry = fields.dateOfExpiry?.value ?? "";
  const dateOfIssue =
    pickDateByLabel(allDateEntries, "issue") ||
    pickIssueDate(allDateEntries, [knownDob, knownExpiry]);
  if (dateOfIssue)
    setField(fields, "dateOfIssue", dateOfIssue, 0.6, provider, "combined");

  // ── Date / identity heuristic fallback ─────────────────────────────────
  const dateOfBirth =
    pickDateByLabel(allDateEntries, "birth") || pickBirthDate(allDateEntries);
  const dateOfExpiry =
    pickDateByLabel(allDateEntries, "expiry") ||
    pickExpiryDate(allDateEntries, [dateOfBirth]);

  // ── Name extraction (multilingual labels + spatial + filtered fallback)
  const name = findPersonalDocName(bundle, combinedLines);

  // ── Document number (expanded multilingual labels + spatial)
  const allOcrLines = [
    ...(bundle.front?.lines ?? []),
    ...(bundle.back?.lines ?? []),
  ];
  const documentNumber = firstNonEmpty(
    findValueNearLabels(
      combinedLines,
      DOCUMENT_NUMBER_LABELS,
      isCodeCandidate,
      true,
    ),
    findValueNearOcrLabels(allOcrLines, DOCUMENT_NUMBER_LABELS, isCodeCandidate),
    findByLabel(
      combinedText,
      /(?:document\s*(?:no|number)|passport\s*(?:no|number)|licen[cs]e\s*(?:no|number)|card\s*(?:no|number)|id\s*(?:no|number)|no\.|nr\.|број|nummer|numero|numéro|dl\s*no)\s*[:#-]?\s*([A-Z0-9\-\/ ]{5,24})/i,
    ),
  );

  // ── Personal ID (expanded multilingual labels + spatial)
  const personalId = firstNonEmpty(
    findValueNearLabels(
      combinedLines,
      PERSONAL_ID_LABELS,
      isCodeCandidate,
      true,
    ),
    findValueNearOcrLabels(allOcrLines, PERSONAL_ID_LABELS, isCodeCandidate),
    findByLabel(
      combinedText,
      /(?:personal\s*(?:no|number)|id\s*number|national\s*id|nin|embg|emso|jmbg|pin|oib|pesel|ssn|cnp|bsn|матичен број|matičen broj|maticen broj)\s*[:#-]?\s*([A-Z0-9\-\/ ]{5,24})/i,
    ),
    (combinedText.match(/\b\d{8,14}\b/g) ?? [])[0] ?? "",
  );

  // ── Nationality (multilingual label + expanded code list)
  const nationalityFromLabel = findByLabel(
    combinedText,
    /(?:nationality|nat|državljanstvo|државјанство|nationalité|staatsangehörigkeit)\s*[:#-]?\s*([A-Z]{2,3})/i,
  );
  const nationalityFromCode =
    NATIONALITY_CODES.find((code) => combinedText.includes(code)) ?? "";
  const nationality = nationalityFromLabel || nationalityFromCode;

  // ── Sex/gender (multilingual, full-word support)
  const sex = extractSexField(combinedText);

  setField(fields, "nameOnCard", name, 0.72, provider, "combined");
  setField(fields, "cardNumber", documentNumber, 0.68, provider, "combined");
  setField(fields, "personalIdNumber", personalId, 0.62, provider, "combined");
  setField(fields, "dateOfBirth", dateOfBirth, 0.66, provider, "combined");
  setField(fields, "dateOfExpiry", dateOfExpiry, 0.68, provider, "combined");
  setField(fields, "nationality", nationality, 0.56, provider, "combined");
  setField(fields, "sex", sex, 0.54, provider, "combined");
}

function extractInsuranceFields(
  bundle: ProviderBundle,
  fields: ExtractedFieldMap,
) {
  const { combinedLines, combinedText, backText } = gatherLines(bundle);
  const provider = bundle.front?.provider ?? bundle.back?.provider ?? "mlkit";
  const dates = parseDates(combinedText);
  setField(fields, "category", "insurance", 1, provider, "combined");
  setField(fields, "type", "Health Insurance", 0.6, provider, "combined");
  setField(
    fields,
    "provider",
    combinedLines[0] ?? "",
    0.62,
    provider,
    "combined",
  );
  setField(
    fields,
    "nameOnCard",
    findLikelyName(combinedLines),
    0.78,
    provider,
    "combined",
  );
  setField(
    fields,
    "policyNumber",
    firstNonEmpty(
      findByLabel(
        combinedText,
        /(?:policy|certificate)\s*(?:number|no)?\s*[:#-]?\s*([A-Z0-9\-\/ ]{5,24})/i,
      ),
      compactCode((combinedText.match(/\b[A-Z0-9\-\/]{6,24}\b/) ?? [""])[0]),
    ),
    0.72,
    provider,
    "combined",
  );
  setField(
    fields,
    "memberId",
    findByLabel(combinedText, /member id\s*[:#-]?\s*([A-Z0-9\-\/ ]{4,24})/i),
    0.7,
    provider,
    "combined",
  );
  setField(
    fields,
    "groupNumber",
    findByLabel(combinedText, /group number\s*[:#-]?\s*([A-Z0-9\-\/ ]{3,24})/i),
    0.68,
    provider,
    "combined",
  );
  setField(
    fields,
    "phoneNumber",
    findByLabel(
      backText || combinedText,
      /(?:phone|call|support)\s*[:#-]?\s*([+()0-9\- ]{6,20})/i,
    ),
    0.58,
    provider,
    backText ? "back" : "combined",
  );
  setField(fields, "dateOfIssue", dates[0] ?? "", 0.52, provider, "combined");
  setField(fields, "dateOfExpiry", dates[1] ?? "", 0.62, provider, "combined");
}

function extractVehicleFields(
  bundle: ProviderBundle,
  fields: ExtractedFieldMap,
) {
  const { combinedLines, combinedText } = gatherLines(bundle);
  const provider = bundle.front?.provider ?? bundle.back?.provider ?? "mlkit";
  const dates = parseDates(combinedText);
  setField(fields, "category", "vehicle", 1, provider, "combined");
  setField(fields, "type", "Vehicle Registration", 0.62, provider, "combined");
  setField(
    fields,
    "vehicleAuthority",
    combinedLines[0] ?? "",
    0.56,
    provider,
    "combined",
  );
  setField(
    fields,
    "nameOnCard",
    findLikelyName(combinedLines),
    0.72,
    provider,
    "combined",
  );
  setField(
    fields,
    "registrationNumber",
    firstNonEmpty(
      findByLabel(
        combinedText,
        /(?:plate|registration)\s*(?:number|no)?\s*[:#-]?\s*([A-Z0-9\- ]{4,16})/i,
      ),
      compactCode(
        (combinedText.match(/\b[A-Z]{1,3}[ -]?\d{3,6}[A-Z]{0,2}\b/i) ?? [
          "",
        ])[0],
      ),
    ),
    0.72,
    provider,
    "combined",
  );
  setField(
    fields,
    "vin",
    findByLabel(combinedText, /\bvin\b\s*[:#-]?\s*([A-Z0-9]{10,18})/i),
    0.72,
    provider,
    "combined",
  );
  setField(fields, "dateOfIssue", dates[0] ?? "", 0.5, provider, "combined");
  setField(fields, "dateOfExpiry", dates[1] ?? "", 0.6, provider, "combined");
}

function extractAccessFields(
  bundle: ProviderBundle,
  fields: ExtractedFieldMap,
) {
  const { combinedLines, combinedText } = gatherLines(bundle);
  const provider = bundle.front?.provider ?? bundle.back?.provider ?? "mlkit";
  const dates = parseDates(combinedText);
  setField(fields, "category", "access", 1, provider, "combined");
  setField(fields, "type", "Employee Badge", 0.58, provider, "combined");
  setField(
    fields,
    "companyName",
    combinedLines[0] ?? "",
    0.58,
    provider,
    "combined",
  );
  setField(
    fields,
    "nameOnCard",
    findLikelyName(combinedLines),
    0.78,
    provider,
    "combined",
  );
  setField(
    fields,
    "employeeId",
    firstNonEmpty(
      findByLabel(
        combinedText,
        /(?:employee|badge|visitor)\s*(?:id|number|no)?\s*[:#-]?\s*([A-Z0-9\-\/ ]{4,24})/i,
      ),
      compactCode((combinedText.match(/\b[A-Z0-9\-\/]{5,18}\b/) ?? [""])[0]),
    ),
    0.7,
    provider,
    "combined",
  );
  setField(
    fields,
    "department",
    findByLabel(
      combinedText,
      /department\s*[:#-]?\s*([A-Za-z0-9 &'/-]{3,30})/i,
    ),
    0.52,
    provider,
    "combined",
  );
  setField(fields, "dateOfIssue", dates[0] ?? "", 0.46, provider, "combined");
  setField(fields, "dateOfExpiry", dates[1] ?? "", 0.58, provider, "combined");
}

function extractClubFields(bundle: ProviderBundle, fields: ExtractedFieldMap) {
  const { combinedLines, combinedText } = gatherLines(bundle);
  const provider = bundle.front?.provider ?? bundle.back?.provider ?? "mlkit";

  setField(fields, "category", "club", 1, provider, "combined");
  setField(fields, "type", "Club Card", 0.56, provider, "combined");

  const clubName = findClubName(bundle, combinedLines);
  setField(fields, "clubName", clubName, 0.62, provider, "combined");

  const memberName = findClubMemberName(bundle, combinedLines, clubName);
  setField(fields, "nameOnCard", memberName, 0.76, provider, "combined");

  const memberId = findClubMemberId(
    combinedLines,
    combinedText,
    clubName,
    memberName,
  );
  setField(fields, "memberId", memberId, 0.7, provider, "combined");

  setField(
    fields,
    "memberIdFormat",
    /\d{6,18}/.test(combinedText) ? "barcode" : "text",
    0.62,
    provider,
    "combined",
  );
  setField(
    fields,
    "tier",
    findByLabel(
      combinedText,
      /(?:tier|status|level)\s*[:#-]?\s*([A-Za-z0-9 &'/-]{3,24})/i,
    ),
    0.48,
    provider,
    "combined",
  );

  // Dates: use label-aware date picking (consistent with personal docs)
  const dateEntries = collectDateEntries(combinedLines);
  const dateOfIssue =
    pickDateByLabel(dateEntries, "issue") ||
    (dateEntries.length >= 1 ? dateEntries[0].formatted : "");
  const dateOfExpiry =
    pickDateByLabel(dateEntries, "expiry") ||
    pickExpiryDate(dateEntries, [dateOfIssue]);

  setField(fields, "dateOfIssue", dateOfIssue, 0.44, provider, "combined");
  setField(fields, "dateOfExpiry", dateOfExpiry, 0.58, provider, "combined");
}

export function extractFields(
  bundle: ProviderBundle,
  classification: DocumentClassificationResult,
): ExtractedFieldMap {
  const fields: ExtractedFieldMap = {};

  switch (classification.category) {
    case "bank":
      extractBankFields(bundle, fields);
      break;
    case "insurance":
      extractInsuranceFields(bundle, fields);
      break;
    case "vehicle":
      extractVehicleFields(bundle, fields);
      break;
    case "access":
      extractAccessFields(bundle, fields);
      break;
    case "club":
      extractClubFields(bundle, fields);
      break;
    default:
      extractPersonalFields(bundle, classification, fields);
      break;
  }

  return fields;
}

export function buildFormValues(
  classification: DocumentClassificationResult,
  extractedFields: ExtractedFieldMap,
): CardFormValues {
  const nextValues: CardFormValues = {
    ...DEFAULT_FORM_VALUES,
    category: classification.category,
    type: classification.type,
  };
  const writableValues = nextValues as Record<keyof CardFormValues, string>;

  (Object.keys(extractedFields) as Array<keyof CardFormValues>).forEach(
    (key) => {
      const field = extractedFields[key];
      if (field?.value) {
        writableValues[key] = field.value;
      }
    },
  );

  if (classification.category === "bank" && !nextValues.holderName) {
    nextValues.holderName = nextValues.nameOnCard;
  }

  if (classification.category !== "bank" && !nextValues.nameOnCard) {
    nextValues.nameOnCard = nextValues.holderName;
  }

  return nextValues;
}

export function scoreExtraction(
  classification: DocumentClassificationResult,
  fields: ExtractedFieldMap,
  providerConfidence: number,
) {
  const requiredFieldsByCategory: Record<
    CardCategory,
    Array<keyof CardFormValues>
  > = {
    bank: ["holderName", "cardNumber", "expiry"],
    personal: ["nameOnCard", "cardNumber"],
    club: ["clubName", "memberId"],
    insurance: ["provider", "policyNumber"],
    vehicle: ["registrationNumber"],
    access: ["employeeId"],
  };
  const required = requiredFieldsByCategory[classification.category] ?? [
    "nameOnCard",
  ];
  const hits = required.filter((key) => Boolean(fields[key]?.value)).length;
  const requiredScore = required.length > 0 ? hits / required.length : 0;
  return clamp(providerConfidence * 0.55 + requiredScore * 0.45);
}

export function buildWarnings(
  classification: DocumentClassificationResult,
  fields: ExtractedFieldMap,
  providerConfidence: number,
  requiresBackSide: boolean,
  hasBackScan: boolean,
  providerUsed: OcrProviderResult["provider"],
  qualityHints: string[],
): ScanWarning[] {
  const warnings: ScanWarning[] = [];

  if (!fields.nameOnCard?.value && classification.category !== "bank") {
    warnings.push({
      code: "unreadable",
      severity: "warning",
      message:
        "The holder name was not extracted confidently. Check the draft before saving.",
      recoverable: true,
    });
  }

  if (classification.category === "bank" && !fields.cardNumber?.value) {
    warnings.push({
      code: "poor-scan",
      severity: "error",
      message:
        "The card number could not be read. Retake the scan with less glare and sharper framing.",
      recoverable: true,
    });
  }

  if (providerConfidence < 0.58) {
    warnings.push({
      code: "low-confidence",
      severity: "warning",
      message: "OCR confidence is low. Review every extracted field carefully.",
      recoverable: true,
    });
  }

  if (requiresBackSide && !hasBackScan) {
    warnings.push({
      code: "missing-back",
      severity: "info",
      message:
        "Back side was skipped, so expiry, member IDs, or support details may be incomplete.",
      recoverable: true,
      side: "back",
    });
  }

  if (providerUsed === "paddle") {
    warnings.push({
      code: "fallback-used",
      severity: "info",
      message:
        "Fallback OCR was used because the primary ML Kit pass looked incomplete.",
      recoverable: false,
    });
  }

  if (qualityHints.length > 0) {
    warnings.push({
      code: "low-light",
      severity: "warning",
      message: qualityHints[0],
      recoverable: true,
    });
  }

  return warnings;
}
