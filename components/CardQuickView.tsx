import { useEffect, useState } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from "react-native";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CardItem } from "@/components/CardItem";
import type { ClubCard, WalletCard } from "@/types/card";
import { useCardStore } from "@/store/useCardStore";
import { APP_THEME, resolveTheme } from "@/utils/theme";

const ENTER_MS = 220;
const EXIT_MS = 170;

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
  // Keep a local copy of the card so it stays visible during the fade-out
  // animation even after the parent sets `card` to null.
  const [modalVisible, setModalVisible] = useState(false);
  const [displayCard, setDisplayCard] = useState<WalletCard | null>(null);

  const bgOpacity = useSharedValue(0);
  const cardScale = useSharedValue(0.88);
  const cardOpacity = useSharedValue(0);

  const deviceScheme = useColorScheme();
  const themePreference = useCardStore((s) => s.themePreference);
  const resolvedTheme = resolveTheme(themePreference, deviceScheme);
  const colors = APP_THEME[resolvedTheme];
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (card) {
      setDisplayCard(card);
      setModalVisible(true);
      bgOpacity.value = withTiming(1, { duration: ENTER_MS });
      cardScale.value = withTiming(1, { duration: ENTER_MS });
      cardOpacity.value = withTiming(1, { duration: ENTER_MS });
    } else {
      bgOpacity.value = withTiming(0, { duration: EXIT_MS });
      cardScale.value = withTiming(0.88, { duration: EXIT_MS });
      cardOpacity.value = withTiming(0, { duration: EXIT_MS }, (done) => {
        if (done) runOnJS(setModalVisible)(false);
      });
    }
  }, [card]); // eslint-disable-line react-hooks/exhaustive-deps

  const bgStyle = useAnimatedStyle(() => ({
    opacity: bgOpacity.value,
  }));

  const cardAnimStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{ scale: cardScale.value }],
  }));

  const side = displayCard ? getQuickViewSide(displayCard) : "front";

  return (
    <Modal
      transparent
      visible={modalVisible}
      animationType="none"
      statusBarTranslucent
      onRequestClose={onDismiss}
    >
      {/* Animated background layer */}
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          bgStyle,
          { backgroundColor: colors.background },
        ]}
        pointerEvents="none"
      />

      {/* Tap-to-dismiss layer + centered card */}
      <Pressable style={styles.container} onPress={onDismiss}>
        {displayCard ? (
          <Animated.View style={[styles.cardWrap, cardAnimStyle]}>
            <CardItem
              card={displayCard}
              size="full"
              side={side}
              showExpiryBadge={false}
            />
          </Animated.View>
        ) : null}
      </Pressable>

      {/* Dismiss hint — non-interactive, always above the pressable layer */}
      <View
        style={[styles.hintWrap, { bottom: insets.bottom + 28 }]}
        pointerEvents="none"
      >
        <Animated.Text
          style={[styles.hint, { color: colors.textSoft }, bgStyle]}
        >
          Tap anywhere to dismiss
        </Animated.Text>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  cardWrap: {
    paddingHorizontal: 25,
    width: "100%",
  },
  hintWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
  },
  hint: {
    fontFamily: "ReadexPro-Regular",
    fontSize: 13,
    textAlign: "center",
  },
});
