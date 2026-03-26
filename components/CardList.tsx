import type { ReactNode } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View, useColorScheme } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useEffect } from "react";

import { CardItem } from "@/components/CardItem";
import type { WalletCard } from "@/types/card";
import { APP_THEME, resolveTheme } from "@/utils/theme";
import { useCardStore } from "@/store/useCardStore";

const FUN_MESSAGES = [
  { emoji: "🃏", text: "Shuffling your cards..." },
  { emoji: "✨", text: "Polishing your wallet..." },
  { emoji: "🔍", text: "Checking for secret cards..." },
  { emoji: "🧹", text: "Dusting off the deck..." },
  { emoji: "🎴", text: "Dealing from the top..." },
  { emoji: "🪄", text: "Nothing up my sleeve..." },
  { emoji: "🎩", text: "Pulling a card out of a hat..." },
  { emoji: "💳", text: "Card inspection in progress..." },
  { emoji: "🎰", text: "Jackpot? Nope. Still the same cards." },
  { emoji: "🕵️", text: "Investigating your wallet..." },
  { emoji: "🐌", text: "Taking my sweet time..." },
  { emoji: "🤌", text: "Chef's kiss on those cards." },
  { emoji: "🦆", text: "Quack. Just checking in." },
  { emoji: "🛸", text: "Scanning for alien cards..." },
  { emoji: "🍕", text: "No pizza here. Just cards." },
  { emoji: "🐉", text: "Dragon guarding your vault..." },
  { emoji: "🎭", text: "The drama of it all..." },
  { emoji: "🧠", text: "Memorising every card..." },
  { emoji: "🌀", text: "Going in circles... found nothing new." },
  { emoji: "🫧", text: "Bubble-wrapping your data..." },
  { emoji: "🐧", text: "Penguin approved. Refreshing." },
  { emoji: "🪩", text: "Disco mode: activated." },
  { emoji: "🦥", text: "Refreshing at my own pace..." },
  { emoji: "🧃", text: "Freshly squeezed wallet." },
  { emoji: "🎯", text: "Locked in. Cards confirmed." },
  { emoji: "🦋", text: "A fresh flutter of cards..." },
  { emoji: "🧊", text: "Keeping things cool..." },
  { emoji: "🥷", text: "Ninja card check complete." },
  { emoji: "🌮", text: "Taco Tuesday? No — card day." },
  { emoji: "📡", text: "Pinging your wallet..." },
];

type CardListProps = {
  cards: WalletCard[];
  header?: ReactNode;
  onCardPress?: (id: string) => void;
  onCardLongPress?: (id: string) => void;
  bottomSpacing?: number;
  refreshing?: boolean;
  onRefresh?: () => void;
  funMessage?: { emoji: string; text: string };
};

function FunRefreshBanner({
  visible,
  emoji,
  text,
  colors,
}: {
  visible: boolean;
  emoji: string;
  text: string;
  colors: (typeof APP_THEME)[keyof typeof APP_THEME];
}) {
  const scale = useSharedValue(0.95);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      opacity.value = withTiming(1, { duration: 200 });
      scale.value = withTiming(1, { duration: 200 });
    } else {
      opacity.value = withTiming(0, { duration: 150 });
      scale.value = withTiming(0.95, { duration: 150 });
    }
  }, [visible]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        animStyle,
        styles.funBanner,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <Text style={styles.funEmoji}>{emoji}</Text>
      <Text style={[styles.funText, { color: colors.textMuted }]}>{text}</Text>
    </Animated.View>
  );
}

export function CardList({
  cards,
  header,
  onCardPress,
  onCardLongPress,
  bottomSpacing = 120,
  refreshing = false,
  onRefresh,
  funMessage = FUN_MESSAGES[0],
}: CardListProps) {
  const themePreference = useCardStore((s) => s.themePreference);
  const deviceScheme = useColorScheme();
  const colors = APP_THEME[resolveTheme(themePreference, deviceScheme)];

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.content, { paddingBottom: bottomSpacing }]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={false}
            onRefresh={onRefresh}
          />
        ) : undefined
      }
    >
      {onRefresh ? (
        <FunRefreshBanner
          visible={refreshing}
          emoji={funMessage.emoji}
          text={funMessage.text}
          colors={colors}
        />
      ) : null}
      {header ? <View style={styles.header}>{header}</View> : null}
      {cards.map((card) => (
        <Pressable
          key={card.id}
          style={styles.item}
          onPress={() => onCardPress?.(card.id)}
          onLongPress={() => onCardLongPress?.(card.id)}
          delayLongPress={600}
        >
          <CardItem card={card} size="full" side="front" />
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  content: {
    paddingTop: 0,
    paddingHorizontal: 25,
    gap: 16,
  },
  header: {
    width: "100%",
  },
  item: {
    width: "100%",
  },
  funBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 14,
    marginBottom: 4,
  },
  funEmoji: {
    fontSize: 26,
  },
  funText: {
    fontFamily: "ReadexPro-Medium",
    fontSize: 14,
    flex: 1,
  },
});
