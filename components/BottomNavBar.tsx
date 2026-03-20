import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type WalletViewMode = 'stack' | 'list';

type BottomNavBarProps = {
  onAddCard: () => void;
  viewMode: WalletViewMode;
  onToggleViewMode: () => void;
};

export function BottomNavBar({ onAddCard, viewMode, onToggleViewMode }: BottomNavBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <View style={styles.bar}>
        {/* Home */}
        <Pressable style={styles.navItem} hitSlop={8}>
          <Feather name="home" size={22} color="#1D1D1D" />
        </Pressable>

        {/* View mode toggle (stack / list) */}
        <Pressable style={styles.navItem} onPress={onToggleViewMode} hitSlop={8}>
          <Feather
            name={viewMode === 'stack' ? 'layers' : 'list'}
            size={22}
            color="rgba(29,29,29,0.40)"
          />
        </Pressable>

        {/* Center Add Card */}
        <Pressable style={styles.addBtn} onPress={onAddCard}>
          <Feather name="plus" size={28} color="#EFEFEF" />
        </Pressable>

        {/* Inbox */}
        <Pressable style={styles.navItem} hitSlop={8}>
          <Feather name="inbox" size={22} color="rgba(29,29,29,0.40)" />
        </Pressable>

        {/* Profile */}
        <Pressable style={styles.navItem} hitSlop={8}>
          <Feather name="user" size={22} color="rgba(29,29,29,0.40)" />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#EFEFEF',
  },
  bar: {
    height: 70,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 12,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 70,
  },
  addBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#1D1D1D',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 8,
    // Subtle lift shadow
    shadowColor: '#1D1D1D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
});
