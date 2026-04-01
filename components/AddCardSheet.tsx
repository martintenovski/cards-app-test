import { Feather } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import * as DocumentPicker from "expo-document-picker";
import { File } from "expo-file-system";
import {
  Alert,
  Dimensions,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  useColorScheme,
  useWindowDimensions,
} from "react-native";
import Animated, {
  Easing as REasing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";

import { CardForm } from "@/components/CardForm";
import { useCardStore } from "@/store/useCardStore";
import { useDocumentScannerStore } from "@/src/store/useDocumentScannerStore";
import { useTranslation } from "@/src/hooks/useTranslation";
import type { CardFormValues, CardPalette } from "@/types/card";
import {
  parseSharedCardPayload,
  SHARED_CARD_FILE_EXTENSION,
} from "@/utils/cardShare";
import { APP_THEME, resolveTheme } from "@/utils/theme";

const CLOSE_THRESHOLD = 80;

const OPEN_CFG = { duration: 260, easing: REasing.out(REasing.cubic) } as const;
const CLOSE_CFG = { duration: 200, easing: REasing.in(REasing.quad) } as const;

type AddCardSheetProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function AddCardSheet({ isOpen, onClose }: AddCardSheetProps) {
  const router = useRouter();
  const tr = useTranslation();
  const addCard = useCardStore((state) => state.addCard);
  const language = useCardStore((state) => state.language);
  const themePreference = useCardStore((state) => state.themePreference);
  const pendingScanDraft = useDocumentScannerStore(
    (state) => state.pendingDraft,
  );
  const clearPendingScanDraft = useDocumentScannerStore(
    (state) => state.clearPendingDraft,
  );
  const deviceScheme = useColorScheme();
  const { width, height } = useWindowDimensions();
  const resolvedTheme = resolveTheme(themePreference, deviceScheme);
  const colors = APP_THEME[resolvedTheme];
  const isCompact = width < 390 || height < 760;
  const sheetHeight = height * (isCompact ? 0.93 : 0.85);
  const [formKey, setFormKey] = useState(0);
  const [modalVisible, setModalVisible] = useState(false);
  const [importedPayload, setImportedPayload] = useState<{
    values: CardFormValues;
    palette: CardPalette;
  } | null>(null);

  const translateY = useSharedValue(sheetHeight);
  const backdropOpacity = useSharedValue(0);
  const isScrollAtTop = useSharedValue(1);

  useEffect(() => {
    if (!isOpen) {
      translateY.value = sheetHeight;
    }
  }, [isOpen, sheetHeight, translateY]);

  useEffect(() => {
    if (isOpen) {
      setModalVisible(true);
      translateY.value = withTiming(0, OPEN_CFG);
      backdropOpacity.value = withTiming(0.55, {
        duration: 220,
        easing: REasing.out(REasing.quad),
      });
    } else {
      translateY.value = withTiming(sheetHeight, CLOSE_CFG);
      backdropOpacity.value = withTiming(0, {
        duration: 180,
        easing: REasing.in(REasing.quad),
      });
      const timer = setTimeout(() => setModalVisible(false), 210);
      return () => clearTimeout(timer);
    }
  }, [isOpen, sheetHeight]); // eslint-disable-line react-hooks/exhaustive-deps

  const dragGesture = Gesture.Pan()
    .activeOffsetY([12, 9999])
    .failOffsetX([-12, 12])
    .onUpdate((e) => {
      if (!isScrollAtTop.value || e.translationY <= 0) return;
      translateY.value = e.translationY;
      backdropOpacity.value = Math.max(
        0,
        0.55 - (e.translationY / sheetHeight) * 0.55,
      );
    })
    .onEnd((e) => {
      if (!isScrollAtTop.value) {
        translateY.value = withTiming(0, OPEN_CFG);
        backdropOpacity.value = withTiming(0.55, { duration: 220 });
        return;
      }
      if (e.translationY > CLOSE_THRESHOLD || e.velocityY > 600) {
        translateY.value = withTiming(sheetHeight, CLOSE_CFG);
        backdropOpacity.value = withTiming(0, { duration: 180 });
        runOnJS(onClose)();
      } else {
        translateY.value = withTiming(0, OPEN_CFG);
        backdropOpacity.value = withTiming(0.55, { duration: 220 });
      }
    });

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const handleDismiss = () => {
    clearPendingScanDraft();
    setImportedPayload(null);
    onClose();
  };

  const handleSubmit = (values: CardFormValues, palette: CardPalette) => {
    addCard(values, palette);
    clearPendingScanDraft();
    setImportedPayload(null);
    setFormKey((k) => k + 1);
    onClose();
  };

  const handleImportSharedCard = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        multiple: false,
        copyToCacheDirectory: true,
        type: ["application/json", "*/*"],
      });

      if (result.canceled) return;

      const file = new File(result.assets[0].uri);
      const rawPayload = await file.text();
      const parsed = parseSharedCardPayload(rawPayload);

      if (!parsed) {
        Alert.alert(
          tr("alert_invalid_shared_card_title"),
          tr("alert_invalid_shared_card_body"),
        );
        return;
      }

      setImportedPayload(parsed);
    } catch (error) {
      if (error instanceof Error && /cancel/i.test(error.message)) return;

      const details =
        error instanceof Error && error.message
          ? `\n\nDetails: ${error.message}`
          : "";

      Alert.alert(
        tr("alert_open_shared_card_failed_title"),
        `${tr("alert_open_shared_card_failed_body")}${details}`,
      );
    }
  };

  const handleOpenScanner = () => {
    onClose();
    requestAnimationFrame(() => {
      router.push("/document-scanner");
    });
  };

  return (
    <Modal
      transparent
      visible={modalVisible}
      animationType="none"
      onRequestClose={handleDismiss}
      statusBarTranslucent
    >
      {/* Backdrop */}
      <Animated.View
        style={[StyleSheet.absoluteFill, styles.backdrop, backdropStyle]}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={handleDismiss} />
      </Animated.View>

      {/* Sheet panel */}
      <GestureDetector gesture={dragGesture}>
        <Animated.View
          style={[
            styles.sheet,
            sheetStyle,
            {
              height: sheetHeight,
              borderTopLeftRadius: isCompact ? 20 : 24,
              borderTopRightRadius: isCompact ? 20 : 24,
              backgroundColor: colors.surface,
            },
          ]}
        >
          <View style={styles.handleArea}>
            <View
              style={[styles.handle, { backgroundColor: colors.textSoft }]}
            />
          </View>

          <View
            style={[
              styles.header,
              {
                paddingHorizontal: isCompact ? 18 : 24,
                paddingBottom: isCompact ? 10 : 12,
              },
            ]}
          >
            <Text
              style={[
                styles.title,
                { color: colors.text, fontSize: isCompact ? 20 : 22 },
              ]}
            >
              {tr("add_card_title")}
            </Text>
            <Pressable
              onPress={handleDismiss}
              hitSlop={12}
              style={styles.closeBtn}
            >
              <Feather name="x" size={22} color={colors.textMuted} />
            </Pressable>
          </View>

          <CardForm
            key={`${formKey}-${pendingScanDraft?.id ?? "blank"}-${importedPayload ? "imported" : ""}`}
            onSubmit={handleSubmit}
            initialValues={
              importedPayload?.values ?? pendingScanDraft?.formValues
            }
            initialPalette={importedPayload?.palette}
            contentHorizontalPadding={isCompact ? 16 : 20}
            onScrollOffsetChange={(offsetY) => {
              isScrollAtTop.value = offsetY <= 4 ? 1 : 0;
            }}
            topAccessory={
              <View style={styles.topAccessoryStack}>
                <View style={styles.topAccessoryBtnRow}>
                  <Pressable
                    onPress={handleOpenScanner}
                    style={[
                      styles.scanButton,
                      { backgroundColor: colors.accent },
                    ]}
                  >
                    <Feather
                      name="camera"
                      size={16}
                      color={colors.accentText}
                    />
                    <Text
                      style={[
                        styles.scanButtonText,
                        { color: colors.accentText },
                      ]}
                    >
                      {tr("add_card_scan_button")}
                    </Text>
                    <View
                      style={[
                        styles.betaBadge,
                        {
                          backgroundColor:
                            resolvedTheme === "dark" ? "#000" : "#fff",
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.betaBadgeText,
                          { color: resolvedTheme === "dark" ? "#fff" : "#000" },
                        ]}
                      >
                        {tr("add_card_scan_beta")}
                      </Text>
                    </View>
                  </Pressable>

                  <Pressable
                    onPress={handleImportSharedCard}
                    style={[
                      styles.importButton,
                      {
                        backgroundColor: colors.surfaceMuted,
                        borderColor: colors.buttonBorder,
                      },
                    ]}
                  >
                    <Feather
                      name="download-cloud"
                      size={18}
                      color={colors.text}
                    />
                    <Text
                      style={[styles.importButtonText, { color: colors.text }]}
                    >
                      Import
                    </Text>
                  </Pressable>
                </View>

                {pendingScanDraft ? (
                  <View
                    style={[
                      styles.scanDraftCard,
                      {
                        backgroundColor: colors.surfaceMuted,
                        borderColor: colors.buttonBorder,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.scanDraftIcon,
                        { backgroundColor: "#0050A3" },
                      ]}
                    >
                      <Feather name="info" size={18} color="#FFFFFF" />
                    </View>
                    <View style={styles.importTextWrap}>
                      <Text
                        style={[styles.importTitle, { color: colors.text }]}
                      >
                        {language === "mk"
                          ? "Пополнето од скениран документ"
                          : "Prefilled from document scan"}
                      </Text>
                      <Text
                        style={[styles.importBody, { color: colors.textMuted }]}
                      >
                        {language === "mk"
                          ? `${pendingScanDraft.analysis.classification.type} е детектирано. Провери и коригирај ги полињата пред зачувување.`
                          : `${pendingScanDraft.analysis.classification.type} detected. Review and adjust any field before saving.`}
                      </Text>
                    </View>
                  </View>
                ) : null}
              </View>
            }
          />
        </Animated.View>
      </GestureDetector>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: "#000",
  },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#1D1D1D",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: "hidden",
  },
  handleArea: {
    width: "100%",
    alignItems: "center",
    paddingVertical: 12,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(239,239,239,0.20)",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingBottom: 12,
  },
  title: {
    fontFamily: "ReadexPro-Bold",
    fontSize: 22,
    color: "#EFEFEF",
  },
  closeBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  topAccessoryStack: {
    gap: 10,
  },
  topAccessoryBtnRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 4,
  },
  scanButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 50,
    borderRadius: 20,
  },
  scanButtonText: {
    fontFamily: "ReadexPro-Bold",
    fontSize: 15,
  },
  betaBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
  },
  betaBadgeText: {
    fontFamily: "ReadexPro-Bold",
    fontSize: 10,
  },
  importButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 50,
    borderRadius: 20,
    borderWidth: 1,
  },
  importButtonText: {
    fontFamily: "ReadexPro-Bold",
    fontSize: 15,
  },
  scanDraftCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
    borderWidth: 1,
    borderRadius: 26,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  scanDraftIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  importCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderWidth: 1,
    borderRadius: 26,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 18,
  },
  importIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  importTextWrap: {
    flex: 1,
    gap: 2,
  },
  importTitle: {
    fontFamily: "ReadexPro-Bold",
    fontSize: 16,
  },
  importBody: {
    fontFamily: "ReadexPro-Regular",
    fontSize: 12,
    lineHeight: 18,
  },
});
