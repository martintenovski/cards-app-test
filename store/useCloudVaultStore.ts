import { create } from "zustand";

type CloudVaultStoreState = {
  changeToken: number;
  bumpChangeToken: () => void;
};

export const useCloudVaultStore = create<CloudVaultStoreState>((set) => ({
  changeToken: 0,
  bumpChangeToken: () =>
    set((state) => ({
      changeToken: state.changeToken + 1,
    })),
}));
