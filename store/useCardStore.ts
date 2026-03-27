import { Platform } from "react-native";
import { create } from "zustand";
import {
  createJSONStorage,
  persist,
  type StateStorage,
} from "zustand/middleware";

import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  type CardPalette,
  type CardFormValues,
  type HomeFilter,
  type WalletCard,
  type WalletViewMode,
  createCardFromForm,
  getContrastColor,
  initialSeedCards,
} from "@/types/card";
import { GRADIENTS } from "@/constants/gradients";
import type { ResolvedTheme, ThemePreference } from "@/utils/theme";

const storage: StateStorage =
  Platform.OS === "web"
    ? {
        getItem: (name) => Promise.resolve(localStorage.getItem(name)),
        setItem: (name, value) => {
          localStorage.setItem(name, value);
          return Promise.resolve();
        },
        removeItem: (name) => {
          localStorage.removeItem(name);
          return Promise.resolve();
        },
      }
    : {
        getItem: (name) => AsyncStorage.getItem(name),
        setItem: (name, value) => AsyncStorage.setItem(name, value),
        removeItem: (name) => AsyncStorage.removeItem(name),
      };

interface CardStoreState {
  cards: WalletCard[];
  viewMode: WalletViewMode;
  homeFilter: HomeFilter;
  hasSeenOnboarding: boolean;
  themePreference: ThemePreference;
  appLockEnabled: boolean;
  hasCompletedAppLockSetup: boolean;
  hasPromptedForAppLock: boolean;
  expiryNotificationsEnabled: boolean;
  screenshotBlockingEnabled: boolean;
  lockScreenEnabled: boolean;
  addCardSheetOpen: boolean;
  hasHydrated: boolean;
  lastModifiedAt: string;
  setViewMode: (viewMode: WalletViewMode) => void;
  toggleViewMode: () => void;
  setHomeFilter: (filter: HomeFilter) => void;
  setHasSeenOnboarding: (hasSeenOnboarding: boolean) => void;
  setThemePreference: (themePreference: ThemePreference) => void;
  toggleThemePreference: (resolvedTheme: ResolvedTheme) => void;
  setAppLockEnabled: (enabled: boolean) => void;
  setHasCompletedAppLockSetup: (hasCompleted: boolean) => void;
  setHasPromptedForAppLock: (hasPrompted: boolean) => void;
  setExpiryNotificationsEnabled: (enabled: boolean) => void;
  setScreenshotBlockingEnabled: (enabled: boolean) => void;
  setLockScreenEnabled: (enabled: boolean) => void;
  openAddCardSheet: () => void;
  closeAddCardSheet: () => void;
  addCard: (values: CardFormValues, palette: CardPalette) => void;
  prependCard: (card: WalletCard) => void;
  replaceCards: (cards: WalletCard[], lastModifiedAt?: string) => void;
  updateCard: (
    id: string,
    values: CardFormValues,
    palette: CardPalette,
  ) => void;
  deleteCard: (id: string) => void;
  /** Advance the stack: current top → end (swipe left) */
  cycleCardFwd: () => void;
  /** Go back in the stack: last card → front (swipe right) */
  cycleCardBwd: () => void;
  resetCards: () => void;
}

export const useCardStore = create<CardStoreState>()(
  persist(
    (set) => ({
      cards: initialSeedCards,
      viewMode: "list",
      homeFilter: "everything",
      hasSeenOnboarding: false,
      themePreference: "system",
      appLockEnabled: false,
      hasCompletedAppLockSetup: false,
      hasPromptedForAppLock: false,
      expiryNotificationsEnabled: true,
      screenshotBlockingEnabled: false,
      lockScreenEnabled: true,
      hasHydrated: false,
      lastModifiedAt: new Date().toISOString(),
      addCardSheetOpen: false,
      openAddCardSheet: () => set({ addCardSheetOpen: true }),
      closeAddCardSheet: () => set({ addCardSheetOpen: false }),
      setViewMode: (viewMode) => set({ viewMode }),
      toggleViewMode: () =>
        set((state) => ({
          viewMode: state.viewMode === "stack" ? "list" : "stack",
        })),
      setHomeFilter: (homeFilter) => set({ homeFilter }),
      setHasSeenOnboarding: (hasSeenOnboarding) => set({ hasSeenOnboarding }),
      setThemePreference: (themePreference) => set({ themePreference }),
      setAppLockEnabled: (appLockEnabled) =>
        set((state) => ({
          appLockEnabled,
          hasCompletedAppLockSetup: appLockEnabled
            ? state.hasCompletedAppLockSetup
            : false,
        })),
      setHasCompletedAppLockSetup: (hasCompletedAppLockSetup) =>
        set({ hasCompletedAppLockSetup }),
      setHasPromptedForAppLock: (hasPromptedForAppLock) =>
        set({ hasPromptedForAppLock }),
      setExpiryNotificationsEnabled: (expiryNotificationsEnabled) =>
        set({ expiryNotificationsEnabled }),
      setScreenshotBlockingEnabled: (screenshotBlockingEnabled) =>
        set({ screenshotBlockingEnabled }),
      setLockScreenEnabled: (lockScreenEnabled) =>
        set({ lockScreenEnabled }),
      toggleThemePreference: (resolvedTheme) =>
        set((state) => ({
          themePreference:
            state.themePreference === "system"
              ? resolvedTheme === "dark"
                ? "light"
                : "dark"
              : state.themePreference === "dark"
                ? "light"
                : "dark",
        })),
      addCard: (values, palette) =>
        set((state) => {
          // Guarantee every new card has a gradient, even if caller omitted one
          const ensuredPalette: CardPalette = palette.gradient
            ? palette
            : (() => {
                const gradient = GRADIENTS[
                  Math.floor(Math.random() * GRADIENTS.length)
                ] as [string, string];
                const primaryText = getContrastColor(gradient[0]);
                const mutedText =
                  primaryText === "#1D1D1D"
                    ? "rgba(29,29,29,0.65)"
                    : "rgba(255,255,255,0.65)";
                return { ...palette, gradient, primaryText, mutedText };
              })();
          return {
            cards: [createCardFromForm(values, ensuredPalette), ...state.cards],
            homeFilter: "everything",
            lastModifiedAt: new Date().toISOString(),
          };
        }),
      prependCard: (card) =>
        set((state) => ({
          cards: [card, ...state.cards],
          homeFilter: "everything",
          lastModifiedAt: new Date().toISOString(),
        })),
      replaceCards: (cards, lastModifiedAt) =>
        set({
          cards,
          homeFilter: "everything",
          lastModifiedAt: lastModifiedAt ?? new Date().toISOString(),
        }),
      updateCard: (id, values, palette) =>
        set((state) => ({
          cards: state.cards.map((c) => {
            if (c.id !== id) return c;
            return { ...createCardFromForm(values, palette), id };
          }),
          lastModifiedAt: new Date().toISOString(),
        })),
      deleteCard: (id) =>
        set((state) => ({
          cards: state.cards.filter((c) => c.id !== id),
          lastModifiedAt: new Date().toISOString(),
        })),
      cycleCardFwd: () =>
        set((state) => {
          if (state.cards.length <= 1) return state;
          const [first, ...rest] = state.cards;
          return { cards: [...rest, first] };
        }),
      cycleCardBwd: () =>
        set((state) => {
          if (state.cards.length <= 1) return state;
          const last = state.cards[state.cards.length - 1];
          const rest = state.cards.slice(0, -1);
          return { cards: [last, ...rest] };
        }),
      resetCards: () =>
        set((state) => ({
          cards: initialSeedCards,
          viewMode: "list",
          homeFilter: "everything",
          hasSeenOnboarding: state.hasSeenOnboarding,
          themePreference: "system",
          appLockEnabled: state.appLockEnabled,
          hasCompletedAppLockSetup: state.hasCompletedAppLockSetup,
          hasPromptedForAppLock: state.hasPromptedForAppLock,
          expiryNotificationsEnabled: true,
          lastModifiedAt: new Date().toISOString(),
        })),
    }),
    {
      name: "cards-app-wallet-store-v3",
      storage: createJSONStorage(() => storage),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        const needsPatch = state.cards.some((c) => !c.palette?.gradient);
        if (needsPatch) {
          const patched = state.cards.map((c) => {
            if (c.palette?.gradient) return c;
            const gradient = GRADIENTS[
              Math.floor(Math.random() * GRADIENTS.length)
            ] as [string, string];
            const primaryText = getContrastColor(gradient[0]);
            const mutedText =
              primaryText === "#1D1D1D"
                ? "rgba(29,29,29,0.65)"
                : "rgba(255,255,255,0.65)";
            return {
              ...c,
              palette: { ...c.palette, gradient, primaryText, mutedText },
            };
          });
          useCardStore.setState({ cards: patched, hasHydrated: true });
          return;
        }
        useCardStore.setState({ hasHydrated: true });
      },
      partialize: (state) => ({
        cards: state.cards,
        viewMode: state.viewMode,
        homeFilter: state.homeFilter,
        hasSeenOnboarding: state.hasSeenOnboarding,
        themePreference: state.themePreference,
        appLockEnabled: state.appLockEnabled,
        hasCompletedAppLockSetup: state.hasCompletedAppLockSetup,
        hasPromptedForAppLock: state.hasPromptedForAppLock,
        expiryNotificationsEnabled: state.expiryNotificationsEnabled,
        screenshotBlockingEnabled: state.screenshotBlockingEnabled,
        lastModifiedAt: state.lastModifiedAt,
      }),
    },
  ),
);
