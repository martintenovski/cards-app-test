import type { CardCategory, CardFormValues } from "@/types/card";

export type ScanSide = "front" | "back";
export type ScanCaptureMode = "auto" | "manual";
export type OcrProviderName = "mlkit" | "paddle";

export type DocumentScannerPhase =
  | "idle"
  | "capturing"
  | "confirming"
  | "preprocessing"
  | "ocr-mlkit"
  | "ocr-paddle"
  | "classifying"
  | "extracting"
  | "creating-draft"
  | "completed"
  | "failed";

export type ScanWarningCode =
  | "poor-scan"
  | "low-light"
  | "unreadable"
  | "low-confidence"
  | "missing-back"
  | "fallback-used";

export interface ScanWarning {
  code: ScanWarningCode;
  severity: "info" | "warning" | "error";
  message: string;
  recoverable: boolean;
  side?: ScanSide;
}

export interface DocumentScanAsset {
  side: ScanSide;
  capturedUri: string;
  normalizedUri: string;
  ocrUri: string;
  width: number;
  height: number;
  fileSize: number;
  qualityHints: string[];
}

export interface OcrTextBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface OcrLineCandidate {
  text: string;
  confidence: number;
  bounds?: OcrTextBounds;
}

export interface OcrProviderResult {
  provider: OcrProviderName;
  text: string;
  lines: OcrLineCandidate[];
  confidence: number;
}

export interface DocumentClassificationResult {
  category: CardCategory;
  type: string;
  confidence: number;
  matchedKeywords: string[];
}

export interface ExtractedFieldValue {
  value: string;
  confidence: number;
  provider: OcrProviderName;
  sourceSide: ScanSide | "combined";
}

export type ExtractedFieldMap = Partial<
  Record<keyof CardFormValues, ExtractedFieldValue>
>;

export interface DocumentScanAnalysis {
  id: string;
  captureMode: ScanCaptureMode;
  requiresBackSide: boolean;
  assets: Partial<Record<ScanSide, DocumentScanAsset>>;
  classification: DocumentClassificationResult;
  providersTried: OcrProviderName[];
  selectedProvider: OcrProviderName;
  providerConfidence: number;
  rawText: string;
  extractedFields: ExtractedFieldMap;
  formValues: CardFormValues;
  warnings: ScanWarning[];
  createdAt: string;
  updatedAt: string;
}

export interface DocumentScanDraft {
  id: string;
  formValues: CardFormValues;
  analysis: DocumentScanAnalysis;
}

export interface StoredDocumentScanRecord {
  id: string;
  createdAt: string;
  classification: DocumentClassificationResult;
  selectedProvider: OcrProviderName;
  providerConfidence: number;
  warnings: ScanWarning[];
  fieldConfidence: Partial<Record<keyof CardFormValues, number>>;
  formSnapshot: Partial<CardFormValues>;
}
