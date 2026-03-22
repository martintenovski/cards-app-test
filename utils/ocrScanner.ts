// OCR powered by OCR.space (https://ocr.space) — free tier, no native deps
const OCR_API_KEY = process.env.EXPO_PUBLIC_OCR_API_KEY ?? '';
const OCR_ENDPOINT = 'https://api.ocr.space/parse/image';

export type ScannedCardData = {
  documentType: 'id' | 'passport' | 'driving_license' | 'bank_card';
  firstName?: string;
  lastName?: string;
  fullName?: string;
  documentNumber?: string;
  personalIdNumber?: string;
  dateOfBirth?: string;
  dateOfExpiry?: string;
  nationality?: string;
  issuedBy?: string;
  sex?: string;
  cardNumber?: string;
  cardExpiry?: string;
  cardHolder?: string;
};

export async function scanImageWithOCR(
  imageUri: string,
  type: 'document' | 'card'
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
  return parseDocumentText(lines);
}

// ---------------------------------------------------------------------------
// Bank card parsing
// ---------------------------------------------------------------------------

function parseCardText(lines: string[]): ScannedCardData {
  let cardNumber: string | undefined;
  let cardExpiry: string | undefined;
  let cardHolder: string | undefined;

  for (const line of lines) {
    // Card number: 16 digits possibly split with spaces/dashes
    if (!cardNumber) {
      const cleaned = line.replace(/[\s\-]/g, '');
      const match = cleaned.match(/\d{16}/);
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
  }

  return { documentType: 'bank_card', cardNumber, cardExpiry, cardHolder };
}

// ---------------------------------------------------------------------------
// Identity document parsing
// ---------------------------------------------------------------------------

function parseDocumentText(lines: string[]): ScannedCardData {
  let fullName: string | undefined;
  let documentNumber: string | undefined;
  let dateOfBirth: string | undefined;
  let dateOfExpiry: string | undefined;
  let nationality: string | undefined;
  let documentType: ScannedCardData['documentType'] = 'id';

  const allText = lines.join(' ').toUpperCase();

  // Detect document type from keywords
  if (allText.includes('PASSPORT')) {
    documentType = 'passport';
  } else if (/\bDRIVING\b|\bLICEN[CS]E\b|\bDRIVER\b/.test(allText)) {
    documentType = 'driving_license';
  }

  const datePattern =
    /\b(\d{1,2}[.\-\/]\d{1,2}[.\-\/]\d{2,4}|\d{4}[.\-\/]\d{2}[.\-\/]\d{2})\b/;
  const untaggedDates: string[] = [];

  for (const line of lines) {
    const upper = line.toUpperCase();

    // Document number: common ID format (letter(s) + 6-9 digits, or pure digits 6-9)
    if (!documentNumber) {
      const match = line.match(/\b[A-Z]{0,2}\d{6,9}\b|\b[A-Z]\d{7,8}\b/);
      if (match && !/NAME|DOB|BIRTH|EXPIR|NATIO|SEX/.test(upper)) {
        documentNumber = match[0];
      }
    }

    // Date fields
    const dateMatch = line.match(datePattern);
    if (dateMatch) {
      const normalized = normalizeDate(dateMatch[0]);
      if (/BIRTH|DOB|GEBOREN|NAISSANCE/.test(upper)) {
        dateOfBirth = normalized;
      } else if (/EXPIR|VALID|ABLAUF/.test(upper)) {
        dateOfExpiry = normalized;
      } else {
        untaggedDates.push(normalized);
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
  }

  // Assign any untagged dates in order: first as DOB, second as expiry
  if (!dateOfBirth && untaggedDates.length > 0) {
    dateOfBirth = untaggedDates.shift();
  }
  if (!dateOfExpiry && untaggedDates.length > 0) {
    dateOfExpiry = untaggedDates.shift();
  }

  return {
    documentType,
    fullName,
    documentNumber,
    dateOfBirth,
    dateOfExpiry,
    nationality,
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
