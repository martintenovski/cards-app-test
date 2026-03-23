import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';
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
  previewSide?: 'front' | 'back';
};

export function CardPreview({ card, previewSide = 'front' }: CardPreviewProps) {
  const { width } = useWindowDimensions();
  const targetSide = previewSide;
  const [displayedSide, setDisplayedSide] = useState<'front' | 'back'>(targetSide);
  const prevTarget = useRef(targetSide);
  const scaleX = useSharedValue(1);
  const previewSize = useMemo<"full" | "compact" | "small">(() => {
    if (width < 360) return 'small';
    if (width < 430) return 'compact';
    return 'full';
  }, [width]);
  const maxWidth = previewSize === 'small' ? 302 : previewSize === 'compact' ? 335 : 380;

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
    <Animated.View style={[styles.container, { maxWidth }, animStyle]}>
      <CardItem
        card={card}
        size={previewSize}
        side={displayedSide}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'center',
    width: '100%',
  },
});

