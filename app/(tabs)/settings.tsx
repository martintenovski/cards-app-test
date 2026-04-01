import { Feather } from "@expo/vector-icons";
import { useIsFocused, useScrollToTop } from "@react-navigation/native";
import { useEffect, useRef, useState } from "react";
import * as LocalAuthentication from "expo-local-authentication";
import * as Linking from "expo-linking";
import * as Notifications from "expo-notifications";
import {
  Alert,
  Modal,
  Platform,
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
import Svg, { Path } from "react-native-svg";
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
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
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
  const [creditsVisible, setCreditsVisible] = useState(false);
  const [cloudVaultStatus, setCloudVaultStatus] = useState<
    "loading" | "missing" | "ready"
  >("loading");
  const [biometricStatus, setBiometricStatus] = useState<
    "supported" | "no-hardware" | "not-enrolled"
  >("supported");
  const supportSummary = getSupporterSummary(customerInfo);
  const shouldShowCloudSyncGuide =
    Boolean(authUser) && cloudVaultStatus === "missing";

  useScrollToTop(scrollViewRef);

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
        tr("alert_disable_lock_screen_title"),
        tr("alert_disable_lock_screen_body"),
        [
          { text: tr("alert_cancel"), style: "cancel" },
          {
            text: tr("alert_disable"),
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
        sound: Platform.OS === "ios" ? "default" : undefined,
        data: { kind: "expiry-reminder", cardId },
      },
      trigger: {
        channelId: Platform.OS === "android" ? "expiry-reminders" : undefined,
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
        tr("alert_purchases_restored_title"),
        tr("alert_purchases_restored_body"),
      );
    } catch (error) {
      Alert.alert(
        tr("alert_restore_failed_title"),
        error instanceof Error
          ? error.message
          : tr("alert_restore_failed_fallback"),
      );
    }
  };

  const handleManageSubscription = async () => {
    try {
      await openMonthlySubscriptionManagement(customerInfo);
    } catch (error) {
      Alert.alert(
        tr("alert_subscription_settings_failed_title"),
        error instanceof Error
          ? error.message
          : tr("alert_subscription_settings_failed_fallback"),
      );
    }
  };

  const handleOpenCloudPassphrase = () => {
    router.push("/cloud-passphrase");
  };

  const handleForgetPassphrase = () => {
    if (!authUser) return;

    Alert.alert(
      tr("alert_forget_passphrase_title"),
      tr("alert_forget_passphrase_body"),
      [
        { text: tr("alert_cancel"), style: "cancel" },
        {
          text: tr("alert_forget_passphrase_btn"),
          style: "destructive",
          onPress: async () => {
            try {
              setAuthBusy("forget-passphrase");
              await deleteStoredSyncPassphrase(authUser.id);
              bumpCloudVaultChangeToken();
            } catch {
              Alert.alert(
                tr("alert_forget_passphrase_failed_title"),
                tr("alert_forget_passphrase_failed_body"),
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
        tr("alert_sync_passphrase_required_title"),
        tr("alert_sync_passphrase_required_body"),
      );
      return;
    }

    requestSync(tr("alert_syncing_body"));
  };

  const handleDeleteData = () => {
    Alert.alert(
      tr("alert_delete_local_data_title"),
      authUser
        ? tr("alert_delete_local_data_body_signed_in")
        : tr("alert_delete_local_data_body_signed_out"),
      [
        { text: tr("alert_cancel"), style: "cancel" },
        {
          text: tr("alert_delete_data_btn"),
          style: "destructive",
          onPress: async () => {
            try {
              setAuthBusy("delete-data");
              if (authUser) {
                setSyncState("idle");
                await deleteWalletSnapshot(authUser.id);
                suppressNextAutoSync();
              }
              replaceCards([]);
              Alert.alert(
                tr("alert_data_deleted_title"),
                authUser
                  ? tr("alert_data_deleted_body_signed_in")
                  : tr("alert_data_deleted_body_signed_out"),
              );
            } catch {
              Alert.alert(
                tr("alert_delete_data_failed_title"),
                tr("alert_delete_data_failed_body"),
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
      tr("alert_delete_account_title"),
      tr("alert_delete_account_body"),
      [
        { text: tr("alert_cancel"), style: "cancel" },
        {
          text: tr("alert_delete_account_btn"),
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
                tr("alert_delete_account_failed_title"),
                error instanceof Error
                  ? error.message
                  : tr("alert_delete_account_failed_fallback"),
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
                  ? tr("biometric_no_hardware")
                  : tr("biometric_not_enrolled")}
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
            <>
              <Text style={[styles.sectionBody, { color: colors.textMuted }]}>
                {tr("cloud_sign_in_prompt")}
              </Text>
              <Pressable
                onPress={() => router.push("/(tabs)/profile")}
                style={[
                  styles.testBtn,
                  {
                    backgroundColor: colors.surfaceMuted,
                    borderColor: colors.buttonBorder,
                  },
                ]}
              >
                <Text style={[styles.testBtnText, { color: colors.text }]}>
                  {tr("cloud_to_profile")}
                </Text>
              </Pressable>
            </>
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
                    {tr("cloud_setup_title")}
                  </Text>
                  <Text
                    style={[styles.cloudGuideBody, { color: colors.textMuted }]}
                  >
                    {tr("cloud_setup_body")}
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
                          {tr("cloud_step_sign_in")}
                        </Text>
                        <Text
                          style={[
                            styles.cloudGuideStepBody,
                            { color: colors.textMuted },
                          ]}
                        >
                          {tr("cloud_step_sign_in_done")}
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
                          {tr("cloud_step_create_passphrase")}
                        </Text>
                        <Text
                          style={[
                            styles.cloudGuideStepBody,
                            { color: colors.textMuted },
                          ]}
                        >
                          {tr("cloud_step_passphrase_desc")}
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
                            {tr("cloud_set_sync_passphrase")}
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
                          {tr("cloud_step_read_how")}
                        </Text>
                        <Text
                          style={[
                            styles.cloudGuideStepBody,
                            { color: colors.textMuted },
                          ]}
                        >
                          {tr("cloud_step_read_how_desc")}
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
                            {tr("cloud_read_more")}
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
                        ? tr("cloud_vault_enabled")
                        : cloudVaultStatus === "loading"
                          ? tr("cloud_vault_checking")
                          : tr("cloud_vault_not_setup")}
                    </Text>
                    <Text
                      style={[
                        styles.cloudStatusBody,
                        { color: colors.textMuted },
                      ]}
                    >
                      {cloudVaultStatus === "ready"
                        ? tr("cloud_vault_enabled_desc")
                        : tr("cloud_vault_not_setup_desc")}
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
                        ? tr("cloud_update_sync_passphrase")
                        : tr("cloud_set_sync_passphrase")}
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
                      ? tr("cloud_forgetting_passphrase")
                      : tr("cloud_forget_passphrase_btn")}
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
                        ? tr("cloud_syncing_data")
                        : tr("cloud_sync_data_btn")}
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
                  {tr("cloud_account_deletion")}
                </Text>
                <Text
                  style={[
                    styles.accountDeletionBody,
                    { color: colors.textMuted },
                  ]}
                >
                  {tr("cloud_account_deletion_desc")}
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
                      ? tr("cloud_deleting_account")
                      : tr("cloud_delete_account_btn")}
                  </Text>
                </Pressable>
              </View>
            </>
          )}
        </View>

        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {tr("data_management_title")}
          </Text>
          <Text style={[styles.sectionBody, { color: colors.textMuted }]}>
            {tr("data_management_body")}
          </Text>
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
                ? tr("data_deleting_local")
                : tr("data_delete_local_btn")}
            </Text>
          </Pressable>
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
                ? tr("support_type_monthly")
                : supportSummary.status === "lifetime"
                  ? tr("support_type_lifetime")
                  : supportSummary.status === "tipper"
                    ? tr("support_type_tip")
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
                {tr("support_cancel_monthly")}
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
            {tr("credits_title")}
          </Text>
          <Text style={[styles.sectionBody, { color: colors.textMuted }]}>
            {tr("credits_body")}
          </Text>
          <Pressable
            onPress={() => setCreditsVisible(true)}
            style={[
              styles.testBtn,
              {
                backgroundColor: colors.surfaceMuted,
                borderColor: colors.buttonBorder,
              },
            ]}
          >
            <Text style={[styles.testBtnText, { color: colors.text }]}>
              {tr("credits_view_all")}
            </Text>
          </Pressable>
          <Text style={[styles.copyrightText, { color: colors.textMuted }]}>
            {`\u00A9 ${new Date().getFullYear()} \u2014 Pocket ID, ${tr("credits_all_rights")}`}
          </Text>
          <View style={styles.developerBrandRow}>
            <Text style={[styles.developerByText, { color: colors.textMuted }]}>
              by
            </Text>
            <Svg width={24} height={24} viewBox="0 0 525 525" fill="none">
              <Path
                d="M262.5 0C407.475 0 525 117.525 525 262.5C525 407.475 407.475 525 262.5 525C117.525 525 0 407.475 0 262.5C4.31772e-06 117.525 117.525 4.31667e-06 262.5 0ZM271.854 316.381C265.526 310.186 255.406 310.186 249.078 316.381L207.913 356.682C197.49 366.885 204.714 384.593 219.302 384.593H301.631C316.218 384.593 323.442 366.885 313.02 356.682L271.854 316.381ZM261.706 145.718C238.767 145.718 216.341 152.521 197.268 165.266C178.193 178.011 163.326 196.125 154.547 217.32C145.768 238.514 143.471 261.836 147.947 284.336C150.826 298.804 156.42 312.514 164.361 324.772C171.694 336.091 187.421 335.992 196.957 326.456L231.309 292.103L210.413 259.356C200.041 243.102 211.717 221.803 230.999 221.803H289.932C309.214 221.803 320.888 243.102 310.516 259.356L290.587 290.587L326.456 326.456C335.992 335.992 351.719 336.091 359.051 324.772C366.992 312.514 372.589 298.804 375.466 284.336C379.942 261.836 377.644 238.514 368.865 217.32C360.086 196.125 345.22 178.011 326.146 165.266C307.072 152.521 284.647 145.718 261.706 145.718Z"
                fill="#5956FF"
              />
            </Svg>
            <Text style={[styles.developerText, { color: colors.textMuted }]}>
              Tenovski
            </Text>
          </View>
          <Modal
            visible={creditsVisible}
            transparent
            animationType="fade"
            onRequestClose={() => setCreditsVisible(false)}
            statusBarTranslucent
          >
            <View style={styles.creditsModalRoot}>
              <Pressable
                style={StyleSheet.absoluteFill}
                onPress={() => setCreditsVisible(false)}
                accessible={false}
              >
                <View style={styles.creditsBackdrop} />
              </Pressable>
              <View style={styles.creditsCentered} pointerEvents="box-none">
                <View
                  style={[
                    styles.creditsSheet,
                    {
                      backgroundColor: colors.surface,
                      shadowColor: "#000",
                    },
                  ]}
                >
                  <View style={styles.creditsHeader}>
                    <Text
                      style={[styles.creditsTitle, { color: colors.text }]}
                    >
                      {tr("credits_title")}
                    </Text>
                    <Pressable
                      onPress={() => setCreditsVisible(false)}
                      style={[
                        styles.creditsCloseBtn,
                        { backgroundColor: colors.surfaceMuted },
                      ]}
                      hitSlop={8}
                    >
                      <Feather name="x" size={18} color={colors.textMuted} />
                    </Pressable>
                  </View>
                  <Text
                    style={[
                      styles.creditsSubtitle,
                      { color: colors.textMuted },
                    ]}
                  >
                    {tr("credits_thanks")}
                  </Text>
                  <ScrollView
                    style={styles.creditsList}
                    showsVerticalScrollIndicator={false}
                  >
                    {[
                      "Marko N.", 
                      "Jovica I.",
                      "Alex G.",
                      "Maggie M.",
                      "Selmin N.",
                      "Luna T.",
                    ].map((name) => (
                      <View
                        key={name}
                        style={[
                          styles.creditsRow,
                          { borderBottomColor: colors.border },
                        ]}
                      >
                        <Text
                          style={[
                            styles.creditsName,
                            { color: colors.text },
                          ]}
                        >
                          {name}
                        </Text>
                      </View>
                    ))}
                  </ScrollView>
                </View>
              </View>
            </View>
          </Modal>
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
  creditsModalRoot: {
    flex: 1,
  },
  creditsBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  creditsCentered: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  creditsSheet: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 28,
    padding: 24,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
  },
  creditsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  creditsTitle: {
    fontFamily: "ReadexPro-Bold",
    fontSize: 20,
    flex: 1,
    marginRight: 12,
  },
  creditsCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  creditsSubtitle: {
    fontFamily: "ReadexPro-Regular",
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 18,
  },
  creditsList: {
    maxHeight: 300,
  },
  creditsRow: {
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  creditsName: {
    fontFamily: "ReadexPro-Medium",
    fontSize: 16,
  },
  developerText: {
    fontFamily: "ReadexPro-Medium",
    fontSize: 14,
    textAlign: "center",
  },
  developerByText: {
    fontFamily: "ReadexPro-Regular",
    fontSize: 13,
    textAlign: "center",
  },
  developerBrandRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 10,
  },
  copyrightText: {
    fontFamily: "ReadexPro-Regular",
    fontSize: 12,
    textAlign: "center",
    marginTop: 12,
  },
});
