import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Dimensions, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { CardForm } from '@/components/CardForm';
import { useCardStore } from '@/store/useCardStore';
import type { CardFormValues, CardPalette } from '@/types/card';

const { height } = Dimensions.get('window');
const SHEET_HEIGHT = height * 0.85;
const CLOSE_THRESHOLD = 100;

const SPRING_OPEN = { damping: 20, stiffness: 90, mass: 0.8, overshootClamping: true } as const;
const SPRING_CLOSE = { damping: 20, stiffness: 90, overshootClamping: true } as const;

type AddCardSheetProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function AddCardSheet({ isOpen, onClose }: AddCardSheetProps) {
  const router = useRouter();
  const addCard = useCardStore((state) => state.addCard);
  const [formKey, setFormKey] = useState(0);

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
    addCard(values, palette);
    setFormKey((k) => k + 1);
    onClose();
  };

  const handleScanPress = () => {
    onClose();
    setTimeout(() => {
      router.push('/card-scanner');
    }, 180);
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
      <Animated.View style={[styles.sheet, sheetStyle]}>
        {/* Drag handle */}
        <GestureDetector gesture={dragGesture}>
          <View style={styles.handleArea}>
            <View style={styles.handle} />
          </View>
        </GestureDetector>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Add New Card</Text>
          <Pressable onPress={onClose} hitSlop={12} style={styles.closeBtn}>
            <Feather name="x" size={22} color="rgba(239,239,239,0.70)" />
          </Pressable>
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={handleScanPress}
          style={styles.scanButton}
        >
          <Feather name="camera" size={18} color="#EFEFEF" />
          <Text style={styles.scanButtonText}>Scan a card instead</Text>
        </Pressable>

        {/* Form */}
        <CardForm key={formKey} onSubmit={handleSubmit} />
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
    alignItems: 'center',
    paddingVertical: 12,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(239,239,239,0.20)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingBottom: 12,
  },
  scanButton: {
    marginHorizontal: 20,
    marginBottom: 12,
    height: 55,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(239,239,239,0.45)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  scanButtonText: {
    fontFamily: 'ReadexPro-Regular',
    fontSize: 16,
    color: '#EFEFEF',
  },
  title: {
    fontFamily: 'ReadexPro-Bold',
    fontSize: 22,
    color: '#EFEFEF',
  },
  closeBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
