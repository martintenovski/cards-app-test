import { create } from "zustand";

type CloudVaultStoreState = {
  changeToken: number;
  syncRequestToken: number;
  pendingSettingsSection: "cloud-sync" | null;
  syncStatus: "idle" | "syncing" | "success" | "error";
  syncMessage: string | null;
  bumpChangeToken: () => void;
  requestSync: (message?: string) => void;
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
  openSettingsSection: (pendingSettingsSection) =>
    set({ pendingSettingsSection }),
  clearPendingSettingsSection: () => set({ pendingSettingsSection: null }),
  setSyncState: (syncStatus, syncMessage = null) =>
    set({ syncStatus, syncMessage }),
}));
