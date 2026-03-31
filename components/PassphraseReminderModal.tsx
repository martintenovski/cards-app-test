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

const SNOOZE_KEY = "passphrase_reminder_snoozed_until";
const SNOOZE_DAYS = 3;

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

  useEffect(() => {
    if (!authReady || !hasHydrated || !user) return;

    let cancelled = false;

    async function check() {
      const snoozedUntil = await AsyncStorage.getItem(SNOOZE_KEY);
      if (snoozedUntil && Date.now() < Number(snoozedUntil)) return;

      const hasPP = await hasStoredSyncPassphrase(user!.id);
      if (!hasPP && !cancelled) {
        setVisible(true);
      }
    }

    void check();

    return () => {
      cancelled = true;
    };
  }, [authReady, hasHydrated, user]);

  async function handleLater() {
    const snoozedUntil = Date.now() + SNOOZE_DAYS * 24 * 60 * 60 * 1000;
    await AsyncStorage.setItem(SNOOZE_KEY, String(snoozedUntil));
    setVisible(false);
  }

  function handleGoProfile() {
    setVisible(false);
    router.push("/(tabs)/profile");
  }

  if (!visible) return null;

  return (
    <Modal
      transparent
      animationType="fade"
      visible={visible}
      onRequestClose={() => void handleLater()}
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
            onPress={handleGoProfile}
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
            onPress={() => void handleLater()}
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
