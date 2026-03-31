import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from "react-native";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import {
  Gesture,
  GestureDetector,
  ScrollView as GHScrollView,
} from "react-native-gesture-handler";
import type { CustomerInfo, PurchasesPackage } from "react-native-purchases";

import {
  FormSheetScaffold,
  formSheetScaffoldStyles,
} from "@/components/FormSheetScaffold";
import { useCardStore } from "@/store/useCardStore";
import { APP_THEME, resolveTheme } from "@/utils/theme";
import { recordSupportModalDismissed } from "@/src/hooks/useAutoSupportModal";
import { useTranslation } from "@/src/hooks/useTranslation";
import {
  canPurchaseSupportProduct,
  canManageMonthlySubscription,
  getSupportLoadErrorMessage,
  getSupportPackages,
  getSupportProductPurchaseCount,
  normalizeProductId,
  openMonthlySubscriptionManagement,
  purchaseSupportPackage,
} from "@/src/services/purchases";

const { height } = Dimensions.get("window");
const SHEET_HEIGHT = height * 0.84;
const CLOSE_THRESHOLD = 100;
const SPRING_OPEN = {
  damping: 22,
  stiffness: 150,
  mass: 0.65,
  overshootClamping: true,
} as const;
const SPRING_CLOSE = {
  damping: 24,
  stiffness: 170,
  mass: 0.6,
  overshootClamping: true,
} as const;

type SupportModalProps = {
  customerInfo: CustomerInfo | null;
  visible: boolean;
  onClose: () => void;
  onPurchaseSuccess?: (customerInfo: CustomerInfo) => void;
};

function fallbackDescription(productIdentifier: string) {
  if (productIdentifier === "tip_coffee") {
    return "A small one-time tip to support continued updates.";
  }

  if (productIdentifier === "tip_pizza") {
    return "A bigger one-time contribution to keep the app moving.";
  }

  if (productIdentifier === "tip_star") {
    return "A generous one-time tip for the project.";
  }

  if (productIdentifier === "supporter_lifetime") {
    return "Unlock the supporter badge forever with a one-time purchase.";
  }

  if (productIdentifier === "supporter_monthly") {
    return "Support the app each month and keep the project sustainable.";
  }

  return "Support Pocket ID and help keep it improving.";
}

export function SupportModal({
  customerInfo,
  visible,
  onClose,
  onPurchaseSuccess,
}: SupportModalProps) {
  const storeName = Platform.OS === "android" ? "Google Play" : "App Store";
  const themePreference = useCardStore((state) => state.themePreference);
  const deviceScheme = useColorScheme();
  const resolvedTheme = resolveTheme(themePreference, deviceScheme);
  const colors = APP_THEME[resolvedTheme];
  const tr = useTranslation();
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [isMounted, setIsMounted] = useState(visible);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [thankYouMessage, setThankYouMessage] = useState<string | null>(null);
  const [purchasingIdentifier, setPurchasingIdentifier] = useState<
    string | null
  >(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const translateY = useSharedValue(SHEET_HEIGHT);
  const backdropOpacity = useSharedValue(0);
  const isScrollAtTop = useSharedValue(1);

  useEffect(() => {
    if (visible) {
      setIsMounted(true);
      translateY.value = withSpring(0, SPRING_OPEN);
      backdropOpacity.value = withSpring(0.55, SPRING_OPEN);
      return;
    }

    translateY.value = withSpring(SHEET_HEIGHT, SPRING_CLOSE);
    backdropOpacity.value = withSpring(0, SPRING_CLOSE, (done) => {
      if (done) {
        runOnJS(setIsMounted)(false);
      }
    });
  }, [backdropOpacity, translateY, visible]);

  useEffect(() => {
    if (!visible) {
      return;
    }

    let cancelled = false;
    setThankYouMessage(null);
    setErrorMessage(null);
    setIsLoading(true);

    getSupportPackages()
      .then((nextPackages) => {
        if (cancelled) {
          return;
        }

        if (!nextPackages.length) {
          setErrorMessage(
            Platform.OS === "android"
              ? "Support products are not available right now. Use a Google Play-enabled device or emulator, make sure the Play build was installed from the internal testing track with a tester account, and confirm the RevenueCat support offering is linked to active Play Console products."
              : "Support products are not available yet. Check your RevenueCat offering named support and try again.",
          );
          setPackages([]);
          return;
        }

        setPackages(nextPackages);
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }

        setErrorMessage(getSupportLoadErrorMessage(error));
        setPackages([]);
      })
      .finally(() => {
        if (cancelled) {
          return;
        }
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [visible]);

  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
      }
    };
  }, []);

  const handleDismiss = async () => {
    await recordSupportModalDismissed();
    setThankYouMessage(null);
    setPurchasingIdentifier(null);
    onClose();
  };

  const dismissWithAnimation = () => {
    translateY.value = withSpring(SHEET_HEIGHT, SPRING_CLOSE);
    backdropOpacity.value = withSpring(0, SPRING_CLOSE, (done) => {
      if (done) {
        runOnJS(handleDismiss)();
      }
    });
  };

  const handleManageSubscription = async () => {
    try {
      await openMonthlySubscriptionManagement(customerInfo);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : `Pocket ID could not open the ${storeName} subscription page right now.`,
      );
    }
  };

  const handlePurchase = async (aPackage: PurchasesPackage) => {
    const productId = normalizeProductId(aPackage.product.identifier);

    if (!canPurchaseSupportProduct(customerInfo, productId)) {
      setErrorMessage(
        productId === "supporter_lifetime"
          ? `This lifetime support unlock is already owned on this ${storeName} account.`
          : `This support option is already active on this ${storeName} account.`,
      );
      return;
    }

    try {
      setPurchasingIdentifier(productId);
      setErrorMessage(null);
      const customerInfo = await purchaseSupportPackage(aPackage);
      onPurchaseSuccess?.(customerInfo);
      setThankYouMessage(
        tr("support_modal_thank_you_body"),
      );
      closeTimeoutRef.current = setTimeout(() => {
        void handleDismiss();
      }, 2000);
    } catch (error) {
      const maybePurchaseError = error as { userCancelled?: boolean };
      if (maybePurchaseError.userCancelled) {
        return;
      }

      setErrorMessage(
        error instanceof Error
          ? error.message
          : tr("support_modal_purchase_error"),
      );
    } finally {
      setPurchasingIdentifier(null);
    }
  };

  const content = useMemo(() => {
    if (thankYouMessage) {
      return (
        <View style={styles.centerState}>
          <View
            style={[
              styles.centerIcon,
              { backgroundColor: colors.surfaceMuted },
            ]}
          >
            <Feather name="heart" size={26} color={colors.accent} />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>{tr("support_modal_thank_you")}</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            {thankYouMessage}
          </Text>
        </View>
      );
    }

    if (isLoading) {
      return (
        <View style={styles.centerState}>
          <ActivityIndicator size="small" color={colors.text} />
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            {tr("support_modal_loading")}
          </Text>
        </View>
      );
    }

    if (errorMessage) {
      return (
        <View style={styles.centerState}>
          <View
            style={[styles.centerIcon, { backgroundColor: colors.dangerSoft }]}
          >
            <Feather name="alert-circle" size={26} color={colors.danger} />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>
            {tr("support_modal_error_title")}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            {errorMessage}
          </Text>
        </View>
      );
    }

    return (
      <GHScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.packageList}
        scrollEventThrottle={16}
        onScroll={(e) => {
          isScrollAtTop.value = e.nativeEvent.contentOffset.y <= 4 ? 1 : 0;
        }}
      >
        {(() => {
          const monthlyPackage = packages.find(
            (candidate) => normalizeProductId(candidate.product.identifier) === "supporter_monthly",
          );
          const oneTimePackages = packages.filter(
            (candidate) => normalizeProductId(candidate.product.identifier) !== "supporter_monthly",
          );

          return (
            <>
              {monthlyPackage ? (
                <View style={styles.sectionWrap}>
                  <Text
                    style={[styles.sectionEyebrow, { color: colors.textSoft }]}
                  >
                    {tr("support_modal_monthly_section")}
                  </Text>
                  <LinearGradient
                    colors={["#4895FF", "#1A5FD9", "#0A3BAF"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.featuredCard}
                  >
                    <View style={styles.featuredCardTopRow}>
                      <View style={styles.featuredBadge}>
                        <Feather
                          name="heart"
                          size={13}
                          color="rgba(255,255,255,0.85)"
                        />
                        <Text style={styles.featuredBadgeText}>
                          {tr("support_modal_best_ongoing")}
                        </Text>
                      </View>
                      <View style={styles.featuredPill}>
                        <Text style={styles.featuredPillText}>{tr("support_modal_recurring")}</Text>
                      </View>
                    </View>

                    <Text style={styles.featuredTitle}>
                      {monthlyPackage.product.title}
                    </Text>
                    <Text style={styles.featuredBody}>
                      {monthlyPackage.product.description ||
                        fallbackDescription(normalizeProductId(monthlyPackage.product.identifier))}
                    </Text>

                    <View style={styles.featuredHighlights}>
                      <View style={styles.featuredHighlightRow}>
                        <Feather
                          name="zap"
                          size={15}
                          color="rgba(255,255,255,0.85)"
                        />
                        <Text style={styles.featuredHighlightText}>
                          {tr("support_modal_highlight_sustainable")}
                        </Text>
                      </View>
                      <View style={styles.featuredHighlightRow}>
                        <Feather
                          name="refresh-cw"
                          size={15}
                          color="rgba(255,255,255,0.85)"
                        />
                        <Text style={styles.featuredHighlightText}>
                          {tr("support_modal_highlight_manage")}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.featuredFooter}>
                      <View style={styles.featuredPriceWrap}>
                        <Text style={styles.featuredPrice}>
                          {monthlyPackage.product.priceString}
                        </Text>
                        <Text style={styles.featuredPriceCaption}>
                          {tr("support_modal_billed_by")} {storeName}
                        </Text>
                      </View>

                      {(() => {
                        const product = monthlyPackage.product;
                        const isPurchasing =
                          purchasingIdentifier === product.identifier;
                        const canPurchase = canPurchaseSupportProduct(
                          customerInfo,
                          product.identifier,
                        );
                        const buttonDisabled =
                          Boolean(purchasingIdentifier) || !canPurchase;
                        const buttonLabel = !canPurchase
                          ? tr("support_modal_active")
                          : isPurchasing
                            ? tr("support_modal_starting")
                            : tr("support_modal_start_monthly");

                        return (
                          <Pressable
                            accessibilityRole="button"
                            disabled={buttonDisabled}
                            onPress={() => void handlePurchase(monthlyPackage)}
                            style={[
                              styles.featuredButton,
                              !canPurchase && styles.featuredButtonDisabled,
                              purchasingIdentifier && !isPurchasing
                                ? styles.dimmedAction
                                : null,
                            ]}
                          >
                            <Text
                              style={[
                                styles.featuredButtonText,
                                !canPurchase &&
                                  styles.featuredButtonTextDisabled,
                              ]}
                            >
                              {buttonLabel}
                            </Text>
                          </Pressable>
                        );
                      })()}
                    </View>

                    {!canPurchaseSupportProduct(
                      customerInfo,
                      monthlyPackage.product.identifier,
                    ) && canManageMonthlySubscription(customerInfo) ? (
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => void handleManageSubscription()}
                        style={styles.featuredSecondaryButton}
                      >
                        <Text style={styles.featuredSecondaryButtonText}>
                          {tr("support_modal_manage_subscription")}
                        </Text>
                      </Pressable>
                    ) : null}
                  </LinearGradient>
                </View>
              ) : null}

              {oneTimePackages.length ? (
                <View style={styles.sectionWrap}>
                  <Text
                    style={[styles.sectionEyebrow, { color: colors.textSoft }]}
                  >
                    {tr("support_modal_onetime_section")}
                  </Text>
                  {oneTimePackages.map((aPackage) => {
                    const product = aPackage.product;
                    const normalizedId = normalizeProductId(product.identifier);
                    const packageDescription =
                      product.description ||
                      fallbackDescription(normalizedId);
                    const isPurchasing =
                      purchasingIdentifier === product.identifier;
                    const purchaseCount = getSupportProductPurchaseCount(
                      customerInfo,
                      normalizedId,
                    );
                    const shouldShowPurchaseCountBadge =
                      purchaseCount > 0 &&
                      normalizedId !== "supporter_lifetime";
                    const canPurchase = canPurchaseSupportProduct(
                      customerInfo,
                      normalizedId,
                    );
                    const buttonDisabled =
                      Boolean(purchasingIdentifier) || !canPurchase;
                    const buttonLabel = !canPurchase
                      ? normalizedId === "supporter_lifetime"
                        ? tr("support_modal_owned")
                        : tr("support_modal_added")
                      : isPurchasing
                        ? tr("support_modal_buying")
                        : normalizedId === "supporter_lifetime"
                          ? tr("support_modal_unlock_forever")
                          : tr("support_modal_buy");

                    return (
                      <View
                        key={product.identifier}
                        style={[
                          styles.packageCard,
                          {
                            backgroundColor: colors.surfaceMuted,
                            borderColor: colors.border,
                          },
                        ]}
                      >
                        <View style={styles.packageMetaRow}>
                          <View
                            style={[
                              styles.packageKindBadge,
                              {
                                backgroundColor: colors.surface,
                                borderColor: colors.border,
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.packageKindBadgeText,
                                { color: colors.textMuted },
                              ]}
                            >
                              {normalizedId === "supporter_lifetime"
                                ? tr("support_modal_badge_lifetime")
                                : tr("support_modal_badge_onetime")}
                            </Text>
                          </View>
                          {shouldShowPurchaseCountBadge ? (
                            <View
                              style={[
                                styles.purchaseCountBadge,
                                {
                                  backgroundColor: colors.surface,
                                  borderColor: colors.border,
                                },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.purchaseCountBadgeText,
                                  { color: colors.textMuted },
                                ]}
                              >
                                x{purchaseCount}
                              </Text>
                            </View>
                          ) : null}
                        </View>

                        <View style={styles.packageTextWrap}>
                          <View style={styles.packageTitleRow}>
                            <Text
                              style={[
                                styles.packageTitle,
                                { color: colors.text },
                              ]}
                            >
                              {product.title}
                            </Text>
                            <Text
                              style={[
                                styles.packagePrice,
                                { color: colors.text },
                              ]}
                            >
                              {product.priceString}
                            </Text>
                          </View>
                          <Text
                            style={[
                              styles.packageBody,
                              { color: colors.textMuted },
                            ]}
                          >
                            {packageDescription}
                          </Text>
                        </View>
                        <Pressable
                          accessibilityRole="button"
                          disabled={buttonDisabled}
                          onPress={() => void handlePurchase(aPackage)}
                          style={[
                            styles.buyButton,
                            {
                              backgroundColor: canPurchase
                                ? colors.accent
                                : colors.surface,
                              borderColor: canPurchase
                                ? colors.accent
                                : colors.buttonBorder,
                              borderWidth: 1,
                              opacity:
                                purchasingIdentifier && !isPurchasing
                                  ? 0.55
                                  : 1,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.buyButtonText,
                              {
                                color: canPurchase
                                  ? colors.accentText
                                  : colors.textMuted,
                              },
                            ]}
                          >
                            {buttonLabel}
                          </Text>
                        </Pressable>
                      </View>
                    );
                  })}
                </View>
              ) : null}
            </>
          );
        })()}
      </GHScrollView>
    );
  }, [
    colors,
    errorMessage,
    isLoading,
    isScrollAtTop,
    packages,
    purchasingIdentifier,
    thankYouMessage,
    customerInfo,
  ]);

  const dragGesture = Gesture.Pan()
    .activeOffsetY([12, 9999])
    .failOffsetX([-12, 12])
    .onUpdate((event) => {
      if (!isScrollAtTop.value || event.translationY <= 0) return;
      translateY.value = event.translationY;
      backdropOpacity.value = Math.max(
        0,
        0.55 - (event.translationY / SHEET_HEIGHT) * 0.55,
      );
    })
    .onEnd((event) => {
      if (!isScrollAtTop.value) {
        translateY.value = withSpring(0, SPRING_OPEN);
        backdropOpacity.value = withSpring(0.55, SPRING_OPEN);
        return;
      }
      if (event.translationY > CLOSE_THRESHOLD || event.velocityY > 800) {
        runOnJS(dismissWithAnimation)();
      } else {
        translateY.value = withSpring(0, SPRING_OPEN);
        backdropOpacity.value = withSpring(0.55, SPRING_OPEN);
      }
    });

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  if (!isMounted) {
    return null;
  }

  return (
    <Modal
      transparent
      visible={isMounted}
      animationType="none"
      statusBarTranslucent
      onRequestClose={dismissWithAnimation}
    >
      <View
        style={StyleSheet.absoluteFill}
        pointerEvents={visible ? "box-none" : "none"}
      >
        <Animated.View
          style={[StyleSheet.absoluteFill, styles.backdrop, backdropStyle]}
        >
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={dismissWithAnimation}
          />
        </Animated.View>

        <Animated.View
          style={[
            formSheetScaffoldStyles.positionedSheet,
            styles.sheet,
            { shadowColor: colors.shadow },
            sheetStyle,
          ]}
        >
          <GestureDetector gesture={dragGesture}>
            <View style={styles.sheetContent}>
              <FormSheetScaffold
                title={tr("support_modal_title")}
                backgroundColor={colors.surface}
                titleColor={colors.text}
                closeColor={colors.textMuted}
                handleColor={colors.textSoft}
                onClose={dismissWithAnimation}
              >
                {content}
              </FormSheetScaffold>
            </View>
          </GestureDetector>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: "#000",
  },
  sheet: {
    height: SHEET_HEIGHT,
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 18,
  },
  sheetContent: {
    flex: 1,
  },
  title: {
    fontFamily: "ReadexPro-Bold",
    fontSize: 24,
    lineHeight: 30,
  },
  subtitle: {
    fontFamily: "ReadexPro-Regular",
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  subheading: {
    fontFamily: "ReadexPro-Regular",
    fontSize: 14,
    lineHeight: 21,
    textAlign: "left",
    marginHorizontal: 20,
    marginTop: 4,
    marginBottom: 16,
  },
  centerState: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 36,
    gap: 12,
  },
  centerIcon: {
    width: 56,
    height: 56,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  packageList: {
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 48,
  },
  sectionWrap: {
    gap: 10,
  },
  sectionEyebrow: {
    fontFamily: "ReadexPro-Medium",
    fontSize: 12,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  featuredCard: {
    borderRadius: 28,
    padding: 18,
    gap: 14,
    overflow: "hidden",
  },
  featuredCardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  featuredBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.18)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  featuredBadgeText: {
    fontFamily: "ReadexPro-Bold",
    fontSize: 11,
    color: "#FFFFFF",
  },
  featuredPill: {
    backgroundColor: "rgba(255,255,255,0.18)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  featuredPillText: {
    fontFamily: "ReadexPro-Bold",
    fontSize: 11,
    color: "#FFFFFF",
  },
  featuredTitle: {
    fontFamily: "ReadexPro-Bold",
    fontSize: 24,
    lineHeight: 30,
    color: "#FFFFFF",
  },
  featuredBody: {
    fontFamily: "ReadexPro-Regular",
    fontSize: 14,
    lineHeight: 21,
    color: "rgba(255,255,255,0.80)",
  },
  featuredHighlights: {
    gap: 8,
  },
  featuredHighlightRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  featuredHighlightText: {
    flex: 1,
    fontFamily: "ReadexPro-Medium",
    fontSize: 13,
    lineHeight: 18,
    color: "rgba(255,255,255,0.85)",
  },
  featuredFooter: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 14,
  },
  featuredPriceWrap: {
    flex: 1,
    gap: 3,
  },
  featuredPrice: {
    fontFamily: "ReadexPro-Bold",
    fontSize: 27,
    lineHeight: 32,
    color: "#FFFFFF",
  },
  featuredPriceCaption: {
    fontFamily: "ReadexPro-Regular",
    fontSize: 12,
    color: "rgba(255,255,255,0.72)",
  },
  featuredButton: {
    minHeight: 52,
    borderRadius: 18,
    paddingHorizontal: 18,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  featuredButtonDisabled: {
    backgroundColor: "rgba(255,255,255,0.65)",
  },
  featuredButtonText: {
    fontFamily: "ReadexPro-Bold",
    fontSize: 15,
    color: "#0A3BAF",
  },
  featuredButtonTextDisabled: {
    color: "rgba(35,17,0,0.62)",
  },
  featuredSecondaryButton: {
    marginTop: 2,
    minHeight: 46,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.24)",
    borderWidth: 1,
    borderColor: "rgba(58,27,0,0.12)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  featuredSecondaryButtonText: {
    fontFamily: "ReadexPro-Bold",
    fontSize: 14,
    color: "#231100",
  },
  packageCard: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 16,
    gap: 16,
  },
  packageMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  packageTextWrap: {
    gap: 8,
  },
  packageKindBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  packageKindBadgeText: {
    fontFamily: "ReadexPro-Bold",
    fontSize: 11,
  },
  packageTitleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  packageTitle: {
    fontFamily: "ReadexPro-Bold",
    fontSize: 16,
    lineHeight: 22,
    flex: 1,
  },
  purchaseCountBadge: {
    minWidth: 34,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  purchaseCountBadgeText: {
    fontFamily: "ReadexPro-Bold",
    fontSize: 11,
  },
  packageBody: {
    fontFamily: "ReadexPro-Regular",
    fontSize: 13,
    lineHeight: 20,
  },
  packagePrice: {
    fontFamily: "ReadexPro-Bold",
    fontSize: 15,
  },
  buyButton: {
    borderRadius: 20,
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    marginTop: 12,
  },
  buyButtonText: {
    fontFamily: "ReadexPro-Medium",
    fontSize: 15,
    textAlign: "center",
    width: "100%",
  },
  secondaryAction: {
    marginTop: 8,
  },
  secondaryActionText: {
    textAlign: "center",
    width: "100%",
  },
  dimmedAction: {
    opacity: 0.55,
  },
});
