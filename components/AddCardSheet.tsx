import { Feather } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import {
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
import type { CardFormValues, CardPalette } from "@/types/card";
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
  const addCard = useCardStore((state) => state.addCard);
  const themePreference = useCardStore((state) => state.themePreference);
  const deviceScheme = useColorScheme();
  const { width, height } = useWindowDimensions();
  const resolvedTheme = resolveTheme(themePreference, deviceScheme);
  const colors = APP_THEME[resolvedTheme];
  const isCompact = width < 390 || height < 760;
  const sheetHeight = height * (isCompact ? 0.93 : 0.85);
  const [formKey, setFormKey] = useState(0);
  const [modalVisible, setModalVisible] = useState(false);

  const translateY = useSharedValue(sheetHeight);
  const backdropOpacity = useSharedValue(0);

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
    .onUpdate((e) => {
      if (e.translationY > 0) {
        translateY.value = e.translationY;
        backdropOpacity.value = Math.max(
          0,
          0.55 - (e.translationY / sheetHeight) * 0.55,
        );
      }
    })
    .onEnd((e) => {
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

  const handleSubmit = (values: CardFormValues, palette: CardPalette) => {
    addCard(values, palette);
    setFormKey((k) => k + 1);
    onClose();
  };

  const handleImportSharedCard = () => {
    onClose();
    requestAnimationFrame(() => {
      router.push("/import-card");
    });
  };

  return (
    <Modal
      transparent
      visible={modalVisible}
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {/* Backdrop */}
      <Animated.View
        style={[StyleSheet.absoluteFill, styles.backdrop, backdropStyle]}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      {/* Sheet panel */}
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
        {/* Drag handle */}
        <GestureDetector gesture={dragGesture}>
          <View style={styles.handleArea}>
            <View
              style={[styles.handle, { backgroundColor: colors.textSoft }]}
            />
          </View>
        </GestureDetector>

        {/* Header */}
        <View
          style={[
            styles.header,
            { paddingHorizontal: isCompact ? 18 : 24, paddingBottom: isCompact ? 10 : 12 },
          ]}
        >
          <Text
            style={[
              styles.title,
              { color: colors.text, fontSize: isCompact ? 20 : 22 },
            ]}
          >
            Add New Card
          </Text>
          <Pressable onPress={onClose} hitSlop={12} style={styles.closeBtn}>
            <Feather name="x" size={22} color={colors.textMuted} />
          </Pressable>
        </View>

        {/* Form */}
        <CardForm
          key={formKey}
          onSubmit={handleSubmit}
          contentHorizontalPadding={isCompact ? 16 : 20}
          topAccessory={
            <Pressable
              onPress={handleImportSharedCard}
              style={[
                styles.importCard,
                {
                  backgroundColor: colors.surfaceMuted,
                  borderColor: colors.border,
                },
              ]}
            >
              <View
                style={[
                  styles.importIcon,
                  { backgroundColor: colors.accent },
                ]}
              >
                <Feather
                  name="download-cloud"
                  size={18}
                  color={colors.accentText}
                />
              </View>
              <View style={styles.importTextWrap}>
                <Text style={[styles.importTitle, { color: colors.text }]}>
                  Import shared card
                </Text>
                <Text style={[styles.importBody, { color: colors.textMuted }]}>
                  Have a Pocket ID card file? Bring it in here instead of
                  typing everything manually.
                </Text>
              </View>
              <Feather
                name="chevron-right"
                size={18}
                color={colors.textSoft}
              />
            </Pressable>
          }
        />
      </Animated.View>
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
