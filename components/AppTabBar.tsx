import { Feather } from "@expo/vector-icons";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useRouter } from "expo-router";
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
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const deviceScheme = useColorScheme();
  const themePreference = useCardStore((store) => store.themePreference);
  const viewMode = useCardStore((store) => store.viewMode);
  const toggleViewMode = useCardStore((store) => store.toggleViewMode);
  const resolvedTheme = resolveTheme(themePreference, deviceScheme);
  const colors = APP_THEME[resolvedTheme];
  const currentRouteName = state.routes[state.index]?.name;
  const viewIcon = viewMode === "list" ? "copy" : "list";
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
          label="View"
          icon={viewIcon}
          active={currentRouteName === "index"}
          activeColor={activeColor}
          inactiveColor={inactiveColor}
          onPress={() => {
            if (currentRouteName !== "index") {
              navigation.navigate("index");
              return;
            }
            toggleViewMode();
          }}
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
          onPress={() => router.push("/add-card")}
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
    paddingTop: 2,
  },
  inner: {
    minHeight: 76,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 30,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 6,
  },
  sideAction: {
    flex: 1,
    minHeight: 52,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  sideActionText: {
    fontFamily: "ReadexPro-Medium",
    fontSize: 11,
  },
  addButton: {
    width: 92,
    height: 62,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    shadowOpacity: 0.2,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  addButtonText: {
    fontFamily: "ReadexPro-Bold",
    fontSize: 11,
  },
});
