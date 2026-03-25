import { useEffect } from "react";

import { SupportModal } from "@/src/components/SupportModal";
import { useAutoSupportModal } from "@/src/hooks/useAutoSupportModal";
import {
  initializePurchases,
  refreshCustomerInfo,
  useCustomerInfo,
} from "@/src/services/purchases";
import { useSupportModalStore } from "@/src/store/useSupportModalStore";

export function SupportModalManager() {
  const isOpen = useSupportModalStore((state) => state.isOpen);
  const open = useSupportModalStore((state) => state.open);
  const close = useSupportModalStore((state) => state.close);
  const { customerInfo, isLoading } = useCustomerInfo();
  const { shouldAutoShow, consumeAutoShow } = useAutoSupportModal(
    customerInfo,
    isLoading,
  );

  useEffect(() => {
    initializePurchases();
  }, []);

  useEffect(() => {
    if (!shouldAutoShow || isOpen) {
      return;
    }

    open("auto");
    consumeAutoShow();
  }, [consumeAutoShow, isOpen, open, shouldAutoShow]);

  return (
    <SupportModal
      visible={isOpen}
      onClose={close}
      onPurchaseSuccess={() => {
        void refreshCustomerInfo();
      }}
    />
  );
}
