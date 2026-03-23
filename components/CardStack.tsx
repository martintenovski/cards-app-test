/**
 * Vertical card stack — a direct React Native port of card-picker.jsx.
 *
 * INFINITE circular scroll:
 *   The scroll offset is UNBOUNDED — no min/max clamp. Cards repeat forever.
 *
 *   Each card's visual slot is found by wrapping its raw distance into the
 *   nearest occurrence in the infinite repeating sequence (runs on UI thread):
 *
 *     totalSize   = N × ITEM_SIZE
 *     rawDist     = index × ITEM_SIZE − scrollOffset
 *     wrappedDist = rawDist − round(rawDist / totalSize) × totalSize
 *     offset      = wrappedDist / ITEM_SIZE          ← always in (−N/2, +N/2)
 *
 *   translateY = CENTER_OFFSET + offset × ITEM_SIZE × 0.38
 *   scale      = max(0.78,  1 − |offset| × 0.10)
 *   opacity    = 1  (fully opaque at all positions)
 *
 *   On release: withDecay (fast flick) or withTiming (slow drag) snaps to the
 *   nearest integer × ITEM_SIZE. The active card index is (nearest % N + N) % N.
 *   Press-to-focus: snaps to the closest wrap-path (shortest arc) to the target.
 */

import React, { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDecay,
  withTiming,
} from "react-native-reanimated";
import type { SharedValue } from "react-native-reanimated";

import { CardItem } from "@/components/CardItem";
import type { WalletCard } from "@/types/card";

// ─── Layout ──────────────────────────────────────────────────────────────────

const CARD_H = 252;
const CARD_GAP = 12;
const ITEM_SIZE = CARD_H + CARD_GAP; // 264 — snap stride
// Fixed container that shows 1 active card + ~90 px peek above & below.
// Changing only this constant resizes the whole widget.
const CONTAINER_H = 440;
// Distance from container top to the top of the active card.
const CENTER_OFFSET = Math.round((CONTAINER_H - CARD_H) / 2); // 94

// ─── Visual — ported directly from card-picker.jsx ───────────────────────────

const TRANSLATE_RATIO = 0.38;
const SCALE_PER_UNIT = 0.1;
const MIN_SCALE = 0.78;

/** Final snap: quick ease-out so it never feels laggy */
const SNAP_CFG = {
  duration: 320,
  easing: Easing.out(Easing.quad),
};
/** Decay deceleration — higher = slower stop, more momentum feel */
const DECAY_RATE = 0.993;

/** Modulo that always returns a non-negative value (worklet-safe) */
function posMod(v: number, n: number) {
  "worklet";
  return ((v % n) + n) % n;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type CardStackProps = {
  cards: WalletCard[];
  /** kept for API compatibility with WalletDashboard */
  onCycleFwd: () => void;
  onCycleBwd: () => void;
  /** Called when the user taps the active (focused) card */
  onCardPress?: (cardId: string) => void;
};

// ─── AnimatedCard ─────────────────────────────────────────────────────────────

type AnimatedCardProps = {
  card: WalletCard;
  index: number;
  scrollOffsetSV: SharedValue<number>;
  /** SharedValue so the wrap formula always uses the current count on the UI thread */
  cardCountSV: SharedValue<number>;
  isActive: boolean;
  onSnapTo: (index: number) => void;
  onActivePress?: (cardId: string) => void;
};

function AnimatedCard({
  card,
  index,
  scrollOffsetSV,
  cardCountSV,
  isActive,
  onSnapTo,
  onActivePress,
}: AnimatedCardProps) {
  const defaultSide: "front" | "back" =
    card.category === "club" ? "back" : "front";
  const [side, setSide] = useState<"front" | "back">(defaultSide);
  const flipSV = useSharedValue(1);

  // Reset to the home-default side whenever this card loses focus.
  useEffect(() => {
    if (!isActive) {
      flipSV.value = withTiming(1, { duration: 200 });
      setSide(defaultSide);
    }
  }, [defaultSide, isActive]);

  const handleFlip = useCallback(() => {
    const next: "front" | "back" = side === "front" ? "back" : "front";
    flipSV.value = withTiming(0, { duration: 150 }, (done) => {
      if (done) {
        runOnJS(setSide)(next);
        flipSV.value = withTiming(1, { duration: 150 });
      }
    });
  }, [side]);

  // All transforms derived from the CONTINUOUS, UNBOUNDED scroll offset.
  // Wrap math keeps each card at its nearest logical slot — infinite loop.
  const cardStyle = useAnimatedStyle(() => {
    const N = cardCountSV.value;
    const totalSize = N * ITEM_SIZE;
    // Raw distance from this card's natural slot to the current scroll position
    const rawDist = index * ITEM_SIZE - scrollOffsetSV.value;
    // Wrap to the nearest occurrence of this card in the infinite sequence
    const wrappedDist = rawDist - Math.round(rawDist / totalSize) * totalSize;
    const offset = wrappedDist / ITEM_SIZE; // always in (−N/2, +N/2)
    const absOffset = Math.abs(offset);

    // Hide cards beyond ±2.5 slots (show max 5 at a time)
    if (absOffset > 2.5) {
      return { opacity: 0, zIndex: -1 };
    }

    const scale = Math.max(MIN_SCALE, 1 - absOffset * SCALE_PER_UNIT);
    const translateY = CENTER_OFFSET + offset * ITEM_SIZE * TRANSLATE_RATIO;
    const zIndex = 999 - Math.round(absOffset * 10);

    return {
      transform: [{ translateY }, { scale }],
      opacity: 1,
      zIndex,
    };
  });

  const flipStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: flipSV.value }],
  }));

  return (
    <Animated.View style={[styles.card, cardStyle]}>
      {/* Active card: tap opens detail. Non-active: tap snaps to it. */}
      <Pressable
        onPress={
          isActive ? () => onActivePress?.(card.id) : () => onSnapTo(index)
        }
        style={styles.pressable}
      >
        <Animated.View style={[styles.flipWrapper, flipStyle]}>
          <CardItem
            card={card}
            size="full"
            side={side}
            onFlip={isActive ? handleFlip : undefined}
          />
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

// ─── CardStack ────────────────────────────────────────────────────────────────

export function CardStack({ cards, onCardPress }: CardStackProps) {
  const scrollOffsetSV = useSharedValue(0);
  const startOffsetSV = useSharedValue(0);
  // Stored as shared value so gesture worklets always read the latest length
  const cardCountSV = useSharedValue(cards.length);

  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    cardCountSV.value = cards.length;
  }, [cards.length]);

  // Reset scroll when the card list changes (e.g. filter change)
  useEffect(() => {
    scrollOffsetSV.value = 0;
    setActiveIndex(0);
  }, [cards.length]);

  /**
   * Snap to a card by index, taking the shortest wrap-path.
   * e.g. if currently showing card 0 and pressing card N-1 (the last),
   * it scrolls UP (backward) rather than all the way forward.
   */
  const snapTo = useCallback(
    (idx: number) => {
      const N = cards.length;
      // Current snapped logical position (integer)
      const currentN = Math.round(scrollOffsetSV.value / ITEM_SIZE);
      const currentIdx = posMod(currentN, N);
      // Shortest arc on the circle
      let diff = idx - currentIdx;
      if (diff > N / 2) diff -= N;
      if (diff < -N / 2) diff += N;
      const target = (currentN + diff) * ITEM_SIZE;
      scrollOffsetSV.value = withTiming(target, SNAP_CFG);
      setActiveIndex(idx);
    },
    [cards.length],
  );

  const gesture = Gesture.Pan()
    .onBegin(() => {
      // Capture position so the new drag cancels any in-flight animation immediately
      startOffsetSV.value = scrollOffsetSV.value;
    })
    .onUpdate((e) => {
      // UNBOUNDED — no clamp, scrolls infinitely in both directions
      scrollOffsetSV.value = startOffsetSV.value - e.translationY;
    })
    .onEnd((e) => {
      const N = cardCountSV.value;
      // Fast flick → natural momentum decay, then snap to nearest card.
      // Slow drag  → snap immediately.
      if (Math.abs(e.velocityY) > 200) {
        scrollOffsetSV.value = withDecay(
          { velocity: -e.velocityY, deceleration: DECAY_RATE }, // no clamp — infinite
          (finished) => {
            if (finished) {
              const nearest = Math.round(scrollOffsetSV.value / ITEM_SIZE);
              scrollOffsetSV.value = withTiming(nearest * ITEM_SIZE, SNAP_CFG);
              runOnJS(setActiveIndex)(posMod(nearest, N));
            }
          },
        );
      } else {
        const nearest = Math.round(scrollOffsetSV.value / ITEM_SIZE);
        scrollOffsetSV.value = withTiming(nearest * ITEM_SIZE, SNAP_CFG);
        runOnJS(setActiveIndex)(posMod(nearest, N));
      }
    });

  return (
    <GestureDetector gesture={gesture}>
      <View style={styles.container}>
        {cards.map((card, index) => (
          <AnimatedCard
            key={card.id}
            card={card}
            index={index}
            scrollOffsetSV={scrollOffsetSV}
            cardCountSV={cardCountSV}
            isActive={index === activeIndex}
            onSnapTo={snapTo}
            onActivePress={onCardPress}
          />
        ))}
      </View>
    </GestureDetector>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    // Fixed height — never exceeds this, never pushes content down.
    height: CONTAINER_H,
    width: "100%",
    overflow: "hidden",
  },
  card: {
    // top:0 + translateY (which includes CENTER_OFFSET) determines position.
    // No flex tricks — fully deterministic.
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
  },
  pressable: {
    // Stretch full width so CardItem (width:'100%') fills the container correctly.
    width: "100%",
    paddingHorizontal: 24,
  },
  flipWrapper: {
    width: "100%",
  },
});
