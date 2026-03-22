import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { CardItem } from '@/components/CardItem';
import type { WalletCard } from '@/types/card';

type CardListProps = {
  cards: WalletCard[];
  onCardPress?: (id: string) => void;
  bottomSpacing?: number;
};

export function CardList({ cards, onCardPress, bottomSpacing = 120 }: CardListProps) {
  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.content, { paddingBottom: bottomSpacing }]}
      showsVerticalScrollIndicator={false}
    >
      {cards.map((card) => (
        <Pressable
          key={card.id}
          style={styles.item}
          onPress={() => onCardPress?.(card.id)}
        >
          <CardItem card={card} size="full" />
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
    paddingTop: 10,
    paddingHorizontal: 25,
    gap: 16,
  },
  item: {
    width: '100%',
  },
});
