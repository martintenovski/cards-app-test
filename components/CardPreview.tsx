import { useEffect, useRef, useState } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { CardItem } from '@/components/CardItem';
import type { WalletCard } from '@/types/card';

type CardPreviewProps = {
  card: WalletCard;
  bankPreviewSide?: 'front' | 'back';
};

export function CardPreview({ card, bankPreviewSide = 'front' }: CardPreviewProps) {
  const targetSide = card.category === 'bank' ? bankPreviewSide : 'front';
  const [displayedSide, setDisplayedSide] = useState<'front' | 'back'>(targetSide);
  const prevTarget = useRef(targetSide);
  const scaleX = useSharedValue(1);

  useEffect(() => {
    if (prevTarget.current === targetSide) return;
    prevTarget.current = targetSide;
    // Squash to 0 (first half of flip)
    scaleX.value = withTiming(0, { duration: 180 }, (done) => {
      if (done) {
        runOnJS(setDisplayedSide)(targetSide);
        // Unsquash back to 1 (second half)
        scaleX.value = withTiming(1, { duration: 180 });
      }
    });
  }, [targetSide]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: scaleX.value }],
  }));

  return (
    <Animated.View style={[styles.container, animStyle]}>
      <CardItem
        card={card}
        size="full"
        side={displayedSide}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 380,
  },
});

