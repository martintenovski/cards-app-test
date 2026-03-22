import { Feather } from '@expo/vector-icons';
import { useEffect } from 'react';
import { Dimensions, Pressable, StyleSheet, Text, View, useColorScheme } from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

import { CardForm } from '@/components/CardForm';
import { useCardStore } from '@/store/useCardStore';
import { cardToFormValues } from '@/types/card';
import type { CardFormValues, CardPalette, WalletCard } from '@/types/card';
import { APP_THEME, resolveTheme } from '@/utils/theme';

const { height } = Dimensions.get('window');
const SHEET_HEIGHT = height * 0.85;
const CLOSE_THRESHOLD = 100;

const SPRING_OPEN = { damping: 20, stiffness: 90, mass: 0.8, overshootClamping: true } as const;
const SPRING_CLOSE = { damping: 20, stiffness: 90, overshootClamping: true } as const;

type EditCardSheetProps = {
  card: WalletCard;
  isOpen: boolean;
  onClose: () => void;
};

export function EditCardSheet({ card, isOpen, onClose }: EditCardSheetProps) {
  const updateCard = useCardStore((state) => state.updateCard);
  const themePreference = useCardStore((state) => state.themePreference);
  const deviceScheme = useColorScheme();
  const resolvedTheme = resolveTheme(themePreference, deviceScheme);
  const colors = APP_THEME[resolvedTheme];

  const translateY = useSharedValue(SHEET_HEIGHT);
  const backdropOpacity = useSharedValue(0);

  useEffect(() => {
    if (isOpen) {
      translateY.value = withSpring(0, SPRING_OPEN);
      backdropOpacity.value = withSpring(0.55, SPRING_OPEN);
    } else {
      translateY.value = withSpring(SHEET_HEIGHT, SPRING_CLOSE);
      backdropOpacity.value = withSpring(0, SPRING_CLOSE);
    }
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  const dragGesture = Gesture.Pan()
    .onUpdate((e) => {
      if (e.translationY > 0) {
        translateY.value = e.translationY;
        backdropOpacity.value = Math.max(0, 0.55 - (e.translationY / SHEET_HEIGHT) * 0.55);
      }
    })
    .onEnd((e) => {
      if (e.translationY > CLOSE_THRESHOLD || e.velocityY > 800) {
        translateY.value = withSpring(SHEET_HEIGHT, SPRING_CLOSE);
        backdropOpacity.value = withSpring(0, SPRING_CLOSE);
        runOnJS(onClose)();
      } else {
        translateY.value = withSpring(0, SPRING_OPEN);
        backdropOpacity.value = withSpring(0.55, SPRING_OPEN);
      }
    });

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const handleSubmit = (values: CardFormValues, palette: CardPalette) => {
    updateCard(card.id, values, palette);
    onClose();
  };

  return (
    <View
      style={StyleSheet.absoluteFill}
      pointerEvents={isOpen ? 'box-none' : 'none'}
    >
      {/* Backdrop */}
      <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, backdropStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      {/* Sheet panel */}
      <Animated.View style={[styles.sheet, sheetStyle, { backgroundColor: colors.surface }]}>
        {/* Drag handle */}
        <GestureDetector gesture={dragGesture}>
          <View style={styles.handleArea}>
            <View style={[styles.handle, { backgroundColor: colors.textSoft }]} />
          </View>
        </GestureDetector>

        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Edit Card</Text>
          <Pressable onPress={onClose} hitSlop={12} style={styles.closeBtn}>
            <Feather name="x" size={22} color={colors.textMuted} />
          </Pressable>
        </View>

        {/* Form with pre-populated values */}
        <CardForm
          onSubmit={handleSubmit}
          initialValues={cardToFormValues(card)}
          initialPalette={card.palette}
          submitLabel="Save Changes"
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: '#000',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: SHEET_HEIGHT,
    backgroundColor: '#1D1D1D',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  handleArea: {
    width: '100%',
    paddingTop: 12,
    paddingBottom: 6,
    alignItems: 'center',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  title: {
    fontFamily: 'ReadexPro-Bold',
    fontSize: 22,
    color: '#EFEFEF',
  },
  closeBtn: {
    padding: 4,
  },
});
