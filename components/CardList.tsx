import type { ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";

import { CardItem } from "@/components/CardItem";
import type { WalletCard } from "@/types/card";

type CardListProps = {
  cards: WalletCard[];
  header?: ReactNode;
  onCardPress?: (id: string) => void;
  onCardLongPress?: (id: string) => void;
  bottomSpacing?: number;
};

export function CardList({
  cards,
  header,
  onCardPress,
  onCardLongPress,
  bottomSpacing = 120,
}: CardListProps) {
  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.content, { paddingBottom: bottomSpacing }]}
      showsVerticalScrollIndicator={false}
    >
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
});
