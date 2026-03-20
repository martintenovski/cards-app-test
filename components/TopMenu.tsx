import { useEffect, useState } from 'react';
import { Feather } from '@expo/vector-icons';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import type { HomeFilter } from '@/types/card';
import { FILTER_LABELS } from '@/types/card';

type TopMenuProps = {
  isOpen: boolean;
  selectedFilter: HomeFilter;
  onClose: () => void;
  onSelect: (filter: HomeFilter) => void;
};

const MENU_ITEMS: HomeFilter[] = ['everything', 'personal', 'bank', 'club'];

export function TopMenu({ isOpen, selectedFilter, onClose, onSelect }: TopMenuProps) {
  const insets = useSafeAreaInsets();
  const [modalVisible, setModalVisible] = useState(false);

  const translateY = useSharedValue(-600);
  const backdropOpacity = useSharedValue(0);

  useEffect(() => {
    if (isOpen) {
      setModalVisible(true);
      translateY.value = withTiming(0, { duration: 300 });
      backdropOpacity.value = withTiming(1, { duration: 240 });
      return undefined;
    }
    translateY.value = withTiming(-600, { duration: 260 });
    backdropOpacity.value = withTiming(0, { duration: 220 });
    const timer = setTimeout(() => setModalVisible(false), 280);
    return () => clearTimeout(timer);
  }, [isOpen]);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  return (
    <Modal
      transparent
      visible={modalVisible}
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {/* Dim backdrop */}
      <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, backdropStyle]} />
      {/* Tap-outside-to-close */}
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

      {/* Sheet slides down from top */}
      <Animated.View style={[styles.sheet, sheetStyle, { paddingTop: insets.top + 20 }]}>
        {/* Header */}
        <View style={styles.sheetHeader}>
          <Text style={styles.sheetTitle}>Manage</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close menu"
            style={styles.closeBtn}
            onPress={onClose}
          >
            <Feather name="chevron-up" size={22} color="#FFFFFF" />
          </Pressable>
        </View>

        {/* Filter options */}
        <View style={styles.optionsList}>
          {MENU_ITEMS.map((item) => {
            const active = item === selectedFilter;
            return (
              <Pressable
                key={item}
                accessibilityRole="button"
                style={styles.optionRow}
                onPress={() => { onSelect(item); onClose(); }}
              >
                <Text style={[styles.optionText, !active && styles.optionTextMuted]}>
                  {FILTER_LABELS[item]}
                </Text>
                {active ? (
                  <Feather name="check" size={18} color="#FFFFFF" />
                ) : (
                  <View style={styles.checkIcon} />
                )}
              </Pressable>
            );
          })}
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    backgroundColor: '#1D1D1D',
    paddingHorizontal: 25,
    paddingBottom: 32,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sheetTitle: {
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
  closeIcon: {
    width: 18,
    height: 20,
  },
  optionsList: {
    marginTop: 20,
    gap: 4,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  optionText: {
    fontFamily: 'ReadexPro-Medium',
    fontSize: 22,
    color: '#FFFFFF',
  },
  optionTextMuted: {
    color: 'rgba(255,255,255,0.4)',
  },
  checkIcon: {
    width: 25,
    height: 20,
  },
});

