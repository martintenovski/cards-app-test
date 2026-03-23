import { Feather } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
  Dimensions,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  useColorScheme,
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

const { height } = Dimensions.get("window");
const SHEET_HEIGHT = height * 0.85;
const CLOSE_THRESHOLD = 80;

const OPEN_CFG = { duration: 260, easing: REasing.out(REasing.cubic) } as const;
const CLOSE_CFG = { duration: 200, easing: REasing.in(REasing.quad) } as const;

type AddCardSheetProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function AddCardSheet({ isOpen, onClose }: AddCardSheetProps) {
  const addCard = useCardStore((state) => state.addCard);
  const themePreference = useCardStore((state) => state.themePreference);
  const deviceScheme = useColorScheme();
  const resolvedTheme = resolveTheme(themePreference, deviceScheme);
  const colors = APP_THEME[resolvedTheme];
  const [formKey, setFormKey] = useState(0);
  const [modalVisible, setModalVisible] = useState(false);

  const translateY = useSharedValue(SHEET_HEIGHT);
  const backdropOpacity = useSharedValue(0);

  useEffect(() => {
    if (isOpen) {
      setModalVisible(true);
      translateY.value = withTiming(0, OPEN_CFG);
      backdropOpacity.value = withTiming(0.55, {
        duration: 220,
        easing: REasing.out(REasing.quad),
      });
    } else {
      translateY.value = withTiming(SHEET_HEIGHT, CLOSE_CFG);
      backdropOpacity.value = withTiming(0, {
        duration: 180,
        easing: REasing.in(REasing.quad),
      });
      const timer = setTimeout(() => setModalVisible(false), 210);
      return () => clearTimeout(timer);
    }
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  const dragGesture = Gesture.Pan()
    .onUpdate((e) => {
      if (e.translationY > 0) {
        translateY.value = e.translationY;
        backdropOpacity.value = Math.max(
          0,
          0.55 - (e.translationY / SHEET_HEIGHT) * 0.55,
        );
      }
    })
    .onEnd((e) => {
      if (e.translationY > CLOSE_THRESHOLD || e.velocityY > 600) {
        translateY.value = withTiming(SHEET_HEIGHT, CLOSE_CFG);
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
        style={[styles.sheet, sheetStyle, { backgroundColor: colors.surface }]}
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
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>
            Add New Card
          </Text>
          <Pressable onPress={onClose} hitSlop={12} style={styles.closeBtn}>
            <Feather name="x" size={22} color={colors.textMuted} />
          </Pressable>
        </View>

        {/* Form */}
        <CardForm key={formKey} onSubmit={handleSubmit} />
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
    height: SHEET_HEIGHT,
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
});
