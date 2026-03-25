import { SupportModal } from "@/src/components/SupportModal";
import { refreshCustomerInfo, useCustomerInfo } from "@/src/services/purchases";
import { useSupportModalStore } from "@/src/store/useSupportModalStore";

export function SupportModalManager() {
  const isOpen = useSupportModalStore((state) => state.isOpen);
  const close = useSupportModalStore((state) => state.close);
  const { customerInfo } = useCustomerInfo({ autoInitialize: isOpen });

  return (
    <SupportModal
      customerInfo={customerInfo}
      visible={isOpen}
      onClose={close}
      onPurchaseSuccess={() => {
        void refreshCustomerInfo();
      }}
    />
  );
}
