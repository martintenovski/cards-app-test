import { useEffect, useMemo, useState } from 'react';
import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useRouter } from 'expo-router';

import { AddCardSheet } from '@/components/AddCardSheet';
import { BottomBar } from '@/components/BottomBar';
import { CardList } from '@/components/CardList';
import { CardStack } from '@/components/CardStack';
import { TopMenu } from '@/components/TopMenu';
import { useCardStore } from '@/store/useCardStore';
import { FILTER_LABELS, getCardsByFilter, type HomeFilter } from '@/types/card';

type WalletDashboardProps = {
  routeFilter: HomeFilter;
};

export function WalletDashboard({ routeFilter }: WalletDashboardProps) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const cards = useCardStore((state) => state.cards);
  const viewMode = useCardStore((state) => state.viewMode);
  const homeFilter = useCardStore((state) => state.homeFilter);
  const setHomeFilter = useCardStore((state) => state.setHomeFilter);
  const toggleViewMode = useCardStore((state) => state.toggleViewMode);
  const cycleCardFwd = useCardStore((state) => state.cycleCardFwd);
  const cycleCardBwd = useCardStore((state) => state.cycleCardBwd);

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
    if (routeFilter !== 'everything' && homeFilter !== routeFilter) {
      setHomeFilter(routeFilter);
    }
  }, [routeFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  const activeFilter = routeFilter === 'everything' ? homeFilter : routeFilter;
  const filteredCards = useMemo(() => getCardsByFilter(cards, activeFilter), [activeFilter, cards]);

  const handleSelectFilter = (filter: HomeFilter) => {
    setHomeFilter(filter);
    // Filter in place — no navigation
  };

  return (
    <SafeAreaView style={styles.root}>
      {/* ── Header ─────────────────────────────────────────── */}
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open filter menu"
          onPress={() => setMenuOpen(true)}
        >
          <Text style={styles.headingMain}>Manage</Text>
          <Text style={styles.headingSub}>{FILTER_LABELS[activeFilter]}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open filter menu"
          style={styles.chevronBtn}
          onPress={() => setMenuOpen(true)}
        >
          <Animated.View style={chevronStyle}>
            <Feather name="chevron-down" size={24} color="#1D1D1D" />
          </Animated.View>
        </Pressable>
      </View>

      {/* ── Cards area ─────────────────────────────────────── */}
      <View style={styles.cardsArea}>
        {cards.length === 0 ? (
          <Pressable style={styles.mockCard} onPress={() => setSheetOpen(true)}>
            <Feather name="credit-card" size={44} color="rgba(29,29,29,0.18)" />
            <Text style={styles.mockCardText}>Add your first card</Text>
            <Text style={styles.mockCardSub}>Tap here to get started</Text>
          </Pressable>
        ) : filteredCards.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>No cards here</Text>
            <Text style={styles.emptyBody}>No cards in this category yet.</Text>
          </View>
        ) : viewMode === 'stack' ? (
          <CardStack
            cards={filteredCards}
            onCycleFwd={cycleCardFwd}
            onCycleBwd={cycleCardBwd}
            onCardPress={(id) => router.push({ pathname: '/card-detail', params: { id } })}
          />
        ) : (
          <CardList
            cards={filteredCards}
            onCardPress={(id) => router.push({ pathname: '/card-detail', params: { id } })}
          />
        )}
      </View>

      <BottomBar
        onAddCard={() => setSheetOpen(true)}
        viewMode={viewMode}
        onToggleViewMode={toggleViewMode}
      />
      <AddCardSheet isOpen={sheetOpen} onClose={() => setSheetOpen(false)} />
      <TopMenu
        isOpen={menuOpen}
        onClose={() => setMenuOpen(false)}
        onSelect={handleSelectFilter}
        selectedFilter={activeFilter}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#EFEFEF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 25,
    paddingTop: 25,
  },
  headingMain: {
    fontFamily: 'ReadexPro-Bold',
    fontSize: 36,
    lineHeight: 44,
    color: '#1D1D1D',
  },
  headingSub: {
    fontFamily: 'ReadexPro-Bold',
    fontSize: 36,
    lineHeight: 44,
    color: '#939393',
  },
  chevronBtn: {
    width: 55,
    height: 55,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  cardsArea: {
    flex: 1,
    paddingTop: 50,
  },
  emptyBox: {
    marginHorizontal: 25,
    marginTop: 40,
    borderRadius: 30,
    backgroundColor: '#FFFFFF',
    padding: 25,
  },
  emptyTitle: {
    fontFamily: 'ReadexPro-Bold',
    fontSize: 24,
    color: '#1D1D1D',
  },
  emptyBody: {
    fontFamily: 'ReadexPro-Regular',
    fontSize: 16,
    color: '#939393',
    marginTop: 8,
  },
  mockCard: {
    marginHorizontal: 25,
    height: 252,
    borderRadius: 30,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: 'rgba(29,29,29,0.15)',
    backgroundColor: 'rgba(255,255,255,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  mockCardText: {
    fontFamily: 'ReadexPro-Medium',
    fontSize: 18,
    color: 'rgba(29,29,29,0.5)',
  },
  mockCardSub: {
    fontFamily: 'ReadexPro-Regular',
    fontSize: 13,
    color: 'rgba(29,29,29,0.3)',
  },
});
