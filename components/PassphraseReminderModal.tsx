import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from "react-native";

import { useTranslation } from "@/src/hooks/useTranslation";
import { useAuthStore } from "@/store/useAuthStore";
import { useCardStore } from "@/store/useCardStore";
import { hasStoredSyncPassphrase } from "@/utils/cloudVault";
import { APP_THEME, resolveTheme } from "@/utils/theme";

const PASSHRASE_SETUP_SNOOZE_KEY = "passphrase_reminder_setup_snoozed_until";
const PASSHRASE_SETUP_SNOOZE_DAYS = 3;

function getSnoozeKey(userId: string) {
  return `${PASSHRASE_SETUP_SNOOZE_KEY}:${userId}`;
}

export function PassphraseReminderModal() {
  const tr = useTranslation();
  const router = useRouter();
  const deviceScheme = useColorScheme();
  const themePreference = useCardStore((state) => state.themePreference);
  const resolvedTheme = resolveTheme(themePreference, deviceScheme);
  const colors = APP_THEME[resolvedTheme];

  const user = useAuthStore((state) => state.user);
  const authReady = useAuthStore((state) => state.isReady);
  const hasHydrated = useCardStore((state) => state.hasHydrated);

  const [visible, setVisible] = useState(false);
  const [dismissedThisSession, setDismissedThisSession] = useState(false);

  useEffect(() => {
    if (!user) {
      setDismissedThisSession(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!authReady || !hasHydrated) {
      return;
    }

    if (!user) {
      setVisible(false);
      return;
    }

    if (dismissedThisSession) {
      setVisible(false);
      return;
    }

    let cancelled = false;
    const userId = user.id;

    async function check() {
      const snoozeKey = getSnoozeKey(userId);
      const hasPP = await hasStoredSyncPassphrase(userId);

      if (hasPP) {
        await AsyncStorage.removeItem(snoozeKey).catch(() => null);
        if (!cancelled) {
          setVisible(false);
        }
        return;
      }

      const snoozedUntil = await AsyncStorage.getItem(snoozeKey);
      if (snoozedUntil && Date.now() < Number(snoozedUntil)) {
        if (!cancelled) {
          setVisible(false);
        }
        return;
      }

      if (!cancelled) {
        setVisible(true);
      }
    }

    void check();

    return () => {
      cancelled = true;
    };
  }, [authReady, dismissedThisSession, hasHydrated, user?.id]);

  function handleLater() {
    setDismissedThisSession(true);
    setVisible(false);
  }

  async function handleOpenPassphraseSetup() {
    if (user) {
      const snoozedUntil =
        Date.now() +
        PASSHRASE_SETUP_SNOOZE_DAYS * 24 * 60 * 60 * 1000;
      await AsyncStorage.setItem(
        getSnoozeKey(user.id),
        String(snoozedUntil),
      ).catch(() => null);
    }

    setDismissedThisSession(true);
    setVisible(false);
    router.push("/cloud-passphrase");
  }

  if (!visible) return null;

  return (
    <Modal
      transparent
      animationType="fade"
      visible={visible}
      onRequestClose={handleLater}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View
          style={[
            styles.sheet,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.title, { color: colors.text }]}>
            {tr("passphrase_reminder_title")}
          </Text>
          <Text style={[styles.body, { color: colors.textMuted }]}>
            {tr("passphrase_reminder_body")}
          </Text>

          <Pressable
            style={[styles.primaryBtn, { backgroundColor: colors.accent }]}
            onPress={() => void handleOpenPassphraseSetup()}
          >
            <Text style={[styles.primaryBtnText, { color: colors.accentText }]}>
              {tr("passphrase_reminder_go_profile")}
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.secondaryBtn,
              { borderColor: colors.border, backgroundColor: colors.surfaceMuted },
            ]}
            onPress={handleLater}
          >
            <Text style={[styles.secondaryBtnText, { color: colors.textMuted }]}>
              {tr("passphrase_reminder_later")}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
    paddingBottom: 24,
    paddingHorizontal: 16,
  },
  sheet: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    gap: 12,
  },
  title: {
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 4,
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  primaryBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  primaryBtnText: {
    fontSize: 15,
    fontWeight: "600",
  },
  secondaryBtn: {
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 14,
    alignItems: "center",
  },
  secondaryBtnText: {
    fontSize: 15,
    fontWeight: "500",
  },
});
