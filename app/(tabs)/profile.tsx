import { Feather } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useColorScheme,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { deleteWalletSnapshot, isSupabaseConfigured } from "@/lib/supabase";
import { useAuthStore } from "@/store/useAuthStore";
import { useCardStore } from "@/store/useCardStore";
import { useCloudVaultStore } from "@/store/useCloudVaultStore";
import { FILTER_LABELS, type CardCategory } from "@/types/card";
import {
  deleteStoredSyncPassphrase,
  hasStoredSyncPassphrase,
} from "@/utils/cloudVault";
import { getPrimaryAppScheme } from "@/utils/deepLink";
import { signInWithProvider, signOut } from "@/utils/authSync";
import { APP_THEME, resolveTheme } from "@/utils/theme";

const CATEGORY_ORDER: CardCategory[] = [
  "bank",
  "personal",
  "club",
  "insurance",
  "vehicle",
  "access",
];

const SUPABASE_SETUP_STEPS = [
  "Create or open your Supabase project.",
  "Go to Project Settings > API.",
  "Copy the Project URL and the anon public key.",
  "Add them to .env.local and rebuild the native app.",
  "In Authentication > Providers, enable Google before testing sign-in.",
];

function SetupValue({
  label,
  value,
  colors,
}: {
  label: string;
  value: string;
  colors: (typeof APP_THEME)[keyof typeof APP_THEME];
}) {
  return (
    <View
      style={[
        styles.setupValue,
        { backgroundColor: colors.surfaceMuted, borderColor: colors.border },
      ]}
    >
      <Text style={[styles.setupValueLabel, { color: colors.textSoft }]}>
        {label}
      </Text>
      <Text style={[styles.setupValueText, { color: colors.text }]}>
        {value}
      </Text>
    </View>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const cards = useCardStore((state) => state.cards);
  const replaceCards = useCardStore((state) => state.replaceCards);
  const themePreference = useCardStore((state) => state.themePreference);
  const authUser = useAuthStore((state) => state.user);
  const authReady = useAuthStore((state) => state.isReady);
  const cloudVaultChangeToken = useCloudVaultStore((state) => state.changeToken);
  const bumpCloudVaultChangeToken = useCloudVaultStore(
    (state) => state.bumpChangeToken,
  );
  const deviceScheme = useColorScheme();
  const { width } = useWindowDimensions();
  const resolvedTheme = resolveTheme(themePreference, deviceScheme);
  const colors = APP_THEME[resolvedTheme];
  const isCompact = width < 390;
  const isVeryCompact = width < 360;
  const [authBusy, setAuthBusy] = useState<
    | "google"
    | "switch-google"
    | "delete-data"
    | "signout"
    | "forget-passphrase"
    | null
  >(null);
  const [cloudVaultStatus, setCloudVaultStatus] = useState<
    "loading" | "missing" | "ready"
  >("loading");

  const categoryStats = useMemo(
    () =>
      CATEGORY_ORDER.map((category) => ({
        category,
        count: cards.filter((card) => card.category === category).length,
      })),
    [cards],
  );

  useEffect(() => {
    if (!authUser) {
      setCloudVaultStatus("missing");
      return;
    }

    let cancelled = false;
    setCloudVaultStatus("loading");

    hasStoredSyncPassphrase(authUser.id)
      .then((exists) => {
        if (cancelled) return;
        setCloudVaultStatus(exists ? "ready" : "missing");
      })
      .catch(() => {
        if (cancelled) return;
        setCloudVaultStatus("missing");
      });

    return () => {
      cancelled = true;
    };
  }, [authUser, cloudVaultChangeToken]);

  const handleSignIn = async (provider: "google") => {
    try {
      setAuthBusy(provider);
      await signInWithProvider(provider);
    } finally {
      setAuthBusy(null);
    }
  };

  const handleSwitchGoogleAccount = async () => {
    try {
      setAuthBusy("switch-google");
      await signOut();
      await signInWithProvider("google", { selectAccount: true });
    } finally {
      setAuthBusy(null);
    }
  };

  const handleSignOut = async () => {
    try {
      setAuthBusy("signout");
      await signOut();
    } finally {
      setAuthBusy(null);
    }
  };

  const handleOpenCloudPassphrase = () => {
    router.push("/cloud-passphrase");
  };

  const handleForgetPassphrase = () => {
    if (!authUser) return;

    Alert.alert(
      "Forget sync passphrase on this device?",
      "Cloud sync will pause here until you enter the passphrase again. Your encrypted data stays in Supabase, but this device will no longer be able to decrypt it.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Forget Passphrase",
          style: "destructive",
          onPress: async () => {
            try {
              setAuthBusy("forget-passphrase");
              await deleteStoredSyncPassphrase(authUser.id);
              bumpCloudVaultChangeToken();
            } catch {
              Alert.alert(
                "Could not forget passphrase",
                "Pocket ID couldn't remove the local sync passphrase right now. Please try again.",
              );
            } finally {
              setAuthBusy(null);
            }
          },
        },
      ],
    );
  };

  const handleDeleteData = () => {
    if (!authUser) return;

    Alert.alert(
      "Delete your data?",
      "This removes your synced wallet data and clears saved cards on this device. Your Google sign-in remains available, but this action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete Data",
          style: "destructive",
          onPress: async () => {
            try {
              setAuthBusy("delete-data");
              await deleteWalletSnapshot(authUser.id);
              replaceCards([]);
              await signOut();
            } catch {
              Alert.alert(
                "Could not delete data",
                "Pocket ID couldn't remove your saved data right now. Please try again.",
              );
            } finally {
              setAuthBusy(null);
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingHorizontal: isCompact ? 20 : 25,
            paddingTop: isCompact ? 20 : 25,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            styles.hero,
            {
              backgroundColor: colors.surface,
              borderRadius: isCompact ? 26 : 32,
              padding: isCompact ? 20 : 24,
            },
          ]}
        >
          <View style={[styles.avatar, { backgroundColor: colors.accent }]}>
            <Feather name="user" size={32} color={colors.accentText} />
          </View>
          <Text
            style={[
              styles.heroTitle,
              { color: colors.text, fontSize: isCompact ? 24 : 30 },
            ]}
          >
            {authUser?.displayName ?? "Pocket ID Owner"}
          </Text>
          <Text
            style={[
              styles.heroBody,
              {
                color: colors.textMuted,
                fontSize: isCompact ? 14 : 15,
                lineHeight: isCompact ? 20 : 22,
              },
            ]}
          >
            {authUser?.email ??
              "A quick view of what is currently stored in your wallet."}
          </Text>

          <View style={[styles.statRow, { gap: isCompact ? 10 : 12 }]}>
            <View
              style={[
                styles.statCard,
                {
                  backgroundColor: colors.surfaceMuted,
                  borderRadius: isCompact ? 18 : 22,
                  padding: isCompact ? 14 : 16,
                },
              ]}
            >
              <Text
                style={[
                  styles.statValue,
                  { color: colors.text, fontSize: isCompact ? 24 : 28 },
                ]}
              >
                {cards.length}
              </Text>
              <Text
                style={[
                  styles.statLabel,
                  {
                    color: colors.textMuted,
                    fontSize: isCompact ? 12 : 13,
                    lineHeight: isCompact ? 16 : 18,
                  },
                ]}
              >
                {isVeryCompact ? "Saved" : "Saved items"}
              </Text>
            </View>
            <View
              style={[
                styles.statCard,
                {
                  backgroundColor: colors.surfaceMuted,
                  borderRadius: isCompact ? 18 : 22,
                  padding: isCompact ? 14 : 16,
                },
              ]}
            >
              <Text
                style={[
                  styles.statValue,
                  { color: colors.text, fontSize: isCompact ? 24 : 28 },
                ]}
              >
                {categoryStats.filter((item) => item.count > 0).length}
              </Text>
              <Text
                style={[
                  styles.statLabel,
                  {
                    color: colors.textMuted,
                    fontSize: isCompact ? 12 : 13,
                    lineHeight: isCompact ? 16 : 18,
                  },
                ]}
              >
                {isVeryCompact ? "Categories" : "Active categories"}
              </Text>
            </View>
          </View>
        </View>

        <View
          style={[
            styles.section,
            {
              backgroundColor: colors.surface,
              borderRadius: isCompact ? 26 : 32,
              padding: isCompact ? 20 : 24,
            },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Account
          </Text>
          {!isSupabaseConfigured ? (
            <>
              <Text style={[styles.accountLabel, { color: colors.text }]}>
                Supabase setup is still missing
              </Text>
              <Text style={[styles.accountBody, { color: colors.textMuted }]}>
                Cloud sign-in does not use an app-store API. It needs your own
                Supabase project URL and anon key.
              </Text>
              <View style={styles.setupList}>
                {SUPABASE_SETUP_STEPS.map((step, index) => (
                  <View key={step} style={styles.setupRow}>
                    <View
                      style={[
                        styles.setupIndex,
                        { backgroundColor: colors.surfaceMuted },
                      ]}
                    >
                      <Text
                        style={[styles.setupIndexText, { color: colors.text }]}
                      >
                        {index + 1}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.setupStepText,
                        { color: colors.textMuted },
                      ]}
                    >
                      {step}
                    </Text>
                  </View>
                ))}
              </View>
              <SetupValue
                label="Env var"
                value="EXPO_PUBLIC_SUPABASE_URL"
                colors={colors}
              />
              <SetupValue
                label="Env var"
                value="EXPO_PUBLIC_SUPABASE_ANON_KEY"
                colors={colors}
              />
              <Text style={[styles.setupHint, { color: colors.textSoft }]}>
                Redirect scheme: {getPrimaryAppScheme()}://auth/callback
              </Text>
            </>
          ) : !authReady ? (
            <View style={styles.authLoading}>
              <ActivityIndicator size="small" color={colors.text} />
              <Text style={[styles.accountBody, { color: colors.textMuted }]}>
                Checking account session…
              </Text>
            </View>
          ) : authUser ? (
            <>
              <Text style={[styles.accountLabel, { color: colors.text }]}>
                Signed in as
              </Text>
              <Text style={[styles.accountValue, { color: colors.textMuted }]}>
                {authUser.displayName ?? authUser.email ?? "Pocket ID user"}
              </Text>
              <Text style={[styles.accountBody, { color: colors.textMuted }]}>
                Cloud sync is active for your saved cards on this account.
              </Text>
              <View
                style={[
                  styles.vaultStatusCard,
                  {
                    backgroundColor: colors.surfaceMuted,
                    borderColor:
                      cloudVaultStatus === "ready"
                        ? colors.accent
                        : colors.border,
                  },
                ]}
              >
                <Text style={[styles.vaultStatusTitle, { color: colors.text }]}>
                  {cloudVaultStatus === "ready"
                    ? "Encrypted cloud vault is enabled"
                    : cloudVaultStatus === "loading"
                      ? "Checking encrypted cloud vault…"
                      : "Encrypted cloud vault is not set up yet"}
                </Text>
                <Text
                  style={[styles.vaultStatusBody, { color: colors.textMuted }]}
                >
                  {cloudVaultStatus === "ready"
                    ? "Your cards are encrypted on this device before upload, so the database stores ciphertext instead of readable card details."
                    : "Set a sync passphrase to encrypt cards before upload. Until then, cloud sync stays paused on this device to avoid sending readable card data."}
                </Text>
              </View>
              <View style={styles.accountActions}>
                <Pressable
                  onPress={handleOpenCloudPassphrase}
                  style={[
                    styles.authButton,
                    styles.authButtonSecondary,
                    {
                      backgroundColor: colors.surfaceMuted,
                      borderColor: colors.border,
                    },
                    styles.authButtonOutline,
                  ]}
                >
                  <Text style={[styles.authButtonText, { color: colors.text }]}>
                    {cloudVaultStatus === "ready"
                      ? "Update Sync Passphrase"
                      : "Set Sync Passphrase"}
                  </Text>
                </Pressable>
                {cloudVaultStatus === "ready" ? (
                  <Pressable
                    onPress={handleForgetPassphrase}
                    style={[
                      styles.authButton,
                      styles.authButtonSecondary,
                      {
                        backgroundColor: colors.surfaceMuted,
                        borderColor: colors.border,
                      },
                      styles.authButtonOutline,
                    ]}
                  >
                    <Text
                      style={[styles.authButtonText, { color: colors.text }]}
                    >
                      {authBusy === "forget-passphrase"
                        ? "Forgetting passphrase…"
                        : "Forget Passphrase on This Device"}
                    </Text>
                  </Pressable>
                ) : null}
                <Pressable
                  onPress={handleSwitchGoogleAccount}
                  style={[
                    styles.authButton,
                    styles.authButtonSecondary,
                    { backgroundColor: colors.accent },
                  ]}
                >
                  <Text
                    style={[
                      styles.authButtonText,
                      { color: colors.accentText },
                    ]}
                  >
                    {authBusy === "switch-google"
                      ? "Switching Google…"
                      : "Switch Google Account"}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={handleDeleteData}
                  style={[
                    styles.authButton,
                    styles.authButtonSecondary,
                    {
                      backgroundColor: colors.dangerSoft,
                      borderColor: colors.danger,
                    },
                    styles.authButtonDanger,
                  ]}
                >
                  <Text
                    style={[styles.authButtonText, { color: colors.danger }]}
                  >
                    {authBusy === "delete-data"
                      ? "Deleting data…"
                      : "Delete My Data"}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={handleSignOut}
                  style={[
                    styles.authButton,
                    styles.authButtonSecondary,
                    { backgroundColor: colors.surfaceMuted },
                  ]}
                >
                  <Text style={[styles.authButtonText, { color: colors.text }]}>
                    {authBusy === "signout" ? "Signing out…" : "Sign Out"}
                  </Text>
                </Pressable>
              </View>
            </>
          ) : (
            <>
              <Text style={[styles.accountBody, { color: colors.textMuted }]}>
                Sign in to restore your cards on a new device and keep this
                wallet synced.
              </Text>
              <Pressable
                onPress={() => handleSignIn("google")}
                style={[styles.authButton, { backgroundColor: colors.accent }]}
              >
                <Text
                  style={[styles.authButtonText, { color: colors.accentText }]}
                >
                  {authBusy === "google"
                    ? "Connecting Google…"
                    : "Continue With Google"}
                </Text>
              </Pressable>
            </>
          )}
        </View>

        <View
          style={[
            styles.section,
            {
              backgroundColor: colors.surface,
              borderRadius: isCompact ? 26 : 32,
              padding: isCompact ? 20 : 24,
            },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Category Breakdown
          </Text>
          {categoryStats.map((item) => (
            <View
              key={item.category}
              style={[styles.row, { borderBottomColor: colors.border }]}
            >
              <Text style={[styles.rowLabel, { color: colors.text }]}>
                {FILTER_LABELS[item.category]}
              </Text>
              <Text style={[styles.rowValue, { color: colors.textMuted }]}>
                {item.count}
              </Text>
            </View>
          ))}
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
    paddingHorizontal: 25,
    paddingTop: 25,
    paddingBottom: 24,
    gap: 18,
  },
  hero: {
    borderRadius: 32,
    padding: 24,
    alignItems: "flex-start",
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  heroTitle: {
    fontFamily: "ReadexPro-Bold",
    fontSize: 30,
  },
  heroBody: {
    fontFamily: "ReadexPro-Regular",
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8,
  },
  setupList: {
    marginTop: 18,
    gap: 12,
  },
  setupRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  setupIndex: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  setupIndexText: {
    fontFamily: "ReadexPro-Bold",
    fontSize: 13,
  },
  setupStepText: {
    flex: 1,
    fontFamily: "ReadexPro-Regular",
    fontSize: 14,
    lineHeight: 21,
  },
  setupValue: {
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginTop: 14,
  },
  setupValueLabel: {
    fontFamily: "ReadexPro-Regular",
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  setupValueText: {
    fontFamily: "ReadexPro-Medium",
    fontSize: 14,
  },
  setupHint: {
    fontFamily: "ReadexPro-Regular",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 12,
  },
  statRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 22,
  },
  statCard: {
    flex: 1,
    borderRadius: 22,
    padding: 16,
  },
  statValue: {
    fontFamily: "ReadexPro-Bold",
    fontSize: 28,
  },
  statLabel: {
    fontFamily: "ReadexPro-Regular",
    fontSize: 13,
    marginTop: 6,
  },
  section: {
    borderRadius: 32,
    padding: 24,
  },
  sectionTitle: {
    fontFamily: "ReadexPro-Bold",
    fontSize: 22,
    marginBottom: 10,
  },
  accountLabel: {
    fontFamily: "ReadexPro-Medium",
    fontSize: 15,
  },
  accountValue: {
    fontFamily: "ReadexPro-Bold",
    fontSize: 18,
    marginTop: 6,
  },
  accountBody: {
    fontFamily: "ReadexPro-Regular",
    fontSize: 14,
    lineHeight: 22,
    marginTop: 8,
  },
  authLoading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 8,
  },
  authButton: {
    marginTop: 14,
    borderRadius: 20,
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  accountActions: {
    width: "100%",
    marginTop: 8,
    gap: 12,
  },
  authButtonSecondary: {
    marginTop: 0,
  },
  authButtonDanger: {
    borderWidth: 1,
  },
  authButtonOutline: {
    borderWidth: 1,
  },
  authButtonText: {
    fontFamily: "ReadexPro-Bold",
    fontSize: 15,
  },
  vaultStatusCard: {
    borderWidth: 1,
    borderRadius: 22,
    marginTop: 18,
    padding: 16,
  },
  vaultStatusTitle: {
    fontFamily: "ReadexPro-Bold",
    fontSize: 15,
  },
  vaultStatusBody: {
    fontFamily: "ReadexPro-Regular",
    fontSize: 13,
    lineHeight: 20,
    marginTop: 8,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  rowLabel: {
    fontFamily: "ReadexPro-Regular",
    fontSize: 15,
  },
  rowValue: {
    fontFamily: "ReadexPro-Bold",
    fontSize: 15,
  },
});
