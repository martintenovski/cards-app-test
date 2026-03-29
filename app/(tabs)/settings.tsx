import { Feather } from "@expo/vector-icons";
import { useIsFocused, useScrollToTop } from "@react-navigation/native";
import { useEffect, useRef, useState } from "react";
import * as LocalAuthentication from "expo-local-authentication";
import * as Linking from "expo-linking";
import { openURL } from "expo-linking";
import * as Notifications from "expo-notifications";
import Svg, { Path } from "react-native-svg";
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
import { CloudSyncInfoModal } from "@/components/CloudSyncInfoModal";
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
import {
  LANGUAGE_FLAGS,
  LANGUAGES,
  type LanguageCode,
} from "@/src/i18n/translations";
import { useTranslation } from "@/src/hooks/useTranslation";

const THEME_OPTIONS: ThemePreference[] = ["system", "light", "dark"];
const FLOATING_TAB_SCROLL_BUFFER = 132;
const GITHUB_REPO_URL = "https://github.com/PowerCube0/pocket-id";

function GitHubIcon({
  size = 20,
  color = "#000",
}: {
  size?: number;
  color?: string;
}) {
  // Path from the official GitHub mark SVG (viewBox 0 0 16 16)
  return (
    <Svg viewBox="0 0 16 16" width={size} height={size}>
      <Path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38
           0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13
           -.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66
           .07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15
           -.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2 .82.64-.18 1.32-.27 2-.27
           .68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12
           .51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48
           0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"
        fill={color}
      />
    </Svg>
  );
}

function SettingToggle({
  label,
  description,
  value,
  onChange,
  textColor,
  mutedColor,
  accentColor,
  isDark,
  borderColor,
  disabled,
}: {
  label: string;
  description: string;
  value: boolean;
  onChange: (nextValue: boolean) => void;
  textColor: string;
  mutedColor: string;
  accentColor: string;
  isDark: boolean;
  borderColor: string;
  disabled?: boolean;
}) {
  const falseTrack = isDark ? "#555555" : "rgba(127,127,127,0.35)";
  const falseThumb = isDark ? "#ABABAB" : "#FFFFFF";
  const trueTrack = isDark ? "#505050" : accentColor;
  const trueThumb = isDark ? "#D6D6D6" : "#FFFFFF";

  return (
    <View style={[styles.toggleRow, disabled && { opacity: 0.45 }]}>
      <View style={styles.toggleTextBlock}>
        <Text style={[styles.rowLabel, { color: textColor }]}>{label}</Text>
        <Text style={[styles.rowDescription, { color: mutedColor }]}>
          {description}
        </Text>
      </View>
      <View style={[styles.switchWrap]}>
        <Switch
          value={value}
          onValueChange={disabled ? undefined : onChange}
          disabled={disabled}
          trackColor={{ false: falseTrack, true: trueTrack }}
          thumbColor={value ? trueThumb : falseThumb}
          ios_backgroundColor={falseTrack}
        />
      </View>
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
  const language = useCardStore((state) => state.language);
  const setLanguage = useCardStore((state) => state.setLanguage);
  const viewMode = useCardStore((state) => state.viewMode);
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const setViewMode = useCardStore((state) => state.setViewMode);
  const appLockEnabled = useCardStore((state) => state.appLockEnabled);
  const setAppLockEnabled = useCardStore((state) => state.setAppLockEnabled);
  const screenshotBlockingEnabled = useCardStore(
    (state) => state.screenshotBlockingEnabled,
  );
  const setScreenshotBlockingEnabled = useCardStore(
    (state) => state.setScreenshotBlockingEnabled,
  );
  const lockScreenEnabled = useCardStore((state) => state.lockScreenEnabled);
  const setLockScreenEnabled = useCardStore(
    (state) => state.setLockScreenEnabled,
  );
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
  const setSyncState = useCloudVaultStore((state) => state.setSyncState);
  const suppressNextAutoSync = useCloudVaultStore(
    (state) => state.suppressNextAutoSync,
  );
  const cards = useCardStore((state) => state.cards);
  const openSupportModal = useSupportModalStore((state) => state.open);
  const { customerInfo, refreshCustomerInfo } = useCustomerInfo({
    autoInitialize: isFocused,
  });
  const deviceScheme = useColorScheme();
  const resolvedTheme = resolveTheme(themePreference, deviceScheme);
  const colors = APP_THEME[resolvedTheme];
  const tr = useTranslation();
  const isDark = resolvedTheme === "dark";
  const scrollViewRef = useRef<ScrollView | null>(null);
  const [cloudSyncSectionY, setCloudSyncSectionY] = useState(0);
  const [authBusy, setAuthBusy] = useState<
    "delete-account" | "delete-data" | "forget-passphrase" | null
  >(null);
  const [cloudInfoVisible, setCloudInfoVisible] = useState(false);
  const [cloudVaultStatus, setCloudVaultStatus] = useState<
    "loading" | "missing" | "ready"
  >("loading");
  const [biometricStatus, setBiometricStatus] = useState<
    "supported" | "no-hardware" | "not-enrolled"
  >("supported");
  const supportSummary = getSupporterSummary(customerInfo);
  const shouldShowCloudSyncGuide =
    Boolean(authUser) && cloudVaultStatus === "missing";
  const canUseAnimatedStack = cards.length >= 4;

  useScrollToTop(scrollViewRef);

  useEffect(() => {
    if (!canUseAnimatedStack && viewMode === "stack") {
      setViewMode("list");
    }
  }, [canUseAnimatedStack, setViewMode, viewMode]);

  useEffect(() => {
    let cancelled = false;
    LocalAuthentication.hasHardwareAsync().then((hasHardware) => {
      if (cancelled) return;
      if (!hasHardware) {
        setBiometricStatus("no-hardware");
        return;
      }
      LocalAuthentication.isEnrolledAsync().then((isEnrolled) => {
        if (cancelled) return;
        setBiometricStatus(isEnrolled ? "supported" : "not-enrolled");
      });
    });
    return () => {
      cancelled = true;
    };
  }, []);

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

  const handleLockScreenChange = (nextValue: boolean) => {
    if (!nextValue) {
      Alert.alert(
        "Disable Lock Screen?",
        "This will allow the app content to be visible in the recent apps screen and when the app is backgrounded. Your cards and documents may be exposed.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Disable",
            style: "destructive",
            onPress: () => setLockScreenEnabled(false),
          },
        ],
      );
    } else {
      setLockScreenEnabled(true);
    }
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
      "Delete your local data?",
      "This removes your synced wallet data and clears saved cards on this device. Your Google sign-in remains available, but this action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete Data",
          style: "destructive",
          onPress: async () => {
            try {
              setAuthBusy("delete-data");
              setSyncState("idle");
              await deleteWalletSnapshot(authUser.id);
              suppressNextAutoSync();
              replaceCards([]);
              Alert.alert(
                "Data deleted",
                "Pocket ID removed your synced wallet data and cleared the saved cards on this device.",
              );
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

  const handleDeleteAccount = () => {
    if (!authUser) return;

    Alert.alert(
      "Delete account from this app?",
      "This removes your synced wallet data, forgets your sync passphrase on this device, signs you out of Google, and resets Pocket ID to a first-time state on this device. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete Account",
          style: "destructive",
          onPress: async () => {
            try {
              setAuthBusy("delete-account");
              setSyncState("idle");
              await deleteWalletSnapshot(authUser.id);
              await deleteStoredSyncPassphrase(authUser.id).catch(() => null);
              suppressNextAutoSync();
              replaceCards([]);
              bumpCloudVaultChangeToken();
              setAppLockEnabled(false);
              setHasSeenOnboarding(false);
              await signOut();
            } catch (error) {
              Alert.alert(
                "Could not delete account",
                error instanceof Error
                  ? error.message
                  : "Pocket ID couldn't remove this account right now. Please try again.",
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
          <Text style={[styles.title, { color: colors.text }]}>
            {tr("settings_title")}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            {tr("settings_subtitle")}
          </Text>
        </View>

        <View
          onLayout={handleCloudSyncSectionLayout}
          style={[styles.section, { backgroundColor: colors.surface }]}
        >
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {tr("settings_section_appearance")}
          </Text>
          <Text style={[styles.sectionBody, { color: colors.textMuted }]}>
            {tr("settings_appearance_body")}
          </Text>
          <View
            style={[
              styles.themeOptionRow,
              {
                backgroundColor: colors.surfaceMuted,
                borderColor: colors.buttonBorder,
              },
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
                      ? tr("settings_theme_system")
                      : option === "light"
                        ? tr("settings_theme_light")
                        : tr("settings_theme_dark")}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {tr("settings_section_card_view")}
          </Text>
          <Text style={[styles.sectionBody, { color: colors.textMuted }]}>
            {tr("settings_card_view_body")}
          </Text>
          <View
            style={[
              styles.themeOptionRow,
              {
                backgroundColor: colors.surfaceMuted,
                borderColor: colors.buttonBorder,
              },
            ]}
          >
            {(["stack", "list"] as const).map((option) => {
              const active = viewMode === option;
              const disabled = option === "stack" && !canUseAnimatedStack;
              return (
                <Pressable
                  key={option}
                  disabled={disabled}
                  onPress={() => {
                    if (!disabled) {
                      setViewMode(option);
                    }
                  }}
                  style={[
                    styles.themeOption,
                    {
                      backgroundColor: active ? colors.accent : "transparent",
                      opacity: disabled ? 0.5 : 1,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.themeOptionText,
                      { color: active ? colors.accentText : colors.textMuted },
                    ]}
                  >
                    {option === "stack"
                      ? tr("settings_card_view_stack")
                      : tr("settings_card_view_list")}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {!canUseAnimatedStack ? (
            <Text style={[styles.cardViewHint, { color: colors.textSoft }]}>
              {tr("settings_card_view_stack_hint")}
            </Text>
          ) : null}
        </View>

        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {tr("settings_section_security")}
          </Text>
          <SettingToggle
            label={tr("settings_biometric_lock_label")}
            description={tr("settings_biometric_lock_desc")}
            value={appLockEnabled}
            onChange={setAppLockEnabled}
            textColor={colors.text}
            mutedColor={colors.textMuted}
            accentColor={colors.accent}
            isDark={isDark}
            borderColor={colors.buttonBorder}
            disabled={biometricStatus !== "supported"}
          />
          {biometricStatus === "no-hardware" ||
          biometricStatus === "not-enrolled" ? (
            <View style={styles.warningBadge}>
              <Feather
                name="alert-triangle"
                size={13}
                color="#92400E"
                style={{ marginTop: 1 }}
              />
              <Text style={styles.warningBadgeText}>
                {biometricStatus === "no-hardware"
                  ? "Your device doesn\u2019t support biometric authentication."
                  : "No biometrics are set up on this device. Add Face ID or a fingerprint in your device settings to enable this."}
              </Text>
            </View>
          ) : null}
          <SettingToggle
            label={tr("settings_block_screenshots_label")}
            description={tr("settings_block_screenshots_desc")}
            value={screenshotBlockingEnabled}
            onChange={setScreenshotBlockingEnabled}
            textColor={colors.text}
            mutedColor={colors.textMuted}
            accentColor={colors.accent}
            isDark={isDark}
            borderColor={colors.buttonBorder}
          />
          <SettingToggle
            label={tr("settings_lock_screen_label")}
            description={tr("settings_lock_screen_desc")}
            value={lockScreenEnabled}
            onChange={handleLockScreenChange}
            textColor={colors.text}
            mutedColor={colors.textMuted}
            accentColor={colors.accent}
            isDark={isDark}
            borderColor={colors.buttonBorder}
          />
        </View>

        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {tr("settings_section_reminders")}
          </Text>
          <SettingToggle
            label={tr("settings_expiry_notifications_label")}
            description={tr("settings_expiry_notifications_desc")}
            value={expiryNotificationsEnabled}
            onChange={setExpiryNotificationsEnabled}
            textColor={colors.text}
            mutedColor={colors.textMuted}
            accentColor={colors.accent}
            isDark={isDark}
            borderColor={colors.buttonBorder}
          />
        </View>

        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <View style={styles.sectionHeaderRow}>
            <GoogleWordmark size={15} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {tr("settings_section_cloud_sync")}
            </Text>
            <Pressable
              onPress={() => setCloudInfoVisible(true)}
              style={styles.infoButton}
              hitSlop={8}
            >
              <Feather name="info" size={18} color={colors.textMuted} />
            </Pressable>
          </View>
          <CloudSyncInfoModal
            visible={cloudInfoVisible}
            onClose={() => setCloudInfoVisible(false)}
          />
          <Text style={[styles.sectionBody, { color: colors.textMuted }]}>
            {tr("settings_cloud_sync_body")}
          </Text>
          {!isSupabaseConfigured || !authUser ? (
            <Text style={[styles.sectionBody, { color: colors.textMuted }]}>
              Sign in from the Profile tab to manage cloud sync settings here.
            </Text>
          ) : (
            <>
              {shouldShowCloudSyncGuide ? (
                <View
                  style={[
                    styles.cloudGuideCard,
                    {
                      backgroundColor: colors.surfaceMuted,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[styles.cloudGuideTitle, { color: colors.text }]}
                  >
                    Set up Google sync in 2 short steps
                  </Text>
                  <Text
                    style={[styles.cloudGuideBody, { color: colors.textMuted }]}
                  >
                    You already finished the first part by signing in with
                    Google.
                  </Text>

                  <View style={styles.cloudGuideSteps}>
                    <View style={styles.cloudGuideStepRow}>
                      <View
                        style={[
                          styles.cloudGuideStepBadge,
                          {
                            backgroundColor: "#0050A3",
                            borderColor: "#0050A3",
                          },
                        ]}
                      >
                        <Feather name="check" size={15} color="#FFFFFF" />
                      </View>
                      <View style={styles.cloudGuideStepContent}>
                        <Text
                          style={[
                            styles.cloudGuideStepTitle,
                            { color: colors.text },
                          ]}
                        >
                          Sign in with Google
                        </Text>
                        <Text
                          style={[
                            styles.cloudGuideStepBody,
                            { color: colors.textMuted },
                          ]}
                        >
                          Done. Your account is connected and ready for secure
                          sync.
                        </Text>
                      </View>
                    </View>

                    <View style={styles.cloudGuideStepRow}>
                      <View
                        style={[
                          styles.cloudGuideStepBadge,
                          {
                            backgroundColor: colors.surface,
                            borderColor: colors.border,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.cloudGuideStepBadgeText,
                            { color: colors.text },
                          ]}
                        >
                          2
                        </Text>
                      </View>
                      <View style={styles.cloudGuideStepContent}>
                        <Text
                          style={[
                            styles.cloudGuideStepTitle,
                            { color: colors.text },
                          ]}
                        >
                          Create your sync passphrase
                        </Text>
                        <Text
                          style={[
                            styles.cloudGuideStepBody,
                            { color: colors.textMuted },
                          ]}
                        >
                          This passphrase encrypts your vault before anything is
                          uploaded.
                        </Text>
                        <Pressable
                          onPress={handleOpenCloudPassphrase}
                          style={[
                            styles.cloudGuideAction,
                            {
                              backgroundColor: colors.accent,
                              borderColor: colors.accent,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.cloudGuideActionText,
                              { color: colors.accentText },
                            ]}
                          >
                            Set Sync Passphrase
                          </Text>
                        </Pressable>
                      </View>
                    </View>

                    <View style={styles.cloudGuideStepRow}>
                      <View
                        style={[
                          styles.cloudGuideStepBadge,
                          {
                            backgroundColor: colors.surface,
                            borderColor: colors.border,
                          },
                        ]}
                      >
                        <Feather
                          name="help-circle"
                          size={15}
                          color={colors.textMuted}
                        />
                      </View>
                      <View style={styles.cloudGuideStepContent}>
                        <Text
                          style={[
                            styles.cloudGuideStepTitle,
                            { color: colors.text },
                          ]}
                        >
                          Read how it works
                        </Text>
                        <Text
                          style={[
                            styles.cloudGuideStepBody,
                            { color: colors.textMuted },
                          ]}
                        >
                          See what Google, Supabase, and encryption each do in
                          the flow.
                        </Text>
                        <Pressable
                          onPress={() => setCloudInfoVisible(true)}
                          style={[
                            styles.cloudGuideAction,
                            {
                              backgroundColor: colors.surface,
                              borderColor: colors.buttonBorder,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.cloudGuideActionText,
                              { color: colors.text },
                            ]}
                          >
                            Read More
                          </Text>
                        </Pressable>
                      </View>
                    </View>
                  </View>
                </View>
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
                    <Text
                      style={[styles.cloudStatusTitle, { color: colors.text }]}
                    >
                      {cloudVaultStatus === "ready"
                        ? "Encrypted cloud vault is enabled"
                        : cloudVaultStatus === "loading"
                          ? "Checking encrypted cloud vault…"
                          : "Encrypted cloud vault is not set up yet"}
                    </Text>
                    <Text
                      style={[
                        styles.cloudStatusBody,
                        { color: colors.textMuted },
                      ]}
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
                        borderColor: colors.buttonBorder,
                      },
                    ]}
                  >
                    <Text style={[styles.testBtnText, { color: colors.text }]}>
                      {cloudVaultStatus === "ready"
                        ? "Update Sync Passphrase"
                        : "Set Sync Passphrase"}
                    </Text>
                  </Pressable>
                </>
              )}
              {cloudVaultStatus === "ready" ? (
                <Pressable
                  onPress={handleForgetPassphrase}
                  style={[
                    styles.testBtn,
                    {
                      backgroundColor: colors.surfaceMuted,
                      borderColor: colors.buttonBorder,
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
              {!shouldShowCloudSyncGuide ? (
                <>
                  <Pressable
                    onPress={handleFetchLatestData}
                    style={[
                      styles.testBtn,
                      {
                        backgroundColor: colors.surfaceMuted,
                        borderColor: colors.buttonBorder,
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
                      {
                        backgroundColor: colors.surfaceMuted,
                        borderColor: colors.buttonBorder,
                      },
                    ]}
                  >
                    <Text style={[styles.testBtnText, { color: colors.text }]}>
                      {authBusy === "delete-data"
                        ? "Deleting data on this device…"
                        : "Delete My Local Data"}
                    </Text>
                  </Pressable>
                </>
              ) : null}

              <View
                style={[
                  styles.accountDeletionCard,
                  {
                    backgroundColor: colors.surfaceMuted,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text
                  style={[styles.accountDeletionTitle, { color: colors.text }]}
                >
                  Account deletion
                </Text>
                <Text
                  style={[
                    styles.accountDeletionBody,
                    { color: colors.textMuted },
                  ]}
                >
                  Remove your synced wallet data, forget this Google sign-in on
                  the device, and start fresh next time.
                </Text>
                <Pressable
                  onPress={handleDeleteAccount}
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
                    {authBusy === "delete-account"
                      ? "Deleting Account…"
                      : "Delete Account"}
                  </Text>
                </Pressable>
              </View>
            </>
          )}
        </View>

        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {tr("settings_section_support")}
          </Text>
          <Text style={[styles.sectionBody, { color: colors.textMuted }]}>
            {tr("settings_support_body")}
          </Text>
          <View
            style={[styles.supportRow, { borderBottomColor: colors.border }]}
          >
            <Text style={[styles.rowLabel, { color: colors.text }]}>
              {tr("settings_support_status")}
            </Text>
            <Text style={[styles.supportValue, { color: colors.textMuted }]}>
              {supportSummary.active
                ? tr("settings_support_active")
                : tr("settings_support_not_yet")}
            </Text>
          </View>
          <View
            style={[styles.supportRow, { borderBottomColor: colors.border }]}
          >
            <Text style={[styles.rowLabel, { color: colors.text }]}>
              {tr("settings_support_type")}
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
              {tr("settings_support_last_payment")}
            </Text>
            <Text style={[styles.supportValue, { color: colors.textMuted }]}>
              {formatSupportDate(supportSummary.lastPaymentDate)}
            </Text>
          </View>
          <View
            style={[styles.supportRow, { borderBottomColor: colors.border }]}
          >
            <Text style={[styles.rowLabel, { color: colors.text }]}>
              {tr("settings_support_next_renewal")}
            </Text>
            <Text style={[styles.supportValue, { color: colors.textMuted }]}>
              {supportSummary.status === "monthly"
                ? formatSupportDate(supportSummary.nextRenewalDate)
                : "—"}
            </Text>
          </View>
          <View style={styles.supportRow}>
            <Text style={[styles.rowLabel, { color: colors.text }]}>
              {tr("settings_support_tips_count")}
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
                borderColor: colors.buttonBorder,
              },
            ]}
          >
            <Text style={[styles.testBtnText, { color: colors.text }]}>
              {tr("settings_view_support_options")}
            </Text>
          </Pressable>
          {canManageMonthlySubscription(customerInfo) ? (
            <Pressable
              onPress={() => void handleManageSubscription()}
              style={[
                styles.testBtn,
                {
                  backgroundColor: colors.surfaceMuted,
                  borderColor: colors.buttonBorder,
                },
              ]}
            >
              <Text style={[styles.testBtnText, { color: colors.text }]}>
                Cancel Monthly Subscription
              </Text>
            </Pressable>
          ) : null}
          <Pressable
            onPress={handleRestorePurchases}
            style={[
              styles.testBtn,
              {
                backgroundColor: colors.surfaceMuted,
                borderColor: colors.buttonBorder,
              },
            ]}
          >
            <Text style={[styles.testBtnText, { color: colors.text }]}>
              {tr("settings_restore_purchases")}
            </Text>
          </Pressable>
        </View>

        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <View style={styles.githubHeaderRow}>
            <GitHubIcon size={22} color={colors.text} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {tr("settings_section_open_source")}
            </Text>
          </View>
          <Text style={[styles.sectionBody, { color: colors.textMuted }]}>
            {tr("settings_open_source_body")}
          </Text>
          <Pressable
            onPress={() => void openURL(GITHUB_REPO_URL)}
            style={[styles.githubButton, { borderColor: colors.buttonBorder }]}
          >
            <GitHubIcon size={18} color={colors.text} />
            <Text style={[styles.githubButtonText, { color: colors.text }]}>
              {tr("settings_open_on_github")}
            </Text>
          </Pressable>
        </View>

        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {tr("settings_section_language")}
          </Text>
          <Text style={[styles.sectionBody, { color: colors.textMuted }]}>
            {tr("settings_language_body")}
          </Text>
          <Pressable
            onPress={() => setLangDropdownOpen((o) => !o)}
            style={[
              styles.langDropdownTrigger,
              {
                backgroundColor: colors.surfaceMuted,
                borderColor: colors.buttonBorder,
              },
            ]}
          >
            <Text style={styles.langFlag}>{LANGUAGE_FLAGS[language]}</Text>
            <Text style={[styles.langDropdownValue, { color: colors.text }]}>
              {LANGUAGES[language]}
            </Text>
            <Feather
              name={langDropdownOpen ? "chevron-up" : "chevron-down"}
              size={16}
              color={colors.textMuted}
            />
          </Pressable>
          {langDropdownOpen ? (
            <View
              style={[
                styles.langDropdownList,
                {
                  backgroundColor: colors.surfaceMuted,
                  borderColor: colors.buttonBorder,
                },
              ]}
            >
              {(Object.keys(LANGUAGES) as LanguageCode[]).map(
                (code, i, arr) => {
                  const active = language === code;
                  return (
                    <Pressable
                      key={code}
                      onPress={() => {
                        setLanguage(code);
                        setLangDropdownOpen(false);
                      }}
                      style={[
                        styles.langDropdownItem,
                        i < arr.length - 1 && {
                          borderBottomWidth: 1,
                          borderBottomColor: colors.buttonBorder,
                        },
                      ]}
                    >
                      <Text style={styles.langFlag}>
                        {LANGUAGE_FLAGS[code]}
                      </Text>
                      <Text
                        style={[
                          styles.langDropdownItemText,
                          { color: active ? colors.accent : colors.text },
                        ]}
                      >
                        {LANGUAGES[code]}
                      </Text>
                      {active ? (
                        <Feather
                          name="check"
                          size={15}
                          color={colors.accent}
                          style={{ marginLeft: "auto" }}
                        />
                      ) : null}
                    </Pressable>
                  );
                },
              )}
            </View>
          ) : null}
        </View>

        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {tr("settings_section_developer")}
          </Text>
          <Pressable
            onPress={sendTestNotification}
            style={[
              styles.testBtn,
              {
                backgroundColor: colors.surfaceMuted,
                borderColor: colors.buttonBorder,
              },
            ]}
          >
            <Text style={[styles.testBtnText, { color: colors.text }]}>
              {tr("settings_send_test_notification")}
            </Text>
          </Pressable>
          <Pressable
            onPress={replayOnboarding}
            style={[
              styles.testBtn,
              {
                backgroundColor: colors.surfaceMuted,
                borderColor: colors.buttonBorder,
              },
            ]}
          >
            <Text style={[styles.testBtnText, { color: colors.text }]}>
              {tr("settings_view_onboarding")}
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
  infoButton: {
    marginLeft: "auto",
    padding: 2,
  },
  githubHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  githubButton: {
    marginTop: 14,
    borderRadius: 20,
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: 16,
    borderWidth: 1,
  },
  githubButtonText: {
    fontFamily: "ReadexPro-Medium",
    fontSize: 15,
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
    borderWidth: 1,
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
  cardViewHint: {
    fontFamily: "ReadexPro-Regular",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 10,
  },
  warningBadge: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    marginTop: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: "#FEF3C7",
    borderWidth: 1,
    borderColor: "#F59E0B",
  },
  warningBadgeText: {
    flex: 1,
    fontFamily: "ReadexPro-Regular",
    fontSize: 12,
    lineHeight: 17,
    color: "#92400E",
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
  langDropdownTrigger: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
    marginTop: 14,
  },
  langDropdownValue: {
    flex: 1,
    fontFamily: "ReadexPro-Medium",
    fontSize: 15,
  },
  langFlag: {
    fontSize: 20,
    lineHeight: 24,
  },
  langDropdownList: {
    borderWidth: 1,
    borderRadius: 14,
    marginTop: 6,
    overflow: "hidden",
  },
  langDropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  langDropdownItemText: {
    fontFamily: "ReadexPro-Medium",
    fontSize: 15,
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
  accountDeletionCard: {
    borderWidth: 1,
    borderRadius: 22,
    marginTop: 18,
    padding: 16,
  },
  accountDeletionTitle: {
    fontFamily: "ReadexPro-Bold",
    fontSize: 15,
  },
  accountDeletionBody: {
    fontFamily: "ReadexPro-Regular",
    fontSize: 13,
    lineHeight: 20,
    marginTop: 8,
  },
  cloudGuideCard: {
    borderWidth: 1,
    borderRadius: 24,
    marginTop: 18,
    padding: 18,
  },
  cloudGuideTitle: {
    fontFamily: "ReadexPro-Bold",
    fontSize: 17,
    lineHeight: 23,
  },
  cloudGuideBody: {
    fontFamily: "ReadexPro-Regular",
    fontSize: 14,
    lineHeight: 21,
    marginTop: 6,
  },
  cloudGuideSteps: {
    gap: 14,
    marginTop: 16,
  },
  cloudGuideStepRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  cloudGuideStepBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  cloudGuideStepBadgeText: {
    fontFamily: "ReadexPro-Bold",
    fontSize: 13,
  },
  cloudGuideStepContent: {
    flex: 1,
    paddingTop: 2,
  },
  cloudGuideStepTitle: {
    fontFamily: "ReadexPro-Bold",
    fontSize: 15,
    lineHeight: 20,
  },
  cloudGuideStepBody: {
    fontFamily: "ReadexPro-Regular",
    fontSize: 13,
    lineHeight: 20,
    marginTop: 4,
  },
  cloudGuideAction: {
    minHeight: 44,
    borderRadius: 16,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    alignSelf: "stretch",
    marginTop: 10,
  },
  cloudGuideActionText: {
    fontFamily: "ReadexPro-Medium",
    fontSize: 14,
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
  switchWrap: {
    borderWidth: 0,
    borderRadius: 999,
    padding: 2,
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
