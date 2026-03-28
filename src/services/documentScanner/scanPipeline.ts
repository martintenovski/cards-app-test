import type { CardCategory } from "@/types/card";
import type {
  DocumentScanAnalysis,
  DocumentScanDraft,
  DocumentScannerPhase,
  OcrProviderName,
  OcrProviderResult,
  ScanCaptureMode,
  ScanSide,
  StoredDocumentScanRecord,
} from "@/types/documentScanner";

import {
  buildFormValues,
  buildWarnings,
  classifyDocument,
  extractFields,
  scoreExtraction,
} from "@/src/services/documentScanner/documentIntelligence";
import { preprocessScannedImage } from "@/src/services/documentScanner/imagePreprocessing";
import {
  runMlKitOcr,
  runPaddleOcr,
} from "@/src/services/documentScanner/ocrProviders";

type ScanPipelineOptions = {
  captureMode: ScanCaptureMode;
  requiresBackSide: boolean;
  frontUri: string;
  backUri?: string | null;
  expectedCategory?: CardCategory;
  expectedType?: string;
  onPhaseChange?: (phase: DocumentScannerPhase) => void;
};

type ProviderBundle = Partial<Record<ScanSide, OcrProviderResult>>;

const PHASE_MINIMUM_DURATION_MS: Partial<Record<DocumentScannerPhase, number>> =
  {
    preprocessing: 350,
    "ocr-mlkit": 650,
    "ocr-paddle": 650,
    classifying: 300,
    extracting: 350,
    "creating-draft": 250,
  };

function createId() {
  return `scan-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function sleep(durationMs: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, durationMs);
  });
}

async function advancePhase(
  phase: DocumentScannerPhase,
  onPhaseChange?: (phase: DocumentScannerPhase) => void,
) {
  onPhaseChange?.(phase);

  const minimumDuration = PHASE_MINIMUM_DURATION_MS[phase] ?? 0;
  if (minimumDuration > 0) {
    await sleep(minimumDuration);
  }
}

async function runProviderForSides(
  provider: OcrProviderName,
  assets: Awaited<ReturnType<typeof preprocessScannedImage>>[],
): Promise<ProviderBundle> {
  const bundle: ProviderBundle = {};

  for (const asset of assets) {
    bundle[asset.side] =
      provider === "mlkit"
        ? await runMlKitOcr(asset)
        : await runPaddleOcr(asset);
  }

  return bundle;
}

function summarizeQualityHints(
  assets: Awaited<ReturnType<typeof preprocessScannedImage>>[],
) {
  return Array.from(
    new Set(assets.flatMap((asset) => asset.qualityHints).filter(Boolean)),
  );
}

function buildStoredRecord(
  analysis: DocumentScanAnalysis,
): StoredDocumentScanRecord {
  const fieldConfidence = Object.entries(analysis.extractedFields).reduce<
    StoredDocumentScanRecord["fieldConfidence"]
  >((accumulator, [key, value]) => {
    if (value) {
      accumulator[key as keyof typeof accumulator] = value.confidence;
    }
    return accumulator;
  }, {});

  return {
    id: analysis.id,
    createdAt: analysis.createdAt,
    classification: analysis.classification,
    selectedProvider: analysis.selectedProvider,
    providerConfidence: analysis.providerConfidence,
    warnings: analysis.warnings,
    fieldConfidence,
    formSnapshot: analysis.formValues,
  };
}

function applyExpectedClassification(
  classification: ReturnType<typeof classifyDocument>,
  expectedCategory?: CardCategory,
  expectedType?: string,
) {
  if (!expectedCategory && !expectedType) {
    return classification;
  }

  return {
    ...classification,
    category: expectedCategory ?? classification.category,
    type: expectedType || classification.type,
    confidence: Math.max(classification.confidence, 0.98),
  };
}

export async function runDocumentScanPipeline({
  captureMode,
  requiresBackSide,
  frontUri,
  backUri,
  expectedCategory,
  expectedType,
  onPhaseChange,
}: ScanPipelineOptions): Promise<{
  analysis: DocumentScanAnalysis;
  draft: DocumentScanDraft;
  record: StoredDocumentScanRecord;
}> {
  await advancePhase("preprocessing", onPhaseChange);

  const assets = [
    await preprocessScannedImage("front", frontUri),
    ...(backUri ? [await preprocessScannedImage("back", backUri)] : []),
  ];

  await advancePhase("ocr-mlkit", onPhaseChange);
  const mlKitBundle = await runProviderForSides("mlkit", assets);
  const mlKitClassification = applyExpectedClassification(
    classifyDocument(mlKitBundle),
    expectedCategory,
    expectedType,
  );
  const mlKitFields = extractFields(mlKitBundle, mlKitClassification);
  const mlKitConfidence = scoreExtraction(
    mlKitClassification,
    mlKitFields,
    Math.min(
      1,
      assets.reduce(
        (sum, asset) => sum + (mlKitBundle[asset.side]?.confidence ?? 0),
        0,
      ) / Math.max(assets.length, 1),
    ),
  );

  let selectedProvider: OcrProviderName = "mlkit";
  let selectedBundle = mlKitBundle;
  let selectedClassification = mlKitClassification;
  let selectedFields = mlKitFields;
  let providerConfidence = mlKitConfidence;
  const providersTried: OcrProviderName[] = ["mlkit"];

  const shouldFallback =
    providerConfidence < 0.64 ||
    (selectedClassification.category === "bank" &&
      !selectedFields.cardNumber?.value) ||
    (!selectedFields.nameOnCard?.value &&
      selectedClassification.category !== "bank");

  if (shouldFallback) {
    await advancePhase("ocr-paddle", onPhaseChange);
    try {
      const paddleBundle = await runProviderForSides("paddle", assets);
      const paddleClassification = applyExpectedClassification(
        classifyDocument(paddleBundle),
        expectedCategory,
        expectedType,
      );
      const paddleFields = extractFields(paddleBundle, paddleClassification);
      const paddleConfidence = scoreExtraction(
        paddleClassification,
        paddleFields,
        Math.min(
          1,
          assets.reduce(
            (sum, asset) => sum + (paddleBundle[asset.side]?.confidence ?? 0),
            0,
          ) / Math.max(assets.length, 1),
        ),
      );

      providersTried.push("paddle");

      if (paddleConfidence > providerConfidence) {
        selectedProvider = "paddle";
        selectedBundle = paddleBundle;
        selectedClassification = paddleClassification;
        selectedFields = paddleFields;
        providerConfidence = paddleConfidence;
      }
    } catch {
      providersTried.push("paddle");
    }
  }

  await advancePhase("classifying", onPhaseChange);
  await advancePhase("extracting", onPhaseChange);

  const formValues = buildFormValues(selectedClassification, selectedFields);
  const createdAt = new Date().toISOString();
  const qualityHints = summarizeQualityHints(assets);

  await advancePhase("creating-draft", onPhaseChange);

  const analysis: DocumentScanAnalysis = {
    id: createId(),
    captureMode,
    requiresBackSide,
    assets: Object.fromEntries(assets.map((asset) => [asset.side, asset])),
    classification: selectedClassification,
    providersTried,
    selectedProvider,
    providerConfidence: Number(providerConfidence.toFixed(2)),
    rawText: [selectedBundle.front?.text, selectedBundle.back?.text]
      .filter(Boolean)
      .join("\n"),
    extractedFields: selectedFields,
    formValues,
    warnings: buildWarnings(
      selectedClassification,
      selectedFields,
      providerConfidence,
      requiresBackSide,
      Boolean(backUri),
      selectedProvider,
      qualityHints,
    ),
    createdAt,
    updatedAt: createdAt,
  };

  const draft: DocumentScanDraft = {
    id: analysis.id,
    formValues,
    analysis,
  };
  const record = buildStoredRecord(analysis);

  onPhaseChange?.("completed");

  return { analysis, draft, record };
}
