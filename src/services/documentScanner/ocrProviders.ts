import PaddleOcr from "@gutenye/ocr-react-native";
import MlkitOcr, { type OcrBlock, type OcrLine } from "rn-mlkit-ocr";

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

function flattenMlKitLines(blocks: OcrBlock[]): OcrLineCandidate[] {
  return blocks.flatMap((block) =>
    block.lines.map((line: OcrLine) => ({
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

let paddleInstancePromise: Promise<PaddleOcr> | null = null;

async function getPaddleInstance() {
  if (!paddleInstancePromise) {
    paddleInstancePromise = PaddleOcr.create({
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
  const result = await MlkitOcr.recognizeText(asset.ocrUri);
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
