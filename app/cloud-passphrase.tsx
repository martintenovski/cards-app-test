import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useColorScheme,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";

import { AppPreviewShield } from "@/components/AppPreviewShield";
import { useAuthStore } from "@/store/useAuthStore";
import { useCardStore } from "@/store/useCardStore";
import { useCloudVaultStore } from "@/store/useCloudVaultStore";
import {
  MIN_SYNC_PASSPHRASE_LENGTH,
  hasStoredSyncPassphrase,
  saveStoredSyncPassphrase,
  validateSyncPassphrase,
} from "@/utils/cloudVault";
import { APP_THEME, resolveTheme } from "@/utils/theme";

type PassphraseStrength = {
  label: "Too weak" | "Weak" | "Okay" | "Strong" | "Very strong";
  score: number;
};

function getPassphraseStrength(passphrase: string): PassphraseStrength {
  if (!passphrase) {
    return { label: "Too weak", score: 0 };
  }

  let score = 0;

  if (passphrase.length >= MIN_SYNC_PASSPHRASE_LENGTH) score += 1;
  if (passphrase.length >= 14) score += 1;
  if (/[a-z]/.test(passphrase) && /[A-Z]/.test(passphrase)) score += 1;
  if (/\d/.test(passphrase)) score += 1;
  if (/[^A-Za-z0-9]/.test(passphrase)) score += 1;

  if (score <= 1) {
    return {
      label:
        passphrase.length < MIN_SYNC_PASSPHRASE_LENGTH ? "Too weak" : "Weak",
      score: Math.max(score, 1),
    };
  }

  if (score === 2) {
    return { label: "Okay", score };
  }

  if (score === 3 || score === 4) {
    return { label: "Strong", score };
  }

  return { label: "Very strong", score };
}

export default function CloudPassphraseScreen() {
  const router = useRouter();
  const authUser = useAuthStore((state) => state.user);
  const themePreference = useCardStore((state) => state.themePreference);
  const requestSync = useCloudVaultStore((state) => state.requestSync);
  const bumpCloudVaultChangeToken = useCloudVaultStore(
    (state) => state.bumpChangeToken,
  );
  const deviceScheme = useColorScheme();
  const resolvedTheme = resolveTheme(themePreference, deviceScheme);
  const colors = APP_THEME[resolvedTheme];
  const [passphrase, setPassphrase] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [isPassphraseVisible, setIsPassphraseVisible] = useState(false);
  const [isConfirmationVisible, setIsConfirmationVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasExistingPassphrase, setHasExistingPassphrase] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const passphraseStrength = useMemo(
    () => getPassphraseStrength(passphrase),
    [passphrase],
  );

  useEffect(() => {
    if (!authUser) {
      router.replace("/(tabs)/profile");
      return;
    }

    let cancelled = false;

    hasStoredSyncPassphrase(authUser.id)
      .then((exists) => {
        if (cancelled) return;
        setHasExistingPassphrase(exists);
      })
      .finally(() => {
        if (cancelled) return;
        setIsChecking(false);
      });

    return () => {
      cancelled = true;
    };
  }, [authUser, router]);

  const helperText = useMemo(() => {
    if (hasExistingPassphrase) {
      return "Use the same updated passphrase on your other devices before you expect them to decrypt newly synced cards.";
    }

    return "This passphrase never goes to Supabase. It stays on this device and is used to encrypt your card vault before upload. If you already have saved cards waiting in cloud sync, you must enter the exact same passphrase that was used before so Pocket ID can decrypt them.";
  }, [hasExistingPassphrase]);

  const handleSave = async () => {
    if (!authUser || isSaving) return;

    if (passphrase !== confirmation) {
      Alert.alert(
        "Passphrases do not match",
        "Enter the same passphrase twice.",
      );
      return;
    }

    try {
      validateSyncPassphrase(passphrase);
    } catch (error) {
      Alert.alert(
        "Passphrase too short",
        error instanceof Error
          ? error.message
          : `Use at least ${MIN_SYNC_PASSPHRASE_LENGTH} characters.`,
      );
      return;
    }

    try {
      setIsSaving(true);
      await saveStoredSyncPassphrase(authUser.id, passphrase);
      requestSync(
        hasExistingPassphrase
          ? "Refreshing your encrypted Pocket ID vault..."
          : "Decrypting and importing your encrypted wallet...",
      );
      bumpCloudVaultChangeToken();
      router.back();
    } catch (error) {
      Alert.alert(
        "Could not save passphrase",
        error instanceof Error
          ? error.message
          : "Pocket ID could not save your sync passphrase right now.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 24}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.headerRow}>
            <Pressable
              onPress={() => router.back()}
              hitSlop={12}
              style={[
                styles.backButton,
                { backgroundColor: colors.surfaceMuted },
              ]}
            >
              <Feather name="arrow-left" size={20} color={colors.text} />
            </Pressable>
            <View style={styles.headerTextWrap}>
              <Text style={[styles.eyebrow, { color: colors.textSoft }]}>
                Cloud Vault
              </Text>
              <Text style={[styles.title, { color: colors.text }]}>
                Sync passphrase
              </Text>
            </View>
          </View>

          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>
              End-to-end encrypted sync
            </Text>
            <Text style={[styles.cardBody, { color: colors.textMuted }]}>
              {helperText}
            </Text>
            <Text style={[styles.cardHint, { color: colors.textSoft }]}>
              Use at least {MIN_SYNC_PASSPHRASE_LENGTH} characters. A longer
              phrase is much safer than a short clever one.
            </Text>
            <Text style={[styles.cardHint, { color: colors.textSoft }]}>
              Already synced cards from another device? Use the same sync
              passphrase there too, or this device will not be able to read
              them.
            </Text>
          </View>

          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            {isChecking ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator size="small" color={colors.text} />
                <Text style={[styles.loadingText, { color: colors.textMuted }]}>
                  Checking current cloud vault status…
                </Text>
              </View>
            ) : (
              <>
                <Text style={[styles.fieldLabel, { color: colors.text }]}>
                  {hasExistingPassphrase ? "New passphrase" : "Passphrase"}
                </Text>
                <View
                  style={[
                    styles.inputWrap,
                    {
                      backgroundColor: colors.surfaceMuted,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <TextInput
                    value={passphrase}
                    onChangeText={setPassphrase}
                    secureTextEntry={!isPassphraseVisible}
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="new-password"
                    textContentType="newPassword"
                    importantForAutofill="yes"
                    placeholder="Enter a strong sync passphrase"
                    placeholderTextColor={colors.textSoft}
                    style={[
                      styles.input,
                      styles.inputInner,
                      {
                        color: colors.text,
                      },
                    ]}
                  />
                  <Pressable
                    onPress={() => setIsPassphraseVisible((current) => !current)}
                    hitSlop={10}
                    accessibilityRole="button"
                    accessibilityLabel={
                      isPassphraseVisible
                        ? "Hide passphrase"
                        : "Show passphrase"
                    }
                    style={styles.visibilityButton}
                  >
                    <Feather
                      name={isPassphraseVisible ? "eye-off" : "eye"}
                      size={20}
                      color={colors.textMuted}
                    />
                  </Pressable>
                </View>

                <View style={styles.strengthWrap}>
                  <View style={styles.strengthBarRow}>
                    {[1, 2, 3, 4].map((index) => {
                      const isActive = passphraseStrength.score >= index;
                      const fillColor =
                        passphraseStrength.score <= 1
                          ? colors.danger
                          : passphraseStrength.score === 2
                            ? "#E7A93B"
                            : colors.accent;

                      return (
                        <View
                          key={index}
                          style={[
                            styles.strengthBar,
                            {
                              backgroundColor: isActive
                                ? fillColor
                                : colors.border,
                            },
                          ]}
                        />
                      );
                    })}
                  </View>
                  <Text
                    style={[styles.strengthLabel, { color: colors.textMuted }]}
                  >
                    Strength:{" "}
                    <Text style={{ color: colors.text }}>
                      {passphraseStrength.label}
                    </Text>
                  </Text>
                </View>

                <Text style={[styles.fieldLabel, { color: colors.text }]}>
                  Confirm passphrase
                </Text>
                <View
                  style={[
                    styles.inputWrap,
                    {
                      backgroundColor: colors.surfaceMuted,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <TextInput
                    value={confirmation}
                    onChangeText={setConfirmation}
                    secureTextEntry={!isConfirmationVisible}
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="new-password"
                    textContentType="newPassword"
                    importantForAutofill="yes"
                    placeholder="Enter it again"
                    placeholderTextColor={colors.textSoft}
                    returnKeyType="done"
                    onSubmitEditing={() => {
                      Keyboard.dismiss();
                      void handleSave();
                    }}
                    style={[
                      styles.input,
                      styles.inputInner,
                      {
                        color: colors.text,
                      },
                    ]}
                  />
                  <Pressable
                    onPress={() =>
                      setIsConfirmationVisible((current) => !current)
                    }
                    hitSlop={10}
                    accessibilityRole="button"
                    accessibilityLabel={
                      isConfirmationVisible
                        ? "Hide confirmation passphrase"
                        : "Show confirmation passphrase"
                    }
                    style={styles.visibilityButton}
                  >
                    <Feather
                      name={isConfirmationVisible ? "eye-off" : "eye"}
                      size={20}
                      color={colors.textMuted}
                    />
                  </Pressable>
                </View>

                <View
                  style={[
                    styles.warningBanner,
                    {
                      backgroundColor: colors.dangerSoft,
                      borderColor: colors.danger,
                    },
                  ]}
                >
                  <Feather
                    name="alert-triangle"
                    size={18}
                    color={colors.danger}
                  />
                  <View style={styles.warningTextWrap}>
                    <Text
                      style={[styles.warningTitle, { color: colors.danger }]}
                    >
                      Keep this passphrase safe
                    </Text>
                    <Text
                      style={[styles.warningBody, { color: colors.textMuted }]}
                    >
                      If you forget it, Pocket ID, Google, and Supabase cannot
                      recover your encrypted synced vault on a new device.
                    </Text>
                  </View>
                </View>

                <Pressable
                  onPress={() => {
                    Keyboard.dismiss();
                    void handleSave();
                  }}
                  disabled={isSaving}
                  style={[
                    styles.primaryButton,
                    {
                      backgroundColor: colors.accent,
                      opacity: isSaving ? 0.7 : 1,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.primaryButtonText,
                      { color: colors.accentText },
                    ]}
                  >
                    {isSaving
                      ? hasExistingPassphrase
                        ? "Updating…"
                        : "Saving…"
                      : hasExistingPassphrase
                        ? "Update Sync Passphrase"
                        : "Enable Encrypted Sync"}
                  </Text>
                </Pressable>
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      <AppPreviewShield />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 32,
    gap: 18,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTextWrap: {
    flex: 1,
  },
  eyebrow: {
    fontFamily: "ReadexPro-Medium",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  title: {
    fontFamily: "ReadexPro-Bold",
    fontSize: 28,
    marginTop: 4,
  },
  card: {
    borderRadius: 28,
    padding: 22,
  },
  cardTitle: {
    fontFamily: "ReadexPro-Bold",
    fontSize: 22,
  },
  cardBody: {
    fontFamily: "ReadexPro-Regular",
    fontSize: 14,
    lineHeight: 22,
    marginTop: 10,
  },
  cardHint: {
    fontFamily: "ReadexPro-Regular",
    fontSize: 12,
    lineHeight: 19,
    marginTop: 12,
  },
  fieldLabel: {
    fontFamily: "ReadexPro-Medium",
    fontSize: 15,
    marginBottom: 8,
  },
  input: {
    minHeight: 54,
    fontFamily: "OpenSans-Regular",
    fontSize: 15,
    marginBottom: 16,
  },
  inputWrap: {
    minHeight: 54,
    borderWidth: 1,
    borderRadius: 18,
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  inputInner: {
    flex: 1,
    marginBottom: 0,
    paddingLeft: 16,
    paddingRight: 10,
  },
  visibilityButton: {
    width: 48,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "stretch",
  },
  strengthWrap: {
    marginTop: -4,
    marginBottom: 16,
  },
  strengthBarRow: {
    flexDirection: "row",
    gap: 8,
  },
  strengthBar: {
    flex: 1,
    height: 6,
    borderRadius: 999,
  },
  strengthLabel: {
    fontFamily: "ReadexPro-Regular",
    fontSize: 12,
    marginTop: 8,
  },
  warningBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    marginBottom: 18,
  },
  warningTextWrap: {
    flex: 1,
  },
  warningTitle: {
    fontFamily: "ReadexPro-Bold",
    fontSize: 14,
  },
  warningBody: {
    fontFamily: "ReadexPro-Regular",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  primaryButton: {
    marginTop: 4,
    minHeight: 54,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  primaryButtonText: {
    fontFamily: "ReadexPro-Medium",
    fontSize: 15,
    textAlign: "center",
    width: "100%",
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  loadingText: {
    fontFamily: "ReadexPro-Regular",
    fontSize: 14,
  },
});
