import { useEffect, useState } from "react";
import { StyleSheet, useColorScheme } from "react-native";
import Animated from "react-native-reanimated";

import { CardItem } from "@/components/CardItem";
import { FocusOverlayModal } from "@/components/FocusOverlayModal";
import type { ClubCard, WalletCard } from "@/types/card";
import { useCardStore } from "@/store/useCardStore";
import { APP_THEME, resolveTheme } from "@/utils/theme";

function getQuickViewSide(card: WalletCard): "front" | "back" {
  if (card.category === "club") {
    const c = card as ClubCard;
    if (c.memberIdFormat === "barcode") return "back";
  }
  return "front";
}

type Props = {
  card: WalletCard | null;
  onDismiss: () => void;
};

export function CardQuickView({ card, onDismiss }: Props) {
  const [displayCard, setDisplayCard] = useState<WalletCard | null>(null);

  const deviceScheme = useColorScheme();
  const themePreference = useCardStore((s) => s.themePreference);
  const resolvedTheme = resolveTheme(themePreference, deviceScheme);
  const colors = APP_THEME[resolvedTheme];

  useEffect(() => {
    if (card) {
      setDisplayCard(card);
      return;
    }

    const timeout = setTimeout(() => {
      setDisplayCard(null);
    }, 180);

    return () => {
      clearTimeout(timeout);
    };
  }, [card]);

  const side = displayCard ? getQuickViewSide(displayCard) : "front";

  return (
    <FocusOverlayModal
      visible={Boolean(card)}
      onDismiss={onDismiss}
      backgroundColor={colors.background}
      hintColor={colors.textSoft}
      hint="Tap anywhere to dismiss"
      contentContainerStyle={styles.cardWrap}
    >
      {displayCard ? (
        <Animated.View>
          <CardItem
            card={displayCard}
            size="full"
            side={side}
            showExpiryBadge={false}
          />
        </Animated.View>
      ) : null}
    </FocusOverlayModal>
  );
}

const styles = StyleSheet.create({
  cardWrap: {
    width: "100%",
    maxWidth: 520,
  },
});
