import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { WalletViewMode } from '@/types/card';

type BottomBarProps = {
  viewMode: WalletViewMode;
  onToggleViewMode: () => void;
  onAddCard: () => void;
};

export function BottomBar({ viewMode, onToggleViewMode, onAddCard }: BottomBarProps) {
  const insets = useSafeAreaInsets();
  const isListMode = viewMode === 'list';

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.container,
        { paddingBottom: Math.max(insets.bottom + 8, 20) },
      ]}
    >
      {/* Toggle button: stack icon (default) / filter icon (list mode) */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Toggle view mode"
        style={[styles.toggleBtn, isListMode && styles.toggleBtnActive]}
        onPress={onToggleViewMode}
      >
        <Feather
          name="sliders"
          size={20}
          color={isListMode ? '#FFFFFF' : '#1D1D1D'}
        />
      </Pressable>

      {/* Add Card pill */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Add card"
        style={styles.addBtn}
        onPress={onAddCard}
      >
        <Feather name="plus" size={20} color="#FFFFFF" />
        <Text style={styles.addBtnText}>Add Card</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 25,
  },
  toggleBtn: {
    width: 55,
    height: 55,
    borderRadius: 30,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  toggleBtnActive: {
    backgroundColor: '#1D1D1D',
  },
  addBtn: {
    flex: 1,
    height: 55,
    borderRadius: 30,
    backgroundColor: '#1D1D1D',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  addBtnText: {
    fontFamily: 'ReadexPro-Medium',
    fontSize: 20,
    color: '#FFFFFF',
  },
});
