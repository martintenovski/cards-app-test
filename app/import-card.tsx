import { useEffect, useMemo, useState } from "react";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as DocumentPicker from "expo-document-picker";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Pressable,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";
import { File } from "expo-file-system";

import { AppPreviewShield } from "@/components/AppPreviewShield";
import { CardForm } from "@/components/CardForm";
import {
  FormSheetScaffold,
  formSheetScaffoldStyles,
} from "@/components/FormSheetScaffold";
import { useCardStore } from "@/store/useCardStore";
import {
  decodeSharedCardPayload,
  parseSharedCardPayload,
  SHARED_CARD_FILE_EXTENSION,
} from "@/utils/cardShare";
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
  const [pickedPayload, setPickedPayload] = useState(sharedPayload);
  const [isPickingFile, setIsPickingFile] = useState(false);
  const translateY = useSharedValue(SHEET_HEIGHT);
  const backdropOpacity = useSharedValue(0);

  useEffect(() => {
    setPickedPayload(sharedPayload);
  }, [sharedPayload]);

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

  const handlePickSharedCardFile = async () => {
    try {
      setIsPickingFile(true);
      const result = await DocumentPicker.getDocumentAsync({
        multiple: false,
        copyToCacheDirectory: true,
        type: ["application/json", "*/*"],
      });

      if (result.canceled) {
        return;
      }

      const file = new File(result.assets[0].uri);
      const rawPayload = await file.text();
      const parsedPayload = parseSharedCardPayload(rawPayload);

      if (!parsedPayload) {
        Alert.alert(
          "Invalid shared card",
          `This file is not a valid Pocket ID card export. Choose a ${SHARED_CARD_FILE_EXTENSION} file and try again.`,
        );
        return;
      }

      setPickedPayload(parsedPayload);
    } catch (error) {
      if (error instanceof Error && /cancel/i.test(error.message)) {
        return;
      }

      const details =
        error instanceof Error && error.message
          ? `\n\nDetails: ${error.message}`
          : "";

      Alert.alert(
        "Could not open shared card",
        `Pocket ID could not read that file. Try downloading it again from Gmail, Drive, or your Files app.${details}`,
      );
    } finally {
      setIsPickingFile(false);
    }
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
                {pickedPayload ? (
                  <CardForm
                    onSubmit={handleSubmit}
                    initialValues={pickedPayload.values}
                    initialPalette={pickedPayload.palette}
                    submitLabel="Add Imported Card"
                  />
                ) : (
                  <View style={styles.errorState}>
                    <View style={styles.emptyStateCard}>
                      <View
                        style={[
                          styles.importIcon,
                          { backgroundColor: colors.surfaceMuted },
                        ]}
                      >
                        {isPickingFile ? (
                          <ActivityIndicator size="small" color={colors.text} />
                        ) : (
                          <Feather
                            name="download-cloud"
                            size={24}
                            color={colors.text}
                          />
                        )}
                      </View>
                      <Text style={[styles.errorTitle, { color: colors.text }]}>
                        Import A Shared Card
                      </Text>
                      <Text
                        style={[styles.errorBody, { color: colors.textMuted }]}
                      >
                        Choose a Pocket ID shared card file from Gmail, Google
                        Drive, Downloads, or your Files app to prefill and save
                        that one card here.
                      </Text>
                      <Pressable
                        onPress={handlePickSharedCardFile}
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
                          {isPickingFile
                            ? "Opening Files…"
                            : "Choose Shared Card File"}
                        </Text>
                      </Pressable>
                      <Pressable
                        onPress={dismissWithAnimation}
                        style={[
                          styles.secondaryButton,
                          { backgroundColor: colors.surfaceMuted },
                        ]}
                      >
                        <Text
                          style={[
                            styles.secondaryButtonText,
                            { color: colors.text },
                          ]}
                        >
                          Back To Wallet
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                )}
              </FormSheetScaffold>
            </View>
          </GestureDetector>
        </Animated.View>
        <AppPreviewShield />
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
    alignItems: "center",
    paddingHorizontal: 8,
  },
  emptyStateCard: {
    width: "100%",
    maxWidth: 360,
    alignItems: "center",
    gap: 16,
  },
  importIcon: {
    width: 54,
    height: 54,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  errorTitle: {
    fontFamily: "ReadexPro-Bold",
    fontSize: 28,
    textAlign: "center",
  },
  errorBody: {
    fontFamily: "ReadexPro-Regular",
    fontSize: 16,
    lineHeight: 24,
    textAlign: "center",
  },
  errorButton: {
    marginTop: 12,
    minHeight: 52,
    width: "100%",
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  errorButtonText: {
    fontFamily: "ReadexPro-Medium",
    fontSize: 15,
    textAlign: "center",
    width: "100%",
  },
  secondaryButton: {
    minHeight: 52,
    minWidth: 180,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  secondaryButtonText: {
    fontFamily: "ReadexPro-Medium",
    fontSize: 15,
    textAlign: "center",
    width: "100%",
  },
});
