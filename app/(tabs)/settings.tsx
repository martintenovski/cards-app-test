import { useEffect, useState } from "react";
import * as Notifications from "expo-notifications";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
  useColorScheme,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { deleteWalletSnapshot, isSupabaseConfigured } from "@/lib/supabase";
import { useAuthStore } from "@/store/useAuthStore";
import { useCardStore } from "@/store/useCardStore";
import { useCloudVaultStore } from "@/store/useCloudVaultStore";
import {
  deleteStoredSyncPassphrase,
  hasStoredSyncPassphrase,
} from "@/utils/cloudVault";
import { signOut } from "@/utils/authSync";
import { getCardExpiryDate } from "@/utils/expiry";
import type { ThemePreference } from "@/utils/theme";
import { APP_THEME, resolveTheme } from "@/utils/theme";

const THEME_OPTIONS: ThemePreference[] = ["system", "light", "dark"];
const FLOATING_TAB_SCROLL_BUFFER = 132;

function SettingToggle({
  label,
  description,
  value,
  onChange,
  textColor,
  mutedColor,
  accentColor,
  isDark,
}: {
  label: string;
  description: string;
  value: boolean;
  onChange: (nextValue: boolean) => void;
  textColor: string;
  mutedColor: string;
  accentColor: string;
  isDark: boolean;
}) {
  const falseTrack = isDark ? "#353535" : "rgba(127,127,127,0.35)";
  const falseThumb = isDark ? "#7A7A7A" : "#FFFFFF";
  const trueTrack = isDark ? "#505050" : accentColor;
  const trueThumb = isDark ? "#D6D6D6" : "#FFFFFF";

  return (
    <View style={styles.toggleRow}>
      <View style={styles.toggleTextBlock}>
        <Text style={[styles.rowLabel, { color: textColor }]}>{label}</Text>
        <Text style={[styles.rowDescription, { color: mutedColor }]}>
          {description}
        </Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: falseTrack, true: trueTrack }}
        thumbColor={value ? trueThumb : falseThumb}
        ios_backgroundColor={falseTrack}
      />
    </View>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const themePreference = useCardStore((state) => state.themePreference);
  const setThemePreference = useCardStore((state) => state.setThemePreference);
  const viewMode = useCardStore((state) => state.viewMode);
  const setViewMode = useCardStore((state) => state.setViewMode);
  const appLockEnabled = useCardStore((state) => state.appLockEnabled);
  const setAppLockEnabled = useCardStore((state) => state.setAppLockEnabled);
  const replaceCards = useCardStore((state) => state.replaceCards);
  const expiryNotificationsEnabled = useCardStore(
    (state) => state.expiryNotificationsEnabled,
  );
  const setExpiryNotificationsEnabled = useCardStore(
    (state) => state.setExpiryNotificationsEnabled,
  );
  const setHasSeenOnboarding = useCardStore(
    (state) => state.setHasSeenOnboarding,
  );
  const authUser = useAuthStore((state) => state.user);
  const cloudVaultChangeToken = useCloudVaultStore(
    (state) => state.changeToken,
  );
  const bumpCloudVaultChangeToken = useCloudVaultStore(
    (state) => state.bumpChangeToken,
  );
  const requestSync = useCloudVaultStore((state) => state.requestSync);
  const syncStatus = useCloudVaultStore((state) => state.syncStatus);
  const cards = useCardStore((state) => state.cards);
  const deviceScheme = useColorScheme();
  const resolvedTheme = resolveTheme(themePreference, deviceScheme);
  const colors = APP_THEME[resolvedTheme];
  const isDark = resolvedTheme === "dark";
  const [authBusy, setAuthBusy] = useState<
    "delete-data" | "forget-passphrase" | null
  >(null);
  const [cloudVaultStatus, setCloudVaultStatus] = useState<
    "loading" | "missing" | "ready"
  >("loading");

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

  const sendTestNotification = async () => {
    const { granted } = await Notifications.requestPermissionsAsync();
    if (!granted) return;
    // Pick the first card that has an expiry date, fall back to any card
    const target = cards.find((c) => getCardExpiryDate(c) !== null) ?? cards[0];
    const cardId = target?.id ?? "";
    const cardTitle = target?.title ?? "My Card";
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `${cardTitle} expires soon`,
        body: `Your card expires in 2 days. Tap to view details.`,
        sound: "default",
        data: { kind: "expiry-reminder", cardId },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 5,
      },
    });
  };

  const replayOnboarding = () => {
    setHasSeenOnboarding(false);
    router.push("/onboarding");
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

  const handleFetchLatestData = () => {
    requestSync("Fetching the latest encrypted wallet data…");
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
          { paddingBottom: FLOATING_TAB_SCROLL_BUFFER },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Settings</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            Control the wallet look, lock behavior, and reminder automation.
          </Text>
        </View>

        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Appearance
          </Text>
          <Text style={[styles.sectionBody, { color: colors.textMuted }]}>
            Choose whether the app follows the system theme or stays in light or
            dark mode.
          </Text>
          <View
            style={[
              styles.themeOptionRow,
              { backgroundColor: colors.surfaceMuted },
            ]}
          >
            {THEME_OPTIONS.map((option) => {
              const active = themePreference === option;
              return (
                <Pressable
                  key={option}
                  onPress={() => setThemePreference(option)}
                  style={[
                    styles.themeOption,
                    { backgroundColor: active ? colors.accent : "transparent" },
                  ]}
                >
                  <Text
                    style={[
                      styles.themeOptionText,
                      { color: active ? colors.accentText : colors.textMuted },
                    ]}
                  >
                    {option === "system"
                      ? "System"
                      : option === "light"
                        ? "Light"
                        : "Dark"}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Card View
          </Text>
          <Text style={[styles.sectionBody, { color: colors.textMuted }]}>
            Choose how cards are displayed on the home screen.
          </Text>
          <View
            style={[
              styles.themeOptionRow,
              { backgroundColor: colors.surfaceMuted },
            ]}
          >
            {(["stack", "list"] as const).map((option) => {
              const active = viewMode === option;
              return (
                <Pressable
                  key={option}
                  onPress={() => setViewMode(option)}
                  style={[
                    styles.themeOption,
                    { backgroundColor: active ? colors.accent : "transparent" },
                  ]}
                >
                  <Text
                    style={[
                      styles.themeOptionText,
                      { color: active ? colors.accentText : colors.textMuted },
                    ]}
                  >
                    {option === "stack" ? "Animated Stack" : "List"}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Security
          </Text>
          <SettingToggle
            label="Biometric Lock"
            description="Require Face ID, Touch ID, or the device passcode fallback when Pocket ID is locked."
            value={appLockEnabled}
            onChange={setAppLockEnabled}
            textColor={colors.text}
            mutedColor={colors.textMuted}
            accentColor={colors.accent}
            isDark={isDark}
          />
        </View>

        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Reminders
          </Text>
          <SettingToggle
            label="Expiry Notifications"
            description="Schedule reminders 1 month, 2 weeks and 2 days before supported cards expire."
            value={expiryNotificationsEnabled}
            onChange={setExpiryNotificationsEnabled}
            textColor={colors.text}
            mutedColor={colors.textMuted}
            accentColor={colors.accent}
            isDark={isDark}
          />
          <Pressable
            onPress={sendTestNotification}
            style={[styles.testBtn, { backgroundColor: colors.surfaceMuted }]}
          >
            <Text style={[styles.testBtnText, { color: colors.textMuted }]}>
              Send test notification (5 s)
            </Text>
          </Pressable>
        </View>

        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Cloud Sync
          </Text>
          <Text style={[styles.sectionBody, { color: colors.textMuted }]}>
            Manage your encrypted cloud vault, fetch the latest data, and clean
            up this device when needed.
          </Text>
          {!isSupabaseConfigured || !authUser ? (
            <Text style={[styles.sectionBody, { color: colors.textMuted }]}> 
              Sign in from the Profile tab to manage cloud sync settings here.
            </Text>
          ) : (
            <>
              <View
                style={[
                  styles.cloudStatusCard,
                  {
                    backgroundColor: colors.surfaceMuted,
                    borderColor:
                      cloudVaultStatus === "ready"
                        ? colors.accent
                        : colors.border,
                  },
                ]}
              >
                <Text style={[styles.cloudStatusTitle, { color: colors.text }]}>
                  {cloudVaultStatus === "ready"
                    ? "Encrypted cloud vault is enabled"
                    : cloudVaultStatus === "loading"
                      ? "Checking encrypted cloud vault…"
                      : "Encrypted cloud vault is not set up yet"}
                </Text>
                <Text
                  style={[styles.cloudStatusBody, { color: colors.textMuted }]}
                >
                  {cloudVaultStatus === "ready"
                    ? "Your cards are encrypted on this device before upload, so the database stores ciphertext instead of readable card details."
                    : "Set or use a sync passphrase to encrypt cards before uploading or pulling your saved cards. Until then, cloud sync stays paused on this device to avoid sending readable card data."}
                </Text>
              </View>
              <Pressable
                onPress={handleOpenCloudPassphrase}
                style={[styles.testBtn, { backgroundColor: colors.surfaceMuted }]}
              >
                <Text style={[styles.testBtnText, { color: colors.text }]}> 
                  {cloudVaultStatus === "ready"
                    ? "Update Sync Passphrase"
                    : "Set Sync Passphrase"}
                </Text>
              </Pressable>
              {cloudVaultStatus === "ready" ? (
                <Pressable
                  onPress={handleForgetPassphrase}
                  style={[styles.testBtn, { backgroundColor: colors.surfaceMuted }]}
                >
                  <Text style={[styles.testBtnText, { color: colors.text }]}> 
                    {authBusy === "forget-passphrase"
                      ? "Forgetting passphrase…"
                      : "Forget Passphrase on This Device"}
                  </Text>
                </Pressable>
              ) : null}
              <Pressable
                onPress={handleFetchLatestData}
                style={[styles.testBtn, { backgroundColor: colors.surfaceMuted }]}
              >
                <Text style={[styles.testBtnText, { color: colors.text }]}> 
                  {syncStatus === "syncing"
                    ? "Fetching Latest Data…"
                    : "Fetch Latest Data"}
                </Text>
              </Pressable>
              <Pressable
                onPress={handleDeleteData}
                style={[
                  styles.testBtn,
                  styles.dangerButton,
                  {
                    backgroundColor: colors.dangerSoft,
                    borderColor: colors.danger,
                  },
                ]}
              >
                <Text style={[styles.testBtnText, { color: colors.danger }]}> 
                  {authBusy === "delete-data"
                    ? "Deleting data…"
                    : "Delete My Data"}
                </Text>
              </Pressable>
            </>
          )}
        </View>

        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}> 
            Onboarding
          </Text>
          <Text style={[styles.sectionBody, { color: colors.textMuted }]}> 
            Replay the Pocket ID introduction whenever you want to review the welcome flow again.
          </Text>
          <Pressable
            onPress={replayOnboarding}
            style={[styles.testBtn, { backgroundColor: colors.surfaceMuted }]}
          >
            <Text style={[styles.testBtnText, { color: colors.text }]}> 
              View onboarding again
            </Text>
          </Pressable>
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
  header: {
    marginBottom: 4,
  },
  title: {
    fontFamily: "ReadexPro-Bold",
    fontSize: 34,
    lineHeight: 40,
  },
  subtitle: {
    fontFamily: "ReadexPro-Regular",
    fontSize: 14,
    marginTop: 8,
  },
  section: {
    borderRadius: 32,
    padding: 24,
  },
  sectionTitle: {
    fontFamily: "ReadexPro-Bold",
    fontSize: 22,
  },
  sectionBody: {
    fontFamily: "ReadexPro-Regular",
    fontSize: 14,
    lineHeight: 22,
    marginTop: 8,
  },
  themeOptionRow: {
    borderRadius: 24,
    padding: 6,
    flexDirection: "row",
    gap: 6,
    marginTop: 18,
  },
  themeOption: {
    flex: 1,
    borderRadius: 18,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  themeOptionText: {
    fontFamily: "ReadexPro-Medium",
    fontSize: 14,
  },
  testBtn: {
    marginTop: 18,
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: "center",
  },
  dangerButton: {
    borderWidth: 1,
  },
  testBtnText: {
    fontFamily: "ReadexPro-Medium",
    fontSize: 14,
  },
  cloudStatusCard: {
    borderWidth: 1,
    borderRadius: 22,
    marginTop: 18,
    padding: 16,
  },
  cloudStatusTitle: {
    fontFamily: "ReadexPro-Bold",
    fontSize: 15,
  },
  cloudStatusBody: {
    fontFamily: "ReadexPro-Regular",
    fontSize: 13,
    lineHeight: 20,
    marginTop: 8,
  },
  toggleRow: {
    marginTop: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
  },
  toggleTextBlock: {
    flex: 1,
  },
  rowLabel: {
    fontFamily: "ReadexPro-Medium",
    fontSize: 16,
  },
  rowDescription: {
    fontFamily: "ReadexPro-Regular",
    fontSize: 13,
    lineHeight: 20,
    marginTop: 6,
  },
});
