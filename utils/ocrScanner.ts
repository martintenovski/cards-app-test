import { recognizeText, type OcrBlock, type OcrFrame, type OcrResult } from 'rn-mlkit-ocr';

export type ScannedCardData = {
  documentType: 'id' | 'passport' | 'driving_license' | 'bank_card' | 'club_card';
  firstName?: string;
  lastName?: string;
  fullName?: string;
  documentNumber?: string;
  personalIdNumber?: string;
  secondaryNumber?: string;
  dateOfBirth?: string;
  dateOfIssue?: string;
  dateOfExpiry?: string;
  nationality?: string;
  issuedBy?: string;
  sex?: string;
  address?: string;
  cardNumber?: string;
  cardExpiry?: string;
  cardHolder?: string;
  bankName?: string;
  clubName?: string;
  memberId?: string;
  tier?: string;
};

type ScanTarget = 'document' | 'card' | 'auto';

type TextNode = {
  text: string;
  upper: string;
  frame: OcrFrame;
  order: number;
  index: number;
};

const DOCUMENT_DATE_PATTERN =
  /\b(\d{1,2}[.\-/]\d{1,2}[.\-/]\d{2,4}|\d{4}[.\-/]\d{2}[.\-/]\d{2})\b/;
const CARD_EXPIRY_PATTERN = /\b(0[1-9]|1[0-2])\s*[\/\-]\s*(\d{2,4})\b/;
const CARD_NUMBER_PATTERN = /(?:\d[\s\-]?){13,19}/;
const DOCUMENT_NUMBER_PATTERN = /\b[A-Z]{0,3}\d{5,12}\b|\b\d{6,12}\b/;
const PERSONAL_NUMBER_PATTERN = /\b\d{10,14}\b/;

const LAST_NAME_LABELS = ['surname', 'last name', 'prezime'];
const FIRST_NAME_LABELS = ['first name', 'name', 'ime'];
const BIRTH_DATE_LABELS = [
  'date of birth',
  'datum rođenja',
  'датум на раѓање',
  'birth date',
  'dob',
];
const EXPIRY_DATE_LABELS = ['date of expiry', 'datum isteka', 'важи до', 'expiry date'];
const ISSUE_DATE_LABELS = ['date of issue', 'issued on', 'issue date', 'datum na izdavanje'];
const PERSONAL_NUMBER_LABELS = [
  'personal number',
  'embg',
  'единствен матичен број',
  'personal id',
  'national id',
  'nin',
];
const NATIONALITY_LABELS = ['nationality', 'државјанство'];
const SEX_LABELS = ['sex', 'пол', 'gender'];
const DOCUMENT_NUMBER_LABELS = [
  'document number',
  'broj dokumenta',
  'document no',
  'document no.',
  'document #',
  'id number',
  'card number',
  'passport number',
  'license number',
];
const ISSUED_BY_LABELS = ['issued by', 'issuer', 'authority', 'ministry', 'department'];
const ADDRESS_LABELS = ['address', 'addr'];
const LICENSE_CLASS_LABELS = ['class', 'category', 'cat', 'restrictions'];
const CARD_HOLDER_LABELS = ['cardholder', 'cardholder name', 'name on card'];
const CARD_NUMBER_LABELS = ['card number', 'pan'];
const CARD_EXPIRY_LABELS = ['valid thru', 'valid through', 'expires', 'exp', 'expiry'];
const CLUB_MEMBER_LABELS = ['member id', 'membership number', 'member number'];
const CLUB_PROGRAM_LABELS = ['program number', 'account number'];
const CLUB_EXPIRY_LABELS = ['valid until', 'expires', 'expiry', 'valid thru'];
const CLUB_ISSUE_LABELS = ['member since', 'joined', 'issued'];

const ALL_LABELS = [
  ...LAST_NAME_LABELS,
  ...FIRST_NAME_LABELS,
  ...BIRTH_DATE_LABELS,
  ...EXPIRY_DATE_LABELS,
  ...ISSUE_DATE_LABELS,
  ...PERSONAL_NUMBER_LABELS,
  ...NATIONALITY_LABELS,
  ...SEX_LABELS,
  ...DOCUMENT_NUMBER_LABELS,
  ...ISSUED_BY_LABELS,
  ...ADDRESS_LABELS,
  ...LICENSE_CLASS_LABELS,
  ...CARD_HOLDER_LABELS,
  ...CARD_NUMBER_LABELS,
  ...CARD_EXPIRY_LABELS,
  ...CLUB_MEMBER_LABELS,
  ...CLUB_PROGRAM_LABELS,
  ...CLUB_EXPIRY_LABELS,
  ...CLUB_ISSUE_LABELS,
];

// OCR.space removed
// rn-mlkit-ocr
async function recognize(imageUri: string): Promise<OcrResult> {
  return recognizeText(imageUri, 'latin');
}

export async function scanImageWithOCR(
  imageUri: string,
  type: ScanTarget
): Promise<ScannedCardData> {
  const ocrResult = await recognize(imageUri);
  const nodes = extractTextNodes(ocrResult);
  const lines = nodes.map((node) => node.text);

  if (type === 'card') {
    return parseCardText(nodes, lines);
  }

  if (type === 'document') {
    return parseDocumentText(nodes, lines);
  }

  return parseFlexibleText(nodes, lines);
}

function parseCardText(nodes: TextNode[], lines: string[]): ScannedCardData {
  const cardNumber =
    normalizeCardNumber(
      findAnchoredValue(nodes, CARD_NUMBER_LABELS, looksLikeCardNumberValue) ??
        findCardNumber(nodes)
    ) ?? undefined;

  const cardExpiry =
    normalizeCardExpiry(
      findAnchoredValue(nodes, CARD_EXPIRY_LABELS, looksLikeCardExpiry) ??
        findCardExpiry(nodes)
    ) ?? undefined;

  const cardHolder =
    normalizeName(
      findAnchoredValue(nodes, CARD_HOLDER_LABELS, isLikelyCardholder) ??
        findCardholderNearNumber(nodes)
    ) ?? undefined;

  const bankName = cleanExtractedValue(findBankName(nodes, cardHolder, lines));

  return {
    documentType: 'bank_card',
    cardNumber,
    cardExpiry,
    cardHolder,
    bankName: bankName || undefined,
  };
}

function parseDocumentText(nodes: TextNode[], lines: string[]): ScannedCardData {
  const allText = lines.join(' ').toUpperCase();
  const documentType = detectDocumentType(allText);

  const lastName = normalizeName(
    findAnchoredValue(nodes, LAST_NAME_LABELS, isLikelyNamePart)
  );
  const firstName = normalizeName(
    findAnchoredValue(nodes, FIRST_NAME_LABELS, isLikelyNamePart, LAST_NAME_LABELS)
  );

  const fullName =
    buildFullName(firstName, lastName) ??
    normalizeName(findStandaloneFullName(nodes, documentType)) ??
    undefined;

  const dateOfBirth =
    normalizeDocumentDate(findAnchoredValue(nodes, BIRTH_DATE_LABELS, looksLikeDocumentDate)) ??
    undefined;

  const dateOfExpiry =
    normalizeDocumentDate(findAnchoredValue(nodes, EXPIRY_DATE_LABELS, looksLikeDocumentDate)) ??
    undefined;

  const dateOfIssue =
    normalizeDocumentDate(findAnchoredValue(nodes, ISSUE_DATE_LABELS, looksLikeDocumentDate)) ??
    undefined;

  const personalIdNumber =
    normalizeIdentifier(
      findAnchoredValue(nodes, PERSONAL_NUMBER_LABELS, looksLikePersonalNumber) ??
        findPersonalNumber(nodes, dateOfBirth, dateOfExpiry)
    ) ?? undefined;

  const documentNumber =
    normalizeIdentifier(
      findAnchoredValue(nodes, DOCUMENT_NUMBER_LABELS, looksLikeDocumentNumber) ??
        findDocumentNumber(nodes, personalIdNumber)
    ) ?? undefined;

  const nationality =
    cleanExtractedValue(findAnchoredValue(nodes, NATIONALITY_LABELS, isUsefulValue)) || undefined;

  const sex =
    normalizeSex(findAnchoredValue(nodes, SEX_LABELS, isSexValue) ?? findStandaloneSex(nodes)) ??
    undefined;

  const issuedBy =
    cleanExtractedValue(
      findAnchoredValue(nodes, ISSUED_BY_LABELS, isUsefulValue) ??
        pickLikelyIssuer(lines, documentType)
    ) || undefined;

  const address =
    cleanExtractedValue(
      findAnchoredValue(nodes, ADDRESS_LABELS, looksLikeAddressValue) ??
        findStandaloneAddress(lines)
    ) || undefined;

  const secondaryNumber =
    documentType === 'driving_license'
      ? normalizeIdentifier(
          findAnchoredValue(nodes, LICENSE_CLASS_LABELS, isUsefulValue) ?? undefined
        ) ?? undefined
      : undefined;

  return {
    documentType,
    firstName: firstName || undefined,
    lastName: lastName || undefined,
    fullName,
    documentNumber,
    personalIdNumber,
    secondaryNumber,
    dateOfBirth,
    dateOfIssue,
    dateOfExpiry,
    nationality,
    issuedBy,
    sex,
    address,
  };
}

function parseFlexibleText(nodes: TextNode[], lines: string[]): ScannedCardData {
  const inferredType = inferAutoType(lines);

  if (inferredType === 'bank_card') {
    return parseCardText(nodes, lines);
  }

  if (inferredType === 'club_card') {
    return parseClubText(nodes, lines);
  }

  return parseDocumentText(nodes, lines);
}

function parseClubText(nodes: TextNode[], lines: string[]): ScannedCardData {
  const memberId =
    normalizeIdentifier(
      findAnchoredValue(nodes, CLUB_MEMBER_LABELS, isUsefulValue) ??
        findMemberNumber(nodes)
    ) ?? undefined;

  const secondaryNumber =
    normalizeIdentifier(findAnchoredValue(nodes, CLUB_PROGRAM_LABELS, isUsefulValue)) ?? undefined;

  const fullName = normalizeName(findStandaloneFullName(nodes, 'club_card')) ?? undefined;
  const dateOfIssue =
    normalizeDocumentDate(findAnchoredValue(nodes, CLUB_ISSUE_LABELS, looksLikeDocumentDate)) ??
    undefined;
  const dateOfExpiry =
    normalizeDocumentDate(findAnchoredValue(nodes, CLUB_EXPIRY_LABELS, looksLikeDocumentDate)) ??
    undefined;
  const address = cleanExtractedValue(findStandaloneAddress(lines)) || undefined;

  let tier: string | undefined;
  let clubName: string | undefined;

  for (const line of lines) {
    const upper = line.toUpperCase();
    const normalized = cleanExtractedValue(line);

    if (!tier) {
      const tierMatch = upper.match(/\b(PLATINUM|GOLD|SILVER|BRONZE|PREMIUM|ELITE|VIP|STANDARD)\b/);
      if (tierMatch) {
        tier = normalizeName(tierMatch[1]) ?? tierMatch[1];
      }
    }

    if (!clubName && isLikelyClubName(normalized)) {
      clubName = normalizeName(normalized) ?? normalized;
    }
  }

  return {
    documentType: 'club_card',
    clubName,
    fullName,
    memberId,
    tier,
    secondaryNumber,
    dateOfIssue,
    dateOfExpiry,
    address,
  };
}

function extractTextNodes(result: OcrResult): TextNode[] {
  const rawNodes: Array<Omit<TextNode, 'index'>> = [];
  let order = 0;

  result.blocks.forEach((block) => {
    if (block.lines.length === 0) {
      const text = cleanExtractedValue(block.text);
      if (text) {
        rawNodes.push({ text, upper: text.toUpperCase(), frame: block.frame, order: order++ });
      }
      return;
    }

    block.lines.forEach((line) => {
      const text = cleanExtractedValue(line.text);
      if (text) {
        rawNodes.push({ text, upper: text.toUpperCase(), frame: line.frame, order: order++ });
      }
    });
  });

  rawNodes.sort((left, right) => {
    const sameRowTolerance = Math.max(14, Math.min(left.frame.height, right.frame.height) + 6);
    const yDiff = left.frame.y - right.frame.y;
    if (Math.abs(yDiff) <= sameRowTolerance) {
      return left.frame.x - right.frame.x || left.order - right.order;
    }
    return yDiff || left.order - right.order;
  });

  return rawNodes.map((node, index) => ({ ...node, index }));
}

function findAnchoredValue(
  nodes: TextNode[],
  labels: string[],
  validator: (value: string) => boolean,
  excludeLabels: string[] = []
): string | undefined {
  const orderedLabels = [...labels].sort((left, right) => right.length - left.length);

  for (const node of nodes) {
    if (matchesAnyLabel(node.text, excludeLabels)) {
      continue;
    }

    for (const label of orderedLabels) {
      const inlineValue = extractInlineValue(node.text, label);
      if (inlineValue && validator(inlineValue)) {
        return cleanExtractedValue(inlineValue);
      }

      if (!matchesLabel(node.text, label)) {
        continue;
      }

      const adjacentValue = findAdjacentValue(nodes, node.index, validator);
      if (adjacentValue) {
        return cleanExtractedValue(adjacentValue);
      }
    }
  }

  return undefined;
}

function findAdjacentValue(
  nodes: TextNode[],
  anchorIndex: number,
  validator: (value: string) => boolean
): string | undefined {
  const anchor = nodes[anchorIndex];
  const rightCandidates = nodes
    .slice(anchorIndex + 1, anchorIndex + 5)
    .filter((candidate) => {
      const sameRow = Math.abs(candidate.frame.y - anchor.frame.y) <= Math.max(anchor.frame.height, 18);
      return candidate.frame.x > anchor.frame.x && sameRow;
    })
    .filter((candidate) => !looksLikeLabel(candidate.text) && validator(candidate.text));

  if (rightCandidates.length > 0) {
    return rightCandidates.sort((left, right) => left.frame.x - right.frame.x)[0]?.text;
  }

  const nextCandidates = nodes
    .slice(anchorIndex + 1, anchorIndex + 4)
    .filter((candidate) => !looksLikeLabel(candidate.text) && validator(candidate.text))
    .filter((candidate) => candidate.frame.y >= anchor.frame.y - 4);

  return nextCandidates[0]?.text;
}

function findStandaloneFullName(
  nodes: TextNode[],
  documentType: ScannedCardData['documentType']
): string | undefined {
  const candidates = nodes
    .map((node) => node.text)
    .filter((value) => !looksLikeLabel(value))
    .filter((value) => looksLikePersonalName(value))
    .filter((value) => !isLikelyIssuer(value))
    .filter((value) => !isLikelyClubName(value) || documentType === 'club_card');

  return candidates[0];
}

function findCardNumber(nodes: TextNode[]): string | undefined {
  for (const node of nodes) {
    const cleaned = node.text.replace(/[^\d]/g, '');
    if (cleaned.length >= 13 && cleaned.length <= 19) {
      return cleaned;
    }
  }

  return undefined;
}

function findCardExpiry(nodes: TextNode[]): string | undefined {
  for (const node of nodes) {
    const match = node.text.match(CARD_EXPIRY_PATTERN);
    if (match) {
      return `${match[1]}/${match[2]}`;
    }
  }

  return undefined;
}

function findCardholderNearNumber(nodes: TextNode[]): string | undefined {
  const cardNumberIndex = nodes.findIndex((node) => looksLikeCardNumberValue(node.text));

  if (cardNumberIndex >= 0) {
    const nearby = nodes
      .slice(Math.max(0, cardNumberIndex - 2), Math.min(nodes.length, cardNumberIndex + 3))
      .map((node) => node.text)
      .filter((value) => isLikelyCardholder(value));

    if (nearby.length > 0) {
      return nearby[0];
    }
  }

  return nodes.map((node) => node.text).find((value) => isLikelyCardholder(value));
}

function findBankName(nodes: TextNode[], cardHolder?: string, lines: string[] = []): string | undefined {
  const candidates = nodes
    .map((node) => node.text)
    .filter((value) => !looksLikeLabel(value))
    .filter((value) => !looksLikeCardNumberValue(value))
    .filter((value) => !looksLikeCardExpiry(value))
    .filter((value) => !isLikelyCardholder(value))
    .filter((value) => !/VISA|MASTERCARD|AMEX|DISCOVER/.test(value.toUpperCase()));

  const fromNodes = candidates.find((value) => /BANK|BANCA|BANKA|CREDIT|DEBIT/.test(value.toUpperCase()));
  if (fromNodes) {
    return fromNodes;
  }

  return lines.find((line) => line !== cardHolder && isLikelyBankName(line));
}

function findDocumentNumber(nodes: TextNode[], personalIdNumber?: string): string | undefined {
  for (const node of nodes) {
    if (looksLikeLabel(node.text)) {
      continue;
    }

    const match = node.text.match(DOCUMENT_NUMBER_PATTERN);
    const candidate = match?.[0]?.trim();
    if (candidate && candidate !== personalIdNumber) {
      return candidate;
    }
  }

  return undefined;
}

function findPersonalNumber(
  nodes: TextNode[],
  dateOfBirth?: string,
  dateOfExpiry?: string
): string | undefined {
  for (const node of nodes) {
    if (looksLikeLabel(node.text)) {
      continue;
    }

    const match = node.text.match(PERSONAL_NUMBER_PATTERN);
    const candidate = match?.[0]?.trim();
    if (candidate && candidate !== dateOfBirth && candidate !== dateOfExpiry) {
      return candidate;
    }
  }

  return undefined;
}

function findMemberNumber(nodes: TextNode[]): string | undefined {
  return nodes.map((node) => node.text).find((value) => /[A-Z0-9\-]{5,}/.test(value));
}

function findStandaloneAddress(lines: string[]): string | undefined {
  return lines.find((line) => looksLikeAddressValue(line));
}

function findStandaloneSex(nodes: TextNode[]): string | undefined {
  return nodes.map((node) => node.text).find((value) => isSexValue(value));
}

function detectDocumentType(allText: string): ScannedCardData['documentType'] {
  if (allText.includes('PASSPORT') || /\bP<[A-Z<]{3}/.test(allText)) {
    return 'passport';
  }

  if (/\bDRIVING\b|\bLICEN[CS]E\b|\bDRIVER\b/.test(allText)) {
    return 'driving_license';
  }

  return 'id';
}

function inferAutoType(lines: string[]): 'bank_card' | 'club_card' | 'document' {
  const allText = lines.join(' ').toUpperCase();
  const hasLongDigits = lines.some((line) => line.replace(/\D/g, '').length >= 13);
  const hasExpiry = CARD_EXPIRY_PATTERN.test(allText);

  if (hasLongDigits && (hasExpiry || /VISA|MASTERCARD|AMEX|DISCOVER|CARDHOLDER/.test(allText))) {
    return 'bank_card';
  }

  if (
    /\b(CLUB|LOYALTY|MEMBER|MEMBERSHIP|REWARD|REWARDS|GYM|FITNESS|POINTS|VIP|TIER)\b/.test(
      allText
    ) &&
    !/\b(PASSPORT|LICEN[CS]E|DRIVER|IDENTITY|BIRTH|NATIONALITY)\b/.test(allText)
  ) {
    return 'club_card';
  }

  return 'document';
}

function cleanExtractedValue(value: string | undefined | null): string {
  return (value ?? '').replace(/\s+/g, ' ').trim();
}

function normalizeDocumentDate(raw?: string): string | undefined {
  if (!raw) {
    return undefined;
  }

  const match = cleanExtractedValue(raw).match(DOCUMENT_DATE_PATTERN);
  return match?.[0]?.replace(/[\/\-]/g, '.');
}

function normalizeCardExpiry(raw?: string): string | undefined {
  if (!raw) {
    return undefined;
  }

  const match = cleanExtractedValue(raw).match(CARD_EXPIRY_PATTERN);
  if (!match) {
    return undefined;
  }

  return `${match[1]}/${match[2].slice(-2)}`;
}

function normalizeCardNumber(raw?: string): string | undefined {
  if (!raw) {
    return undefined;
  }

  const digits = raw.replace(/\D/g, '');
  if (digits.length < 13 || digits.length > 19) {
    return undefined;
  }

  return digits.match(/.{1,4}/g)?.join(' ') ?? digits;
}

function normalizeIdentifier(raw?: string): string | undefined {
  const cleaned = cleanExtractedValue(raw);
  return cleaned || undefined;
}

function normalizeName(raw?: string): string | undefined {
  const cleaned = cleanExtractedValue(raw);
  if (!cleaned) {
    return undefined;
  }

  return /[A-Z]{2,}/.test(cleaned) && cleaned === cleaned.toUpperCase()
    ? toTitleCase(cleaned)
    : cleaned;
}

function normalizeSex(raw?: string): string | undefined {
  const cleaned = cleanExtractedValue(raw).toUpperCase();
  if (!cleaned) {
    return undefined;
  }

  if (cleaned.startsWith('MALE')) return 'M';
  if (cleaned.startsWith('FEMALE')) return 'F';
  if (/^[MFX]$/.test(cleaned)) return cleaned;
  return undefined;
}

function buildFullName(firstName?: string, lastName?: string): string | undefined {
  const pieces = [firstName, lastName].map((value) => cleanExtractedValue(value)).filter(Boolean);
  return pieces.length > 0 ? pieces.join(' ') : undefined;
}

function looksLikeDocumentDate(value: string) {
  return DOCUMENT_DATE_PATTERN.test(value);
}

function looksLikeCardExpiry(value: string) {
  return CARD_EXPIRY_PATTERN.test(value);
}

function looksLikeCardNumberValue(value: string) {
  const digits = value.replace(/\D/g, '');
  return digits.length >= 13 && digits.length <= 19;
}

function looksLikeDocumentNumber(value: string) {
  return DOCUMENT_NUMBER_PATTERN.test(value);
}

function looksLikePersonalNumber(value: string) {
  return PERSONAL_NUMBER_PATTERN.test(value);
}

function isLikelyNamePart(value: string) {
  return /^[\p{L}][\p{L}\s\-'.]{1,}$/iu.test(cleanExtractedValue(value)) && !/\d/.test(value);
}

function isLikelyCardholder(value: string) {
  const cleaned = cleanExtractedValue(value);
  return looksLikePersonalName(cleaned) && cleaned.split(' ').length >= 2;
}

function isSexValue(value: string) {
  return /^(M|F|X|MALE|FEMALE)$/i.test(cleanExtractedValue(value));
}

function isUsefulValue(value: string) {
  const cleaned = cleanExtractedValue(value);
  return Boolean(cleaned) && !looksLikeLabel(cleaned);
}

function looksLikeAddressValue(value: string) {
  return /\d/.test(value) && /(ST|STREET|AVE|ROAD|RD|BLVD|BR\.|BR\b|ASNOM|LANE|DRIVE|WAY)/i.test(value);
}

function looksLikeLabel(value: string) {
  return matchesAnyLabel(value, ALL_LABELS);
}

function matchesAnyLabel(value: string, labels: string[]) {
  return labels.some((label) => matchesLabel(value, label));
}

function matchesLabel(value: string, label: string) {
  const cleanedValue = cleanExtractedValue(value).toLowerCase();
  const cleanedLabel = cleanExtractedValue(label).toLowerCase();

  return (
    cleanedValue === cleanedLabel ||
    cleanedValue.startsWith(`${cleanedLabel}:`) ||
    cleanedValue.startsWith(`${cleanedLabel} `) ||
    cleanedValue.includes(` ${cleanedLabel}:`) ||
    cleanedValue.includes(` ${cleanedLabel} `)
  );
}

function extractInlineValue(value: string, label: string) {
  const pattern = new RegExp(`^\\s*${escapeRegExp(label)}\\s*[:\\-–—]?\\s*(.+)$`, 'iu');
  const match = cleanExtractedValue(value).match(pattern);
  const inlineValue = match?.[1]?.trim();
  if (!inlineValue) {
    return undefined;
  }

  return inlineValue === label ? undefined : inlineValue;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function toTitleCase(str: string): string {
  return str.toLowerCase().replace(/\b\w/g, (character) => character.toUpperCase());
}

function looksLikePersonalName(value: string) {
  return /^[\p{L}][\p{L}\s\-\.',]{4,}$/iu.test(value) && value.includes(' ') && !/\d/.test(value);
}

function isLikelyIssuer(value: string) {
  return /(MINISTRY|DEPARTMENT|REPUBLIC|POLICE|DMV|STATE|AUTHORITY|MVR)/i.test(value);
}

function isLikelyBankName(value: string) {
  return /(BANK|BANCA|BANKA|FINANCE|CREDIT|SPARKASSE|NLB)/i.test(value.toUpperCase());
}

function isLikelyClubName(value: string) {
  return (
    /^[A-Z0-9][A-Z0-9\s&'\-]{4,}$/i.test(value) &&
    !looksLikePersonalName(value) &&
    !/MEMBER|VALID|EXPIRE|DATE|ADDRESS|NUMBER|CARD/.test(value.toUpperCase())
  );
}

function pickLikelyIssuer(lines: string[], documentType: ScannedCardData['documentType']) {
  const candidate = lines.find((line) => isLikelyIssuer(line));
  if (candidate) {
    return candidate.trim();
  }

  switch (documentType) {
    case 'passport':
      return 'Passport Authority';
    case 'driving_license':
      return 'DMV / Licensing Authority';
    default:
      return 'Issuing Authority';
  }
}
