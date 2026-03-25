import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
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
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import type { CustomerInfo, PurchasesPackage } from "react-native-purchases";

import {
  FormSheetScaffold,
  formSheetScaffoldStyles,
} from "@/components/FormSheetScaffold";
import { useCardStore } from "@/store/useCardStore";
import { APP_THEME, resolveTheme } from "@/utils/theme";
import { recordSupportModalDismissed } from "@/src/hooks/useAutoSupportModal";
import {
  canPurchaseSupportProduct,
  canManageMonthlySubscription,
  getSupportPackages,
  getSupportProductPurchaseCount,
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
  const themePreference = useCardStore((state) => state.themePreference);
  const deviceScheme = useColorScheme();
  const resolvedTheme = resolveTheme(themePreference, deviceScheme);
  const colors = APP_THEME[resolvedTheme];
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
            "Support products are not available yet. Check your RevenueCat offering named support and try again.",
          );
          setPackages([]);
          return;
        }

        setPackages(nextPackages);
      })
      .catch(() => {
        if (cancelled) {
          return;
        }

        setErrorMessage(
          "Pocket ID could not load support options right now. Please try again in a moment.",
        );
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
          : "Pocket ID could not open the App Store subscription page right now.",
      );
    }
  };

  const handlePurchase = async (aPackage: PurchasesPackage) => {
    const productId = aPackage.product.identifier;

    if (!canPurchaseSupportProduct(customerInfo, productId)) {
      setErrorMessage(
        productId === "supporter_lifetime"
          ? "This lifetime support unlock is already owned on this App Store account."
          : "This support option is already active on this App Store account.",
      );
      return;
    }

    try {
      setPurchasingIdentifier(productId);
      setErrorMessage(null);
      const customerInfo = await purchaseSupportPackage(aPackage);
      onPurchaseSuccess?.(customerInfo);
      setThankYouMessage(
        "Thank you for supporting Pocket ID. It really helps. 💛",
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
          : "Pocket ID could not complete that purchase right now.",
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
          <Text style={[styles.title, { color: colors.text }]}>Thank you</Text>
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
            Loading support options…
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
            Could not load support
          </Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            {errorMessage}
          </Text>
        </View>
      );
    }

    return (
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.packageList}
      >
        {packages.map((aPackage) => {
          const product = aPackage.product;
          const packageDescription =
            product.description || fallbackDescription(product.identifier);
          const isPurchasing = purchasingIdentifier === product.identifier;
          const purchaseCount = getSupportProductPurchaseCount(
            customerInfo,
            product.identifier,
          );
          const shouldShowPurchaseCountBadge =
            purchaseCount > 0 &&
            product.identifier !== "supporter_lifetime" &&
            product.identifier !== "supporter_monthly";
          const canPurchase = canPurchaseSupportProduct(
            customerInfo,
            product.identifier,
          );
          const buttonDisabled = Boolean(purchasingIdentifier) || !canPurchase;
          const buttonLabel = !canPurchase
            ? product.identifier === "supporter_lifetime"
              ? "Owned"
              : "Active"
            : isPurchasing
              ? "Buying…"
              : "Buy";

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
              <View style={styles.packageTextWrap}>
                <View style={styles.packageTitleRow}>
                  <Text style={[styles.packageTitle, { color: colors.text }]}>
                    {product.title}
                  </Text>
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
                <Text style={[styles.packageBody, { color: colors.textMuted }]}>
                  {packageDescription}
                </Text>
                <Text style={[styles.packagePrice, { color: colors.text }]}>
                  {product.priceString}
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
                    borderColor: canPurchase ? colors.accent : colors.border,
                    borderWidth: 1,
                    opacity: purchasingIdentifier && !isPurchasing ? 0.55 : 1,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.buyButtonText,
                    {
                      color: canPurchase ? colors.accentText : colors.textMuted,
                    },
                  ]}
                >
                  {buttonLabel}
                </Text>
              </Pressable>
              {!canPurchase &&
              product.identifier === "supporter_monthly" &&
              canManageMonthlySubscription(customerInfo) ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => void handleManageSubscription()}
                  style={[
                    styles.buyButton,
                    styles.secondaryAction,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                      borderWidth: 1,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.buyButtonText,
                      styles.secondaryActionText,
                      { color: colors.text },
                    ]}
                  >
                    Cancel Monthly Subscription
                  </Text>
                </Pressable>
              ) : null}
            </View>
          );
        })}
      </ScrollView>
    );
  }, [
    colors,
    errorMessage,
    isLoading,
    packages,
    purchasingIdentifier,
    thankYouMessage,
    customerInfo,
  ]);

  const dragGesture = Gesture.Pan()
    .activeOffsetY([12, 9999])
    .failOffsetX([-12, 12])
    .onUpdate((event) => {
      if (event.translationY > 0) {
        translateY.value = event.translationY;
        backdropOpacity.value = Math.max(
          0,
          0.55 - (event.translationY / SHEET_HEIGHT) * 0.55,
        );
      }
    })
    .onEnd((event) => {
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
                title="Enjoying the app? 💛"
                backgroundColor={colors.surface}
                titleColor={colors.text}
                closeColor={colors.textMuted}
                handleColor={colors.textSoft}
                onClose={dismissWithAnimation}
              >
                <Text style={[styles.subheading, { color: colors.textMuted }]}>
                  Optional support for the developer, entirely by free will.
                </Text>

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
    paddingBottom: 16,
  },
  packageCard: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 16,
    gap: 16,
  },
  packageTextWrap: {
    gap: 8,
  },
  packageTitleRow: {
    flexDirection: "row",
    alignItems: "center",
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
});
