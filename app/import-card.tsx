import { useEffect, useMemo } from "react";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
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
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";

import { CardForm } from "@/components/CardForm";
import {
  FormSheetScaffold,
  formSheetScaffoldStyles,
} from "@/components/FormSheetScaffold";
import { useCardStore } from "@/store/useCardStore";
import { decodeSharedCardPayload } from "@/utils/cardShare";
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

export default function ImportCardScreen() {
  const { payload } = useLocalSearchParams<{ payload?: string }>();
  const router = useRouter();
  const addCard = useCardStore((state) => state.addCard);
  const themePreference = useCardStore((state) => state.themePreference);
  const deviceScheme = useColorScheme();
  const resolvedTheme = resolveTheme(themePreference, deviceScheme);
  const sharedPayload = useMemo(
    () => decodeSharedCardPayload(payload),
    [payload],
  );
  const colors = APP_THEME[resolvedTheme];
  const translateY = useSharedValue(SHEET_HEIGHT);
  const backdropOpacity = useSharedValue(0);

  useEffect(() => {
    translateY.value = withSpring(0, SPRING_OPEN);
    backdropOpacity.value = withSpring(0.55, SPRING_OPEN);
  }, []);

  const dismiss = () => router.replace("/");

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
    router.replace("/");
  };

  return (
    <>
      <StatusBar style={resolvedTheme === "dark" ? "light" : "dark"} />
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={StyleSheet.absoluteFill}>
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
                title="Import Card"
                backgroundColor={colors.surface}
                titleColor={colors.text}
                closeColor={colors.textMuted}
                handleColor={colors.textSoft}
                onClose={dismissWithAnimation}
              >
                {sharedPayload ? (
                  <CardForm
                    onSubmit={handleSubmit}
                    initialValues={sharedPayload.values}
                    initialPalette={sharedPayload.palette}
                    submitLabel="Add Imported Card"
                  />
                ) : (
                  <View style={styles.errorState}>
                    <Text style={[styles.errorTitle, { color: colors.text }]}>
                      Invalid Card Link
                    </Text>
                    <Text
                      style={[styles.errorBody, { color: colors.textMuted }]}
                    >
                      This shared card could not be opened. Ask the sender to
                      share it again.
                    </Text>
                    <Pressable
                      onPress={dismissWithAnimation}
                      style={[
                        styles.errorButton,
                        { backgroundColor: colors.accent },
                      ]}
                    >
                      <Text
                        style={[
                          styles.errorButtonText,
                          { color: colors.accentText },
                        ]}
                      >
                        Back To Wallet
                      </Text>
                    </Pressable>
                  </View>
                )}
              </FormSheetScaffold>
            </View>
          </GestureDetector>
        </Animated.View>
      </SafeAreaView>
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
  errorState: {
    flex: 1,
    justifyContent: "center",
    gap: 14,
  },
  errorTitle: {
    fontFamily: "ReadexPro-Bold",
    fontSize: 28,
  },
  errorBody: {
    fontFamily: "ReadexPro-Regular",
    fontSize: 16,
    lineHeight: 24,
  },
  errorButton: {
    marginTop: 12,
    height: 55,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  errorButtonText: {
    fontFamily: "ReadexPro-Bold",
    fontSize: 18,
  },
});
