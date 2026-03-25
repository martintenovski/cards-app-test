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
import { GluestackUIProvider } from "@/components/ui/gluestack-ui-provider";
import { SupportModalManager } from "@/src/components/SupportModalManager";
import * as Notifications from "expo-notifications";
import { useFonts } from "expo-font";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { LogBox, useColorScheme } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

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
  const hasSeenOnboarding = useCardStore((state) => state.hasSeenOnboarding);
  const themePreference = useCardStore((state) => state.themePreference);
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
      <GestureHandlerRootView
        style={{ flex: 1, backgroundColor: colors.background }}
      >
        <SafeAreaProvider>
          <StatusBar style={resolvedTheme === "dark" ? "light" : "dark"} />
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
                name="add-card"
                options={{
                  presentation: "transparentModal",
                  animation: "none",
                }}
              />
              <Stack.Screen
                name="card-detail"
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
              <Stack.Screen
                name="card-scanner"
                options={{
                  headerShown: false,
                  presentation: "modal",
                  animation: "slide_from_bottom",
                }}
              />
            </Stack>
          </AppLockGate>
        </SafeAreaProvider>
      </GluestackUIProvider>
    </GestureHandlerRootView>
  );
}
