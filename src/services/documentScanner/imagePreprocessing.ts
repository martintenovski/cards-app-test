import { File } from "expo-file-system";
import {
  SaveFormat,
  manipulateAsync,
  type Action,
} from "expo-image-manipulator";
import { Image } from "react-native";

import type { DocumentScanAsset, ScanSide } from "@/types/documentScanner";

function getImageSize(uri: string) {
  return new Promise<{ width: number; height: number }>((resolve, reject) => {
    Image.getSize(uri, (width, height) => resolve({ width, height }), reject);
  });
}

function clampWidth(width: number) {
  if (width > 2200) {
    return 2200;
  }

  if (width > 1800) {
    return 1800;
  }

  return width;
}

function buildQualityHints(
  width: number,
  height: number,
  fileSize: number,
): string[] {
  const hints: string[] = [];

  if (Math.min(width, height) < 900) {
    hints.push("Document is smaller than recommended for OCR.");
  }

  if (fileSize > 0 && fileSize < 160_000) {
    hints.push("Captured image is heavily compressed.");
  }

  if (width / Math.max(height, 1) > 2.3 || height / Math.max(width, 1) > 2.3) {
    hints.push("Document framing looks narrow and may miss edge content.");
  }

  return hints;
}

export async function preprocessScannedImage(
  side: ScanSide,
  capturedUri: string,
): Promise<DocumentScanAsset> {
  const { width, height } = await getImageSize(capturedUri);
  const resizedWidth = clampWidth(width);
  const resizeActions: Action[] =
    resizedWidth !== width ? [{ resize: { width: resizedWidth } }] : [];

  const normalized = await manipulateAsync(capturedUri, resizeActions, {
    compress: 1,
    format: SaveFormat.JPEG,
  });

  const ocrWidth = Math.min(resizedWidth, 1700);
  const ocrActions: Action[] =
    ocrWidth !== resizedWidth ? [{ resize: { width: ocrWidth } }] : [];

  const ocrReady =
    ocrActions.length > 0
      ? await manipulateAsync(normalized.uri, ocrActions, {
          compress: 0.92,
          format: SaveFormat.JPEG,
        })
      : normalized;

  const fileInfo = new File(normalized.uri).info();
  const fileSize = typeof fileInfo.size === "number" ? fileInfo.size : 0;

  return {
    side,
    capturedUri,
    normalizedUri: normalized.uri,
    ocrUri: ocrReady.uri,
    width: normalized.width,
    height: normalized.height,
    fileSize,
    qualityHints: buildQualityHints(
      normalized.width,
      normalized.height,
      fileSize,
    ),
  };
}
