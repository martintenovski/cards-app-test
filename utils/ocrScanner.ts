// OCR powered by OCR.space (https://ocr.space) — free tier, no native deps
const OCR_API_KEY = process.env.EXPO_PUBLIC_OCR_API_KEY ?? '';
const OCR_ENDPOINT = 'https://api.ocr.space/parse/image';

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

export async function scanImageWithOCR(
  imageUri: string,
  type: 'document' | 'card' | 'auto'
): Promise<ScannedCardData> {
  const body = new FormData();
  body.append('file', { uri: imageUri, type: 'image/jpeg', name: 'scan.jpg' } as unknown as Blob);
  body.append('apikey', OCR_API_KEY);
  body.append('language', 'eng');
  body.append('isOverlayRequired', 'false');
  body.append('detectOrientation', 'true');
  body.append('scale', 'true');
  body.append('OCREngine', '2'); // Engine 2 is better for cards/docs

  const response = await fetch(OCR_ENDPOINT, { method: 'POST', body });
  if (!response.ok) throw new Error(`OCR request failed: ${response.status}`);

  const json = (await response.json()) as {
    ParsedResults?: Array<{ ParsedText: string }>;
    IsErroredOnProcessing?: boolean;
    ErrorMessage?: string;
  };

  if (json.IsErroredOnProcessing) {
    throw new Error(json.ErrorMessage ?? 'OCR processing error');
  }

  const rawText = json.ParsedResults?.[0]?.ParsedText ?? '';
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (type === 'card') return parseCardText(lines);
  if (type === 'document') return parseDocumentText(lines);
  return parseFlexibleText(lines);
}

// ---------------------------------------------------------------------------
// Bank card parsing
// ---------------------------------------------------------------------------

function parseCardText(lines: string[]): ScannedCardData {
  let cardNumber: string | undefined;
  let cardExpiry: string | undefined;
  let cardHolder: string | undefined;
  let bankName: string | undefined;

  for (const line of lines) {
    const upper = line.toUpperCase();
    // Card number: 16 digits possibly split with spaces/dashes
    if (!cardNumber) {
      const cleaned = line.replace(/[\s\-]/g, '');
      const match = cleaned.match(/\d{13,19}/);
      if (match) {
        cardNumber = match[0].match(/.{1,4}/g)?.join(' ') ?? match[0];
      }
    }

    // Expiry: MM/YY or MM/YYYY
    if (!cardExpiry) {
      const match = line.match(/\b(0[1-9]|1[0-2])\s*[\/\-]\s*(\d{2,4})\b/);
      if (match) {
        const year = match[2].slice(-2);
        cardExpiry = `${match[1]}/${year}`;
      }
    }

    // Name: all-caps, 2+ words, no digits — typical embossed card name
    if (
      !cardHolder &&
      /^[A-Z][A-Z\s\-\.\']{4,}$/.test(line) &&
      line.includes(' ') &&
      !/\d/.test(line)
    ) {
      cardHolder = toTitleCase(line.trim());
    }

    if (
      !bankName &&
      /^[A-Z][A-Z\s&.'\-]{3,}$/.test(upper) &&
      !/VISA|MASTERCARD|AMEX|DISCOVER|CARDHOLDER|VALID|THRU|EXP/.test(upper) &&
      !looksLikePersonalName(line)
    ) {
      bankName = toTitleCase(line.trim());
    }
  }

  return { documentType: 'bank_card', cardNumber, cardExpiry, cardHolder, bankName };
}

// ---------------------------------------------------------------------------
// Identity document parsing
// ---------------------------------------------------------------------------

function parseDocumentText(lines: string[]): ScannedCardData {
  let fullName: string | undefined;
  let documentNumber: string | undefined;
  let personalIdNumber: string | undefined;
  let secondaryNumber: string | undefined;
  let dateOfBirth: string | undefined;
  let dateOfIssue: string | undefined;
  let dateOfExpiry: string | undefined;
  let nationality: string | undefined;
  let issuedBy: string | undefined;
  let sex: string | undefined;
  let address: string | undefined;
  let documentType: ScannedCardData['documentType'] = 'id';

  const allText = lines.join(' ').toUpperCase();

  // Detect document type from keywords
  if (allText.includes('PASSPORT') || /\bP<[A-Z<]{3}/.test(allText)) {
    documentType = 'passport';
  } else if (/\bDRIVING\b|\bLICEN[CS]E\b|\bDRIVER\b/.test(allText)) {
    documentType = 'driving_license';
  }

  const datePattern =
    /\b(\d{1,2}[.\-\/]\d{1,2}[.\-\/]\d{2,4}|\d{4}[.\-\/]\d{2}[.\-\/]\d{2})\b/;
  const untaggedDates: string[] = [];

  for (const line of lines) {
    const upper = line.toUpperCase();
    const normalized = line.replace(/\s+/g, ' ').trim();

    // Document number: common ID format (letter(s) + 6-9 digits, or pure digits 6-9)
    if (!documentNumber) {
      const labelled = line.match(
        /(?:DOCUMENT|DOC|CARD|ID|IDENTITY|LICENSE|LICENCE|PASSPORT)\s*(?:NO\.?|NUMBER|#)?\s*[:\-]?\s*([A-Z0-9\-]{5,})/i
      );
      const match = labelled ?? line.match(/\b[A-Z]{0,3}\d{5,12}\b|\b\d{6,12}\b/);
      if (match && !/NAME|DOB|BIRTH|EXPIR|NATIO|SEX/.test(upper)) {
        documentNumber = (match[1] ?? match[0]).trim();
      }
    }

    if (!personalIdNumber) {
      const match = line.match(
        /(?:PERSONAL|NATIONAL|IDENTITY|PIN|NIN)\s*(?:ID|NO\.?|NUMBER)?\s*[:\-]?\s*([A-Z0-9\-]{5,})/i
      );
      if (match) {
        personalIdNumber = match[1].trim();
      }
    }

    if (!secondaryNumber) {
      const match = line.match(/(?:CLASS|CATEGORY|CAT|RESTRICTIONS?)\s*[:\-]?\s*([A-Z0-9\-/ ]{1,})/i);
      if (match) {
        secondaryNumber = match[1].trim();
      }
    }

    // Date fields
    const dateMatch = line.match(datePattern);
    if (dateMatch) {
      const normalizedDate = normalizeDate(dateMatch[0]);
      if (/BIRTH|DOB|GEBOREN|NAISSANCE/.test(upper)) {
        dateOfBirth = normalizedDate;
      } else if (/ISSUE|ISSUED|DELIVR|AUSSTELL/.test(upper)) {
        dateOfIssue = normalizedDate;
      } else if (/EXPIR|VALID|ABLAUF/.test(upper)) {
        dateOfExpiry = normalizedDate;
      } else {
        untaggedDates.push(normalizedDate);
      }
    }

    // Full name — labeled or inferred from all-caps line
    if (!fullName) {
      const labeled = line.match(/(?:SURNAME|LAST\s*NAME|NOM|NAME)\s*[:\-\/]?\s*(.+)/i);
      if (labeled) {
        fullName = toTitleCase(labeled[1].trim());
      } else if (
        /^[A-Z][A-Z\s\-\,\.\']{5,}$/.test(line) &&
        line.includes(' ') &&
        !/PASSPORT|LICEN[CS]E|REPUBLIC|IDENTITY|NATIONALITY|DOCUMENT|DRIVING/.test(upper)
      ) {
        fullName = toTitleCase(line.trim());
      }
    }

    // Nationality
    if (!nationality) {
      const match = line.match(/(?:NATIONALITY|NATIONALITÉ)\s*[:\-\/]?\s*(.+)/i);
      if (match) {
        nationality = match[1].trim();
      }
    }

    if (!issuedBy) {
      const match = line.match(
        /(?:ISSUED BY|AUTHORITY|ISSUER|STATE|REPUBLIC|DEPARTMENT|MINISTRY)\s*[:\-]?\s*(.+)/i
      );
      if (match) {
        issuedBy = match[1].trim();
      } else if (isLikelyIssuer(normalized)) {
        issuedBy = normalized;
      }
    }

    if (!sex) {
      const match = line.match(/(?:SEX|GENDER)\s*[:\-]?\s*(M|F|X|MALE|FEMALE)/i);
      if (match) {
        sex = match[1].slice(0, 1).toUpperCase();
      } else if (/^(M|F|X)$/.test(upper)) {
        sex = upper;
      }
    }

    if (!address) {
      const match = line.match(/(?:ADDRESS|ADDR)\s*[:\-]?\s*(.+)/i);
      if (match) {
        address = match[1].trim();
      } else if (looksLikeAddress(normalized)) {
        address = normalized;
      }
    }
  }

  // Assign any untagged dates in order: first as DOB, second as expiry
  if (!dateOfBirth && untaggedDates.length > 0) {
    dateOfBirth = untaggedDates.shift();
  }
  if (!dateOfIssue && untaggedDates.length > 0) {
    dateOfIssue = untaggedDates.shift();
  }
  if (!dateOfExpiry && untaggedDates.length > 0) {
    dateOfExpiry = untaggedDates.shift();
  }

  return {
    documentType,
    fullName,
    documentNumber,
    personalIdNumber,
    secondaryNumber,
    dateOfBirth,
    dateOfIssue,
    dateOfExpiry,
    nationality,
    issuedBy: issuedBy ?? pickLikelyIssuer(lines, documentType),
    sex,
    address,
  };
}

function parseFlexibleText(lines: string[]): ScannedCardData {
  const inferredType = inferAutoType(lines);

  if (inferredType === 'bank_card') {
    return parseCardText(lines);
  }

  if (inferredType === 'club_card') {
    return parseClubText(lines);
  }

  return parseDocumentText(lines);
}

function parseClubText(lines: string[]): ScannedCardData {
  let clubName: string | undefined;
  let memberId: string | undefined;
  let fullName: string | undefined;
  let tier: string | undefined;
  let secondaryNumber: string | undefined;
  let dateOfIssue: string | undefined;
  let dateOfExpiry: string | undefined;
  let address: string | undefined;

  const datePattern =
    /\b(\d{1,2}[.\-\/]\d{1,2}[.\-\/]\d{2,4}|\d{4}[.\-\/]\d{2}[.\-\/]\d{2})\b/;

  for (const line of lines) {
    const upper = line.toUpperCase();
    const normalized = line.replace(/\s+/g, ' ').trim();

    if (!tier) {
      const match = upper.match(/\b(PLATINUM|GOLD|SILVER|BRONZE|PREMIUM|ELITE|VIP|STANDARD)\b/);
      if (match) {
        tier = toTitleCase(match[1]);
      }
    }

    if (!memberId) {
      const match = line.match(/(?:MEMBER|MEMBERSHIP|CARD)\s*(?:ID|NO\.?|NUMBER|#)?\s*[:\-]?\s*([A-Z0-9\-]{5,})/i);
      if (match) {
        memberId = match[1].trim();
      }
    }

    if (!secondaryNumber) {
      const match = line.match(/(?:PROGRAM|ACCOUNT)\s*(?:NO\.?|NUMBER|#)?\s*[:\-]?\s*([A-Z0-9\-]{5,})/i);
      if (match) {
        secondaryNumber = match[1].trim();
      }
    }

    if (!fullName && looksLikePersonalName(normalized)) {
      fullName = toTitleCase(normalized);
    }

    if (!address) {
      const match = line.match(/(?:ADDRESS|ADDR)\s*[:\-]?\s*(.+)/i);
      if (match) {
        address = match[1].trim();
      } else if (looksLikeAddress(normalized)) {
        address = normalized;
      }
    }

    const dateMatch = line.match(datePattern);
    if (dateMatch) {
      const normalizedDate = normalizeDate(dateMatch[0]);
      if (!dateOfIssue && /ISSUE|SINCE|JOINED|MEMBER SINCE/.test(upper)) {
        dateOfIssue = normalizedDate;
      } else if (!dateOfExpiry && /EXPIR|VALID|UNTIL|THRU/.test(upper)) {
        dateOfExpiry = normalizedDate;
      } else if (!dateOfIssue) {
        dateOfIssue = normalizedDate;
      } else if (!dateOfExpiry) {
        dateOfExpiry = normalizedDate;
      }
    }

    if (!clubName && isLikelyClubName(normalized)) {
      clubName = toTitleCase(normalized);
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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function normalizeDate(raw: string): string {
  return raw.replace(/[\/\-]/g, '.');
}

function toTitleCase(str: string): string {
  return str.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

function inferAutoType(lines: string[]): 'bank_card' | 'club_card' | 'document' {
  const allText = lines.join(' ').toUpperCase();
  const hasLongDigits = lines.some((line) => line.replace(/\D/g, '').length >= 13);
  const hasExpiry = /\b(0[1-9]|1[0-2])\s*[\/\-]\s*(\d{2,4})\b/.test(allText);

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

function looksLikeAddress(value: string) {
  return /\d/.test(value) && /(ST|STREET|AVE|ROAD|RD|BLVD|BR\.|BR\b|ASNOM|LANE|DRIVE|WAY)/i.test(value);
}

function looksLikePersonalName(value: string) {
  return /^[A-Z][A-Z\s\-\.',]{4,}$/.test(value.toUpperCase()) && value.includes(' ') && !/\d/.test(value);
}

function isLikelyIssuer(value: string) {
  return /(MINISTRY|DEPARTMENT|REPUBLIC|POLICE|DMV|STATE|AUTHORITY|MVR)/i.test(value);
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
