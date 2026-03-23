import { Feather } from "@expo/vector-icons";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useCardStore } from "@/store/useCardStore";
import { APP_THEME, resolveTheme } from "@/utils/theme";

type NavActionProps = {
  label: string;
  icon: keyof typeof Feather.glyphMap;
  active?: boolean;
  activeColor: string;
  inactiveColor: string;
  onPress: () => void;
};

function NavAction({
  label,
  icon,
  active = false,
  activeColor,
  inactiveColor,
  onPress,
}: NavActionProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={styles.sideAction}
    >
      <Feather
        name={icon}
        size={20}
        color={active ? activeColor : inactiveColor}
      />
      <Text
        style={[
          styles.sideActionText,
          { color: active ? activeColor : inactiveColor },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function AppTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const deviceScheme = useColorScheme();
  const themePreference = useCardStore((store) => store.themePreference);
  const openAddCardSheet = useCardStore((store) => store.openAddCardSheet);
  const resolvedTheme = resolveTheme(themePreference, deviceScheme);
  const colors = APP_THEME[resolvedTheme];
  const currentRouteName = state.routes[state.index]?.name;
  const activeColor = colors.text;
  const inactiveColor = colors.textSoft;

  const shellStyle = [
    styles.shell,
    {
      paddingBottom: Math.max(10, Math.min(insets.bottom, 12)),
      backgroundColor: colors.background,
    },
  ];

  return (
    <View style={shellStyle}>
      <View
        style={[
          styles.inner,
          {
            backgroundColor:
              resolvedTheme === "light" ? colors.surfaceStrong : colors.surface,
            borderColor: colors.border,
          },
        ]}
      >
        <NavAction
          label="Home"
          icon="home"
          active={currentRouteName === "index"}
          activeColor={activeColor}
          inactiveColor={inactiveColor}
          onPress={() => navigation.navigate("index")}
        />
        <NavAction
          label="Search"
          icon="search"
          active={currentRouteName === "search"}
          activeColor={activeColor}
          inactiveColor={inactiveColor}
          onPress={() => navigation.navigate("search")}
        />

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add new card"
          style={[
            styles.addButton,
            {
              backgroundColor: colors.accent,
              shadowColor: colors.shadow,
            },
          ]}
          onPress={openAddCardSheet}
        >
          <Feather name="plus" size={22} color={colors.accentText} />
          <Text style={[styles.addButtonText, { color: colors.accentText }]}>
            New Card
          </Text>
        </Pressable>

        <NavAction
          label="Profile"
          icon="user"
          active={currentRouteName === "profile"}
          activeColor={activeColor}
          inactiveColor={inactiveColor}
          onPress={() => navigation.navigate("profile")}
        />
        <NavAction
          label="Settings"
          icon="settings"
          active={currentRouteName === "settings"}
          activeColor={activeColor}
          inactiveColor={inactiveColor}
          onPress={() => navigation.navigate("settings")}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    paddingHorizontal: 14,
    paddingTop: 0,
    marginBottom: 5,
  },
  inner: {
    minHeight: 70,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 50,
    borderWidth: 1,
    paddingHorizontal: 10,
    gap: 5,
  },
  sideAction: {
    flex: 1,
    minHeight: 50,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  sideActionText: {
    fontFamily: "ReadexPro-Medium",
    fontSize: 10,
  },
  addButton: {
    width: 80,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    elevation: 4,
  },
  addButtonText: {
    fontFamily: "ReadexPro-Bold",
    fontSize: 10,
  },
});
