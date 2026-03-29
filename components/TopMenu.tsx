import { useEffect, useState } from "react";
import { Feather } from "@expo/vector-icons";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { useCardStore } from "@/store/useCardStore";
import type { HomeFilter } from "@/types/card";
import { FILTER_LABELS, getCardsByFilter } from "@/types/card";
import { APP_THEME, resolveTheme } from "@/utils/theme";

type TopMenuProps = {
  isOpen: boolean;
  selectedFilter: HomeFilter;
  onClose: () => void;
  onSelect: (filter: HomeFilter) => void;
};

const MENU_ITEMS: HomeFilter[] = [
  "everything",
  "personal",
  "bank",
  "club",
  "insurance",
  "vehicle",
  "access",
];

export function TopMenu({
  isOpen,
  selectedFilter,
  onClose,
  onSelect,
}: TopMenuProps) {
  const insets = useSafeAreaInsets();
  const cards = useCardStore((state) => state.cards);
  const language = useCardStore((state) => state.language);
  const themePreference = useCardStore((state) => state.themePreference);
  const deviceScheme = useColorScheme();
  const resolvedTheme = resolveTheme(themePreference, deviceScheme);
  const colors = APP_THEME[resolvedTheme];
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

  const getFilterLabel = (filter: HomeFilter) => {
    if (language !== "mk") return FILTER_LABELS[filter];

    switch (filter) {
      case "everything":
        return "Сите";
      case "personal":
        return "Лични документи";
      case "bank":
        return "Банкарски картички";
      case "club":
        return "Клуб картички";
      case "insurance":
        return "Осигурителни картички";
      case "vehicle":
        return "Возачки документи";
      case "access":
        return "Пристапни беџови";
      default:
        return FILTER_LABELS[filter];
    }
  };

  return (
    <Modal
      transparent
      visible={modalVisible}
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {/* Dim backdrop */}
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          styles.backdrop,
          backdropStyle,
          { backgroundColor: colors.overlay },
        ]}
      />
      {/* Tap-outside-to-close */}
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

      {/* Sheet slides down from top */}
      <Animated.View
        style={[
          styles.sheet,
          sheetStyle,
          { paddingTop: insets.top + 20, backgroundColor: colors.surface },
        ]}
      >
        {/* Header */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={language === "mk" ? "Затвори мени" : "Close menu"}
          style={styles.sheetHeader}
          onPress={onClose}
        >
          <View style={styles.sheetTitleWrap}>
            <Text style={[styles.sheetTitle, { color: colors.text }]}>
              {language === "mk" ? "Управувај" : "Manage"}
            </Text>
          </View>
          <View style={styles.closeBtn}>
            <Feather name="chevron-up" size={22} color={colors.text} />
          </View>
        </Pressable>

        {/* Filter options */}
        <View style={styles.optionsList}>
          {MENU_ITEMS.map((item) => {
            const active = item === selectedFilter;
            const itemCount = getCardsByFilter(cards, item).length;

            return (
              <Pressable
                key={item}
                accessibilityRole="button"
                style={styles.optionRow}
                onPress={() => {
                  onSelect(item);
                  onClose();
                }}
              >
                <View style={styles.optionLabelWrap}>
                  <Text
                    style={[
                      styles.optionText,
                      { color: active ? colors.text : colors.textMuted },
                    ]}
                    numberOfLines={1}
                  >
                    {getFilterLabel(item)}
                  </Text>
                  <View
                    style={[
                      styles.countBadge,
                      {
                        backgroundColor: active
                          ? colors.accent
                          : colors.surfaceMuted,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.countBadgeText,
                        {
                          color: active ? colors.accentText : colors.textMuted,
                        },
                      ]}
                    >
                      {itemCount}
                    </Text>
                  </View>
                </View>
                <View style={styles.optionTrailing}>
                  {active ? (
                    <Feather name="check" size={18} color={colors.text} />
                  ) : (
                    <View style={styles.checkIcon} />
                  )}
                </View>
              </Pressable>
            );
          })}
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {},
  sheet: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    paddingHorizontal: 25,
    paddingBottom: 32,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sheetTitleWrap: {
    flex: 1,
    paddingRight: 12,
  },
  sheetTitle: {
    fontFamily: "ReadexPro-Bold",
    fontSize: 36,
    lineHeight: 42,
    color: "#FFFFFF",
  },
  closeBtn: {
    paddingTop: 4,
    alignItems: "center",
    justifyContent: "center",
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
  },
  optionLabelWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingRight: 12,
  },
  optionText: {
    fontFamily: "ReadexPro-Medium",
    fontSize: 22,
    flexShrink: 1,
  },
  optionTrailing: {
    width: 25,
    alignItems: "flex-end",
  },
  countBadge: {
    minWidth: 28,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  countBadgeText: {
    fontFamily: "ReadexPro-Bold",
    fontSize: 12,
  },
  checkIcon: {
    width: 25,
    height: 20,
  },
});
