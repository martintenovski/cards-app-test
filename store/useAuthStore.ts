import { create } from "zustand";

export type AuthProfile = {
  id: string;
  email: string | null;
  displayName: string | null;
  provider: string | null;
};

type AuthStoreState = {
  user: AuthProfile | null;
  isReady: boolean;
  setUser: (user: AuthProfile | null) => void;
  setReady: (ready: boolean) => void;
};

export const useAuthStore = create<AuthStoreState>((set) => ({
  user: null,
  isReady: false,
  setUser: (user) => set({ user }),
  setReady: (isReady) => set({ isReady }),
}));
