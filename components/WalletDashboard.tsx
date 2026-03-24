import { useEffect, useMemo, useState } from "react";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  useColorScheme,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useRouter } from "expo-router";

import { CardList } from "@/components/CardList";
import { CardQuickView } from "@/components/CardQuickView";
import { CardStack } from "@/components/CardStack";
import { TopMenu } from "@/components/TopMenu";
import { useCardStore } from "@/store/useCardStore";
import {
  FILTER_LABELS,
  getCardsByFilter,
  type HomeFilter,
  type WalletCard,
} from "@/types/card";
import { APP_THEME, resolveTheme } from "@/utils/theme";

type WalletDashboardProps = {
  routeFilter: HomeFilter;
};

export function WalletDashboard({ routeFilter }: WalletDashboardProps) {
  const router = useRouter();
  const deviceScheme = useColorScheme();
  const { width, height } = useWindowDimensions();
  const [menuOpen, setMenuOpen] = useState(false);
  const [quickViewCard, setQuickViewCard] = useState<WalletCard | null>(null);
  const cards = useCardStore((state) => state.cards);
  const viewMode = useCardStore((state) => state.viewMode);
  const homeFilter = useCardStore((state) => state.homeFilter);
  const themePreference = useCardStore((state) => state.themePreference);
  const setHomeFilter = useCardStore((state) => state.setHomeFilter);
  const cycleCardFwd = useCardStore((state) => state.cycleCardFwd);
  const cycleCardBwd = useCardStore((state) => state.cycleCardBwd);
  const resolvedTheme = resolveTheme(themePreference, deviceScheme);
  const colors = APP_THEME[resolvedTheme];
  const isCompact = width < 390;
  const isShort = height < 760;

  // Chevron rotation animation
  const chevronRotate = useSharedValue(0);
  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${chevronRotate.value}deg` }],
  }));
  useEffect(() => {
    chevronRotate.value = withTiming(menuOpen ? 180 : 0, { duration: 250 });
  }, [menuOpen]);

  useEffect(() => {
    // Sync homeFilter with specific-tab routes only
    if (routeFilter !== "everything" && homeFilter !== routeFilter) {
      setHomeFilter(routeFilter);
    }
  }, [routeFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  const activeFilter = routeFilter === "everything" ? homeFilter : routeFilter;
  const filteredCards = useMemo(
    () => getCardsByFilter(cards, activeFilter),
    [activeFilter, cards],
  );

  const handleSelectFilter = (filter: HomeFilter) => {
    setHomeFilter(filter);
    // Filter in place — no navigation
  };

  const handleCardLongPress = (id: string) => {
    const card = filteredCards.find((c) => c.id === id);
    if (!card) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setQuickViewCard(card);
  };

  return (
    <SafeAreaView
      edges={["top"]}
      style={[styles.root, { backgroundColor: colors.background }]}
    >
      {/* ── Header ─────────────────────────────────────────── */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Open filter menu"
        onPress={() => setMenuOpen(true)}
        style={[
          styles.header,
          {
            paddingHorizontal: isCompact ? 20 : 25,
            paddingTop: isCompact ? 16 : 20,
          },
        ]}
      >
        <View style={styles.headingWrap}>
          <Text
            style={[
              styles.headingMain,
              {
                color: colors.text,
                fontSize: isCompact ? 31 : 36,
                lineHeight: isCompact ? 37 : 42,
              },
            ]}
          >
            Manage
          </Text>
          <Text
            numberOfLines={2}
            style={[
              styles.headingSub,
              {
                color: colors.textMuted,
                fontSize: isCompact ? 24 : 30,
                lineHeight: isCompact ? 29 : 36,
              },
            ]}
          >
            {FILTER_LABELS[activeFilter]}
          </Text>
        </View>
        <View
          style={[
            styles.chevronBtn,
            {
              width: isCompact ? 48 : 55,
              height: isCompact ? 48 : 55,
              marginTop: isCompact ? 2 : 8,
            },
          ]}
        >
          <Animated.View style={chevronStyle}>
            <Feather
              name="chevron-down"
              size={isCompact ? 22 : 24}
              color={colors.text}
            />
          </Animated.View>
        </View>
      </Pressable>

      {/* ── Cards area ─────────────────────────────────────── */}
      <View
        style={[
          styles.cardsArea,
          { marginTop: isCompact ? 14 : 20, marginBottom: isCompact ? 16 : 20 },
        ]}
      >
        {cards.length === 0 ? (
          <Pressable
            style={[
              styles.mockCard,
              {
                marginHorizontal: isCompact ? 20 : 25,
                height: isCompact ? 212 : 252,
                borderRadius: isCompact ? 24 : 30,
                borderColor: colors.border,
                backgroundColor: colors.surface,
              },
            ]}
            onPress={() => router.push("/add-card")}
          >
            <Feather
              name="credit-card"
              size={isCompact ? 38 : 44}
              color={colors.textSoft}
            />
            <Text
              style={[
                styles.mockCardText,
                { color: colors.textMuted, fontSize: isCompact ? 17 : 18 },
              ]}
            >
              Add your first card
            </Text>
            <Text
              style={[
                styles.mockCardSub,
                {
                  color: colors.textSoft,
                  fontSize: isCompact ? 12 : 13,
                },
              ]}
            >
              Tap here to get started
            </Text>
          </Pressable>
        ) : filteredCards.length === 0 ? (
          <View
            style={[
              styles.emptyBox,
              {
                backgroundColor: colors.surface,
                marginHorizontal: isCompact ? 20 : 25,
                marginTop: isShort ? 24 : 40,
                borderRadius: isCompact ? 24 : 30,
                padding: isCompact ? 20 : 25,
              },
            ]}
          >
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              No cards here
            </Text>
            <Text style={[styles.emptyBody, { color: colors.textMuted }]}>
              No cards in this category yet.
            </Text>
          </View>
        ) : viewMode === "stack" ? (
          <View style={styles.stackStage}>
            <CardStack
              cards={filteredCards}
              onCycleFwd={cycleCardFwd}
              onCycleBwd={cycleCardBwd}
              onCardPress={(id) =>
                router.push({ pathname: "/card-detail", params: { id } })
              }
              onCardLongPress={handleCardLongPress}
            />
          </View>
        ) : (
          <CardList
            cards={filteredCards}
            bottomSpacing={132}
            onCardPress={(id) =>
              router.push({ pathname: "/card-detail", params: { id } })
            }
            onCardLongPress={handleCardLongPress}
          />
        )}
      </View>
      <TopMenu
        isOpen={menuOpen}
        onClose={() => setMenuOpen(false)}
        onSelect={handleSelectFilter}
        selectedFilter={activeFilter}
      />
      <CardQuickView
        card={quickViewCard}
        onDismiss={() => setQuickViewCard(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#EFEFEF",
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: 25,
    paddingTop: 20,
  },
  headingWrap: {
    flex: 1,
    paddingRight: 12,
  },
  headingMain: {
    fontFamily: "ReadexPro-Bold",
    fontSize: 36,
    lineHeight: 42,
    color: "#1D1D1D",
  },
  headingSub: {
    fontFamily: "ReadexPro-Bold",
    fontSize: 30,
    lineHeight: 36,
    color: "#939393",
  },
  chevronBtn: {
    width: 55,
    height: 55,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  cardsArea: {
    flex: 1,
    overflow: "hidden",
    marginTop: 20,
    marginBottom: 20,
  },
  stackStage: {
    flex: 1,
    justifyContent: "center",
    paddingBottom: 0,
  },
  emptyBox: {
    marginHorizontal: 25,
    marginTop: 40,
    borderRadius: 30,
    backgroundColor: "#FFFFFF",
    padding: 25,
  },
  emptyTitle: {
    fontFamily: "ReadexPro-Bold",
    fontSize: 24,
    color: "#1D1D1D",
  },
  emptyBody: {
    fontFamily: "ReadexPro-Regular",
    fontSize: 16,
    color: "#939393",
    marginTop: 8,
  },
  mockCard: {
    marginHorizontal: 25,
    height: 252,
    borderRadius: 30,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "rgba(29,29,29,0.15)",
    backgroundColor: "rgba(255,255,255,0.75)",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  mockCardText: {
    fontFamily: "ReadexPro-Medium",
    fontSize: 18,
    color: "rgba(29,29,29,0.5)",
  },
  mockCardSub: {
    fontFamily: "ReadexPro-Regular",
    fontSize: 13,
    color: "rgba(29,29,29,0.3)",
  },
});
