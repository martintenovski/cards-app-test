import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { WalletViewMode } from '@/types/card';
import type { ResolvedTheme } from '@/utils/theme';
import { APP_THEME } from '@/utils/theme';

type BottomBarProps = {
  viewMode: WalletViewMode;
  onToggleViewMode: () => void;
  onAddCard: () => void;
  theme: ResolvedTheme;
  onToggleTheme: () => void;
};

export function BottomBar({
  viewMode,
  onToggleViewMode,
  onAddCard,
  theme,
  onToggleTheme,
}: BottomBarProps) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isListMode = viewMode === 'list';
  const isCompact = width < 390;
  const colors = APP_THEME[theme];
  const toggleIconName = isListMode ? 'copy' : 'list';
  const themeIconName = theme === 'dark' ? 'sun' : 'moon';
  const sideButtonSize = isCompact ? 52 : 55;
  const horizontalPadding = Math.max(isCompact ? 16 : 24, Math.max(insets.left, insets.right) + 12);
  const bottomSpacing = Math.max(insets.bottom, isCompact ? 12 : 16);
  const addButtonGap = isCompact ? 10 : 12;
  const addButtonTextSize = isCompact ? 18 : 20;

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.container,
        { paddingBottom: bottomSpacing, paddingHorizontal: horizontalPadding },
      ]}
    >
      {/* Toggle button: list icon in stack mode / stacked cards icon in list mode */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Toggle view mode"
        style={[
          styles.sideBtn,
          { width: sideButtonSize, height: sideButtonSize },
          { backgroundColor: isListMode ? colors.accent : colors.chip },
        ]}
        onPress={onToggleViewMode}
      >
        <Feather
          name={toggleIconName}
          size={20}
          color={isListMode ? colors.accentText : colors.chipText}
        />
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Add card"
        style={[styles.addBtn, { backgroundColor: colors.accent, gap: addButtonGap }]}
        onPress={onAddCard}
      >
        <Feather name="plus" size={20} color={colors.accentText} />
        <Text style={[styles.addBtnText, { color: colors.accentText, fontSize: addButtonTextSize }]}>Add Card</Text>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Toggle theme"
        style={[styles.sideBtn, { width: sideButtonSize, height: sideButtonSize, backgroundColor: colors.chip }]}
        onPress={onToggleTheme}
      >
        <Feather name={themeIconName} size={20} color={colors.chipText} />
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
    justifyContent: 'space-between',
    gap: 10,
  },
  sideBtn: {
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  addBtn: {
    flex: 1,
    maxWidth: 360,
    height: 55,
    borderRadius: 30,
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
  },
});
