import type {
  DocumentScanAsset,
  OcrLineCandidate,
  OcrProviderResult,
} from "@/types/documentScanner";

function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function normalizeText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function estimateCoverageConfidence(lines: OcrLineCandidate[]) {
  const totalChars = lines.reduce((sum, line) => sum + line.text.length, 0);
  const densityScore = clamp(totalChars / 140);
  const lineScore = clamp(lines.length / 10);
  return Number((densityScore * 0.65 + lineScore * 0.35).toFixed(2));
}

type MlkitLine = {
  text: string;
  frame: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
};

type MlkitBlock = {
  text: string;
  lines: MlkitLine[];
};

type MlkitResult = {
  text: string;
  blocks: MlkitBlock[];
};

type MlkitModule = {
  recognizeText: (uri: string) => Promise<MlkitResult>;
};

function flattenMlKitLines(blocks: MlkitBlock[]): OcrLineCandidate[] {
  return blocks.flatMap((block) =>
    block.lines.map((line) => ({
      text: normalizeText(line.text),
      confidence: 0.76,
      bounds: {
        x: line.frame.x,
        y: line.frame.y,
        width: line.frame.width,
        height: line.frame.height,
      },
    })),
  );
}

function getMlKitModule(): MlkitModule {
  try {
    const mlkitModule = require("rn-mlkit-ocr") as
      | MlkitModule
      | { default: MlkitModule };

    return "default" in mlkitModule ? mlkitModule.default : mlkitModule;
  } catch (error) {
    throw new Error(
      error instanceof Error && /doesn't seem to be linked|not using Expo Go/i.test(error.message)
        ? "ML Kit OCR is not available in the current app build. Rebuild the Android app after installing native modules (for example with `npx expo run:android`) and open the rebuilt dev client instead of only restarting Metro."
        : error instanceof Error
          ? `ML Kit OCR is unavailable in this build: ${error.message}`
          : "ML Kit OCR is unavailable in this build.",
    );
  }
}

type PaddleOcrInstance = {
  detect: (uri: string) => Promise<
    Array<{
      text: string;
      score: number;
      frame: {
        left: number;
        top: number;
        width: number;
        height: number;
      };
    }>
  >;
};

type PaddleOcrModule = {
  create: (options: {
    recognitionImageMaxSize: number;
    detectionThreshold: number;
    detectionBoxThreshold: number;
    detectionUseDilate: boolean;
    useDirectionClassify: boolean;
  }) => Promise<PaddleOcrInstance>;
};

let paddleInstancePromise: Promise<PaddleOcrInstance> | null = null;

function getPaddleModule(): PaddleOcrModule {
  try {
    const paddleModule = require("@gutenye/ocr-react-native") as
      | PaddleOcrModule
      | { default: PaddleOcrModule };

    return "default" in paddleModule ? paddleModule.default : paddleModule;
  } catch (error) {
    throw new Error(
      error instanceof Error
        ? `Paddle OCR is unavailable in this build: ${error.message}`
        : "Paddle OCR is unavailable in this build.",
    );
  }
}

async function getPaddleInstance() {
  if (!paddleInstancePromise) {
    const paddleModule = getPaddleModule();

    paddleInstancePromise = paddleModule.create({
      recognitionImageMaxSize: 1600,
      detectionThreshold: 0.24,
      detectionBoxThreshold: 0.45,
      detectionUseDilate: true,
      useDirectionClassify: true,
    });
  }

  return paddleInstancePromise;
}

export async function runMlKitOcr(
  asset: DocumentScanAsset,
): Promise<OcrProviderResult> {
  const mlkit = getMlKitModule();
  const result = await mlkit.recognizeText(asset.ocrUri);
  const lines = flattenMlKitLines(result.blocks).filter((line) => line.text);

  return {
    provider: "mlkit",
    text: normalizeText(result.text),
    lines,
    confidence: clamp(0.2 + estimateCoverageConfidence(lines) * 0.8),
  };
}

export async function runPaddleOcr(
  asset: DocumentScanAsset,
): Promise<OcrProviderResult> {
  const paddle = await getPaddleInstance();
  const result = await paddle.detect(asset.ocrUri);
  const lines = result
    .map((line) => ({
      text: normalizeText(line.text),
      confidence: clamp(line.score, 0, 1),
      bounds: {
        x: line.frame.left,
        y: line.frame.top,
        width: line.frame.width,
        height: line.frame.height,
      },
    }))
    .filter((line) => line.text);
  const averageConfidence =
    lines.length > 0
      ? lines.reduce((sum, line) => sum + line.confidence, 0) / lines.length
      : 0;

  return {
    provider: "paddle",
    text: lines.map((line) => line.text).join("\n"),
    lines,
    confidence: clamp(
      averageConfidence * 0.7 + estimateCoverageConfidence(lines) * 0.3,
    ),
  };
}
