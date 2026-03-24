import { Feather } from "@expo/vector-icons";
import * as LocalAuthentication from "expo-local-authentication";
import { type ReactNode, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from "react-native";

import { useCardStore } from "@/store/useCardStore";
import { APP_THEME, resolveTheme } from "@/utils/theme";

const RELOCK_AFTER_MS = 15_000;
const DEFAULT_UNLOCK_MESSAGE =
  "Use Face ID, Touch ID, or your device passcode to unlock this wallet.";
const RESUME_UNLOCK_MESSAGE = "Unlocking Pocket ID after returning to the app.";

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

function getBiometricPromptCopy(
  types: LocalAuthentication.AuthenticationType[],
) {
  const hasFace = types.includes(
    LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION,
  );
  const hasFingerprint = types.includes(
    LocalAuthentication.AuthenticationType.FINGERPRINT,
  );
  const hasIris = types.includes(LocalAuthentication.AuthenticationType.IRIS);

  if (Platform.OS === "ios") {
    if (hasFace) {
      return {
        label: "Face ID",
        buttonText: "Use Face ID",
      };
    }

    if (hasFingerprint) {
      return {
        label: "Touch ID",
        buttonText: "Use Touch ID",
      };
    }
  }

  if (hasFace) {
    return {
      label: "face unlock",
      buttonText: "Use Face Unlock",
    };
  }

  if (hasFingerprint) {
    return {
      label: "fingerprint",
      buttonText: "Use Fingerprint",
    };
  }

  if (hasIris) {
    return {
      label: "iris scan",
      buttonText: "Use Iris Scan",
    };
  }

  return {
    label: "biometrics",
    buttonText: "Use Biometrics",
  };
}

export function AppLockGate({ children }: AppLockGateProps) {
  const themePreference = useCardStore((state) => state.themePreference);
  const hasSeenOnboarding = useCardStore((state) => state.hasSeenOnboarding);
  const appLockEnabled = useCardStore((state) => state.appLockEnabled);
  const setAppLockEnabled = useCardStore((state) => state.setAppLockEnabled);
  const hasPromptedForAppLock = useCardStore(
    (state) => state.hasPromptedForAppLock,
  );
  const setHasPromptedForAppLock = useCardStore(
    (state) => state.setHasPromptedForAppLock,
  );
  const deviceScheme = useColorScheme();
  const resolvedTheme = resolveTheme(themePreference, deviceScheme);
  const colors = APP_THEME[resolvedTheme];

  const [isSupported, setIsSupported] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [shouldAutoAuthenticate, setShouldAutoAuthenticate] = useState(false);
  const [message, setMessage] = useState(DEFAULT_UNLOCK_MESSAGE);
  const [supportedAuthTypes, setSupportedAuthTypes] = useState<
    LocalAuthentication.AuthenticationType[]
  >([]);

  const appStateRef = useRef(AppState.currentState);
  const backgroundedAtRef = useRef<number | null>(null);
  const authInFlightRef = useRef(false);
  const authPromptActiveRef = useRef(false);
  const autoAuthenticateTimeoutRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);
  const previousAppLockEnabledRef = useRef<boolean | null>(null);
  const biometricPromptCopy = getBiometricPromptCopy(supportedAuthTypes);
  const shouldShowSetupPrompt =
    isReady && hasSeenOnboarding && isSupported && !hasPromptedForAppLock;

  const authenticate = async () => {
    if (authInFlightRef.current) {
      return;
    }

    authInFlightRef.current = true;
    authPromptActiveRef.current = true;
    setIsAuthenticating(true);
    setMessage(DEFAULT_UNLOCK_MESSAGE);

    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Unlock Pocket ID",
        cancelLabel: "Cancel",
        fallbackLabel: "Use Passcode",
        disableDeviceFallback: false,
      });

      if (result.success) {
        setIsUnlocked(true);
        setMessage(DEFAULT_UNLOCK_MESSAGE);
      } else {
        setIsUnlocked(false);
        setMessage(getAuthErrorMessage(result.error));
      }
    } catch {
      setIsUnlocked(false);
      setMessage("Authentication is temporarily unavailable. Try again.");
    } finally {
      authInFlightRef.current = false;
      authPromptActiveRef.current = false;
      setIsAuthenticating(false);
    }
  };

  useEffect(() => {
    let mounted = true;

    async function prepare() {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = hasHardware
        ? await LocalAuthentication.isEnrolledAsync()
        : false;
      const authTypes = hasHardware
        ? await LocalAuthentication.supportedAuthenticationTypesAsync()
        : [];

      if (!mounted) return;

      const biometricSupported = hasHardware && isEnrolled;
      const wasEnabled = previousAppLockEnabledRef.current;
      previousAppLockEnabledRef.current = appLockEnabled;

      setIsSupported(biometricSupported);
      setSupportedAuthTypes(authTypes);
      setIsReady(true);

      if (!appLockEnabled || !biometricSupported) {
        setIsUnlocked(true);
        setShouldAutoAuthenticate(false);
        return;
      }

      setMessage(DEFAULT_UNLOCK_MESSAGE);

      if (wasEnabled === false) {
        setIsUnlocked(true);
        setShouldAutoAuthenticate(false);
        return;
      }

      setIsUnlocked(false);
      setShouldAutoAuthenticate(true);
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
        if (authPromptActiveRef.current) {
          return;
        }
        backgroundedAtRef.current = Date.now();

        if (appLockEnabled && isSupported) {
          setIsUnlocked(false);
          setMessage(RESUME_UNLOCK_MESSAGE);
        }
        return;
      }

      if (
        previousState.match(/inactive|background/) &&
        nextState === "active" &&
        isSupported &&
        appLockEnabled
      ) {
        const backgroundedAt = backgroundedAtRef.current;
        if (backgroundedAt && Date.now() - backgroundedAt >= RELOCK_AFTER_MS) {
          setIsUnlocked(false);
          setMessage(RESUME_UNLOCK_MESSAGE);
          setShouldAutoAuthenticate(true);
        } else {
          setIsUnlocked(true);
          setShouldAutoAuthenticate(false);
          setMessage(DEFAULT_UNLOCK_MESSAGE);
        }

        backgroundedAtRef.current = null;
      }
    });

    return () => {
      subscription.remove();
    };
  }, [appLockEnabled, isSupported]);

  useEffect(() => {
    if (autoAuthenticateTimeoutRef.current) {
      clearTimeout(autoAuthenticateTimeoutRef.current);
      autoAuthenticateTimeoutRef.current = null;
    }

    if (
      !isReady ||
      !appLockEnabled ||
      !isSupported ||
      isUnlocked ||
      shouldShowSetupPrompt ||
      !shouldAutoAuthenticate ||
      isAuthenticating
    ) {
      return;
    }

    setShouldAutoAuthenticate(false);

    autoAuthenticateTimeoutRef.current = setTimeout(() => {
      autoAuthenticateTimeoutRef.current = null;
      void authenticate();
    }, 250);

    return () => {
      if (autoAuthenticateTimeoutRef.current) {
        clearTimeout(autoAuthenticateTimeoutRef.current);
        autoAuthenticateTimeoutRef.current = null;
      }
    };
  }, [
    appLockEnabled,
    isAuthenticating,
    isReady,
    isSupported,
    isUnlocked,
    shouldAutoAuthenticate,
    shouldShowSetupPrompt,
  ]);

  if (!appLockEnabled) {
    return (
      <>
        {children}
        {shouldShowSetupPrompt ? (
          <View
            pointerEvents="auto"
            style={[styles.promptOverlay, { backgroundColor: colors.overlay }]}
          >
            <View
              style={[
                styles.promptCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  shadowColor: colors.shadow,
                },
              ]}
            >
              <View
                style={[
                  styles.promptIcon,
                  { backgroundColor: colors.surfaceMuted },
                ]}
              >
                <Feather name="shield" size={26} color={colors.text} />
              </View>
              <Text style={[styles.title, { color: colors.text }]}>
                Use {biometricPromptCopy.label}?
              </Text>
              <Text style={[styles.body, { color: colors.textMuted }]}>
                Pocket ID can ask for {biometricPromptCopy.label} before opening
                after the app is locked or sent to the background.
              </Text>
              <View style={styles.promptActions}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    setHasPromptedForAppLock(true);
                  }}
                  style={[
                    styles.secondaryButton,
                    {
                      backgroundColor: colors.surfaceMuted,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[styles.secondaryButtonText, { color: colors.text }]}
                  >
                    Setup later
                  </Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    setHasPromptedForAppLock(true);
                    setAppLockEnabled(true);
                    setIsUnlocked(true);
                    setShouldAutoAuthenticate(false);
                  }}
                  style={[
                    styles.button,
                    styles.promptPrimaryButton,
                    { backgroundColor: colors.accent },
                  ]}
                >
                  <Feather name="lock" size={18} color={colors.accentText} />
                  <Text
                    style={[styles.buttonText, { color: colors.accentText }]}
                  >
                    {biometricPromptCopy.buttonText}
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        ) : null}
      </>
    );
  }

  if (shouldShowSetupPrompt) {
    return (
      <>
        {children}
        <View
          pointerEvents="auto"
          style={[styles.promptOverlay, { backgroundColor: colors.overlay }]}
        >
          <View
            style={[
              styles.promptCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                shadowColor: colors.shadow,
              },
            ]}
          >
            <View
              style={[
                styles.promptIcon,
                { backgroundColor: colors.surfaceMuted },
              ]}
            >
              <Feather name="shield" size={26} color={colors.text} />
            </View>
            <Text style={[styles.title, { color: colors.text }]}>
              Use {biometricPromptCopy.label}?
            </Text>
            <Text style={[styles.body, { color: colors.textMuted }]}>
              Pocket ID can ask for {biometricPromptCopy.label} before opening
              after the app is locked or sent to the background.
            </Text>
            <View style={styles.promptActions}>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setAppLockEnabled(false);
                  setHasPromptedForAppLock(true);
                  setIsUnlocked(true);
                  setShouldAutoAuthenticate(false);
                }}
                style={[
                  styles.secondaryButton,
                  {
                    backgroundColor: colors.surfaceMuted,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text
                  style={[styles.secondaryButtonText, { color: colors.text }]}
                >
                  Setup later
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setHasPromptedForAppLock(true);
                  setAppLockEnabled(true);
                  setIsUnlocked(true);
                  setShouldAutoAuthenticate(false);
                }}
                style={[
                  styles.button,
                  styles.promptPrimaryButton,
                  { backgroundColor: colors.accent },
                ]}
              >
                <Feather name="lock" size={18} color={colors.accentText} />
                <Text style={[styles.buttonText, { color: colors.accentText }]}>
                  {biometricPromptCopy.buttonText}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </>
    );
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
  promptOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    zIndex: 1000,
    elevation: 1000,
  },
  promptCard: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 30,
    borderWidth: 1,
    paddingHorizontal: 24,
    paddingVertical: 26,
    alignItems: "center",
    shadowOpacity: 0.14,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 16 },
  },
  promptIcon: {
    width: 64,
    height: 64,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  promptActions: {
    width: "100%",
    gap: 12,
    marginTop: 22,
  },
  promptPrimaryButton: {
    marginTop: 0,
    width: "100%",
  },
  secondaryButton: {
    minHeight: 52,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  secondaryButtonText: {
    fontFamily: "ReadexPro-Medium",
    fontSize: 15,
  },
});
