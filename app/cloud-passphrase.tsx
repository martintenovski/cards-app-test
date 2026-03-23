import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
    return { label: passphrase.length < MIN_SYNC_PASSPHRASE_LENGTH ? "Too weak" : "Weak", score: Math.max(score, 1) };
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

    return "This passphrase never goes to Supabase. It stays on this device and is used to encrypt your card vault before upload.";
  }, [hasExistingPassphrase]);

  const handleSave = async () => {
    if (!authUser || isSaving) return;

    if (passphrase !== confirmation) {
      Alert.alert("Passphrases do not match", "Enter the same passphrase twice.");
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
          ? "Refreshing your encrypted Pocket ID vault…"
          : "Decrypting and importing your encrypted wallet…",
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
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={12}
            style={[styles.backButton, { backgroundColor: colors.surfaceMuted }]}
          >
            <Feather name="arrow-left" size={20} color={colors.text} />
          </Pressable>
          <View style={styles.headerTextWrap}>
            <Text style={[styles.eyebrow, { color: colors.textSoft }]}>
              Cloud Vault
            </Text>
            <Text style={[styles.title, { color: colors.text }]}>Sync passphrase</Text>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface }]}> 
          <Text style={[styles.cardTitle, { color: colors.text }]}>End-to-end encrypted sync</Text>
          <Text style={[styles.cardBody, { color: colors.textMuted }]}>
            {helperText}
          </Text>
          <Text style={[styles.cardHint, { color: colors.textSoft }]}> 
            Use at least {MIN_SYNC_PASSPHRASE_LENGTH} characters. A longer phrase is much safer than a short clever one.
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface }]}> 
          {isChecking ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color={colors.text} />
              <Text style={[styles.loadingText, { color: colors.textMuted }]}>Checking current cloud vault status…</Text>
            </View>
          ) : (
            <>
              <Text style={[styles.fieldLabel, { color: colors.text }]}> 
                {hasExistingPassphrase ? "New passphrase" : "Passphrase"}
              </Text>
              <TextInput
                value={passphrase}
                onChangeText={setPassphrase}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                placeholder="Enter a strong sync passphrase"
                placeholderTextColor={colors.textSoft}
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.surfaceMuted,
                    borderColor: colors.border,
                    color: colors.text,
                  },
                ]}
              />

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
                <Text style={[styles.strengthLabel, { color: colors.textMuted }]}> 
                  Strength: <Text style={{ color: colors.text }}>{passphraseStrength.label}</Text>
                </Text>
              </View>

              <Text style={[styles.fieldLabel, { color: colors.text }]}>Confirm passphrase</Text>
              <TextInput
                value={confirmation}
                onChangeText={setConfirmation}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                placeholder="Enter it again"
                placeholderTextColor={colors.textSoft}
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.surfaceMuted,
                    borderColor: colors.border,
                    color: colors.text,
                  },
                ]}
              />

              <View
                style={[
                  styles.warningBanner,
                  {
                    backgroundColor: colors.dangerSoft,
                    borderColor: colors.danger,
                  },
                ]}
              >
                <Feather name="alert-triangle" size={18} color={colors.danger} />
                <View style={styles.warningTextWrap}>
                  <Text style={[styles.warningTitle, { color: colors.danger }]}> 
                    Keep this passphrase safe
                  </Text>
                  <Text style={[styles.warningBody, { color: colors.textMuted }]}> 
                    If you forget it, Pocket ID, Google, and Supabase cannot recover your encrypted synced vault on a new device.
                  </Text>
                </View>
              </View>

              <Pressable
                onPress={handleSave}
                style={[styles.primaryButton, { backgroundColor: colors.accent }]}
              >
                <Text style={[styles.primaryButtonText, { color: colors.accentText }]}> 
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
    borderWidth: 1,
    borderRadius: 18,
    minHeight: 54,
    paddingHorizontal: 16,
    fontFamily: "OpenSans-Regular",
    fontSize: 15,
    marginBottom: 16,
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
    fontFamily: "ReadexPro-Bold",
    fontSize: 15,
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
