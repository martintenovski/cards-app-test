import {
  BlinkIdSdkSettings,
  BlinkIdScanningSettings,
  BlinkIdScanningUxSettings,
  BlinkIdSessionSettings,
  ClassFilter,
  CroppedImageSettings,
  DetectionLevel,
  DocumentFilter,
  DocumentType,
  ScanningMode,
  type BlinkIdScanningResult,
  performScan,
} from '@microblink/blinkid-react-native';
import { Platform } from 'react-native';

export const LICENSE_KEY_IOS = process.env.EXPO_PUBLIC_BLINKID_LICENSE_KEY_IOS ?? '';
export const LICENSE_KEY_ANDROID = process.env.EXPO_PUBLIC_BLINKID_LICENSE_KEY_ANDROID ?? '';

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
  rawResult?: unknown;
};

export async function scanWithBlinkID(
  type: 'document' | 'card'
): Promise<ScannedCardData | null> {
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') {
    return null;
  }

  try {
    const licenseKey = Platform.select({
      ios: LICENSE_KEY_IOS,
      android: LICENSE_KEY_ANDROID,
      default: undefined,
    });

    if (!licenseKey) {
      return null;
    }

    const sdkSettings = new BlinkIdSdkSettings(licenseKey);
    sdkSettings.downloadResources = true;

    const sessionSettings = new BlinkIdSessionSettings();
    const scanningSettings = new BlinkIdScanningSettings();
    const croppedImageSettings = new CroppedImageSettings();
    const uxSettings = new BlinkIdScanningUxSettings();

    uxSettings.allowHapticFeedback = true;
    scanningSettings.glareDetectionLevel = DetectionLevel.Mid;
    croppedImageSettings.returnDocumentImage = true;
    croppedImageSettings.returnFaceImage = type === 'document';
    scanningSettings.croppedImageSettings = croppedImageSettings;
    sessionSettings.scanningSettings = scanningSettings;
    sessionSettings.scanningMode =
      type === 'card' ? ScanningMode.Single : ScanningMode.Automatic;

    const classFilter =
      type === 'card'
        ? new ClassFilter([
            new DocumentFilter(undefined, undefined, DocumentType.FinCard),
          ])
        : undefined;

    const result = await performScan(
      sdkSettings,
      sessionSettings,
      uxSettings,
      classFilter
    );

    if (type === 'document') {
      const mappedResult = mapDocumentResult(result);
      return hasDocumentData(mappedResult) ? mappedResult : null;
    }

    const mappedResult = mapCardResult(result);
    return hasCardData(mappedResult) ? mappedResult : null;
  } catch (error) {
    console.error('BlinkID scan error:', error);
    throw error;
  }
}

function mapDocumentResult(result: BlinkIdScanningResult): ScannedCardData {
  const fullName =
    result.fullName?.value ??
    ([result.firstName?.value, result.lastName?.value]
      .filter(Boolean)
      .join(' ') ||
      undefined);

  return {
    documentType: detectDocumentType(result),
    firstName: result.firstName?.value ?? undefined,
    lastName: result.lastName?.value ?? undefined,
    fullName,
    documentNumber: result.documentNumber?.value ?? undefined,
    personalIdNumber:
      result.personalIdNumber?.value ??
      result.additionalPersonalIdNumber?.value ??
      result.nationalInsuranceNumber?.value ??
      undefined,
    dateOfBirth: formatDate(result.dateOfBirth),
    dateOfExpiry: formatDate(result.dateOfExpiry),
    nationality:
      result.nationality?.value ??
      result.documentClassInfo?.countryName ??
      undefined,
    issuedBy:
      result.issuingAuthority?.value ??
      result.documentClassInfo?.countryName ??
      undefined,
    sex: result.sex?.value ?? undefined,
    rawResult: result,
  };
}

function mapCardResult(result: BlinkIdScanningResult): ScannedCardData {
  const cardNumber = normalizeCardNumber(result.documentNumber?.value);
  const cardExpiry = formatCardExpiry(result.dateOfExpiry);
  const cardHolder =
    result.fullName?.value ??
    ([result.firstName?.value, result.lastName?.value]
      .filter(Boolean)
      .join(' ') ||
      undefined);

  return {
    documentType: 'bank_card',
    cardNumber,
    cardExpiry,
    cardHolder,
    rawResult: result,
  };
}

function detectDocumentType(
  result: BlinkIdScanningResult
): ScannedCardData['documentType'] {
  switch (result.documentClassInfo?.documentType) {
    case DocumentType.Passport:
      return 'passport';
    case DocumentType.Dl:
    case DocumentType.DlPublicServicesCard:
      return 'driving_license';
    default:
      return 'id';
  }
}

function formatDate(
  dateResult?: BlinkIdScanningResult['dateOfBirth'] | BlinkIdScanningResult['dateOfExpiry']
): string | undefined {
  const date = dateResult?.date;

  if (!date?.day || !date?.month || !date?.year) {
    const original = dateResult?.originalString;
    return typeof original === 'string'
      ? original
      : original?.value ?? undefined;
  }

  return `${String(date.day).padStart(2, '0')}.${String(date.month).padStart(
    2,
    '0'
  )}.${date.year}`;
}

function formatCardExpiry(
  dateResult?: BlinkIdScanningResult['dateOfExpiry']
): string | undefined {
  const original = extractOriginalString(dateResult?.originalString);
  if (original) {
    return original;
  }

  const date = dateResult?.date;
  if (!date?.month || !date?.year) {
    return undefined;
  }

  return `${String(date.month).padStart(2, '0')}/${String(date.year).slice(-2)}`;
}

function extractOriginalString(
  value: unknown
): string | undefined {
  if (typeof value === 'string') {
    return value.trim() || undefined;
  }

  if (value && typeof value === 'object' && 'value' in value) {
    const nestedValue = value.value;
    return typeof nestedValue === 'string' ? nestedValue.trim() || undefined : undefined;
  }

  return undefined;
}

function normalizeCardNumber(value?: string): string | undefined {
  if (!value) {
    return undefined;
  }

  const digits = value.replace(/\D/g, '');
  if (!digits) {
    return value.trim() || undefined;
  }

  return digits.match(/.{1,4}/g)?.join(' ') ?? digits;
}

function hasDocumentData(result: ScannedCardData) {
  return Boolean(
    result.fullName ||
      result.documentNumber ||
      result.personalIdNumber ||
      result.dateOfBirth ||
      result.dateOfExpiry
  );
}

function hasCardData(result: ScannedCardData) {
  return Boolean(result.cardNumber || result.cardExpiry || result.cardHolder);
}