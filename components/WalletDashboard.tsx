import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Feather } from "@expo/vector-icons";
import { useScrollToTop } from "@react-navigation/native";
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

import { CardDetailModal } from "@/components/CardDetailModal";
import { CardList } from "@/components/CardList";
import { CardQuickView } from "@/components/CardQuickView";
import { CardStack } from "@/components/CardStack";
import { TopMenu } from "@/components/TopMenu";
import { DEMO_CARDS } from "@/constants/demoCards";
import { useTranslation } from "@/src/hooks/useTranslation";
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
  const tr = useTranslation();
  const deviceScheme = useColorScheme();
  const { width, height } = useWindowDimensions();
  const [menuOpen, setMenuOpen] = useState(false);
  const [quickViewCard, setQuickViewCard] = useState<WalletCard | null>(null);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [funMessage, setFunMessage] = useState({
    emoji: "🃏",
    text: "Shuffling your cards...",
  });
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const listRef = useRef<Animated.FlatList<WalletCard> | null>(null);
  const cards = useCardStore((state) => state.cards);
  const viewMode = useCardStore((state) => state.viewMode);
  const homeFilter = useCardStore((state) => state.homeFilter);
  const language = useCardStore((state) => state.language);
  const themePreference = useCardStore((state) => state.themePreference);
  const setHomeFilter = useCardStore((state) => state.setHomeFilter);
  const openAddCardSheet = useCardStore((state) => state.openAddCardSheet);
  const resolvedTheme = resolveTheme(themePreference, deviceScheme);
  const colors = APP_THEME[resolvedTheme];
  const isCompact = width < 390;
  const isShort = height < 760;
  const canUseAnimatedStack = cards.length >= 4;

  const FUN_MESSAGES = useMemo(
    () =>
      language === "mk"
        ? [
            { emoji: "🃏", text: "Ги мешаме картичките..." },
            { emoji: "✨", text: "Го полираме паричникот..." },
            { emoji: "🔍", text: "Проверуваме за тајни картички..." },
            { emoji: "🧹", text: "Го чистиме шпилот..." },
            { emoji: "🎴", text: "Делиме одозгора..." },
            { emoji: "🪄", text: "Ништо во ракавот..." },
            { emoji: "💳", text: "Проверка на картичките е во тек..." },
            { emoji: "🕵️", text: "Го истражуваме паричникот..." },
            { emoji: "🐧", text: "Пингвински одобрено освежување." },
            { emoji: "🎯", text: "Заклучено. Картичките се потврдени." },
          ]
        : [
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
          ],
    [language],
  );

  const handleRefresh = useCallback(() => {
    const msg = FUN_MESSAGES[Math.floor(Math.random() * FUN_MESSAGES.length)];
    setFunMessage(msg);
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (refreshTimer.current) clearTimeout(refreshTimer.current);
    refreshTimer.current = setTimeout(() => {
      setRefreshing(false);
    }, 1400);
  }, [FUN_MESSAGES]);

  useEffect(() => {
    return () => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
    };
  }, []);

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
  const filteredDemoCards = useMemo(
    () =>
      activeFilter === "everything"
        ? DEMO_CARDS
        : getCardsByFilter(DEMO_CARDS, activeFilter),
    [activeFilter],
  );

  const handleSelectFilter = useCallback(
    (filter: HomeFilter) => {
      setHomeFilter(filter);
    },
    [setHomeFilter],
  );

  const getFilterLabel = useCallback(
    (filter: HomeFilter) => {
      if (language !== "mk") return FILTER_LABELS[filter];
      switch (filter) {
        case "everything":
          return "Сите";
        case "personal":
          return "Лични документи";
        case "bank":
          return "Банкарски картички";
        case "club":
          return "Клуб картички";
        case "insurance":
          return "Осигурителни картички";
        case "vehicle":
          return "Возачки документи";
        case "access":
          return "Пристапни беџови";
        default:
          return FILTER_LABELS[filter];
      }
    },
    [language],
  );

  // Stable long-press handlers — depend on memoized card arrays so renderItem
  // in CardList only gets a new reference when the list actually changes.
  const handleCardLongPress = useCallback(
    (id: string) => {
      const found = filteredCards.find((c) => c.id === id);
      if (!found) return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setQuickViewCard(found);
    },
    [filteredCards],
  );

  const handleDemoCardLongPress = useCallback(
    (id: string) => {
      const found = filteredDemoCards.find((c) => c.id === id);
      if (!found) return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setQuickViewCard(found);
    },
    [filteredDemoCards],
  );

  const handleCardPress = useCallback((id: string) => {
    setSelectedCardId(id);
  }, []);

  const handleOpenMenu = useCallback(() => setMenuOpen(true), []);
  const handleCloseMenu = useCallback(() => setMenuOpen(false), []);
  const handleDismissQuickView = useCallback(() => setQuickViewCard(null), []);
  const handleCloseDetail = useCallback(() => setSelectedCardId(null), []);

  useScrollToTop(listRef);

  return (
    <SafeAreaView
      edges={["top"]}
      style={[styles.root, { backgroundColor: colors.background }]}
    >
      {/* ── Header ─────────────────────────────────────────── */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Open filter menu"
        onPress={handleOpenMenu}
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
            {tr("cards_manage_heading")}
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
            {getFilterLabel(activeFilter)}
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
          <CardList
            ref={listRef}
            cards={filteredDemoCards}
            bottomSpacing={132}
            onCardPress={handleCardPress}
            onCardLongPress={handleDemoCardLongPress}
            refreshing={refreshing}
            onRefresh={handleRefresh}
            funMessage={funMessage}
            refreshBannerBottomSpacing={15}
            header={
              <View style={styles.demoHeaderStack}>
                <Pressable
                  style={[
                    styles.mockCard,
                    {
                      height: isCompact ? 212 : 252,
                      borderRadius: isCompact ? 24 : 30,
                      borderColor: colors.border,
                      backgroundColor: colors.surface,
                    },
                  ]}
                  onPress={openAddCardSheet}
                >
                  <Feather
                    name="credit-card"
                    size={isCompact ? 38 : 44}
                    color={colors.textSoft}
                  />
                  <Text
                    style={[
                      styles.mockCardText,
                      {
                        color: colors.textMuted,
                        fontSize: isCompact ? 17 : 18,
                      },
                    ]}
                  >
                    {tr("cards_add_first_card")}
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
                    {tr("cards_add_first_subtitle")}
                  </Text>
                </Pressable>

                <View
                  style={[
                    styles.demoNotice,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                      borderRadius: isCompact ? 20 : 24,
                      paddingHorizontal: isCompact ? 16 : 18,
                      paddingVertical: isCompact ? 14 : 16,
                    },
                  ]}
                >
                  <Text
                    style={[styles.demoNoticeTitle, { color: colors.text }]}
                  >
                    {tr("cards_demo_title")}
                  </Text>
                  <Text
                    style={[styles.demoNoticeBody, { color: colors.textMuted }]}
                  >
                    {tr("cards_demo_body")}
                  </Text>
                </View>
              </View>
            }
          />
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
              {tr("cards_no_cards_title")}
            </Text>
            <Text style={[styles.emptyBody, { color: colors.textMuted }]}>
              {tr("cards_none_in_category")}
            </Text>
          </View>
        ) : viewMode === "stack" ? (
          <View style={styles.stackStage}>
            {canUseAnimatedStack ? (
              <CardStack
                cards={filteredCards}
                onCardPress={handleCardPress}
                onCardLongPress={handleCardLongPress}
              />
            ) : (
              <>
                <CardList
                  ref={listRef}
                  cards={filteredCards}
                  bottomSpacing={132}
                  onCardPress={handleCardPress}
                  onCardLongPress={handleCardLongPress}
                  refreshing={refreshing}
                  onRefresh={handleRefresh}
                  funMessage={funMessage}
                />
                <View
                  style={[
                    styles.stackDisabledNotice,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.stackDisabledText,
                      { color: colors.text },
                    ]}
                  >
                    {tr("cards_stack_unlock_hint")}
                  </Text>
                </View>
              </>
            )}
          </View>
        ) : (
          <CardList
            ref={listRef}
            cards={filteredCards}
            bottomSpacing={132}
            onCardPress={handleCardPress}
            onCardLongPress={handleCardLongPress}
            refreshing={refreshing}
            onRefresh={handleRefresh}
            funMessage={funMessage}
          />
        )}
      </View>
      <TopMenu
        isOpen={menuOpen}
        onClose={handleCloseMenu}
        onSelect={handleSelectFilter}
        selectedFilter={activeFilter}
      />
      <CardQuickView card={quickViewCard} onDismiss={handleDismissQuickView} />
      <CardDetailModal cardId={selectedCardId} onClose={handleCloseDetail} />
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
  stackDisabledNotice: {
    marginHorizontal: 20,
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
  },
  stackDisabledText: {
    fontFamily: "ReadexPro-Regular",
    fontSize: 13,
    textAlign: "center",
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
  demoHeaderStack: {
    width: "100%",
    gap: 16,
  },
  demoNotice: {
    borderWidth: 1,
  },
  demoNoticeTitle: {
    fontFamily: "ReadexPro-Bold",
    fontSize: 18,
  },
  demoNoticeBody: {
    fontFamily: "ReadexPro-Regular",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
  },
});
