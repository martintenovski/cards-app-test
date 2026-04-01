import Constants from "expo-constants";
import { useEffect, useState } from "react";
import { Linking, Platform } from "react-native";
import Purchases, {
  PURCHASES_ERROR_CODE,
  type CustomerInfo,
  type CustomerInfoUpdateListener,
  type LogHandler,
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
export type SupportBadge = {
  key: string;
  label: string;
  variant: "highlight" | "neutral";
};

const PRODUCT_ORDER = [
  "tip_coffee",
  "tip_pizza",
  "tip_star",
  SUPPORTER_LIFETIME_PRODUCT_ID,
  SUPPORTER_MONTHLY_PRODUCT_ID,
] as const;
export const EXPECTED_SUPPORT_PRODUCT_IDS = [...PRODUCT_ORDER];

function getExpoExtraString(key: string) {
  const extra = Constants.expoConfig?.extra as
    | Record<string, unknown>
    | undefined;
  const value = extra?.[key];
  return typeof value === "string" ? value.trim() : "";
}

const iosApiKey =
  getExpoExtraString("EXPO_PUBLIC_REVENUECAT_IOS_API_KEY") ||
  process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY ||
  "";
const androidApiKey =
  getExpoExtraString("EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY") ||
  process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY ||
  "";

let hasAttemptedConfiguration = false;
let isConfigured = false;
let customerInfoCache: CustomerInfo | null = null;
let hasLoadedCustomerInfo = false;
let listenerRegistered = false;
let customLogHandlerInstalled = false;
let hasLoggedAndroidBillingUnavailable = false;
const subscribers = new Set<(customerInfo: CustomerInfo | null) => void>();

type PurchasesErrorLike = {
  code?: string;
  message?: string;
  underlyingErrorMessage?: string;
  userCancelled?: boolean | null;
  userInfo?: {
    readableErrorCode?: string;
  } | null;
};

type PurchasesErrorDetails = {
  code: string | null;
  readableErrorCode: string | null;
  message: string | null;
  underlyingErrorMessage: string | null;
  combinedMessage: string;
};

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

function getStoreName() {
  return Platform.OS === "android" ? "Google Play" : "App Store";
}

function getAppIdentifierLabel() {
  return Platform.OS === "android" ? "Package name" : "Bundle identifier";
}

function isPurchasesErrorLike(error: unknown): error is PurchasesErrorLike {
  return typeof error === "object" && error !== null;
}

function getPurchasesErrorDetails(error: unknown): PurchasesErrorDetails {
  if (!isPurchasesErrorLike(error)) {
    return {
      code: null,
      readableErrorCode: null,
      message: null,
      underlyingErrorMessage: null,
      combinedMessage: "",
    };
  }

  const message = typeof error.message === "string" ? error.message : null;
  const underlyingErrorMessage =
    typeof error.underlyingErrorMessage === "string"
      ? error.underlyingErrorMessage
      : null;

  return {
    code: typeof error.code === "string" ? error.code : null,
    readableErrorCode:
      typeof error.userInfo?.readableErrorCode === "string"
        ? error.userInfo.readableErrorCode
        : null,
    message,
    underlyingErrorMessage,
    combinedMessage: [message, underlyingErrorMessage]
      .filter((value): value is string => Boolean(value))
      .join("\n"),
  };
}

function isAndroidBillingUnavailableError(error: unknown) {
  if (Platform.OS !== "android" || !isPurchasesErrorLike(error)) {
    return false;
  }

  const { combinedMessage } = getPurchasesErrorDetails(error);

  return (
    error.code === PURCHASES_ERROR_CODE.PURCHASE_NOT_ALLOWED_ERROR &&
    /BILLING_UNAVAILABLE|billing(?: service)? unavailable|billing is not available/i.test(
      combinedMessage,
    )
  );
}

function getAndroidBillingUnavailableMessage() {
  return [
    "Google Play Billing is unavailable on this device right now.",
    "Use a physical Android device or a Google Play-enabled emulator, sign in to Google Play with a license tester or internal-test account, install the Play-distributed build, and confirm the app plus products are active in RevenueCat and Google Play Console.",
  ].join(" ");
}

function isLikelyNetworkError(error: unknown) {
  const { combinedMessage } = getPurchasesErrorDetails(error);
  return /network|timed?\s*out|unable to connect|could not connect|dns|internet/i.test(
    combinedMessage,
  );
}

function isLikelyRevenueCatConfigurationError(error: unknown) {
  const { combinedMessage } = getPurchasesErrorDetails(error);
  return /issue with your configuration|no products|none of the products|offerings?|product identifiers?|there is an issue/i.test(
    combinedMessage,
  );
}

function getBundleIdentifier() {
  if (Platform.OS === "ios") {
    return (
      Constants.expoConfig?.ios?.bundleIdentifier ?? "com.tenovski.cardsapp"
    );
  }

  if (Platform.OS === "android") {
    return Constants.expoConfig?.android?.package ?? "com.tenovski.cardsapp";
  }

  return "unknown";
}

function logRevenueCatConfigurationHints(error?: unknown) {
  const productIds = PRODUCT_ORDER.join(", ");
  const messageLines = [
    "[RevenueCat] Support products could not be loaded.",
    `${getAppIdentifierLabel()}: ${getBundleIdentifier()}`,
    `Offering identifier: ${SUPPORT_OFFERING_ID}`,
    `Expected product identifiers: ${productIds}`,
  ];

  if (Platform.OS === "android") {
    if (isAndroidBillingUnavailableError(error)) {
      messageLines.push(getAndroidBillingUnavailableMessage());
    } else {
      messageLines.push(
        "This Android build fetches live Google Play products, not a local StoreKit configuration.",
        "Verify the same product identifiers exist in Google Play Console, are attached in the RevenueCat support offering, and that the Play Console app, testers, and billing setup are all ready.",
      );
    }
  } else {
    messageLines.push(
      "This build is configured to fetch live App Store Connect sandbox products, not a local Xcode StoreKit configuration.",
      "Ad hoc / EAS internal builds and Xcode runs without a StoreKit config must fetch real sandbox products from App Store Connect.",
      "Verify the same product identifiers exist in App Store Connect, are attached in the RevenueCat support offering, and that Apple agreements, tax, and banking are complete.",
    );
  }

  const message = messageLines.join("\n");

  console.warn(message);

  if (error) {
    const {
      code,
      message: errorMessage,
      underlyingErrorMessage,
    } = getPurchasesErrorDetails(error);

    console.warn(
      `[RevenueCat] Underlying offerings error${code ? ` (${code})` : ""}: ${
        errorMessage ?? "Unknown error"
      }`,
    );

    if (underlyingErrorMessage) {
      console.warn(
        `[RevenueCat] Underlying store error: ${underlyingErrorMessage}`,
      );
    }
  }
}

export function getSupportLoadErrorMessage(error: unknown) {
  const { code, readableErrorCode, message, underlyingErrorMessage } =
    getPurchasesErrorDetails(error);
  const debugSuffix = [
    readableErrorCode ? `RevenueCat code: ${readableErrorCode}` : null,
    code ? `SDK code: ${code}` : null,
    message ? `Message: ${message}` : null,
    underlyingErrorMessage ? `Store detail: ${underlyingErrorMessage}` : null,
  ]
    .filter((value): value is string => Boolean(value))
    .join("\n");

  if (Platform.OS === "android") {
    if (isAndroidBillingUnavailableError(error)) {
      return [getAndroidBillingUnavailableMessage(), debugSuffix]
        .filter(Boolean)
        .join("\n\n");
    }

    if (code === PURCHASES_ERROR_CODE.CONFIGURATION_ERROR) {
      return [
        `Pocket ID reached RevenueCat, but the support offering is not ready for Google Play package ${getBundleIdentifier()}. Confirm the offering identifier is \"${SUPPORT_OFFERING_ID}\", that it contains the exact product IDs ${PRODUCT_ORDER.join(
          ", ",
        )}, and that those Play Console products are active.`,
        debugSuffix,
      ]
        .filter(Boolean)
        .join("\n\n");
    }

    if (code === PURCHASES_ERROR_CODE.INVALID_CREDENTIALS_ERROR) {
      return [
        "RevenueCat rejected the Android public SDK key in this build. In RevenueCat, open the Google Play app for Pocket ID and copy its Public SDK key (it should start with goog_). Make sure this build is not using an iOS key, a secret API key, or a key from another RevenueCat app/project.",
        `If you are building locally, verify the Mac build is reading the intended EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY value and that .env.local is overriding .env. Rebuild after updating the key.`,
        debugSuffix,
      ]
        .filter(Boolean)
        .join("\n\n");
    }

    if (
      code === PURCHASES_ERROR_CODE.PRODUCT_NOT_AVAILABLE_FOR_PURCHASE_ERROR
    ) {
      return [
        `Google Play found the app, but one or more support products are not available for package ${getBundleIdentifier()}. This usually means the tester account does not have access yet, the products are still inactive, or the Play Console / RevenueCat product IDs do not match exactly.`,
        debugSuffix,
      ]
        .filter(Boolean)
        .join("\n\n");
    }

    if (
      code === PURCHASES_ERROR_CODE.NETWORK_ERROR ||
      code === PURCHASES_ERROR_CODE.OFFLINE_CONNECTION_ERROR ||
      code === PURCHASES_ERROR_CODE.PRODUCT_REQUEST_TIMED_OUT_ERROR
    ) {
      return [
        "Pocket ID could not reach RevenueCat or Google Play right now. Check the device connection, open Google Play once to confirm the tester account is signed in, and try again.",
        debugSuffix,
      ]
        .filter(Boolean)
        .join("\n\n");
    }

    if (code === PURCHASES_ERROR_CODE.STORE_PROBLEM_ERROR) {
      return [
        `Google Play reported a store problem while loading support options for package ${getBundleIdentifier()}. This is often caused by testing on an emulator without full Play billing support or by a Play account/tester mismatch.`,
        debugSuffix,
      ]
        .filter(Boolean)
        .join("\n\n");
    }

    if (isLikelyRevenueCatConfigurationError(error)) {
      return [
        `Pocket ID reached RevenueCat, but the support offering is not ready for Google Play package ${getBundleIdentifier()}. Confirm the support offering contains the live product IDs ${PRODUCT_ORDER.join(
          ", ",
        )}, that those products are active in Play Console, and that this build was installed from the Play internal track using a tester account.`,
        debugSuffix,
      ]
        .filter(Boolean)
        .join("\n\n");
    }

    if (isLikelyNetworkError(error)) {
      return [
        "Pocket ID could not reach RevenueCat or Google Play right now. Check the device connection, open Google Play once to confirm the tester account is signed in, and try again.",
        debugSuffix,
      ]
        .filter(Boolean)
        .join("\n\n");
    }

    return [
      `Pocket ID could not load Google Play support options for package ${getBundleIdentifier()} right now. Make sure this Play build is installed from the internal testing track on a Google Play-enabled device, and that the RevenueCat offering is linked to active Play Console products.`,
      debugSuffix,
    ]
      .filter(Boolean)
      .join("\n\n");
  }

  if (isLikelyNetworkError(error)) {
    return [
      "Pocket ID could not reach the App Store or RevenueCat right now. Check the device connection and try again.",
      debugSuffix,
    ]
      .filter(Boolean)
      .join("\n\n");
  }

  if (isLikelyRevenueCatConfigurationError(error)) {
    return [
      `Pocket ID reached RevenueCat, but the support offering is not ready for bundle identifier ${getBundleIdentifier()}. Confirm the support offering contains the expected live product IDs ${PRODUCT_ORDER.join(
        ", ",
      )}.`,
      debugSuffix,
    ]
      .filter(Boolean)
      .join("\n\n");
  }

  return [
    "Pocket ID could not load support options right now. Please try again in a moment.",
    debugSuffix,
  ]
    .filter(Boolean)
    .join("\n\n");
}

/**
 * On Android, RevenueCat returns subscription identifiers as
 * `productId:basePlanId` (e.g. `supporter_monthly:monthly`). Strip the
 * base-plan suffix so comparisons against our canonical product IDs work
 * on both platforms.
 */
export function normalizeProductId(identifier: string) {
  if (Platform.OS !== "android") {
    return identifier;
  }
  const colonIndex = identifier.indexOf(":");
  return colonIndex === -1 ? identifier : identifier.slice(0, colonIndex);
}

function logSupportPackageStatus(offering: PurchasesOffering) {
  if (!__DEV__) return;

  const availableProductIds = offering.availablePackages.map((pkg) =>
    normalizeProductId(pkg.product.identifier),
  );
  const missingProductIds = PRODUCT_ORDER.filter(
    (productId) => !availableProductIds.includes(productId),
  );

  console.log(
    `[RevenueCat] Support offering returned ${availableProductIds.length} package(s): ${availableProductIds.join(
      ", ",
    )}`,
  );

  if (missingProductIds.length > 0) {
    console.warn(
      `[RevenueCat] Support offering is currently missing expected products: ${missingProductIds.join(
        ", ",
      )}`,
    );
  }
}

function installRevenueCatLogHandler() {
  if (customLogHandlerInstalled) {
    return;
  }

  const logHandler: LogHandler = (level, message) => {
    const formattedMessage = `[RevenueCat] ${message}`;
    const isCancelledPurchaseLog =
      level === Purchases.LOG_LEVEL.ERROR &&
      message.includes("Purchase was cancelled.");
    const isAndroidBillingUnavailableLog =
      Platform.OS === "android" &&
      level === Purchases.LOG_LEVEL.ERROR &&
      /BILLING_UNAVAILABLE|billing(?: service)? unavailable|billing is not available|device or user is not allowed to make the purchase/i.test(
        message,
      );

    if (isCancelledPurchaseLog) {
      console.info(formattedMessage);
      return;
    }

    if (isAndroidBillingUnavailableLog) {
      if (!hasLoggedAndroidBillingUnavailable) {
        hasLoggedAndroidBillingUnavailable = true;
        console.warn(`[RevenueCat] ${getAndroidBillingUnavailableMessage()}`);
      }
      return;
    }

    switch (level) {
      case Purchases.LOG_LEVEL.DEBUG:
        console.debug(formattedMessage);
        break;
      case Purchases.LOG_LEVEL.INFO:
        console.info(formattedMessage);
        break;
      case Purchases.LOG_LEVEL.WARN:
        console.warn(formattedMessage);
        break;
      case Purchases.LOG_LEVEL.ERROR:
        console.error(formattedMessage);
        break;
      default:
        console.log(formattedMessage);
    }
  };

  Purchases.setLogHandler(logHandler);
  customLogHandlerInstalled = true;
}

function hasPurchasedProduct(
  customerInfo: CustomerInfo | null | undefined,
  productId: string,
) {
  if (!customerInfo) {
    return false;
  }

  if (customerInfo.allPurchasedProductIdentifiers.includes(productId)) {
    return true;
  }

  if (customerInfo.allPurchaseDates[productId]) {
    return true;
  }

  return customerInfo.nonSubscriptionTransactions.some(
    (transaction) => transaction.productIdentifier === productId,
  );
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

  installRevenueCatLogHandler();
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

  try {
    const offerings = await Purchases.getOfferings();
    const offering =
      offerings.all[SUPPORT_OFFERING_ID] ?? offerings.current ?? null;

    if (!offering || offering.availablePackages.length === 0) {
      logRevenueCatConfigurationHints();
    } else {
      logSupportPackageStatus(offering);
    }

    return offering;
  } catch (error) {
    logRevenueCatConfigurationHints(error);

    if (isAndroidBillingUnavailableError(error)) {
      return null;
    }

    throw error;
  }
}

export async function getSupportPackages(): Promise<PurchasesPackage[]> {
  const offering = await getSupportOffering();
  if (!offering) {
    return [];
  }

  return [...offering.availablePackages]
    .filter((pkg) =>
      PRODUCT_ORDER.includes(
        normalizeProductId(
          pkg.product.identifier,
        ) as (typeof PRODUCT_ORDER)[number],
      ),
    )
    .sort(
      (left, right) =>
        PRODUCT_ORDER.indexOf(
          normalizeProductId(
            left.product.identifier,
          ) as (typeof PRODUCT_ORDER)[number],
        ) -
        PRODUCT_ORDER.indexOf(
          normalizeProductId(
            right.product.identifier,
          ) as (typeof PRODUCT_ORDER)[number],
        ),
    );
}

export async function purchaseSupportPackage(aPackage: PurchasesPackage) {
  try {
    const result = await Purchases.purchasePackage(aPackage);
    broadcastCustomerInfo(result.customerInfo);
    return result.customerInfo;
  } catch (error) {
    if (isAndroidBillingUnavailableError(error)) {
      throw new Error(getAndroidBillingUnavailableMessage());
    }

    throw error;
  }
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
    customerInfo.entitlements.active[SUPPORTER_ENTITLEMENT_ID]
      ?.productIdentifier === SUPPORTER_LIFETIME_PRODUCT_ID
  ) {
    return true;
  }

  if (
    customerInfo.entitlements.all[SUPPORTER_ENTITLEMENT_ID]
      ?.productIdentifier === SUPPORTER_LIFETIME_PRODUCT_ID
  ) {
    return true;
  }

  return hasPurchasedProduct(customerInfo, SUPPORTER_LIFETIME_PRODUCT_ID);
}

function hasMonthlySupport(customerInfo: CustomerInfo | null | undefined) {
  if (!customerInfo) {
    return false;
  }

  return (
    customerInfo.activeSubscriptions.includes(SUPPORTER_MONTHLY_PRODUCT_ID) ||
    customerInfo.entitlements.active[SUPPORTER_ENTITLEMENT_ID]
      ?.productIdentifier === SUPPORTER_MONTHLY_PRODUCT_ID
  );
}

export function getSupporterStatus(
  customerInfo: CustomerInfo | null | undefined,
): SupporterStatus {
  if (!customerInfo) {
    return null;
  }

  const hasMonthlySubscription = hasMonthlySupport(customerInfo);

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
    managementURL: customerInfo?.managementURL ?? null,
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

function pluralize(count: number, singular: string, plural: string) {
  return count === 1 ? singular : plural;
}

export function getSupportProductPurchaseCount(
  customerInfo: CustomerInfo | null | undefined,
  productId: string,
) {
  if (!customerInfo) {
    return 0;
  }

  return customerInfo.nonSubscriptionTransactions.filter(
    (transaction) => transaction.productIdentifier === productId,
  ).length;
}

export function getSupportBadges(
  customerInfo: CustomerInfo | null | undefined,
): SupportBadge[] {
  if (!customerInfo) {
    return [];
  }

  const badges: SupportBadge[] = [];
  const hasLifetime = hasLifetimeSupport(customerInfo);
  const hasMonthly = hasMonthlySupport(customerInfo);

  if (hasLifetime) {
    badges.push({
      key: "lifetime",
      label: "❤️ Lifetime Supporter",
      variant: "highlight",
    });
  }

  if (hasMonthly) {
    badges.push({
      key: "monthly",
      label: "🌙 Monthly Supporter",
      variant: "highlight",
    });
  }

  const tipCounts = TIP_PRODUCT_IDS.reduce<Record<TipProductId, number>>(
    (counts, productId) => {
      counts[productId] = customerInfo.nonSubscriptionTransactions.filter(
        (transaction) => transaction.productIdentifier === productId,
      ).length;
      return counts;
    },
    {
      tip_coffee: 0,
      tip_pizza: 0,
      tip_star: 0,
    },
  );

  if (tipCounts.tip_coffee > 0) {
    badges.push({
      key: "tip_coffee",
      label:
        tipCounts.tip_coffee === 1
          ? "☕ You bought a coffee"
          : `☕ Bought ${tipCounts.tip_coffee} ${pluralize(
              tipCounts.tip_coffee,
              "coffee",
              "coffees",
            )}`,
      variant: "neutral",
    });
  }

  if (tipCounts.tip_pizza > 0) {
    badges.push({
      key: "tip_pizza",
      label:
        tipCounts.tip_pizza === 1
          ? "🍕 You bought a pizza"
          : `🍕 Bought ${tipCounts.tip_pizza} pizzas`,
      variant: "neutral",
    });
  }

  if (tipCounts.tip_star > 0) {
    badges.push({
      key: "tip_star",
      label:
        tipCounts.tip_star === 1
          ? "⭐ 1 Star Cosmic Commander"
          : `⭐ ${tipCounts.tip_star} Star Cosmic Commander`,
      variant: "neutral",
    });
  }

  return badges;
}

export function canManageMonthlySubscription(
  customerInfo: CustomerInfo | null | undefined,
) {
  return Boolean(
    customerInfo?.managementURL &&
    (customerInfo.activeSubscriptions.includes(SUPPORTER_MONTHLY_PRODUCT_ID) ||
      customerInfo.entitlements.active[SUPPORTER_ENTITLEMENT_ID]
        ?.productIdentifier === SUPPORTER_MONTHLY_PRODUCT_ID),
  );
}

export async function openMonthlySubscriptionManagement(
  customerInfo: CustomerInfo | null | undefined,
) {
  const managementURL = customerInfo?.managementURL;
  const storeName = getStoreName();

  if (!managementURL) {
    throw new Error(
      `Pocket ID could not find a ${storeName} subscription management link for this account.`,
    );
  }

  const canOpen = await Linking.canOpenURL(managementURL);
  if (!canOpen) {
    throw new Error(
      `Pocket ID could not open the ${storeName} subscription management page.`,
    );
  }

  await Linking.openURL(managementURL);
}

export function canPurchaseSupportProduct(
  customerInfo: CustomerInfo | null | undefined,
  productId: string,
) {
  if (productId === SUPPORTER_LIFETIME_PRODUCT_ID) {
    return !hasLifetimeSupport(customerInfo);
  }

  if (productId === SUPPORTER_MONTHLY_PRODUCT_ID) {
    return !hasMonthlySupport(customerInfo);
  }

  return true;
}

export function subscribeToCustomerInfo(
  listener: (customerInfo: CustomerInfo | null) => void,
) {
  subscribers.add(listener);
  return () => {
    subscribers.delete(listener);
  };
}

export function useCustomerInfo(options?: { autoInitialize?: boolean }) {
  const autoInitialize = options?.autoInitialize ?? true;
  const [customerInfo, setCustomerInfo] = useState(customerInfoCache);
  const [isLoading, setIsLoading] = useState(
    autoInitialize && !hasLoadedCustomerInfo,
  );

  useEffect(() => {
    const unsubscribe = subscribeToCustomerInfo((nextCustomerInfo) => {
      setCustomerInfo(nextCustomerInfo);
      setIsLoading(false);
    });

    if (!autoInitialize) {
      setIsLoading(false);
      return unsubscribe;
    }

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
  }, [autoInitialize]);

  return {
    customerInfo,
    isLoading,
    refreshCustomerInfo,
  };
}
