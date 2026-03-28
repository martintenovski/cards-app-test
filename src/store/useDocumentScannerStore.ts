import { create } from "zustand";

import type {
  DocumentScanDraft,
  StoredDocumentScanRecord,
} from "@/types/documentScanner";

type DocumentScannerStoreState = {
  pendingDraft: DocumentScanDraft | null;
  lastScanRecord: StoredDocumentScanRecord | null;
  setPendingDraft: (
    draft: DocumentScanDraft,
    lastScanRecord: StoredDocumentScanRecord,
  ) => void;
  clearPendingDraft: () => void;
};

export const useDocumentScannerStore = create<DocumentScannerStoreState>(
  (set) => ({
    pendingDraft: null,
    lastScanRecord: null,
    setPendingDraft: (pendingDraft, lastScanRecord) =>
      set({ pendingDraft, lastScanRecord }),
    clearPendingDraft: () => set({ pendingDraft: null }),
  }),
);
