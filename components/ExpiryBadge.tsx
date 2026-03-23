import { StyleSheet, Text, View } from "react-native";

import type { WalletCard } from "@/types/card";
import { getExpiryStatus } from "@/utils/expiry";

type ExpiryBadgeProps = {
  card: WalletCard;
  compact?: boolean;
  showSuffix?: boolean;
  appearance?: "default" | "surface";
};

const BADGE_COLORS = {
  default: {
    green: {
      background: "rgba(27, 172, 107, 0.18)",
      border: "rgba(27, 172, 107, 0.45)",
      text: "#D9FFEF",
    },
    yellow: {
      background: "rgba(240, 187, 48, 0.18)",
      border: "rgba(240, 187, 48, 0.45)",
      text: "#FFF5CC",
    },
    red: {
      background: "rgba(234, 78, 78, 0.18)",
      border: "rgba(234, 78, 78, 0.48)",
      text: "#FFE2E2",
    },
  },
  surface: {
    green: {
      background: "#E7F8EF",
      border: "#8FD7B0",
      text: "#176540",
    },
    yellow: {
      background: "#FFF4D9",
      border: "#E7BE63",
      text: "#7A5700",
    },
    red: {
      background: "#FFE6E4",
      border: "#E59A95",
      text: "#8F2E29",
    },
  },
} as const;

export function ExpiryBadge({
  card,
  compact = false,
  showSuffix = true,
  appearance = "default",
}: ExpiryBadgeProps) {
  const status = getExpiryStatus(card, new Date(), {
    includeSuffix: showSuffix,
  });
  if (!status) return null;

  const palette = BADGE_COLORS[appearance][status.tone];

  return (
    <View
      style={[
        styles.badge,
        compact ? styles.badgeCompact : null,
        {
          backgroundColor: palette.background,
          borderColor: palette.border,
        },
      ]}
    >
      <Text
        style={[
          styles.text,
          compact ? styles.textCompact : null,
          { color: palette.text },
        ]}
      >
        {status.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignSelf: "flex-start",
  },
  badgeCompact: {
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  text: {
    fontFamily: "ReadexPro-Bold",
    fontSize: 11,
    letterSpacing: 0.3,
  },
  textCompact: {
    fontSize: 11,
  },
});
