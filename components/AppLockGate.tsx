import { Feather } from "@expo/vector-icons";
import * as LocalAuthentication from "expo-local-authentication";
import { type ReactNode, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  Pressable,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from "react-native";

import { useCardStore } from "@/store/useCardStore";
import { APP_THEME, resolveTheme } from "@/utils/theme";

const RELOCK_AFTER_MS = 15_000;

type AppLockGateProps = {
  children: ReactNode;
};

function getAuthErrorMessage(code?: string) {
  if (!code) {
    return "Unlock the app to continue.";
  }

  if (
    code === "user_cancel" ||
    code === "system_cancel" ||
    code === "app_cancel"
  ) {
    return "Authentication was cancelled.";
  }

  if (code === "lockout" || code === "too_many_attempts") {
    return "Too many failed attempts. Use your device passcode or try again shortly.";
  }

  return "We could not verify your identity. Try again.";
}

export function AppLockGate({ children }: AppLockGateProps) {
  const themePreference = useCardStore((state) => state.themePreference);
  const appLockEnabled = useCardStore((state) => state.appLockEnabled);
  const deviceScheme = useColorScheme();
  const resolvedTheme = resolveTheme(themePreference, deviceScheme);
  const colors = APP_THEME[resolvedTheme];

  const [isSupported, setIsSupported] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [message, setMessage] = useState(
    "Use Face ID, Touch ID, or your device passcode to unlock this wallet.",
  );

  const appStateRef = useRef(AppState.currentState);
  const backgroundedAtRef = useRef<number | null>(null);
  const authInFlightRef = useRef(false);

  const authenticate = async () => {
    if (authInFlightRef.current) {
      return;
    }

    authInFlightRef.current = true;
    setIsAuthenticating(true);
    setMessage(
      "Use Face ID, Touch ID, or your device passcode to unlock this wallet.",
    );

    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Unlock Pocket ID",
        cancelLabel: "Cancel",
        fallbackLabel: "Use Passcode",
        disableDeviceFallback: false,
      });

      if (result.success) {
        setIsUnlocked(true);
        setMessage(
          "Use Face ID, Touch ID, or your device passcode to unlock this wallet.",
        );
      } else {
        setIsUnlocked(false);
        setMessage(getAuthErrorMessage(result.error));
      }
    } catch {
      setIsUnlocked(false);
      setMessage("Authentication is temporarily unavailable. Try again.");
    } finally {
      authInFlightRef.current = false;
      setIsAuthenticating(false);
    }
  };

  useEffect(() => {
    let mounted = true;

    async function prepare() {
      if (!appLockEnabled) {
        if (!mounted) return;
        setIsSupported(false);
        setIsUnlocked(true);
        setIsReady(true);
        return;
      }

      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = hasHardware
        ? await LocalAuthentication.isEnrolledAsync()
        : false;

      if (!mounted) return;

      if (!hasHardware || !isEnrolled) {
        setIsSupported(false);
        setIsUnlocked(true);
        setIsReady(true);
        return;
      }

      setIsSupported(true);
      setIsReady(true);
      await authenticate();
    }

    void prepare();

    return () => {
      mounted = false;
    };
  }, [appLockEnabled]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      const previousState = appStateRef.current;
      appStateRef.current = nextState;

      if (nextState === "background" || nextState === "inactive") {
        backgroundedAtRef.current = Date.now();
        return;
      }

      if (
        previousState.match(/inactive|background/) &&
        nextState === "active" &&
        isSupported
      ) {
        const backgroundedAt = backgroundedAtRef.current;
        if (backgroundedAt && Date.now() - backgroundedAt >= RELOCK_AFTER_MS) {
          setIsUnlocked(false);
          void authenticate();
        }
      }
    });

    return () => {
      subscription.remove();
    };
  }, [appLockEnabled, isSupported]);

  if (!appLockEnabled) {
    return <>{children}</>;
  }

  if (!isReady) {
    return (
      <View style={[styles.lockScreen, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.text} />
      </View>
    );
  }

  if (!isSupported || isUnlocked) {
    return <>{children}</>;
  }

  return (
    <View style={[styles.lockScreen, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.lockCard,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <View style={[styles.lockIcon, { backgroundColor: colors.input }]}>
          <Feather name="shield" size={30} color={colors.text} />
        </View>
        <Text style={[styles.title, { color: colors.text }]}>
          Unlock Pocket ID
        </Text>
        <Text style={[styles.body, { color: colors.textMuted }]}>
          {message}
        </Text>
        <Pressable
          accessibilityRole="button"
          disabled={isAuthenticating}
          onPress={() => {
            void authenticate();
          }}
          style={[
            styles.button,
            {
              backgroundColor: colors.accent,
              opacity: isAuthenticating ? 0.75 : 1,
            },
          ]}
        >
          {isAuthenticating ? (
            <ActivityIndicator size="small" color={colors.accentText} />
          ) : (
            <Feather name="lock" size={18} color={colors.accentText} />
          )}
          <Text style={[styles.buttonText, { color: colors.accentText }]}>
            {isAuthenticating ? "Checking…" : "Unlock App"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  lockScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  lockCard: {
    width: "100%",
    maxWidth: 420,
    borderWidth: 1,
    borderRadius: 28,
    paddingHorizontal: 24,
    paddingVertical: 28,
    alignItems: "center",
  },
  lockIcon: {
    width: 68,
    height: 68,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  title: {
    fontFamily: "ReadexPro-Bold",
    fontSize: 28,
    textAlign: "center",
  },
  body: {
    fontFamily: "ReadexPro-Regular",
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    marginTop: 10,
  },
  button: {
    marginTop: 22,
    minWidth: 180,
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  buttonText: {
    fontFamily: "ReadexPro-Medium",
    fontSize: 15,
  },
});
