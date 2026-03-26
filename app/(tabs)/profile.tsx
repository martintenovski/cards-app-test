import { Feather } from "@expo/vector-icons";
import { useIsFocused } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
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

import { GoogleWordmark } from "@/components/GoogleWordmark";
import { isSupabaseConfigured, supabaseConfigStatus } from "@/lib/supabase";
import {
  getSupportBadges,
  getSupporterStatus,
  isSupporterActive,
  useCustomerInfo,
} from "@/src/services/purchases";
import { useSupportModalStore } from "@/src/store/useSupportModalStore";
import { useAuthStore } from "@/store/useAuthStore";
import { useCardStore } from "@/store/useCardStore";
import { useCloudVaultStore } from "@/store/useCloudVaultStore";
import { FILTER_LABELS, type CardCategory } from "@/types/card";
import { hasStoredSyncPassphrase } from "@/utils/cloudVault";
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

const FLOATING_TAB_SCROLL_BUFFER = 132;

const SUPABASE_SETUP_STEPS = [
  "Create or open your Supabase project.",
  "Go to Project Settings > API.",
  "Copy the Project URL and the anon public key.",
  "For local development, add them to .env.local.",
  "For preview or production phone builds, also add the same EXPO_PUBLIC_* values to your Expo/EAS environment variables and rebuild.",
  "In Authentication > Providers, enable Google before testing sign-in.",
];

function getAuthErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return "Pocket ID could not finish Google sign-in right now. Please try again.";
}

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

function SupporterBadges({
  badges,
  colors,
}: {
  badges: ReturnType<typeof getSupportBadges>;
  colors: (typeof APP_THEME)[keyof typeof APP_THEME];
}) {
  if (badges.length === 0) {
    return (
      <View
        style={[
          styles.supporterBadgeMuted,
          { backgroundColor: colors.surfaceMuted, borderColor: colors.border },
        ]}
      >
        <Text style={[styles.supporterBadgeText, { color: colors.textMuted }]}>
          Not a supporter yet
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.supporterBadgeList}>
      {badges.map((badge) =>
        badge.variant === "highlight" ? (
          <LinearGradient
            key={badge.key}
            colors={["#1A6BC8", "#4D93E6"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.supporterBadgeActive}
          >
            <Text style={styles.supporterBadgeText}>{badge.label}</Text>
          </LinearGradient>
        ) : (
          <View
            key={badge.key}
            style={[
              styles.supporterBadgeMuted,
              {
                backgroundColor: colors.surfaceMuted,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={[styles.supporterBadgeText, { color: colors.text }]}>
              {badge.label}
            </Text>
          </View>
        ),
      )}
    </View>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const isFocused = useIsFocused();
  const cards = useCardStore((state) => state.cards);
  const themePreference = useCardStore((state) => state.themePreference);
  const authUser = useAuthStore((state) => state.user);
  const authReady = useAuthStore((state) => state.isReady);
  const cloudVaultChangeToken = useCloudVaultStore(
    (state) => state.changeToken,
  );
  const openSettingsSection = useCloudVaultStore(
    (state) => state.openSettingsSection,
  );
  const requestSync = useCloudVaultStore((state) => state.requestSync);
  const openSupportModal = useSupportModalStore((state) => state.open);
  const { customerInfo } = useCustomerInfo({ autoInitialize: isFocused });
  const deviceScheme = useColorScheme();
  const { width } = useWindowDimensions();
  const resolvedTheme = resolveTheme(themePreference, deviceScheme);
  const colors = APP_THEME[resolvedTheme];
  const warningColor = resolvedTheme === "dark" ? "#FFB454" : "#C26B00";
  const warningBackground =
    resolvedTheme === "dark" ? "rgba(255,180,84,0.12)" : "rgba(194,107,0,0.10)";
  const isCompact = width < 390;
  const isVeryCompact = width < 360;
  const supabaseStatusMessage =
    supabaseConfigStatus === "invalid"
      ? "This build did not receive a valid Supabase URL and anon key. Placeholder values and malformed keys are treated as not configured."
      : "Cloud sign-in does not use an app-store API. It needs your own Supabase project URL and anon key.";
  const [authBusy, setAuthBusy] = useState<
    "google" | "switch-google" | "signout" | null
  >(null);
  const [cloudVaultStatus, setCloudVaultStatus] = useState<
    "loading" | "missing" | "ready"
  >("loading");
  const supporterStatus = getSupporterStatus(customerInfo);
  const supportBadges = getSupportBadges(customerInfo);
  const hasActiveSupport = isSupporterActive(customerInfo);
  const supportCardTitle = hasActiveSupport
    ? "Support Pocket ID again? 💛"
    : "Show me some love? 💛";
  const supportCardBody = hasActiveSupport
    ? supporterStatus === "lifetime"
      ? "Your lifetime support is active. You can still leave a tip anytime if you want to help even more."
      : supporterStatus === "monthly"
        ? "Your monthly support is active. You can still add one-time tips whenever you want."
        : "Thanks for supporting the app. You can always add another tip whenever you want."
    : "Support my work and keep this app alive.";
  const supportButtonLabel = hasActiveSupport
    ? "View more support options →"
    : "Support the app →";

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
      const session = await signInWithProvider(provider);
      if (session) {
        requestSync("Syncing your device and encrypted cloud vault...");
      }
    } catch (error) {
      Alert.alert("Google sign-in failed", getAuthErrorMessage(error));
    } finally {
      setAuthBusy(null);
    }
  };

  const handleSwitchGoogleAccount = async () => {
    try {
      setAuthBusy("switch-google");
      const session = await signInWithProvider("google", {
        selectAccount: true,
      });
      if (session) {
        requestSync("Syncing your device and encrypted cloud vault...");
      }
    } catch (error) {
      Alert.alert(
        "Could not switch Google account",
        getAuthErrorMessage(error),
      );
    } finally {
      setAuthBusy(null);
    }
  };

  const handleSignOut = async () => {
    try {
      setAuthBusy("signout");
      await signOut();
    } catch (error) {
      Alert.alert("Could not sign out", getAuthErrorMessage(error));
    } finally {
      setAuthBusy(null);
    }
  };

  const handleOpenCloudSyncSettings = () => {
    openSettingsSection("cloud-sync");
    router.push("/(tabs)/settings");
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingHorizontal: isCompact ? 20 : 25,
            paddingTop: isCompact ? 20 : 25,
            paddingBottom: FLOATING_TAB_SCROLL_BUFFER,
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
          <Text
            style={[
              styles.heroTitle,
              { color: colors.text, fontSize: isCompact ? 24 : 30 },
            ]}
          >
            Personal Stats
          </Text>
          <View style={styles.supporterBadgeWrap}>
            <SupporterBadges badges={supportBadges} colors={colors} />
          </View>

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
            {supportCardTitle}
          </Text>
          <Text style={[styles.accountBody, { color: colors.textMuted }]}>
            {supportCardBody}
          </Text>
          <Pressable
            onPress={() => openSupportModal("profile")}
            style={[styles.authButton, { backgroundColor: colors.accent }]}
          >
            <Text style={[styles.authButtonText, { color: colors.accentText }]}>
              {supportButtonLabel}
            </Text>
          </Pressable>
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
          <View style={styles.sectionHeaderRow}>
            <GoogleWordmark size={15} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Account
            </Text>
          </View>
          {!isSupabaseConfigured ? (
            <>
              <Text style={[styles.accountLabel, { color: colors.text }]}>
                {supabaseConfigStatus === "invalid"
                  ? "Supabase setup is invalid in this build"
                  : "Supabase setup is still missing"}
              </Text>
              <Text style={[styles.accountBody, { color: colors.textMuted }]}>
                {supabaseStatusMessage}
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
                EAS builds do not read your local `.env.local` unless the same
                values are configured in Expo/EAS before the build starts.
              </Text>
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
              {cloudVaultStatus === "missing" ? (
                <View
                  style={[
                    styles.vaultStatusCard,
                    {
                      backgroundColor: warningBackground,
                      borderColor: warningColor,
                    },
                  ]}
                >
                  <Pressable onPress={handleOpenCloudSyncSettings}>
                    <Text
                      style={[
                        styles.vaultStatusTitle,
                        styles.vaultStatusWarning,
                        { color: warningColor },
                      ]}
                    >
                      Encrypted cloud vault is not set up yet
                    </Text>
                  </Pressable>
                </View>
              ) : null}
              <View style={styles.accountActions}>
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
                  onPress={handleSignOut}
                  style={[
                    styles.authButton,
                    styles.authButtonSecondary,
                    {
                      backgroundColor: colors.surfaceMuted,
                      borderWidth: 1,
                      borderColor: colors.buttonBorder,
                    },
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
  supporterBadgeWrap: {
    marginTop: 12,
  },
  supporterBadgeList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  supporterBadgeMuted: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  supporterBadgeActive: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  supporterBadgeText: {
    fontFamily: "ReadexPro-Bold",
    fontSize: 12,
    color: "#FFFFFF",
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
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  sectionTitle: {
    fontFamily: "ReadexPro-Bold",
    fontSize: 22,
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
    fontFamily: "ReadexPro-Medium",
    fontSize: 15,
    textAlign: "center",
    width: "100%",
  },
  authButtonTextCentered: {
    textAlign: "center",
    width: "100%",
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
  vaultStatusWarning: {
    textAlign: "center",
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
