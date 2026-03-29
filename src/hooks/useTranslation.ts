import { useCardStore } from "@/store/useCardStore";
import { t, type TranslationKeys } from "@/src/i18n/translations";

/**
 * Returns a bound `tr(key)` function that uses the current app language
 * from the card store. Re-renders automatically when the language changes.
 */
export function useTranslation(): (key: keyof TranslationKeys) => string {
  const language = useCardStore((state) => state.language);
  return (key: keyof TranslationKeys) => t(key, language);
}
