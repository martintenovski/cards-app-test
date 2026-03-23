import TextRecognition, {
  TextRecognitionScript,
  type TextRecognitionResult,
} from "@react-native-ml-kit/text-recognition";

export type FieldScanTarget =
  | "bank_card_number"
  | "bank_account_number"
  | "personal_nin"
  | "personal_barcode";

export type ScannableFieldName =
  | "cardNumber"
  | "accountNumber"
  | "personalIdNumber";

type RecognizedLine = {
  text: string;
  elements: string[];
};

type RecognitionSnapshot = {
  text: string;
  lines: RecognizedLine[];
  flatLines: string[];
};

type ScanTargetConfig = {
  field: ScannableFieldName;
  buttonLabel: string;
  title: string;
  description: string;
  captureHint: string;
  emptyResultMessage: string;
};

export const FIELD_SCAN_CONFIG: Record<FieldScanTarget, ScanTargetConfig> = {
  bank_card_number: {
    field: "cardNumber",
    buttonLabel: "Scan card number",
    title: "Scan Card Number",
    description:
      "Capture only the printed card number from the front of the card.",
    captureHint:
      "Center the PAN digits in the frame and keep glare off the card surface.",
    emptyResultMessage:
      "No card number was detected. Try again with the digits centered and better lighting.",
  },
  bank_account_number: {
    field: "accountNumber",
    buttonLabel: "Scan account number",
    title: "Scan Account Number",
    description:
      "Capture only the bank account or IBAN number shown on the document.",
    captureHint:
      "Place the account or IBAN line inside the frame and keep the text flat and sharp.",
    emptyResultMessage:
      "No account number was detected. Try again with the account line closer to the camera.",
  },
  personal_nin: {
    field: "personalIdNumber",
    buttonLabel: "Scan NIN number",
    title: "Scan NIN Number",
    description:
      "Capture only the national identification number printed on the ID card.",
    captureHint:
      "Align the NIN field inside the frame and avoid cropping the surrounding label.",
    emptyResultMessage:
      "No NIN number was detected. Try again with the ID number area centered in the frame.",
  },
  personal_barcode: {
    field: "cardNumber",
    buttonLabel: "Scan barcode digits",
    title: "Scan Barcode Digits",
    description:
      "Capture only the printed code beneath the barcode on the ID card.",
    captureHint:
      "Keep the code under the barcode inside the frame and avoid motion blur.",
    emptyResultMessage:
      "No barcode digits were detected. Try again with the printed code fully visible.",
  },
};

export function getFieldForScanTarget(
  target: FieldScanTarget,
): ScannableFieldName {
  return FIELD_SCAN_CONFIG[target].field;
}

export async function scanImageForField(
  imageUri: string,
  target: FieldScanTarget,
): Promise<string> {
  const snapshot = await recognizeImageText(imageUri);
  const value = extractFieldValue(snapshot, target);

  if (!value) {
    throw new Error(FIELD_SCAN_CONFIG[target].emptyResultMessage);
  }

  return value;
}

async function recognizeImageText(imageUri: string) {
  try {
    const recognition = await TextRecognition.recognize(
      imageUri,
      TextRecognitionScript.LATIN,
    );
    return buildRecognitionSnapshot(recognition);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown ML Kit error";
    throw new Error(`ML Kit text recognition failed: ${message}`);
  }
}

function extractFieldValue(
  snapshot: RecognitionSnapshot,
  target: FieldScanTarget,
) {
  switch (target) {
    case "bank_card_number":
      return extractCardNumber(snapshot);
    case "bank_account_number":
      return extractAccountNumber(snapshot);
    case "personal_nin":
      return extractNationalIdNumber(snapshot);
    case "personal_barcode":
      return extractBarcodeDigits(snapshot);
    default:
      return undefined;
  }
}

function buildRecognitionSnapshot(
  recognition: TextRecognitionResult,
): RecognitionSnapshot {
  const lines = recognition.blocks.flatMap((block) =>
    block.lines
      .map((line) => {
        const elements = line.elements
          .map((element) => normalizeText(element.text))
          .filter(Boolean);
        const text =
          normalizeText(line.text) || normalizeText(elements.join(" "));

        return {
          text,
          elements,
        };
      })
      .filter((line) => Boolean(line.text)),
  );

  return {
    text: normalizeText(recognition.text),
    lines,
    flatLines: lines.map((line) => line.text),
  };
}

function normalizeText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function normalizePotentialDigitChars(value: string) {
  return value
    .toUpperCase()
    .replace(/[OQ]/g, "0")
    .replace(/[IL]/g, "1")
    .replace(/S/g, "5")
    .replace(/B/g, "8");
}

function extractCardNumber(snapshot: RecognitionSnapshot) {
  const candidates = new Set<string>();

  for (const line of snapshot.flatLines) {
    addCardNumberCandidates(line, candidates);
  }

  for (const line of snapshot.lines) {
    for (const element of line.elements) {
      addCardNumberCandidates(element, candidates);
    }
  }

  addCardNumberCandidates(snapshot.text, candidates);

  const rankedCandidates = [...candidates]
    .filter((candidate) => candidate.length >= 12 && candidate.length <= 19)
    .map((candidate) => ({
      candidate,
      score: scoreCardNumberCandidate(candidate),
    }))
    .sort((left, right) => right.score - left.score);

  return rankedCandidates[0]?.candidate;
}

function addCardNumberCandidates(value: string, candidates: Set<string>) {
  const normalizedValue = normalizePotentialDigitChars(value);
  const matches = normalizedValue.match(/\d(?:[\d\s\-]{10,25}\d)/g) ?? [];

  for (const match of matches) {
    const digits = match.replace(/\D/g, "");
    if (digits.length >= 12 && digits.length <= 19) {
      candidates.add(digits);
    }
  }
}

function scoreCardNumberCandidate(candidate: string) {
  let score = candidate.length;

  if (passesLuhnCheck(candidate)) {
    score += 100;
  }

  if (candidate.length >= 16) {
    score += 8;
  }

  if (/^(4|5|2[2-7]|34|37|6)/.test(candidate)) {
    score += 4;
  }

  return score;
}

function passesLuhnCheck(digits: string) {
  let sum = 0;
  let shouldDouble = false;

  for (let index = digits.length - 1; index >= 0; index -= 1) {
    let digit = Number(digits[index]);
    if (Number.isNaN(digit)) {
      return false;
    }

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

function extractAccountNumber(snapshot: RecognitionSnapshot) {
  const lines = snapshot.flatLines;
  const labelledPattern =
    /(?:IBAN|ACCOUNT(?:\s+NUMBER)?|ACCT|A\/C|ACC(?:\.|OUNT)?|SMETKA)\s*[:#\-]?\s*([A-Z0-9\- ]{6,34})/i;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const nextLine = lines[index + 1];
    const labelledValue = extractLabelledCode(line, labelledPattern);
    if (labelledValue) {
      return labelledValue;
    }

    if (labelledPattern.test(line) && nextLine) {
      const nextCandidate = sanitizeCodeCandidate(nextLine);
      if (nextCandidate) {
        return nextCandidate;
      }
    }
  }

  const ibanMatch = snapshot.text.match(/\b[A-Z]{2}\d{2}[A-Z0-9 ]{10,30}\b/);
  if (ibanMatch) {
    return sanitizeCodeCandidate(ibanMatch[0]);
  }

  const denseCandidates = collectDenseCodeCandidates(snapshot)
    .filter((candidate) => candidate.length >= 6 && candidate.length <= 34)
    .filter((candidate) => !looksLikeCardNumber(candidate));

  return denseCandidates[0];
}

function extractNationalIdNumber(snapshot: RecognitionSnapshot) {
  const lines = snapshot.flatLines;
  const labelledPattern =
    /(?:NIN|PERSONAL(?:\s+ID|\s+NUMBER)?|ID\s*NO|EMBG|EMB|PIN)\s*[:#\-]?\s*([A-Z0-9\- ]{6,24})/i;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const nextLine = lines[index + 1];
    const labelledValue = extractLabelledCode(line, labelledPattern);
    if (labelledValue) {
      return labelledValue;
    }

    if (labelledPattern.test(line) && nextLine) {
      const nextCandidate = sanitizeCodeCandidate(nextLine);
      if (nextCandidate) {
        return nextCandidate;
      }
    }
  }

  const exactLengthDigits = collectDenseCodeCandidates(snapshot).filter(
    (candidate) => /^\d{13}$/.test(candidate),
  );
  if (exactLengthDigits[0]) {
    return exactLengthDigits[0];
  }

  const fallback = collectDenseCodeCandidates(snapshot).find((candidate) =>
    /^\d{8,18}$/.test(candidate),
  );

  return fallback;
}

function extractBarcodeDigits(snapshot: RecognitionSnapshot) {
  const lines = snapshot.flatLines;
  const labelledPattern =
    /(?:BARCODE|CODE|DOC(?:UMENT)?\s*NO|CARD\s*NO)\s*[:#\-]?\s*([A-Z0-9\- ]{6,24})/i;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const nextLine = lines[index + 1];
    const labelledValue = extractLabelledCode(line, labelledPattern);
    if (labelledValue) {
      return labelledValue;
    }

    if (labelledPattern.test(line) && nextLine) {
      const nextCandidate = sanitizeCodeCandidate(nextLine);
      if (nextCandidate) {
        return nextCandidate;
      }
    }
  }

  const candidates = collectDenseCodeCandidates(snapshot)
    .filter((candidate) => candidate.length >= 6 && candidate.length <= 24)
    .filter((candidate) => !/^\d{2}\.\d{2}\.\d{4}$/.test(candidate));

  return candidates[0];
}

function extractLabelledCode(value: string, pattern: RegExp) {
  const match = value.match(pattern);
  if (!match?.[1]) {
    return undefined;
  }

  return sanitizeCodeCandidate(match[1]);
}

function sanitizeCodeCandidate(value: string) {
  const trimmed = value.replace(/\s+/g, " ").trim();
  const normalized = trimmed.replace(/[^A-Z0-9\- ]/gi, "").toUpperCase();
  return normalized.length >= 3 ? normalized : undefined;
}

function collectDenseCodeCandidates(snapshot: RecognitionSnapshot) {
  const candidates = new Set<string>();
  const sources = [snapshot.text, ...snapshot.flatLines];

  for (const source of sources) {
    const matches =
      source.match(/\b[A-Z0-9][A-Z0-9\- ]{4,33}[A-Z0-9]\b/g) ?? [];
    for (const match of matches) {
      const candidate = sanitizeCodeCandidate(match);
      if (candidate) {
        candidates.add(candidate);
      }
    }
  }

  return [...candidates].sort((left, right) => right.length - left.length);
}

function looksLikeCardNumber(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits.length >= 12 && digits.length <= 19;
}
