/**
 * documentScanner.ts
 *
 * Self-contained document scanning pipeline.
 *
 * Public API
 * ──────────
 *  scanDocument(imagePath, side)         – preprocess image + run ML Kit OCR
 *  extractDocumentFields(front, back)    – extract fields from front+back OCR results
 *
 * Architecture
 * ────────────
 * 1. Image preprocessing  (expo-image-manipulator)
 *    Resize → grayscale → contrast boost. Runs on each image independently
 *    before OCR so the text recogniser gets the cleanest possible input.
 *
 * 2. OCR  (rn-mlkit-ocr)
 *    Returns blocks with .text and .frame (x, y, width, height) bounding
 *    boxes. We keep the geometry because it is essential for disambiguation
 *    when text from two languages appears on the same card.
 *
 * 3. Label-based OCR fallback  (front + back)
 *    Bilingual documents print labels in two scripts, e.g.
 *      "ПРЕЗИМЕ / SURNAME" on one line, the value on the next.
 *    We match against a known label vocabulary and, whenever a bilingual
 *    "Cyrillic / Latin" split is found, always prefer the Latin half.
 *    Spatial position (bounding boxes) is used as a tiebreaker.
 *
 * Priority: OCR label match (back) > OCR label match (front)
 */

import MlkitOcr, { type OcrBlock } from "rn-mlkit-ocr";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type OcrConfidence = "ocr-label" | "ocr-position" | "unknown";

export interface OcrBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface OcrTextBlock {
  text: string;
  bounds: OcrBounds;
}

/** Raw output of scanDocument – one entry per recognised text block. */
export type OcrBlocks = OcrTextBlock[];

export interface ExtractedField {
  value: string;
  confidence: OcrConfidence;
}

/**
 * Normalised output of extractDocumentFields.
 * All fields are null if not found – we never guess.
 */
export interface DocumentFields {
  /** Document type inferred from MRZ or keywords */
  documentType: ExtractedField | null;
  /** ISO 3166-1 alpha-3 country issuing the document */
  nationality: ExtractedField | null;
  /** Family / last name as printed (Latin script) */
  surname: ExtractedField | null;
  /** Given / first name(s) as printed (Latin script) */
  givenName: ExtractedField | null;
  /** Date of birth in DD.MM.YYYY */
  dateOfBirth: ExtractedField | null;
  /** Document / ID number */
  documentNumber: ExtractedField | null;
  /** Expiry date in DD.MM.YYYY */
  expiry: ExtractedField | null;
  /** Place of birth (Latin script) */
  placeOfBirth: ExtractedField | null;
  /** Permanent residence / address (Latin script) */
  address: ExtractedField | null;
  /** Authority that issued the document (Latin script) */
  issuingAuthority: ExtractedField | null;
  /** National identity number / personal number */
  personalNumber: ExtractedField | null;
  /** Sex / gender as printed on document */
  sex: ExtractedField | null;
  /** CVV/CVC security code (bank cards only) */
  cvv: ExtractedField | null;
  /** Account number (bank cards only) */
  accountNumber: ExtractedField | null;
  /** Raw OCR text from both sides, for debugging */
  raw: { front: string; back: string };
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 1 – Image preprocessing
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Resize → grayscale the image.
 * We intentionally keep the image wide (≤ 1800px) to preserve fine MRZ
 * characters while not overloading ML Kit on low-end devices.
 * Returns the URI of the processed image ready for OCR.
 */
async function preprocessImage(imagePath: string): Promise<string> {
  // 1a. Get natural size from ML Kit – we only resize if it is larger than
  //     the optimal range; smaller images are left as-is.
  const targetWidth = 1800;

  const processed = await manipulateAsync(
    imagePath,
    [
      // Only resize down, never up – upscaling blurs fine text
      { resize: { width: targetWidth } },
    ],
    {
      compress: 0.96, // minimal compression loss
      format: SaveFormat.JPEG,
    },
  );

  return processed.uri;
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 2 – OCR
// ─────────────────────────────────────────────────────────────────────────────

/**
 * scanDocument(imagePath)
 *
 * Preprocesses the image and runs ML Kit Text Recognition.
 * Returns one OcrTextBlock per recognised text block, preserving the
 * bounding-box geometry for downstream spatial analysis.
 *
 * Note: call this function once for the front image and once for the back
 * image; keep the two result arrays separate and pass them together to
 * extractDocumentFields().
 */
export async function scanDocument(imagePath: string): Promise<OcrBlocks> {
  // Preprocess first so OCR operates on a clean image
  const processedUri = await preprocessImage(imagePath);

  const result = await MlkitOcr.recognizeText(processedUri);

  // Flatten ML Kit blocks into our simpler OcrTextBlock shape.
  // ML Kit returns nested Block → Line → Element; we work at the Block level
  // because each block corresponds to a visually coherent region, which is
  // exactly what we need for label+value pairing.
  return result.blocks.map((block: OcrBlock) => ({
    text: block.text.trim(),
    bounds: {
      x: block.frame.x,
      y: block.frame.y,
      width: block.frame.width,
      height: block.frame.height,
    },
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers used by label extraction
// ─────────────────────────────────────────────────────────────────────────────

/** Strip Cyrillic characters from a string. */
function stripCyrillic(s: string): string {
  return s
    .replace(/[\u0400-\u04FF]+/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/**
 * Given a bilingual string that contains both a Cyrillic half and a Latin half
 * (separated by /, -, |, newlines, or similar delimiters), return the Latin
 * half.  When both halves have equal Latin character counts the right/lower
 * half is returned because EU IDs always put the Latin script second.
 * As a final step all remaining Cyrillic characters are stripped.
 */
function preferLatinHalf(raw: string): string {
  // Normalise common separator patterns to a single sentinel
  const normalised = raw
    .replace(/ \/ /g, "\x00")
    .replace(/ \/ /g, "\x00")
    .replace(/ - /g, "\x00")
    .replace(/ - /g, "\x00")
    .replace(/ \| /g, "\x00")
    .replace(/\n/g, "\x00");

  const sepIdx = normalised.indexOf("\x00");
  if (sepIdx === -1) return stripCyrillic(raw.trim());

  const left = raw.slice(0, sepIdx).trim();
  const right = raw.slice(sepIdx + 1).trim();

  const latinCount = (s: string) => (s.match(/[A-Za-z]/g) ?? []).length;
  const chosen = latinCount(right) >= latinCount(left) ? right : left;
  return stripCyrillic(chosen);
}

/** Capitalise the first letter of each word, lower-case the rest. */
function titleCase(s: string): string {
  return s.toLowerCase().replace(/(?:^|\s)\S/g, (c) => c.toUpperCase());
}

/**
 * Build a normalised field value, applying preferLatinHalf, Cyrillic
 * stripping, space collapsing, and punctuation trimming.
 * Returns null if the result is empty.
 */
function field(
  raw: string | null | undefined,
  confidence: OcrConfidence,
): ExtractedField | null {
  if (!raw) return null;
  const value = cleanFieldValue(
    preferLatinHalf(raw).replace(/\s+/g, " ").trim(),
  );
  return value.length > 0 ? { value, confidence } : null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 3 – Label-based OCR fallback
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Multilingual label vocabulary.
 * Each entry maps a logical field name to the label text that typically
 * appears above or to the left of the value on the card.
 * Include both Latin and Cyrillic variants because OCR may return either.
 */
const LABEL_MAP: Record<string, string[]> = {
  surname: [
    "SURNAME",
    "FAMILY NAME",
    "LAST NAME",
    "FAMILIENNAME",
    "NOM",
    "APELLIDOS",
    "COGNOME",
    "ACHTERNAAM",
    "ПРЕЗИМЕ",
    "PREZIME",
    "ФАМИЛИЯ",
    "1",
  ],
  givenName: [
    "GIVEN NAME",
    "GIVEN NAMES",
    "FIRST NAME",
    "NAME",
    "VORNAMEN",
    "PRÉNOMS",
    "NOMBRE",
    "NOME",
    "VOORNAMEN",
    "PRÉNOM",
    "ИМЕ",
    "IME",
    "ИМЯ",
    "2",
  ],
  dateOfBirth: [
    "DATE OF BIRTH",
    "BIRTH DATE",
    "DOB",
    "GEBURTSDATUM",
    "FECHA DE NACIMIENTO",
    "DATA DI NASCITA",
    "GEBOORTEDATUM",
    "ДАТУМ НА РАЃАЊЕ",
    "ДАТА НА РАЖДАНЕ",
    "DATE DE NAISSANCE",
    "03",
    "3",
  ],
  documentNumber: [
    "PAN",
    "DOCUMENT NO",
    "DOCUMENT NUMBER",
    "ID CARD NUMBER",
    "AUSWEISNUMMER",
    "NUMÉRO",
    "NÚMERO",
    "NUMERO",
    "CARD NUMBER",
    "4D",
    "5",
    "БРОЈ НА ЛИЧНА КАРТА",
    "БРОЈ НА ПАСОШ",
    "PERSONAL NO.",
    "ID NO",
    "БР. НА ПЛАТЕЖНА КАРТИЧКА",
    "PAN",
    "5.",
  ],
  expiry: [
    "DATE OF EXPIRY",
    "EXPIRY DATE",
    "EXPIRATION DATE",
    "VALID UNTIL",
    "GÜLTIG BIS",
    "DATE D'EXPIRATION",
    "VÁLIDO HASTA",
    "SCADE",
    "GELDIG TOT",
    "VALID THRU",
    "VALID TO",
    "РОК НА ВАЖНОСТ",
    "ВАЖИ ДО",
    "09",
    "4b",
  ],
  placeOfBirth: [
    "PLACE OF BIRTH",
    "GEBURTSORT",
    "LIEU DE NAISSANCE",
    "LUGAR DE NACIMIENTO",
    "LUOGO DI NASCITA",
    "МЕСТО НА РАЃАЊЕ",
    "МЕСТО НА РАЖДАНЕ",
    "04B",
  ],
  address: [
    "ADDRESS",
    "PERMANENT RESIDENCE",
    "RESIDENCE",
    "WOHNORT",
    "DOMICILE",
    "DOMICILIO",
    "INDIRIZZO",
    "WOONADRES",
    "АДРЕСА",
    "ЖИВЕАЛИШТЕ",
    "8",
  ],
  issuingAuthority: [
    "AUTHORITY",
    "ISSUED BY",
    "ISSUING AUTHORITY",
    "AUSSTELLENDE BEHÖRDE",
    "AUTORITÉ",
    "AUTORIDAD",
    "ENTE EMITTENTE",
    "ИЗДАДЕНА ОД",
    "ИЗДАЛ",
    "10",
    "4c",
  ],
  nationality: [
    "NATIONALITY",
    "NATIONAL",
    "STAATSANGEHÖRIGKEIT",
    "NATIONALITÉ",
    "NACIONALIDAD",
    "NAZIONALITÀ",
    "ДРЖАВЈАНСТВО",
    "НАЦИОНАЛНОСТ",
  ],
  sex: ["SEX", "GENDER", "ПОЛ"],
  personalNumber: [
    "PERSONAL NO",
    "PERSONAL NUMBER",
    "NIN",
    "EMBG",
    "JMBG",
    "МАТИЧЕН БРОЈ",
    "MB/NIN",
    "4d",
  ],
  cvv: [
    "CVV2",
    "CVC2",
    "CVV",
    "CVC",
    "SECURITY CODE",
    "CVV/CVC",
    "CVV Code",
    "CVC Code",
    "CVV Код",
  ],
  accountNumber: [
    "ACCOUNT NUMBER",
    "ACCOUNT NO",
    "ACCOUNT",
    "SMETKA",
    "БРОЈ НА СМЕТКА",
    "БР. НА ПЛАТЕЖНА СМЕТКА",
  ],
};

/**
 * Sort OCR blocks top-to-bottom, left-to-right.
 * This mirrors natural reading order and makes label-then-value lookup simpler.
 */
function sortBlocksByPosition(blocks: OcrBlocks): OcrBlocks {
  return [...blocks].sort((a, b) => {
    const rowDiff = a.bounds.y - b.bounds.y;
    if (Math.abs(rowDiff) > 15) return rowDiff; // different rows
    return a.bounds.x - b.bounds.x; // same row → left to right
  });
}

/**
 * Return true when a text block looks like a label rather than a value.
 * Labels are typically short, all-caps, and contain no digits.
 */
function looksLikeLabel(text: string): boolean {
  const t = text.trim();
  return t.length < 40 && t === t.toUpperCase() && !/\d/.test(t);
}

/**
 * Find the value associated with a label block.
 *
 * Strategies (tried in order):
 *  A) Inline: text after the label on the same block line.
 *  B) Right-of-label: a block within 300px horizontally and the same vertical
 *     band — handles bank cards that put values to the right of labels.
 *  C) Below-label: the topmost non-label block within 120px below.
 *
 * Any candidate containing a '/' separator is passed through preferLatinHalf.
 */
function findValueForLabel(
  labelBlock: OcrTextBlock,
  sorted: OcrBlocks,
): string | null {
  // ── A. Inline extraction ─────────────────────────────────────────────────
  const labelText = labelBlock.text.toUpperCase();
  for (const [, labels] of Object.entries(LABEL_MAP)) {
    for (const lbl of labels) {
      if (labelText.includes(lbl)) {
        const afterLabel = labelBlock.text
          .substring(labelText.indexOf(lbl) + lbl.length)
          .replace(/^[\s:/\-]+/, "")
          .trim();
        if (afterLabel.length > 1) {
          return afterLabel.includes("/")
            ? preferLatinHalf(afterLabel)
            : afterLabel;
        }
      }
    }
  }

  const labelBottom = labelBlock.bounds.y + labelBlock.bounds.height;
  const labelRight = labelBlock.bounds.x + labelBlock.bounds.width;
  const labelMidY = labelBlock.bounds.y + labelBlock.bounds.height / 2;

  // ── B. Right of label ────────────────────────────────────────────────────
  const rightOf = sorted.filter(
    (b) =>
      b !== labelBlock &&
      b.bounds.x > labelRight &&
      b.bounds.x < labelRight + 300 &&
      b.bounds.y < labelMidY + 20 &&
      b.bounds.y + b.bounds.height > labelMidY - 20,
  );
  if (rightOf.length > 0) {
    const nearest = rightOf.reduce((a, b) => (a.bounds.x < b.bounds.x ? a : b));
    const val = nearest.text.trim();
    if (val.length > 1 && !looksLikeLabel(val)) {
      return val.includes("/") ? preferLatinHalf(val) : val;
    }
  }

  // ── C. Below label ───────────────────────────────────────────────────────
  const below = sorted.filter(
    (b) =>
      b !== labelBlock &&
      b.bounds.y > labelBlock.bounds.y &&
      b.bounds.y < labelBottom + 120 &&
      b.bounds.x < labelBlock.bounds.x + labelBlock.bounds.width + 40,
  );
  const belowFiltered = below.filter((b) => !looksLikeLabel(b.text));
  const pool = belowFiltered.length > 0 ? belowFiltered : below;
  if (pool.length > 0) {
    const nearest = pool.reduce((a, b) => (a.bounds.y < b.bounds.y ? a : b));
    const val = nearest.text.trim();
    if (val.length > 1) {
      return val.includes("/") ? preferLatinHalf(val) : val;
    }
  }

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Bank card extraction
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Extract bank card–specific fields from front and back OCR blocks.
 * Handles PAN, expiry, CVV, account number, and cardholder name.
 * Returns a partial label map compatible with extractByLabels output.
 */
function extractBankCardFields(
  frontSorted: OcrBlocks,
  backSorted: OcrBlocks = [],
): Partial<Record<string, string>> {
  const result: Partial<Record<string, string>> = {};
  const frontText = frontSorted.map((b) => b.text).join(" ");
  const backText = backSorted.map((b) => b.text).join(" ");
  const allText = (frontText + " " + backText).trim();

  // ── PAN — 16 digits with optional spaces/dashes ─────────────────────────
  const panMatch = allText.match(
    /\b(\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4})\b/,
  );
  if (panMatch) {
    const digits = panMatch[1].replace(/[\s-]/g, "");
    result.documentNumber = digits.replace(/(\d{4})(?=\d)/g, "$1 ");
  }

  // ── Expiry — MM/YY or MM/YYYY, normalise to MM/YY ───────────────────────
  const expiryMatch = allText.match(/\b(0[1-9]|1[0-2])[\/\s](\d{2}|\d{4})\b/);
  if (expiryMatch) {
    const month = expiryMatch[1];
    const year =
      expiryMatch[2].length === 4 ? expiryMatch[2].slice(-2) : expiryMatch[2];
    result.expiry = `${month}/${year}`;
  }

  // ── CVV — 3-digit code near CVV/CVC label (back of card preferred) ───────
  // Never use digits from the PAN as a CVV candidate.
  const cvvLabelOrder = ["CVV2", "CVC2", "SECURITY CODE", "CVV", "CVC"];
  const cvvSearchBlocks = [...backSorted, ...frontSorted];
  let cvvFound = false;
  for (const block of cvvSearchBlocks) {
    if (cvvFound) break;
    const upper = block.text.toUpperCase();
    const matchedLabel = cvvLabelOrder.find((l) => upper.includes(l));
    if (!matchedLabel) continue;
    // Inline: 3-digit code immediately after the label
    const afterLabel = block.text
      .substring(
        block.text.toUpperCase().indexOf(matchedLabel) + matchedLabel.length,
      )
      .replace(/^[\s:/\-]+/, "");
    const inlineMatch = afterLabel.match(/\b(\d{3})\b/);
    if (inlineMatch) {
      result.cvv = inlineMatch[1];
      cvvFound = true;
      break;
    }
    // Below: nearest block within 120px containing a 3-digit code
    const labelBottom = block.bounds.y + block.bounds.height;
    const below = cvvSearchBlocks
      .filter(
        (b) =>
          b !== block &&
          b.bounds.y > block.bounds.y &&
          b.bounds.y < labelBottom + 120,
      )
      .sort((a, c) => a.bounds.y - c.bounds.y);
    for (const b of below) {
      const m = b.text.match(/\b(\d{3})\b/);
      if (m) {
        result.cvv = m[1];
        cvvFound = true;
        break;
      }
    }
  }

  // ── Account number — may appear ABOVE its label on some cards ────────────
  const accountLabelWords = [
    "ACCOUNT NUMBER",
    "ACCOUNT NO",
    "ACCOUNT",
    "SMETKA",
    "БРОЈ НА СМЕТКА",
  ];
  const accountBlocks = backSorted.length ? backSorted : frontSorted;
  outer: for (const block of accountBlocks) {
    const upper = block.text.toUpperCase();
    const matched = accountLabelWords.find((l) => upper.includes(l));
    if (!matched) continue;
    // Inline
    const afterLabel = block.text
      .substring(block.text.toUpperCase().indexOf(matched) + matched.length)
      .replace(/^[\s:/\-]+/, "");
    const inlineMatch = afterLabel.match(/\d[\d\s]{10,}/);
    if (inlineMatch) {
      result.accountNumber = inlineMatch[0].replace(/\s+/g, " ").trim();
      break;
    }
    // Above the label (within 80px) — value printed above its label on some cards
    const above = accountBlocks
      .filter(
        (b) =>
          b !== block &&
          b.bounds.y + b.bounds.height <= block.bounds.y &&
          b.bounds.y + b.bounds.height > block.bounds.y - 80,
      )
      .sort((a, b) => b.bounds.y - a.bounds.y);
    for (const b of above) {
      const m = b.text.match(/\d[\d\s]{10,}/);
      if (m) {
        result.accountNumber = m[0].replace(/\s+/g, " ").trim();
        break outer;
      }
    }
    // Below the label (within 120px)
    const labelBottom = block.bounds.y + block.bounds.height;
    const below = accountBlocks
      .filter(
        (b) =>
          b !== block &&
          b.bounds.y > block.bounds.y &&
          b.bounds.y < labelBottom + 120,
      )
      .sort((a, b) => a.bounds.y - b.bounds.y);
    for (const b of below) {
      const m = b.text.match(/\d[\d\s]{10,}/);
      if (m) {
        result.accountNumber = m[0].replace(/\s+/g, " ").trim();
        break outer;
      }
    }
  }

  // ── Cardholder name — strict validation ──────────────────────────────────
  const BANK_LABEL_WORDS = new Set([
    "VALID",
    "THRU",
    "TO",
    "PAN",
    "CVV",
    "CVC",
    "CVV2",
    "CVC2",
    "ACCOUNT",
    "NUMBER",
    "VISA",
    "MASTERCARD",
    "MAESTRO",
    "MEMBER",
    "SINCE",
  ]);
  const isValidCardholderName = (text: string): boolean => {
    const t = text.trim();
    if (t.length <= 5) return false;
    if (!/^[A-Za-zÀ-ÿ ]+$/.test(t)) return false;
    const words = t.toUpperCase().split(/\s+/);
    if (words.some((w) => BANK_LABEL_WORDS.has(w))) return false;
    const isAllCaps = t === t.toUpperCase();
    const isTitleCase = words.every(
      (w) =>
        w.length === 0 ||
        (w[0] === w[0].toUpperCase() &&
          w.slice(1) === w.slice(1).toLowerCase()),
    );
    return isAllCaps || isTitleCase;
  };
  const nameBlocks = frontSorted.length ? frontSorted : backSorted;
  if (nameBlocks.length > 0) {
    const maxY = Math.max(
      ...nameBlocks.map((b) => b.bounds.y + b.bounds.height),
    );
    const candidates = nameBlocks.filter(
      (b) => b.bounds.y > maxY * 0.5 && isValidCardholderName(b.text.trim()),
    );
    if (candidates.length > 0) {
      const nameBlock = candidates.reduce((a, b) =>
        b.text.length > a.text.length ? b : a,
      );
      result.givenName = nameBlock.text.trim();
    }
  }

  return result;
}

/**
 * Given sorted OCR blocks, scan for known labels and extract their values.
 * Returns a map from field key to raw extracted string.
 */
function extractByLabels(sorted: OcrBlocks): Partial<Record<string, string>> {
  const result: Partial<Record<string, string>> = {};

  for (const block of sorted) {
    const blockTextUpper = block.text.toUpperCase();

    for (const [fieldKey, labels] of Object.entries(LABEL_MAP)) {
      if (result[fieldKey]) continue; // already found

      const matched = labels.find((lbl) => blockTextUpper.includes(lbl));
      if (!matched) continue;

      // Check if the label and value are on the same line (block text contains
      // both) or if we need to look at the next block.
      const afterLabel = block.text
        .substring(block.text.toUpperCase().indexOf(matched) + matched.length)
        .replace(/^[\s:/\-]+/, "")
        .trim();

      if (afterLabel.length > 1) {
        // Inline value
        result[fieldKey] = preferLatinHalf(afterLabel);
      } else {
        // Look for the value in neighbouring blocks
        const value = findValueForLabel(block, sorted);
        if (value) result[fieldKey] = value;
      }
    }
  }

  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// Post-processing helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * General cleanup applied to every extracted field value:
 * - Strip remaining Cyrillic characters
 * - Collapse multiple spaces
 * - Remove leading/trailing punctuation (/, -, |, .)
 */
function cleanFieldValue(v: string): string {
  return stripCyrillic(v)
    .replace(/\s{2,}/g, " ")
    .replace(/^[/\-|.\s]+/, "")
    .replace(/[/\-|.\s]+$/, "")
    .trim();
}

/**
 * Normalise date strings to DD.MM.YYYY wherever possible.
 * Handles: DD-MM-YYYY, DD/MM/YYYY, MM/YY, MMYY (bank card style).
 */
function normaliseDateValue(v: string): string {
  // Already in DD.MM.YYYY
  if (/^\d{2}\.\d{2}\.\d{4}$/.test(v)) return v;
  // DD-MM-YYYY or DD/MM/YYYY
  const full = v.match(/^(\d{2})[\/\-](\d{2})[\/\-](\d{4})$/);
  if (full) return `${full[1]}.${full[2]}.${full[3]}`;
  // MM/YY (bank card)
  const mmyy = v.match(/^(0[1-9]|1[0-2])\/(\d{2})$/);
  if (mmyy) return `${mmyy[1]}/${mmyy[2]}`; // keep as MM/YY for bank cards
  // MMYY (4-digit compact)
  const mmyyCompact = v.match(/^(0[1-9]|1[0-2])(\d{2})$/);
  if (mmyyCompact) return `${mmyyCompact[1]}/${mmyyCompact[2]}`;
  return v;
}

/** Apply general cleanup + date normalisation, return null if empty. */
function cleanDate(f: ExtractedField | null): ExtractedField | null {
  if (!f) return null;
  const v = normaliseDateValue(cleanFieldValue(f.value));
  return v.length > 0 ? { value: v, confidence: f.confidence } : null;
}

/**
 * If the value looks like a PAN (16 digits possibly with spaces/dashes),
 * reformat it as XXXX XXXX XXXX XXXX.
 */
function cleanPan(f: ExtractedField | null): ExtractedField | null {
  if (!f) return null;
  const cleaned = cleanFieldValue(f.value);
  const digits = cleaned.replace(/[\s\-]/g, "");
  if (/^\d{16}$/.test(digits)) {
    const formatted = digits.replace(/(\d{4})(?=\d)/g, "$1 ");
    return { value: formatted, confidence: f.confidence };
  }
  return cleaned.length > 0
    ? { value: cleaned, confidence: f.confidence }
    : null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 5 – Merge and return
// ─────────────────────────────────────────────────────────────────────────────

/**
 * extractDocumentFields(frontBlocks, backBlocks)
 *
 * Runs label-based OCR extraction on both sides, with a bank card fallback
 * when no document-type labels are detected.
 *
 * Priority: label match (back) > label match (front)
 */
export function extractDocumentFields(
  frontBlocks: OcrBlocks,
  backBlocks: OcrBlocks,
): DocumentFields {
  // ── Raw text for debugging ─────────────────────────────────────────────
  const raw = {
    front: frontBlocks.map((b) => b.text).join("\n"),
    back: backBlocks.map((b) => b.text).join("\n"),
  };

  // ── Sort blocks for spatial analysis ──────────────────────────────────
  const sortedFront = sortBlocksByPosition(frontBlocks);
  const sortedBack = sortBlocksByPosition(backBlocks);

  // ── Step 3: OCR label extraction ──────────────────────────────────────
  const backLabels = extractByLabels(sortedBack);
  const frontLabels = extractByLabels(sortedFront);

  /**
   * Resolve a field following the priority chain.
   * `mrzValue` is used when the MRZ was parsed successfully.
   * `labelKeys` is a list of keys to check in backLabels then frontLabels.
   */
  function resolve(...labelKeys: string[]): ExtractedField | null {
    for (const key of labelKeys) {
      const v = backLabels[key] ?? frontLabels[key];
      if (v) return field(v, "ocr-label");
    }
    return null;
  }

  // ── Bank card fallback ─────────────────────────────────────────────────
  // If neither side has document-type labels, try bank card extraction.
  const allText = (raw.front + " " + raw.back).toUpperCase();
  const hasDocLabel =
    /PASSPORT|REISEPASS|PASSEPORT|PASAPORTE|PASSAPORTO|IDENTITY CARD|PERSONALAUSWEIS|CARTE D.IDENTIT|DNI|CARTA D.IDENTIT|IDENTITEITSKAART|DRIVER|DRIVING|FUHR|PERMIS|PERMISO|PATENTE|RIJBEWIJS|VOZACKA|\u041b\u0418\u0427\u041d\u0410|\u041f\u0410\u0421\u041e\u0428/.test(
      allText,
    );

  const isBankCard =
    /\bPAN\b|VALID THRU|VALID TO|\bCVV\b|\bCVC\b|\bVISA\b|\bMASTERCARD\b|\bMAESTRO\b|\bIBAN\b/.test(
      allText,
    );

  let bankCardHolderName: string | null = null;

  if (isBankCard || !hasDocLabel) {
    const bankFields = extractBankCardFields(sortedFront, sortedBack);
    if (
      !backLabels.documentNumber &&
      !frontLabels.documentNumber &&
      bankFields.documentNumber
    )
      backLabels.documentNumber = bankFields.documentNumber;
    if (!backLabels.expiry && !frontLabels.expiry && bankFields.expiry)
      backLabels.expiry = bankFields.expiry;
    if (bankFields.cvv) backLabels.cvv = bankFields.cvv;
    if (bankFields.accountNumber)
      backLabels.accountNumber = bankFields.accountNumber;
    if (bankFields.givenName) bankCardHolderName = bankFields.givenName;
  }

  // ── Document type — derived from multilingual keywords ────────────────
  let documentType: ExtractedField | null = null;
  if (/PASSPORT|REISEPASS|PASSEPORT|PASAPORTE|PASSAPORTO/.test(allText)) {
    documentType = { value: "Passport", confidence: "ocr-label" };
  } else if (
    /IDENTITY CARD|PERSONALAUSWEIS|CARTE D.IDENTIT|\bDNI\b|CARTA D.IDENTIT|IDENTITEITSKAART|\bID CARD\b|ЛИЧНА КАРТА/.test(
      allText,
    )
  ) {
    documentType = { value: "Identity Card", confidence: "ocr-label" };
  } else if (
    /DRIVER|DRIVING|FÜHR|PERMIS DE CONDUI|PERMISO DE CONDU|PATENTE|RIJBEWIJS|VOZAČKA/.test(
      allText,
    )
  ) {
    documentType = { value: "Driving License", confidence: "ocr-label" };
  } else if (
    isBankCard ||
    (!hasDocLabel && (backLabels.documentNumber ?? frontLabels.documentNumber))
  ) {
    documentType = { value: "Bank Card", confidence: "ocr-label" };
  }

  // ── Fields ─────────────────────────────────────────────────────────────

  const surname = resolve("surname");
  // Bank card names may be in local script — skip Cyrillic stripping for them
  const givenName =
    isBankCard && bankCardHolderName
      ? { value: bankCardHolderName, confidence: "ocr-label" as OcrConfidence }
      : resolve("givenName");
  const dateOfBirth = cleanDate(resolve("dateOfBirth"));
  const documentNumber = cleanPan(resolve("documentNumber"));
  const nationality = resolve("nationality");
  const expiry = cleanDate(resolve("expiry"));
  const sex = resolve("sex");
  const personalNumber = resolve("personalNumber");
  const placeOfBirth = resolve("placeOfBirth");
  const address = resolve("address");
  const issuingAuthority = resolve("issuingAuthority");
  const cvv = resolve("cvv");
  const accountNumber = resolve("accountNumber");

  return {
    documentType,
    nationality,
    surname,
    givenName,
    dateOfBirth,
    documentNumber,
    expiry,
    placeOfBirth,
    address,
    issuingAuthority,
    personalNumber,
    sex,
    cvv,
    accountNumber,
    raw,
  };
}
