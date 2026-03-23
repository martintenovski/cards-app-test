import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";

import { useCardStore } from "@/store/useCardStore";
import {
  getCardDisplayName,
  getCategoryLabel,
  type WalletCard,
} from "@/types/card";
import {
  formatExpiryDateForNotification,
  getCardExpiryDate,
} from "@/utils/expiry";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const REMINDER_DEFINITIONS = [
  { key: "1m", label: "1 month", getDate: subtractOneMonth },
  {
    key: "2w",
    label: "2 weeks",
    getDate: (date: Date) => subtractDays(date, 14),
  },
  {
    key: "2d",
    label: "2 days",
    getDate: (date: Date) => subtractDays(date, 2),
  },
] as const;

function subtractDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() - days);
  next.setHours(9, 0, 0, 0);
  return next;
}

function subtractOneMonth(date: Date) {
  const next = new Date(date);
  const targetDay = next.getDate();
  next.setMonth(next.getMonth() - 1);
  if (next.getDate() !== targetDay) {
    next.setDate(0);
  }
  next.setHours(9, 0, 0, 0);
  return next;
}

async function ensurePermissions() {
  const settings = await Notifications.getPermissionsAsync();
  if (
    settings.granted ||
    settings.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL
  ) {
    return true;
  }

  const requested = await Notifications.requestPermissionsAsync();
  return (
    requested.granted ||
    requested.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL
  );
}

async function configureAndroidChannel() {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync("expiry-reminders", {
    name: "Expiry reminders",
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 180, 120, 180],
    lightColor: "#239BFF",
  });
}

async function clearExistingExpiryReminders() {
  const existing = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    existing
      .filter(
        (notification) => notification.content.data?.kind === "expiry-reminder",
      )
      .map((notification) =>
        Notifications.cancelScheduledNotificationAsync(notification.identifier),
      ),
  );
}

async function scheduleReminder(card: WalletCard) {
  const expiryDate = getCardExpiryDate(card);
  if (!expiryDate) return;

  const now = Date.now();
  const categoryLabel = getCategoryLabel(card.category);
  const displayName = getCardDisplayName(card);
  const expiryText = formatExpiryDateForNotification(expiryDate);

  for (const reminder of REMINDER_DEFINITIONS) {
    const triggerDate = reminder.getDate(expiryDate);
    if (triggerDate.getTime() <= now) continue;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: `${displayName} expires soon`,
        body: `Your ${categoryLabel.toLowerCase()} expires in ${reminder.label} on ${expiryText}.`,
        sound: Platform.OS === "ios" ? "default" : undefined,
        data: {
          kind: "expiry-reminder",
          cardId: card.id,
          category: card.category,
          reminder: reminder.key,
        },
      },
      trigger: {
        channelId: Platform.OS === "android" ? "expiry-reminders" : undefined,
        date: triggerDate,
        type: Notifications.SchedulableTriggerInputTypes.DATE,
      },
    });
  }
}

async function syncExpiryNotifications(cards: WalletCard[]) {
  await configureAndroidChannel();
  const hasPermission = await ensurePermissions();
  if (!hasPermission) return;
  await clearExistingExpiryReminders();
  for (const card of cards) {
    await scheduleReminder(card);
  }
}

export function ExpiryNotificationManager() {
  const cards = useCardStore((state) => state.cards);
  const hasHydrated = useCardStore((state) => state.hasHydrated);
  const expiryNotificationsEnabled = useCardStore(
    (state) => state.expiryNotificationsEnabled,
  );
  const isSyncingRef = useRef(false);

  useEffect(() => {
    if (Platform.OS === "web" || !hasHydrated || isSyncingRef.current) {
      return;
    }

    if (!expiryNotificationsEnabled) {
      isSyncingRef.current = true;
      void clearExistingExpiryReminders().finally(() => {
        isSyncingRef.current = false;
      });
      return;
    }

    isSyncingRef.current = true;
    void syncExpiryNotifications(cards).finally(() => {
      isSyncingRef.current = false;
    });
  }, [cards, expiryNotificationsEnabled, hasHydrated]);

  return null;
}
