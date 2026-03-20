import { useEffect } from 'react';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Feather } from '@expo/vector-icons';
import { Dimensions, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { CardForm } from '@/components/CardForm';
import { useCardStore } from '@/store/useCardStore';
import type { CardFormValues, CardPalette } from '@/types/card';

const SCREEN_HEIGHT = Dimensions.get('window').height;

export default function AddCardScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const addCard = useCardStore((state) => state.addCard);

  const panY = useSharedValue(SCREEN_HEIGHT);

  // Slide the panel in on mount
  useEffect(() => {
    panY.value = withSpring(0, { damping: 22, stiffness: 200 });
  }, []);

  const dismiss = () => router.back();

  const dismissWithAnimation = () => {
    panY.value = withTiming(SCREEN_HEIGHT, { duration: 240 }, (done) => {
      if (done) runOnJS(dismiss)();
    });
  };

  const dragGesture = Gesture.Pan()
    .activeOffsetY([0, 10])
    .failOffsetX([-30, 30])
    .onUpdate((e) => {
      if (e.translationY > 0) panY.value = e.translationY;
    })
    .onEnd(() => {
      if (panY.value > 120) {
        panY.value = withTiming(SCREEN_HEIGHT, { duration: 220 }, (done) => {
          if (done) runOnJS(dismiss)();
        });
      } else {
        panY.value = withSpring(0, { damping: 22, stiffness: 200 });
      }
    });

  const panelStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: panY.value }],
  }));

  const handleSubmit = (values: CardFormValues, palette: CardPalette) => {
    addCard(values, palette);
    router.back();
  };

  return (
    <>
      <StatusBar style="light" />
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.overlay}>
        {/* Dim backdrop — tap outside to dismiss */}
        <Pressable
          style={[StyleSheet.absoluteFill, styles.backdrop]}
          onPress={dismissWithAnimation}
        />

        {/* Sliding panel */}
        <Animated.View
          style={[styles.panel, { paddingBottom: insets.bottom + 20 }, panelStyle]}
        >
          {/* Drag handle — gesture only on this area to avoid scroll conflicts */}
          <GestureDetector gesture={dragGesture}>
            <View style={styles.dragArea}>
              <View style={styles.handle} />
              <View style={styles.panelHeader}>
                <Text style={styles.panelTitle}>New Card</Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Close"
                  style={styles.closeBtn}
                  onPress={dismissWithAnimation}
                >
                  <Feather name="chevron-down" size={22} color="#FFFFFF" />
                </Pressable>
              </View>
            </View>
          </GestureDetector>

          <CardForm onSubmit={handleSubmit} />
        </Animated.View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  panel: {
    backgroundColor: '#1D1D1D',
    borderTopLeftRadius: 34,
    borderTopRightRadius: 34,
    height: '90%',
    paddingHorizontal: 25,
    paddingTop: 12,
  },
  dragArea: {
    paddingBottom: 4,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignSelf: 'center',
    marginBottom: 18,
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  panelTitle: {
    fontFamily: 'ReadexPro-Bold',
    fontSize: 36,
    lineHeight: 36,
    color: '#FFFFFF',
  },
  closeBtn: {
    width: 55,
    height: 55,
    alignItems: 'center',
    justifyContent: 'center',
  },
});