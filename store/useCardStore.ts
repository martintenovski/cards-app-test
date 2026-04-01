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
  createCardFromForm,
  getContrastColor,
  initialSeedCards,
} from "@/types/card";
import { getCardExpiryDate } from "@/utils/expiry";
import { GRADIENTS } from "@/constants/gradients";
import type { ResolvedTheme, ThemePreference } from "@/utils/theme";
import type { LanguageCode } from "@/src/i18n/translations";

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
  homeFilter: HomeFilter;
  hasSeenOnboarding: boolean;
  themePreference: ThemePreference;
  appLockEnabled: boolean;
  hasCompletedAppLockSetup: boolean;
  hasPromptedForAppLock: boolean;
  expiryNotificationsEnabled: boolean;
  screenshotBlockingEnabled: boolean;
  lockScreenEnabled: boolean;
  language: LanguageCode;
  addCardSheetOpen: boolean;
  hasHydrated: boolean;
  lastModifiedAt: string;
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
  setLanguage: (language: LanguageCode) => void;
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
  /** Delete all cards that expired more than 7 days ago */
  purgeExpiredCards: () => void;
  resetCards: () => void;
}

export const useCardStore = create<CardStoreState>()(
  persist(
    (set) => ({
      cards: initialSeedCards,
      homeFilter: "everything",
      hasSeenOnboarding: false,
      themePreference: "system",
      appLockEnabled: false,
      hasCompletedAppLockSetup: false,
      hasPromptedForAppLock: false,
      expiryNotificationsEnabled: true,
      screenshotBlockingEnabled: false,
      lockScreenEnabled: true,
      language: "en",
      hasHydrated: false,
      lastModifiedAt: new Date().toISOString(),
      addCardSheetOpen: false,
      openAddCardSheet: () => set({ addCardSheetOpen: true }),
      closeAddCardSheet: () => set({ addCardSheetOpen: false }),
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
      setLockScreenEnabled: (lockScreenEnabled) => set({ lockScreenEnabled }),
      setLanguage: (language) => set({ language }),
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
      purgeExpiredCards: () =>
        set((state) => {
          const now = new Date();
          const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
          const surviving = state.cards.filter((c) => {
            const expiryDate = getCardExpiryDate(c);
            if (!expiryDate) return true;
            const msSinceExpiry = now.getTime() - expiryDate.getTime();
            return msSinceExpiry < SEVEN_DAYS_MS;
          });
          if (surviving.length === state.cards.length) return state;
          return { cards: surviving, lastModifiedAt: new Date().toISOString() };
        }),
      resetCards: () =>
        set((state) => ({
          cards: initialSeedCards,
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
        homeFilter: state.homeFilter,
        hasSeenOnboarding: state.hasSeenOnboarding,
        themePreference: state.themePreference,
        appLockEnabled: state.appLockEnabled,
        hasCompletedAppLockSetup: state.hasCompletedAppLockSetup,
        hasPromptedForAppLock: state.hasPromptedForAppLock,
        expiryNotificationsEnabled: state.expiryNotificationsEnabled,
        screenshotBlockingEnabled: state.screenshotBlockingEnabled,
        lockScreenEnabled: state.lockScreenEnabled,
        language: state.language,
        lastModifiedAt: state.lastModifiedAt,
      }),
    },
  ),
);
