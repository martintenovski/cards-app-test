import { useEffect, useState } from "react";
import { Platform } from "react-native";
import Purchases, {
  type CustomerInfo,
  type CustomerInfoUpdateListener,
  type PurchasesOffering,
  type PurchasesPackage,
} from "react-native-purchases";

export const SUPPORT_OFFERING_ID = "support";
export const SUPPORTER_ENTITLEMENT_ID = "supporter";
export const SUPPORTER_MONTHLY_PRODUCT_ID = "supporter_monthly";
export const SUPPORTER_LIFETIME_PRODUCT_ID = "supporter_lifetime";
export const TIP_PRODUCT_IDS = ["tip_coffee", "tip_pizza", "tip_star"] as const;
export type TipProductId = (typeof TIP_PRODUCT_IDS)[number];
export type SupporterStatus = "lifetime" | "monthly" | "tipper" | null;

const PRODUCT_ORDER = [
  "tip_coffee",
  "tip_pizza",
  "tip_star",
  SUPPORTER_LIFETIME_PRODUCT_ID,
  SUPPORTER_MONTHLY_PRODUCT_ID,
] as const;

const iosApiKey = process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY ?? "";
const androidApiKey = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY ?? "";

let hasAttemptedConfiguration = false;
let isConfigured = false;
let customerInfoCache: CustomerInfo | null = null;
let hasLoadedCustomerInfo = false;
let listenerRegistered = false;
const subscribers = new Set<(customerInfo: CustomerInfo | null) => void>();

function getApiKey() {
  if (Platform.OS === "ios") {
    return iosApiKey;
  }

  if (Platform.OS === "android") {
    return androidApiKey;
  }

  return "";
}

function broadcastCustomerInfo(customerInfo: CustomerInfo | null) {
  customerInfoCache = customerInfo;
  hasLoadedCustomerInfo = true;
  subscribers.forEach((listener) => listener(customerInfo));
}

export function initializePurchases() {
  if (Platform.OS === "web") {
    hasLoadedCustomerInfo = true;
    return false;
  }

  if (isConfigured) {
    return true;
  }

  if (hasAttemptedConfiguration) {
    return false;
  }

  hasAttemptedConfiguration = true;
  const apiKey = getApiKey();

  if (!apiKey) {
    console.warn(
      "RevenueCat is not configured. Set EXPO_PUBLIC_REVENUECAT_IOS_API_KEY and EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY.",
    );
    broadcastCustomerInfo(null);
    return false;
  }

  Purchases.configure({ apiKey });
  if (__DEV__) {
    void Purchases.setLogLevel(Purchases.LOG_LEVEL.DEBUG);
  }

  if (!listenerRegistered) {
    const listener: CustomerInfoUpdateListener = (nextCustomerInfo) => {
      broadcastCustomerInfo(nextCustomerInfo);
    };
    Purchases.addCustomerInfoUpdateListener(listener);
    listenerRegistered = true;
  }

  isConfigured = true;
  void refreshCustomerInfo();
  return true;
}

export async function refreshCustomerInfo() {
  if (!isConfigured) {
    return customerInfoCache;
  }

  try {
    const nextCustomerInfo = await Purchases.getCustomerInfo();
    broadcastCustomerInfo(nextCustomerInfo);
    return nextCustomerInfo;
  } catch {
    hasLoadedCustomerInfo = true;
    return customerInfoCache;
  }
}

export async function getSupportOffering(): Promise<PurchasesOffering | null> {
  const configured = initializePurchases();
  if (!configured) {
    return null;
  }

  const offerings = await Purchases.getOfferings();
  return offerings.all[SUPPORT_OFFERING_ID] ?? offerings.current ?? null;
}

export async function getSupportPackages(): Promise<PurchasesPackage[]> {
  const offering = await getSupportOffering();
  if (!offering) {
    return [];
  }

  return [...offering.availablePackages]
    .filter((pkg) =>
      PRODUCT_ORDER.includes(
        pkg.product.identifier as (typeof PRODUCT_ORDER)[number],
      ),
    )
    .sort(
      (left, right) =>
        PRODUCT_ORDER.indexOf(
          left.product.identifier as (typeof PRODUCT_ORDER)[number],
        ) -
        PRODUCT_ORDER.indexOf(
          right.product.identifier as (typeof PRODUCT_ORDER)[number],
        ),
    );
}

export async function purchaseSupportPackage(aPackage: PurchasesPackage) {
  const result = await Purchases.purchasePackage(aPackage);
  broadcastCustomerInfo(result.customerInfo);
  return result.customerInfo;
}

export async function restoreSupportPurchases() {
  const restored = await Purchases.restorePurchases();
  broadcastCustomerInfo(restored);
  return restored;
}

function hasLifetimeSupport(customerInfo: CustomerInfo | null | undefined) {
  if (!customerInfo) {
    return false;
  }

  if (
    customerInfo.entitlements.all[SUPPORTER_ENTITLEMENT_ID]
      ?.productIdentifier === SUPPORTER_LIFETIME_PRODUCT_ID
  ) {
    return true;
  }

  return customerInfo.nonSubscriptionTransactions.some(
    (transaction) =>
      transaction.productIdentifier === SUPPORTER_LIFETIME_PRODUCT_ID,
  );
}

export function getSupporterStatus(
  customerInfo: CustomerInfo | null | undefined,
): SupporterStatus {
  if (!customerInfo) {
    return null;
  }

  const hasMonthlySubscription =
    customerInfo.activeSubscriptions.includes(SUPPORTER_MONTHLY_PRODUCT_ID) ||
    customerInfo.entitlements.active[SUPPORTER_ENTITLEMENT_ID]
      ?.productIdentifier === SUPPORTER_MONTHLY_PRODUCT_ID;

  if (hasMonthlySubscription) {
    return "monthly";
  }

  if (hasLifetimeSupport(customerInfo)) {
    return "lifetime";
  }

  const hasTipHistory = customerInfo.nonSubscriptionTransactions.some(
    (transaction) =>
      TIP_PRODUCT_IDS.includes(transaction.productIdentifier as TipProductId),
  );

  return hasTipHistory ? "tipper" : null;
}

export function isSupporterActive(
  customerInfo: CustomerInfo | null | undefined,
) {
  if (!customerInfo) {
    return false;
  }

  const hasAnyActiveEntitlement =
    Object.keys(customerInfo.entitlements.active).length > 0;

  return hasAnyActiveEntitlement || hasLifetimeSupport(customerInfo);
}

export function getSupporterSummary(
  customerInfo: CustomerInfo | null | undefined,
) {
  const status = getSupporterStatus(customerInfo);
  const active = isSupporterActive(customerInfo);
  const totalTipsCount = customerInfo
    ? customerInfo.nonSubscriptionTransactions.filter((transaction) =>
        TIP_PRODUCT_IDS.includes(transaction.productIdentifier as TipProductId),
      ).length
    : 0;

  const supportDates = customerInfo
    ? [
        customerInfo.allPurchaseDates[SUPPORTER_MONTHLY_PRODUCT_ID],
        customerInfo.allPurchaseDates[SUPPORTER_LIFETIME_PRODUCT_ID],
        ...customerInfo.nonSubscriptionTransactions
          .filter((transaction) =>
            TIP_PRODUCT_IDS.includes(
              transaction.productIdentifier as TipProductId,
            ),
          )
          .map((transaction) => transaction.purchaseDate),
      ].filter((value): value is string => Boolean(value))
    : [];

  const sortedSupportDates = [...supportDates].sort(
    (left, right) => new Date(right).getTime() - new Date(left).getTime(),
  );

  const monthlySubscriptionInfo =
    customerInfo?.subscriptionsByProductIdentifier[
      SUPPORTER_MONTHLY_PRODUCT_ID
    ];

  return {
    active,
    status,
    totalTipsCount,
    lastPaymentDate:
      sortedSupportDates[0] ?? customerInfo?.latestExpirationDate ?? null,
    nextRenewalDate:
      status === "monthly"
        ? (monthlySubscriptionInfo?.expiresDate ?? null)
        : null,
  };
}

export function getSupporterLabel(status: SupporterStatus) {
  if (status === "lifetime") {
    return "❤️ Lifetime Supporter";
  }

  if (status === "monthly") {
    return "🌙 Monthly Supporter";
  }

  if (status === "tipper") {
    return "☕ Coffee Supporter";
  }

  return "Not a supporter yet";
}

export function subscribeToCustomerInfo(
  listener: (customerInfo: CustomerInfo | null) => void,
) {
  subscribers.add(listener);
  return () => {
    subscribers.delete(listener);
  };
}

export function useCustomerInfo() {
  const [customerInfo, setCustomerInfo] = useState(customerInfoCache);
  const [isLoading, setIsLoading] = useState(!hasLoadedCustomerInfo);

  useEffect(() => {
    const unsubscribe = subscribeToCustomerInfo((nextCustomerInfo) => {
      setCustomerInfo(nextCustomerInfo);
      setIsLoading(false);
    });

    if (!hasLoadedCustomerInfo) {
      const configured = initializePurchases();
      if (!configured) {
        setIsLoading(false);
      } else {
        void refreshCustomerInfo().finally(() => {
          setIsLoading(false);
        });
      }
    }

    return unsubscribe;
  }, []);

  return {
    customerInfo,
    isLoading,
    refreshCustomerInfo,
  };
}
