import { useEffect } from "react";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Feather } from "@expo/vector-icons";
import {
  Dimensions,
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

import { AppPreviewShield } from "@/components/AppPreviewShield";
import { CardForm } from "@/components/CardForm";
import {
  FormSheetScaffold,
  formSheetScaffoldStyles,
} from "@/components/FormSheetScaffold";
import { useCardStore } from "@/store/useCardStore";
import { APP_THEME, resolveTheme } from "@/utils/theme";
import type { CardFormValues, CardPalette } from "@/types/card";

const { height } = Dimensions.get("window");
const SHEET_HEIGHT = height * 0.85;
const CLOSE_THRESHOLD = 100;
const SPRING_OPEN = {
  damping: 20,
  stiffness: 90,
  mass: 0.8,
  overshootClamping: true,
} as const;
const SPRING_CLOSE = {
  damping: 20,
  stiffness: 90,
  overshootClamping: true,
} as const;

export default function AddCardScreen() {
  const router = useRouter();
  const addCard = useCardStore((state) => state.addCard);
  const themePreference = useCardStore((state) => state.themePreference);
  const deviceScheme = useColorScheme();
  const resolvedTheme = resolveTheme(themePreference, deviceScheme);
  const colors = APP_THEME[resolvedTheme];

  const translateY = useSharedValue(SHEET_HEIGHT);
  const backdropOpacity = useSharedValue(0);

  useEffect(() => {
    translateY.value = withSpring(0, SPRING_OPEN);
    backdropOpacity.value = withSpring(0.55, SPRING_OPEN);
  }, []);

  const dismiss = () => router.back();

  const dismissWithAnimation = () => {
    translateY.value = withSpring(SHEET_HEIGHT, SPRING_CLOSE);
    backdropOpacity.value = withSpring(0, SPRING_CLOSE, (done) => {
      if (done) runOnJS(dismiss)();
    });
  };

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
      if (e.translationY > CLOSE_THRESHOLD || e.velocityY > 800) {
        translateY.value = withSpring(SHEET_HEIGHT, SPRING_CLOSE);
        backdropOpacity.value = withSpring(0, SPRING_CLOSE);
        runOnJS(dismiss)();
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

  const handleSubmit = (values: CardFormValues, palette: CardPalette) => {
    addCard(values, palette);
    router.back();
  };

  const handleImportSharedCard = () => {
    router.replace("/import-card");
  };

  return (
    <>
      <StatusBar style={resolvedTheme === "dark" ? "light" : "dark"} />
      <Stack.Screen options={{ headerShown: false }} />
      <View style={StyleSheet.absoluteFill}>
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
            sheetStyle,
          ]}
        >
          <GestureDetector gesture={dragGesture}>
            <View style={styles.sheetContent}>
              <FormSheetScaffold
                title="Add Card"
                backgroundColor={colors.surface}
                titleColor={colors.text}
                closeColor={colors.textMuted}
                handleColor={colors.textSoft}
                onClose={dismissWithAnimation}
              >
                <CardForm
                  onSubmit={handleSubmit}
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
                        <Text
                          style={[styles.importTitle, { color: colors.text }]}
                        >
                          Import shared card
                        </Text>
                        <Text
                          style={[
                            styles.importBody,
                            { color: colors.textMuted },
                          ]}
                        >
                          Have a Pocket ID card file? Bring it in here instead
                          of typing everything manually.
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
              </FormSheetScaffold>
            </View>
          </GestureDetector>
        </Animated.View>
        <AppPreviewShield />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: "#000",
  },
  sheet: {
    height: SHEET_HEIGHT,
  },
  sheetContent: {
    flex: 1,
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
