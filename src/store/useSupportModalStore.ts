import { create } from "zustand";

export type SupportModalSource = "auto" | "profile" | "settings" | "dev" | null;

type SupportModalStore = {
  isOpen: boolean;
  source: SupportModalSource;
  open: (source?: SupportModalSource) => void;
  close: () => void;
};

export const useSupportModalStore = create<SupportModalStore>((set) => ({
  isOpen: false,
  source: null,
  open: (source = null) => set({ isOpen: true, source }),
  close: () => set({ isOpen: false, source: null }),
}));
