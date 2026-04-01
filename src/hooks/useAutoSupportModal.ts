import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useRef, useState } from "react";

import { isSupporterActive } from "@/src/services/purchases";
import type { CustomerInfo } from "react-native-purchases";

export const SUPPORT_MODAL_LAST_SHOWN_KEY = "support_modal_last_shown";
export const SUPPORT_MODAL_SHOWN_COUNT_KEY = "support_modal_shown_count";

const AUTO_SHOW_DELAY_DAYS = 5;
const MAX_AUTO_SHOW_COUNT = 5;
const AUTO_SHOW_DELAY_MS = AUTO_SHOW_DELAY_DAYS * 24 * 60 * 60 * 1000;

export async function recordSupportModalDismissed() {
  await AsyncStorage.setItem(
    SUPPORT_MODAL_LAST_SHOWN_KEY,
    Date.now().toString(),
  );
}

export function useAutoSupportModal(
  customerInfo: CustomerInfo | null,
  isLoadingCustomerInfo: boolean,
) {
  const [shouldAutoShow, setShouldAutoShow] = useState(false);
  const hasCheckedRef = useRef(false);

  useEffect(() => {
    if (hasCheckedRef.current || isLoadingCustomerInfo) {
      return;
    }

    hasCheckedRef.current = true;

    async function decide() {
      if (isSupporterActive(customerInfo)) {
        return;
      }

      const [lastShownRaw, shownCountRaw] = await Promise.all([
        AsyncStorage.getItem(SUPPORT_MODAL_LAST_SHOWN_KEY),
        AsyncStorage.getItem(SUPPORT_MODAL_SHOWN_COUNT_KEY),
      ]);

      const lastShownAt = Number(lastShownRaw ?? 0);
      const shownCount = Number(shownCountRaw ?? 0);
      const now = Date.now();
      const shouldShow =
        shownCount < MAX_AUTO_SHOW_COUNT &&
        (!lastShownAt || now - lastShownAt >= AUTO_SHOW_DELAY_MS);

      if (!shouldShow) {
        return;
      }

      await AsyncStorage.multiSet([
        [SUPPORT_MODAL_LAST_SHOWN_KEY, now.toString()],
        [SUPPORT_MODAL_SHOWN_COUNT_KEY, (shownCount + 1).toString()],
      ]);
      setShouldAutoShow(true);
    }

    void decide().catch(() => {
      // Non-critical — suppress so auto-show logic never crashes the app.
    });
  }, [customerInfo, isLoadingCustomerInfo]);

  const consumeAutoShow = () => {
    setShouldAutoShow(false);
  };

  return {
    shouldAutoShow,
    consumeAutoShow,
  };
}
