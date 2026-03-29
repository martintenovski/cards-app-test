import type { ReactNode } from "react";
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useCallback, useEffect, forwardRef, memo } from "react";

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
  refreshBannerBottomSpacing?: number;
};

function FunRefreshBanner({
  visible,
  emoji,
  text,
  colors,
  bottomSpacing,
}: {
  visible: boolean;
  emoji: string;
  text: string;
  colors: (typeof APP_THEME)[keyof typeof APP_THEME];
  bottomSpacing: number;
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
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          marginBottom: bottomSpacing,
        },
      ]}
    >
      <Text style={styles.funEmoji}>{emoji}</Text>
      <Text style={[styles.funText, { color: colors.textMuted }]}>{text}</Text>
    </Animated.View>
  );
}

const CardListItem = memo(function CardListItem({
  card,
  onCardPress,
  onCardLongPress,
}: {
  card: WalletCard;
  onCardPress?: (id: string) => void;
  onCardLongPress?: (id: string) => void;
}) {
  return (
    <Pressable
      style={styles.item}
      onPress={() => onCardPress?.(card.id)}
      onLongPress={() => onCardLongPress?.(card.id)}
      delayLongPress={600}
    >
      <CardItem card={card} size="full" side="front" />
    </Pressable>
  );
});

export const CardList = forwardRef<FlatList<WalletCard>, CardListProps>(
  function CardList(
    {
      cards,
      header,
      onCardPress,
      onCardLongPress,
      bottomSpacing = 120,
      refreshing = false,
      onRefresh,
      funMessage = FUN_MESSAGES[0],
      refreshBannerBottomSpacing = 0,
    },
    ref,
  ) {
    const themePreference = useCardStore((s) => s.themePreference);
    const deviceScheme = useColorScheme();
    const colors = APP_THEME[resolveTheme(themePreference, deviceScheme)];

    const keyExtractor = useCallback((item: WalletCard) => item.id, []);

    const renderItem = useCallback(
      ({ item }: { item: WalletCard }) => (
        <CardListItem
          card={item}
          onCardPress={onCardPress}
          onCardLongPress={onCardLongPress}
        />
      ),
      [onCardPress, onCardLongPress],
    );

    const ListHeader = (
      <>
        {onRefresh ? (
          <FunRefreshBanner
            visible={refreshing}
            emoji={funMessage.emoji}
            text={funMessage.text}
            colors={colors}
            bottomSpacing={refreshBannerBottomSpacing}
          />
        ) : null}
        {header ? <View style={styles.header}>{header}</View> : null}
      </>
    );

    return (
      <FlatList
        ref={ref}
        data={cards}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: bottomSpacing },
        ]}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        removeClippedSubviews
        initialNumToRender={8}
        maxToRenderPerBatch={6}
        windowSize={5}
        ListHeaderComponent={ListHeader}
        refreshControl={
          onRefresh ? (
            <RefreshControl refreshing={false} onRefresh={onRefresh} />
          ) : undefined
        }
      />
    );
  },
);

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
