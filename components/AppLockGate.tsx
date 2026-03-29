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

const AUTO_AUTH_DELAY_MS = 180;
const AUTH_COOLDOWN_MS = 1200;
const DEFAULT_UNLOCK_MESSAGE =
  "Use your biometrics or device passcode to unlock this wallet.";
const RESUME_UNLOCK_MESSAGE = "Unlocking Pocket ID after returning to the app.";
const WAITING_FOR_PROMPT_MESSAGE = "Waiting for biometric prompt...";

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

function shouldAttemptDeviceFallback(code?: string) {
  return !(
    code === "user_cancel" ||
    code === "system_cancel" ||
    code === "app_cancel" ||
    code === "not_enrolled" ||
    code === "passcode_not_set"
  );
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

  // On Android, the system BiometricPrompt handles the UI for whichever
  // method is enrolled (fingerprint, face, iris).  Show a generic label so
  // users are never confused by e.g. "Face Unlock" when their device only
  // has a fingerprint sensor, or vice-versa.
  if (hasFingerprint || hasFace) {
    return {
      label: "biometric lock",
      buttonText: "Unlock with Biometrics",
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
  const lockScreenEnabled = useCardStore((state) => state.lockScreenEnabled);
  const setAppLockEnabled = useCardStore((state) => state.setAppLockEnabled);
  const hasCompletedAppLockSetup = useCardStore(
    (state) => state.hasCompletedAppLockSetup,
  );
  const setHasCompletedAppLockSetup = useCardStore(
    (state) => state.setHasCompletedAppLockSetup,
  );
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
  const [hasAuthFailed, setHasAuthFailed] = useState(false);
  const [isPreviewHidden, setIsPreviewHidden] = useState(
    AppState.currentState !== "active",
  );
  const [message, setMessage] = useState(DEFAULT_UNLOCK_MESSAGE);
  const [supportedAuthTypes, setSupportedAuthTypes] = useState<
    LocalAuthentication.AuthenticationType[]
  >([]);

  const appStateRef = useRef(AppState.currentState);
  const backgroundedSinceUnlockRef = useRef(
    AppState.currentState === "background",
  );
  const authInFlightRef = useRef(false);
  const authPromptActiveRef = useRef(false);
  const authCooldownUntilRef = useRef(0);
  const autoAuthenticateTimeoutRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);
  const previousAppLockEnabledRef = useRef<boolean | null>(null);
  const biometricPromptCopy = getBiometricPromptCopy(supportedAuthTypes);
  const shouldShowSetupPrompt =
    isReady &&
    hasSeenOnboarding &&
    isSupported &&
    !appLockEnabled &&
    !hasPromptedForAppLock;
  const isInAppLockSetupFlow = appLockEnabled && !hasCompletedAppLockSetup;

  const cancelAppLockSetup = () => {
    setAppLockEnabled(false);
    setHasCompletedAppLockSetup(false);
    setIsUnlocked(true);
    setHasAuthFailed(false);
    setShouldAutoAuthenticate(false);
    setMessage(DEFAULT_UNLOCK_MESSAGE);
  };

  const authenticate = async () => {
    if (authInFlightRef.current) {
      return;
    }

    authInFlightRef.current = true;
    authPromptActiveRef.current = true;
    setIsAuthenticating(true);
    setHasAuthFailed(false);
    setMessage(DEFAULT_UNLOCK_MESSAGE);

    try {
      // On Android, pass disableDeviceFallback: false so the OS handles the
      // PIN/pattern fallback natively in a single prompt. On iOS we attempt
      // biometric-only first and then fall back manually if needed.
      if (Platform.OS === "android") {
        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: "Unlock Pocket ID",
          cancelLabel: "Cancel",
          disableDeviceFallback: false,
        });

        if (result.success) {
          backgroundedSinceUnlockRef.current = false;
          setIsUnlocked(true);
          setHasAuthFailed(false);
          setHasCompletedAppLockSetup(true);
          setMessage(DEFAULT_UNLOCK_MESSAGE);
          return;
        }

        setIsUnlocked(false);
        setHasAuthFailed(true);
        setMessage(getAuthErrorMessage(result.error));
        return;
      }

      const biometricResult = await LocalAuthentication.authenticateAsync({
        promptMessage: "Unlock Pocket ID",
        cancelLabel: "Cancel",
        disableDeviceFallback: true,
      });

      if (biometricResult.success) {
        backgroundedSinceUnlockRef.current = false;
        setIsUnlocked(true);
        setHasAuthFailed(false);
        setHasCompletedAppLockSetup(true);
        setMessage(DEFAULT_UNLOCK_MESSAGE);
        return;
      }

      if (shouldAttemptDeviceFallback(biometricResult.error)) {
        setMessage("Biometric check failed. Trying your device passcode...");

        const fallbackResult = await LocalAuthentication.authenticateAsync({
          promptMessage: "Unlock Pocket ID",
          cancelLabel: "Cancel",
          fallbackLabel: "Use Passcode",
          disableDeviceFallback: false,
        });

        if (fallbackResult.success) {
          backgroundedSinceUnlockRef.current = false;
          setIsUnlocked(true);
          setHasAuthFailed(false);
          setHasCompletedAppLockSetup(true);
          setMessage(DEFAULT_UNLOCK_MESSAGE);
          return;
        }

        setIsUnlocked(false);
        setHasAuthFailed(true);
        setMessage(getAuthErrorMessage(fallbackResult.error));
        return;
      }

      setIsUnlocked(false);
      setHasAuthFailed(true);
      setMessage(getAuthErrorMessage(biometricResult.error));
    } catch {
      setIsUnlocked(false);
      setHasAuthFailed(true);
      setMessage("Authentication is temporarily unavailable. Try again.");
    } finally {
      authInFlightRef.current = false;
      setIsAuthenticating(false);
      // On Android the biometric prompt runs as a system dialog that can
      // push the app to "background".  The AppState transition back to
      // "active" sometimes fires AFTER the promise resolves and the refs
      // are cleared, which causes an immediate re-lock.  Keep the prompt
      // guard active for a short cooldown so the AppState handler ignores
      // the stale background→active transition.
      if (Platform.OS === "android") {
        authCooldownUntilRef.current = Date.now() + AUTH_COOLDOWN_MS;
        setTimeout(() => {
          authPromptActiveRef.current = false;
        }, AUTH_COOLDOWN_MS);
      } else {
        authPromptActiveRef.current = false;
      }
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
        setHasAuthFailed(false);
        if (!biometricSupported) {
          setHasCompletedAppLockSetup(false);
        }
        return;
      }

      setMessage(DEFAULT_UNLOCK_MESSAGE);

      if (wasEnabled === false) {
        setIsUnlocked(false);
        setShouldAutoAuthenticate(true);
        setMessage(WAITING_FOR_PROMPT_MESSAGE);
        return;
      }

      setIsUnlocked(false);
      setShouldAutoAuthenticate(true);
      setMessage(WAITING_FOR_PROMPT_MESSAGE);
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

      if (nextState === "inactive") {
        if (authPromptActiveRef.current) {
          return;
        }

        setIsPreviewHidden(true);
        return;
      }

      if (nextState === "background") {
        if (authPromptActiveRef.current) {
          return;
        }

        backgroundedSinceUnlockRef.current = true;
        setIsPreviewHidden(true);
        return;
      }

      if (
        previousState === "background" &&
        nextState === "active" &&
        isSupported &&
        appLockEnabled &&
        backgroundedSinceUnlockRef.current &&
        !authPromptActiveRef.current &&
        Date.now() > authCooldownUntilRef.current
      ) {
        backgroundedSinceUnlockRef.current = false;
        setIsUnlocked(false);
        setMessage(RESUME_UNLOCK_MESSAGE);
        setShouldAutoAuthenticate(true);
        setHasAuthFailed(false);
        return;
      }

      if (nextState === "active") {
        backgroundedSinceUnlockRef.current = false;
        setIsPreviewHidden(false);
      }
    });

    return () => {
      subscription.remove();
    };
  }, [appLockEnabled, isSupported]);

  useEffect(() => {
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

    if (autoAuthenticateTimeoutRef.current) {
      return;
    }

    autoAuthenticateTimeoutRef.current = setTimeout(() => {
      autoAuthenticateTimeoutRef.current = null;
      setMessage(WAITING_FOR_PROMPT_MESSAGE);
      setShouldAutoAuthenticate(false);
      void authenticate();
    }, AUTO_AUTH_DELAY_MS);
  }, [
    appLockEnabled,
    isAuthenticating,
    isReady,
    isSupported,
    isUnlocked,
    shouldAutoAuthenticate,
    shouldShowSetupPrompt,
  ]);

  useEffect(() => {
    return () => {
      if (autoAuthenticateTimeoutRef.current) {
        clearTimeout(autoAuthenticateTimeoutRef.current);
        autoAuthenticateTimeoutRef.current = null;
      }
    };
  }, []);

  const previewShield = isPreviewHidden && lockScreenEnabled ? (
    <View
      pointerEvents="none"
      style={[styles.previewShield, { backgroundColor: colors.background }]}
    >
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
          App preview unavailable for security reasons
        </Text>
        <Text style={[styles.body, { color: colors.textMuted }]}>
          Return to Pocket ID to continue.
        </Text>
      </View>
    </View>
  ) : null;

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
                    setHasCompletedAppLockSetup(false);
                  }}
                  style={[
                    styles.secondaryButton,
                    {
                      backgroundColor: colors.surfaceMuted,
                      borderColor: colors.buttonBorder,
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
                    setHasCompletedAppLockSetup(false);
                    setIsUnlocked(false);
                    setHasAuthFailed(false);
                    setMessage(WAITING_FOR_PROMPT_MESSAGE);
                    setShouldAutoAuthenticate(true);
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
        {previewShield}
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
    return (
      <>
        {children}
        {previewShield}
      </>
    );
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
          App preview unavailable for security reasons
        </Text>
        <Text style={[styles.body, { color: colors.textMuted }]}>
          {message}
        </Text>
        {isAuthenticating ? (
          <View
            style={[
              styles.button,
              {
                backgroundColor: colors.accent,
                opacity: 0.85,
              },
            ]}
          >
            <ActivityIndicator size="small" color={colors.accentText} />
            <Text style={[styles.buttonText, { color: colors.accentText }]}>
              Checking…
            </Text>
          </View>
        ) : hasAuthFailed ? (
          <>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setShouldAutoAuthenticate(true);
              }}
              style={[
                styles.button,
                {
                  backgroundColor: colors.accent,
                },
              ]}
            >
              <Feather name="refresh-cw" size={18} color={colors.accentText} />
              <Text style={[styles.buttonText, { color: colors.accentText }]}>
                Try Again
              </Text>
            </Pressable>
            {isInAppLockSetupFlow ? (
              <Pressable
                accessibilityRole="button"
                onPress={cancelAppLockSetup}
                style={[
                  styles.secondaryButton,
                  styles.secondaryAction,
                  {
                    backgroundColor: colors.surfaceMuted,
                    borderColor: colors.buttonBorder,
                  },
                ]}
              >
                <Text
                  style={[styles.secondaryButtonText, { color: colors.text }]}
                >
                  Setup later
                </Text>
              </Pressable>
            ) : null}
          </>
        ) : isInAppLockSetupFlow ? (
          <Pressable
            accessibilityRole="button"
            onPress={cancelAppLockSetup}
            style={[
              styles.secondaryButton,
              styles.secondaryAction,
              {
                backgroundColor: colors.surfaceMuted,
                borderColor: colors.buttonBorder,
              },
            ]}
          >
            <Text style={[styles.secondaryButtonText, { color: colors.text }]}>
              Setup later
            </Text>
          </Pressable>
        ) : null}
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
    minHeight: 52,
    borderRadius: 20,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  buttonText: {
    fontFamily: "ReadexPro-Medium",
    fontSize: 15,
    textAlign: "center",
  },
  promptOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    zIndex: 1000,
    elevation: 1000,
  },
  previewShield: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    zIndex: 1100,
    elevation: 1100,
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
    borderRadius: 20,
    borderWidth: 1,
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
  secondaryAction: {
    marginTop: 12,
    width: "100%",
  },
});
