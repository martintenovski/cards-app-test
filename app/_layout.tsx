import "react-native-gesture-handler";

import "@/global.css";

import {
  OpenSans_400Regular,
  OpenSans_600SemiBold,
  OpenSans_700Bold,
  OpenSans_800ExtraBold,
} from "@expo-google-fonts/open-sans";
import {
  ReadexPro_400Regular,
  ReadexPro_500Medium,
  ReadexPro_700Bold,
} from "@expo-google-fonts/readex-pro";
import { AppLockGate } from "@/components/AppLockGate";
import { AuthSessionManager } from "@/components/AuthSessionManager";
import { CloudSyncManager } from "@/components/CloudSyncManager";
import { ExpiryNotificationManager } from "@/components/ExpiryNotificationManager";
import { PassphraseReminderModal } from "@/components/PassphraseReminderModal";
import { GluestackUIProvider } from "@/components/ui/gluestack-ui-provider";
import { SupportModalManager } from "@/src/components/SupportModalManager";
import * as Notifications from "expo-notifications";
import * as ScreenCapture from "expo-screen-capture";
import { useFonts } from "expo-font";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import {
  AppState,
  Image,
  LogBox,
  Platform,
  Text,
  useColorScheme,
  View,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

import { useCardStore } from "@/store/useCardStore";
import { APP_THEME, resolveTheme } from "@/utils/theme";

LogBox.ignoreLogs([
  "Sending `onAnimatedValueUpdate` with no listeners registered.",
  'Attempted to import the module "C:\\Users\\PowerCube\\copilot-sonnet\\cards-app\\node_modules\\@noble\\ciphers\\chacha"',
  'Attempted to import the module "C:\\Users\\PowerCube\\copilot-sonnet\\cards-app\\node_modules\\@noble\\ciphers\\utils"',
  'Route "./cloud-passphrase.tsx" is missing the required default export.',
]);

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const deviceScheme = useColorScheme();
  const hasHydrated = useCardStore((state) => state.hasHydrated);
  const purgeExpiredCards = useCardStore((state) => state.purgeExpiredCards);
  const hasSeenOnboarding = useCardStore((state) => state.hasSeenOnboarding);
  const themePreference = useCardStore((state) => state.themePreference);
  const screenshotBlockingEnabled = useCardStore(
    (state) => state.screenshotBlockingEnabled,
  );
  const lockScreenEnabled = useCardStore((state) => state.lockScreenEnabled);
  const resolvedTheme = resolveTheme(themePreference, deviceScheme);
  const colors = APP_THEME[resolvedTheme];
  const [fontsLoaded] = useFonts({
    "ReadexPro-Regular": ReadexPro_400Regular,
    "ReadexPro-Medium": ReadexPro_500Medium,
    "ReadexPro-Bold": ReadexPro_700Bold,
    "OpenSans-Regular": OpenSans_400Regular,
    "OpenSans-SemiBold": OpenSans_600SemiBold,
    "OpenSans-Bold": OpenSans_700Bold,
    "OpenSans-ExtraBold": OpenSans_800ExtraBold,
  });

  useEffect(() => {
    if (hasHydrated) {
      purgeExpiredCards();
    }
  }, [hasHydrated, purgeExpiredCards]);

  useEffect(() => {
    if (!fontsLoaded || !hasHydrated) {
      return;
    }

    const isOnboardingRoute = segments[0] === "onboarding";

    if (!hasSeenOnboarding && !isOnboardingRoute) {
      router.replace("/onboarding");
      return;
    }

    if (hasSeenOnboarding && isOnboardingRoute) {
      router.replace("/");
    }
  }, [fontsLoaded, hasHydrated, hasSeenOnboarding, router, segments]);

  // Enable or disable screenshot/screen-recording blocking based on user setting
  useEffect(() => {
    if (screenshotBlockingEnabled) {
      void ScreenCapture.preventScreenCaptureAsync();
    } else {
      void ScreenCapture.allowScreenCaptureAsync();
    }
  }, [screenshotBlockingEnabled]);

  // On Android the React Native overlay used as a preview shield isn't
  // captured by the system's recent-apps screenshot — only FLAG_SECURE is.
  // When the user has "hide screen content" enabled, toggle FLAG_SECURE via
  // expo-screen-capture so the app shows as blank in the recent-apps switcher.
  useEffect(() => {
    if (Platform.OS !== "android" || !lockScreenEnabled) return;

    const sub = AppState.addEventListener("change", (nextState) => {
      if (nextState === "background" || nextState === "inactive") {
        void ScreenCapture.preventScreenCaptureAsync();
      } else if (nextState === "active") {
        // Restore capture state on foreground.
        // Keep prevented only if the user also enabled screenshot blocking.
        if (!screenshotBlockingEnabled) {
          void ScreenCapture.allowScreenCaptureAsync();
        }
      }
    });

    return () => sub.remove();
  }, [lockScreenEnabled, screenshotBlockingEnabled]);

  // Navigate to card-detail when a notification is tapped
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data as Record<
          string,
          unknown
        >;
        if (
          data?.kind === "expiry-reminder" &&
          typeof data.cardId === "string"
        ) {
          router.push({
            pathname: "/card-detail",
            params: { id: data.cardId },
          });
        }
      },
    );
    return () => sub.remove();
  }, [router]);

  if (!fontsLoaded || !hasHydrated) {
    return (
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: "#1C1E21" }}>
        <SafeAreaProvider>
          <SafeAreaView style={{ flex: 1, backgroundColor: "#1C1E21" }}>
            <StatusBar style="light" />
            {/* Logo centred – matches the native iOS/Android splash exactly */}
            <View
              style={{
                flex: 1,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Image
                // eslint-disable-next-line @typescript-eslint/no-require-imports
                source={require("../assets/ios-logo.png")}
                style={{ width: 88, height: 88, borderRadius: 20 }}
                resizeMode="contain"
              />
            </View>
            {/* "by tenovski" footer – mirrors the native iOS storyboard labels */}
            <View style={{ alignItems: "center", paddingBottom: 40 }}>
              <Text style={{ color: "#8E8E93", fontSize: 13, lineHeight: 18 }}>
                by
              </Text>
              <Text
                style={{
                  color: "#FFFFFF",
                  fontSize: 13,
                  fontWeight: "bold",
                  lineHeight: 18,
                }}
              >
                tenovski
              </Text>
            </View>
          </SafeAreaView>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <GluestackUIProvider mode={resolvedTheme}>
        <SafeAreaProvider>
          <StatusBar style={resolvedTheme === "dark" ? "light" : "dark"} />
          <AppLockGate>
            <AuthSessionManager />
            <CloudSyncManager />
            <ExpiryNotificationManager />
            <PassphraseReminderModal />
            <SupportModalManager />
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: {
                  backgroundColor: colors.background,
                },
              }}
            >
              <Stack.Screen name="(tabs)" />
              <Stack.Screen
                name="onboarding"
                options={{
                  headerShown: false,
                  animation: "fade_from_bottom",
                }}
              />
              <Stack.Screen
                name="card-detail"
                dangerouslySingular={(
                  _name: string,
                  params: Record<string, string>,
                ) => params?.id}
                options={{
                  headerShown: false,
                  presentation: "modal",
                  animation: "slide_from_bottom",
                }}
              />
              <Stack.Screen
                name="import-card"
                options={{
                  headerShown: false,
                  animation: "slide_from_right",
                }}
              />
              <Stack.Screen
                name="document-scanner"
                options={{
                  headerShown: false,
                  animation: "slide_from_right",
                }}
              />
              <Stack.Screen
                name="cloud-passphrase"
                options={{
                  headerShown: false,
                  animation: "slide_from_right",
                }}
              />
              <Stack.Screen
                name="auth/callback"
                options={{
                  headerShown: false,
                  animation: "fade_from_bottom",
                }}
              />
            </Stack>
          </AppLockGate>
        </SafeAreaProvider>
      </GluestackUIProvider>
    </GestureHandlerRootView>
  );
}
