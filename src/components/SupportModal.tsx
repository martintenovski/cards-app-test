import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { CustomerInfo, PurchasesPackage } from "react-native-purchases";

import { useCardStore } from "@/store/useCardStore";
import { APP_THEME, resolveTheme } from "@/utils/theme";
import { recordSupportModalDismissed } from "@/src/hooks/useAutoSupportModal";
import {
  getSupportPackages,
  purchaseSupportPackage,
} from "@/src/services/purchases";

type SupportModalProps = {
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
  visible,
  onClose,
  onPurchaseSuccess,
}: SupportModalProps) {
  const insets = useSafeAreaInsets();
  const themePreference = useCardStore((state) => state.themePreference);
  const deviceScheme = useColorScheme();
  const resolvedTheme = resolveTheme(themePreference, deviceScheme);
  const colors = APP_THEME[resolvedTheme];
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [thankYouMessage, setThankYouMessage] = useState<string | null>(null);
  const [purchasingIdentifier, setPurchasingIdentifier] = useState<
    string | null
  >(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const handlePurchase = async (aPackage: PurchasesPackage) => {
    try {
      setPurchasingIdentifier(aPackage.product.identifier);
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
                <Text style={[styles.packageTitle, { color: colors.text }]}>
                  {product.title}
                </Text>
                <Text style={[styles.packageBody, { color: colors.textMuted }]}>
                  {packageDescription}
                </Text>
                <Text style={[styles.packagePrice, { color: colors.text }]}>
                  {product.priceString}
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                disabled={Boolean(purchasingIdentifier)}
                onPress={() => void handlePurchase(aPackage)}
                style={[
                  styles.buyButton,
                  {
                    backgroundColor: colors.accent,
                    opacity: purchasingIdentifier && !isPurchasing ? 0.55 : 1,
                  },
                ]}
              >
                <Text
                  style={[styles.buyButtonText, { color: colors.accentText }]}
                >
                  {isPurchasing ? "Buying…" : "Buy"}
                </Text>
              </Pressable>
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
  ]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={() => void handleDismiss()}
    >
      <View style={styles.modalRoot}>
        <Pressable
          style={styles.backdrop}
          onPress={() => void handleDismiss()}
        />
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.surface,
              paddingBottom: Math.max(insets.bottom, 16),
              shadowColor: colors.shadow,
            },
          ]}
        >
          <View style={styles.handleWrap}>
            <View
              style={[styles.handle, { backgroundColor: colors.textSoft }]}
            />
          </View>
          <View style={styles.headerRow}>
            <View style={styles.headerTextWrap}>
              <Text style={[styles.title, { color: colors.text }]}>
                Enjoying the app? 💛
              </Text>
              <Text style={[styles.subtitle, { color: colors.textMuted }]}>
                It takes time and love to build. If you find it useful, consider
                supporting!
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close support modal"
              hitSlop={10}
              onPress={() => void handleDismiss()}
              style={[
                styles.closeButton,
                { backgroundColor: colors.surfaceMuted },
              ]}
            >
              <Feather name="x" size={18} color={colors.text} />
            </Pressable>
          </View>

          <LinearGradient
            colors={["#1A6BC8", "#4D93E6"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.callout}
          >
            <Text style={styles.calloutTitle}>Support Pocket ID</Text>
            <Text style={styles.calloutBody}>
              One-time tips, lifetime support, or a small monthly subscription.
            </Text>
          </LinearGradient>

          {content}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.42)",
  },
  sheet: {
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 20,
    paddingTop: 10,
    maxHeight: "84%",
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 18,
  },
  handleWrap: {
    alignItems: "center",
    marginBottom: 14,
  },
  handle: {
    width: 42,
    height: 4,
    borderRadius: 999,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  headerTextWrap: {
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
  callout: {
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingVertical: 16,
    marginTop: 18,
    marginBottom: 16,
  },
  calloutTitle: {
    fontFamily: "ReadexPro-Bold",
    fontSize: 18,
    color: "#FFFFFF",
  },
  calloutBody: {
    fontFamily: "ReadexPro-Regular",
    fontSize: 13,
    lineHeight: 20,
    color: "rgba(255,255,255,0.86)",
    marginTop: 6,
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
    paddingBottom: 8,
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
  packageTitle: {
    fontFamily: "ReadexPro-Bold",
    fontSize: 16,
    lineHeight: 22,
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
    borderRadius: 16,
    minHeight: 46,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  buyButtonText: {
    fontFamily: "ReadexPro-Bold",
    fontSize: 14,
  },
});
