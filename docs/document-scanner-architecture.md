# Document Scanner Architecture

## Flow

1. `Settings > Developer Actions > Scan document` opens the orchestration route at `app/document-scanner.tsx`.
2. The route lets the user choose capture mode and whether to scan the back side.
3. `react-native-document-scanner-plugin` launches the native scanner UI for each requested side.
4. After each scan, the app shows a local confirmation step with retake support.
5. Once confirmed, the pipeline preprocesses images, runs OCR, classifies the document, extracts fields, and builds a `CardFormValues` draft.
6. The draft is written into `useDocumentScannerStore` and the existing add-card sheet opens already prefilled.

## Layers

- `app/document-scanner.tsx`: route-level orchestration and progress UX.
- `src/services/documentScanner/imagePreprocessing.ts`: normalizes and resizes scans for OCR.
- `src/services/documentScanner/ocrProviders.ts`: ML Kit primary OCR and Guten OCR fallback.
- `src/services/documentScanner/documentIntelligence.ts`: classification, field extraction, confidence scoring, and warning generation.
- `src/services/documentScanner/scanPipeline.ts`: end-to-end pipeline coordinator.
- `src/store/useDocumentScannerStore.ts`: transient draft handoff into the existing `AddCardSheet` flow.

## OCR Strategy

- Primary OCR: `rn-mlkit-ocr`
- Fallback OCR: `@gutenye/ocr-react-native`
- Selection rule: ML Kit runs first. The fallback runs when required fields are missing or the extracted result scores below the confidence threshold.

## Preprocessing

- Preserve the scanner plugin crop and perspective correction as the source of truth.
- Normalize to high-quality JPEG.
- Resize oversized images for faster OCR without losing legibility.
- Keep both the normalized image and OCR-optimized image URIs in the scan asset model.

## Error Handling

- Poor scan: triggered when critical identifiers are missing after OCR.
- Low light / compression hint: derived from small dimensions or heavily compressed output.
- Unreadable text: triggered when holder name or key identity fields remain empty.
- Missing back side: informational warning when the user skips optional back capture.
- Fallback used: informational warning to explain why Paddle-style OCR was selected.

## Data Model Notes

- Raw images are treated as transient capture assets.
- Prefill state is kept in-memory only.
- `StoredDocumentScanRecord` is metadata-only and does not retain image URIs by default, which is the safer production default for sensitive documents.
