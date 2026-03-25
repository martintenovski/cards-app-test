import { useIsFocused } from "@react-navigation/native";
import { useEffect, useRef, useState } from "react";
import * as Notifications from "expo-notifications";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
  type LayoutChangeEvent,
  useColorScheme,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { deleteWalletSnapshot, isSupabaseConfigured } from "@/lib/supabase";
import { GoogleWordmark } from "@/components/GoogleWordmark";
import {
  canManageMonthlySubscription,
  getSupporterSummary,
  initializePurchases,
  openMonthlySubscriptionManagement,
  restoreSupportPurchases,
  useCustomerInfo,
} from "@/src/services/purchases";
import { useSupportModalStore } from "@/src/store/useSupportModalStore";
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

function formatSupportDate(value: string | null) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function SettingsScreen() {
  const isFocused = useIsFocused();
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
  const pendingSettingsSection = useCloudVaultStore(
    (state) => state.pendingSettingsSection,
  );
  const clearPendingSettingsSection = useCloudVaultStore(
    (state) => state.clearPendingSettingsSection,
  );
  const requestSync = useCloudVaultStore((state) => state.requestSync);
  const syncStatus = useCloudVaultStore((state) => state.syncStatus);
  const cards = useCardStore((state) => state.cards);
  const openSupportModal = useSupportModalStore((state) => state.open);
  const { customerInfo, refreshCustomerInfo } = useCustomerInfo({
    autoInitialize: isFocused,
  });
  const deviceScheme = useColorScheme();
  const resolvedTheme = resolveTheme(themePreference, deviceScheme);
  const colors = APP_THEME[resolvedTheme];
  const isDark = resolvedTheme === "dark";
  const scrollViewRef = useRef<ScrollView | null>(null);
  const [cloudSyncSectionY, setCloudSyncSectionY] = useState(0);
  const [authBusy, setAuthBusy] = useState<
    "delete-data" | "forget-passphrase" | null
  >(null);
  const [cloudVaultStatus, setCloudVaultStatus] = useState<
    "loading" | "missing" | "ready"
  >("loading");
  const supportSummary = getSupporterSummary(customerInfo);

  useEffect(() => {
    if (!isFocused) {
      return;
    }

    initializePurchases();
  }, [isFocused]);

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

  useEffect(() => {
    if (
      !isFocused ||
      pendingSettingsSection !== "cloud-sync" ||
      cloudSyncSectionY <= 0
    ) {
      return;
    }

    const timer = setTimeout(() => {
      scrollViewRef.current?.scrollTo({
        y: Math.max(cloudSyncSectionY - 20, 0),
        animated: true,
      });
      clearPendingSettingsSection();
    }, 60);

    return () => clearTimeout(timer);
  }, [
    clearPendingSettingsSection,
    cloudSyncSectionY,
    isFocused,
    pendingSettingsSection,
  ]);

  const handleCloudSyncSectionLayout = (event: LayoutChangeEvent) => {
    setCloudSyncSectionY(event.nativeEvent.layout.y);
  };

  const sendTestNotification = async () => {
    const permissions = await Notifications.requestPermissionsAsync();
    const notificationsAllowed =
      permissions.status === Notifications.PermissionStatus.GRANTED ||
      permissions.ios?.status ===
        Notifications.IosAuthorizationStatus.PROVISIONAL;

    if (!notificationsAllowed) return;
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

  const handleRestorePurchases = async () => {
    try {
      await restoreSupportPurchases();
      await refreshCustomerInfo();
      Alert.alert(
        "Purchases restored",
        "Pocket ID refreshed your RevenueCat customer info and restored any eligible purchases.",
      );
    } catch (error) {
      Alert.alert(
        "Restore failed",
        error instanceof Error
          ? error.message
          : "Pocket ID could not restore purchases right now.",
      );
    }
  };

  const handleManageSubscription = async () => {
    try {
      await openMonthlySubscriptionManagement(customerInfo);
    } catch (error) {
      Alert.alert(
        "Could not open subscription settings",
        error instanceof Error
          ? error.message
          : "Pocket ID could not open the App Store subscription page right now.",
      );
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

  const handleFetchLatestData = () => {
    if (cloudVaultStatus !== "ready") {
      Alert.alert(
        "Sync passphrase required",
        "You must set your sync passphrase first in Settings > Cloud Sync before syncing cloud data.",
      );
      return;
    }

    requestSync("Syncing your device and encrypted cloud vault...");
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
        ref={scrollViewRef}
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

        <View
          onLayout={handleCloudSyncSectionLayout}
          style={[styles.section, { backgroundColor: colors.surface }]}
        >
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
            style={[
              styles.testBtn,
              {
                backgroundColor: colors.surfaceMuted,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={[styles.testBtnText, { color: colors.text }]}>
              Send test notification (5 s)
            </Text>
          </Pressable>
        </View>

        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <View style={styles.sectionHeaderRow}>
            <GoogleWordmark size={15} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Cloud Sync
            </Text>
          </View>
          <Text style={[styles.sectionBody, { color: colors.textMuted }]}>
            Manage your encrypted cloud vault, sync cloud data on demand, and
            clean up this device when needed.
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
                style={[
                  styles.testBtn,
                  {
                    backgroundColor: colors.surfaceMuted,
                    borderColor: colors.border,
                  },
                ]}
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
                  style={[
                    styles.testBtn,
                    {
                      backgroundColor: colors.surfaceMuted,
                      borderColor: colors.border,
                    },
                  ]}
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
                style={[
                  styles.testBtn,
                  {
                    backgroundColor: colors.surfaceMuted,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text style={[styles.testBtnText, { color: colors.text }]}>
                  {syncStatus === "syncing"
                    ? "Syncing Cloud Data…"
                    : "Sync Cloud Data"}
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
            Your Support
          </Text>
          <Text style={[styles.sectionBody, { color: colors.textMuted }]}>
            RevenueCat supporter details for this app-store account.
          </Text>
          <View
            style={[styles.supportRow, { borderBottomColor: colors.border }]}
          >
            <Text style={[styles.rowLabel, { color: colors.text }]}>
              Status
            </Text>
            <Text style={[styles.supportValue, { color: colors.textMuted }]}>
              {supportSummary.active ? "Active ❤️" : "Not a supporter yet"}
            </Text>
          </View>
          <View
            style={[styles.supportRow, { borderBottomColor: colors.border }]}
          >
            <Text style={[styles.rowLabel, { color: colors.text }]}>
              Support type
            </Text>
            <Text style={[styles.supportValue, { color: colors.textMuted }]}>
              {supportSummary.status === "monthly"
                ? "Monthly Subscription"
                : supportSummary.status === "lifetime"
                  ? "Lifetime"
                  : supportSummary.status === "tipper"
                    ? "Tip"
                    : "—"}
            </Text>
          </View>
          <View
            style={[styles.supportRow, { borderBottomColor: colors.border }]}
          >
            <Text style={[styles.rowLabel, { color: colors.text }]}>
              Last payment date
            </Text>
            <Text style={[styles.supportValue, { color: colors.textMuted }]}>
              {formatSupportDate(supportSummary.lastPaymentDate)}
            </Text>
          </View>
          <View
            style={[styles.supportRow, { borderBottomColor: colors.border }]}
          >
            <Text style={[styles.rowLabel, { color: colors.text }]}>
              Next renewal date
            </Text>
            <Text style={[styles.supportValue, { color: colors.textMuted }]}>
              {supportSummary.status === "monthly"
                ? formatSupportDate(supportSummary.nextRenewalDate)
                : "—"}
            </Text>
          </View>
          <View style={styles.supportRow}>
            <Text style={[styles.rowLabel, { color: colors.text }]}>
              Total tips count
            </Text>
            <Text style={[styles.supportValue, { color: colors.textMuted }]}>
              {supportSummary.totalTipsCount}
            </Text>
          </View>
          <Pressable
            onPress={() => openSupportModal("settings")}
            style={[
              styles.testBtn,
              {
                backgroundColor: colors.surfaceMuted,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={[styles.testBtnText, { color: colors.text }]}>
              View Support Options
            </Text>
          </Pressable>
          {canManageMonthlySubscription(customerInfo) ? (
            <Pressable
              onPress={() => void handleManageSubscription()}
              style={[styles.testBtn, { backgroundColor: colors.surfaceMuted }]}
            >
              <Text style={[styles.testBtnText, { color: colors.text }]}>
                Cancel Monthly Subscription
              </Text>
            </Pressable>
          ) : null}
          <Pressable
            onPress={handleRestorePurchases}
            style={[styles.testBtn, { backgroundColor: colors.surfaceMuted }]}
          >
            <Text style={[styles.testBtnText, { color: colors.text }]}>
              Restore Purchases
            </Text>
          </Pressable>
        </View>

        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Onboarding
          </Text>
          <Text style={[styles.sectionBody, { color: colors.textMuted }]}>
            Replay the Pocket ID introduction whenever you want to review the
            welcome flow again.
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

        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            DEV / TEST
          </Text>
          <Text style={[styles.sectionBody, { color: colors.textMuted }]}>
            Manually open the support modal while testing RevenueCat Sandbox or
            TestFlight flows.
          </Text>
          <Pressable
            onPress={() => openSupportModal("dev")}
            style={[styles.testBtn, { backgroundColor: colors.surfaceMuted }]}
          >
            <Text style={[styles.testBtnText, { color: colors.text }]}>
              🧪 Trigger Support Modal
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
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
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
    marginTop: 14,
    borderRadius: 20,
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    borderWidth: 1,
  },
  dangerButton: {
    borderWidth: 1,
  },
  testBtnText: {
    fontFamily: "ReadexPro-Medium",
    fontSize: 15,
    textAlign: "center",
    width: "100%",
  },
  supportRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  supportValue: {
    fontFamily: "ReadexPro-Bold",
    fontSize: 14,
    flexShrink: 1,
    textAlign: "right",
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
