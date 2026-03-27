import { create } from "zustand";

type CloudVaultStoreState = {
  changeToken: number;
  syncRequestToken: number;
  suppressedAutoSyncCount: number;
  pendingSettingsSection: "cloud-sync" | null;
  syncStatus: "idle" | "syncing" | "success" | "error";
  syncMessage: string | null;
  bumpChangeToken: () => void;
  requestSync: (message?: string) => void;
  suppressNextAutoSync: () => void;
  consumeSuppressedAutoSync: () => void;
  openSettingsSection: (section: "cloud-sync") => void;
  clearPendingSettingsSection: () => void;
  setSyncState: (
    status: "idle" | "syncing" | "success" | "error",
    message?: string | null,
  ) => void;
};

export const useCloudVaultStore = create<CloudVaultStoreState>((set) => ({
  changeToken: 0,
  syncRequestToken: 0,
  pendingSettingsSection: null,
  syncStatus: "idle",
  syncMessage: null,
  bumpChangeToken: () =>
    set((state) => ({
      changeToken: state.changeToken + 1,
    })),
  requestSync: (message) =>
    set((state) => ({
      syncRequestToken: state.syncRequestToken + 1,
      syncStatus: "syncing",
      syncMessage: message ?? "Fetching your latest cards…",
    })),
  suppressedAutoSyncCount: 0,
  suppressNextAutoSync: () =>
    set((state) => ({
      suppressedAutoSyncCount: state.suppressedAutoSyncCount + 1,
    })),
  consumeSuppressedAutoSync: () =>
    set((state) => ({
      suppressedAutoSyncCount:
        state.suppressedAutoSyncCount > 0
          ? state.suppressedAutoSyncCount - 1
          : 0,
    })),
  openSettingsSection: (pendingSettingsSection) =>
    set({ pendingSettingsSection }),
  clearPendingSettingsSection: () => set({ pendingSettingsSection: null }),
  setSyncState: (syncStatus, syncMessage = null) =>
    set({ syncStatus, syncMessage }),
}));
