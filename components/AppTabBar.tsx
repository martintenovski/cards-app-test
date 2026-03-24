import { Feather } from "@expo/vector-icons";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import type { ComponentType } from "react";
import { requireOptionalNativeModule } from "expo-modules-core";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useColorScheme,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useCardStore } from "@/store/useCardStore";
import { APP_THEME, resolveTheme } from "@/utils/theme";

type GlassEffectModule = {
  GlassView: ComponentType<{
    pointerEvents?: "auto" | "none" | "box-none" | "box-only";
    style?: unknown;
    glassEffectStyle?: {
      style: "regular";
      animate?: boolean;
      animationDuration?: number;
    };
    colorScheme?: "light" | "dark";
    tintColor?: string;
  }>;
  isGlassEffectAPIAvailable: () => boolean;
  isLiquidGlassAvailable: () => boolean;
};

type NativeGlassEffectModule = {
  isGlassEffectAPIAvailable?: boolean;
  isLiquidGlassAvailable?: boolean;
};

let glassEffectModule: GlassEffectModule | null = null;

function getGlassEffectModule() {
  if (glassEffectModule !== null) {
    return glassEffectModule;
  }

  try {
    const nativeGlassEffect =
      requireOptionalNativeModule<NativeGlassEffectModule>("ExpoGlassEffect");

    if (!nativeGlassEffect) {
      glassEffectModule = null;
      return glassEffectModule;
    }

    glassEffectModule = require("expo-glass-effect") as GlassEffectModule;
  } catch {
    glassEffectModule = null;
  }

  return glassEffectModule;
}

type NavActionProps = {
  label: string;
  icon: keyof typeof Feather.glyphMap;
  active?: boolean;
  activeColor: string;
  inactiveColor: string;
  onPress: () => void;
  showLabel?: boolean;
  compact?: boolean;
};

function NavAction({
  label,
  icon,
  active = false,
  activeColor,
  inactiveColor,
  onPress,
  showLabel = true,
  compact = false,
}: NavActionProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.sideAction, compact && styles.sideActionCompact]}
    >
      <Feather
        name={icon}
        size={20}
        color={active ? activeColor : inactiveColor}
      />
      {showLabel ? (
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.85}
          style={[
            styles.sideActionText,
            compact && styles.sideActionTextCompact,
            { color: active ? activeColor : inactiveColor },
          ]}
        >
          {label}
        </Text>
      ) : null}
    </Pressable>
  );
}

export function AppTabBar({ state, navigation }: BottomTabBarProps) {
  const glassEffect = getGlassEffectModule();
  const GlassView = glassEffect?.GlassView;
  const insets = useSafeAreaInsets();
  const deviceScheme = useColorScheme();
  const { width } = useWindowDimensions();
  const themePreference = useCardStore((store) => store.themePreference);
  const openAddCardSheet = useCardStore((store) => store.openAddCardSheet);
  const resolvedTheme = resolveTheme(themePreference, deviceScheme);
  const colors = APP_THEME[resolvedTheme];
  const currentRouteName = state.routes[state.index]?.name;
  const activeColor = colors.text;
  const inactiveColor = colors.textSoft;
  const isCompact = width < 390;
  const isVeryCompact = width < 360;
  const showSideLabels = !isVeryCompact;
  const addButtonLabel = isVeryCompact ? "" : isCompact ? "Add" : "New Card";
  const shouldUseLiquidGlass = Platform.OS === "ios" && glassEffect !== null;
  const iosBottomClearance = Math.max(
    insets.bottom - (insets.bottom >= 24 ? 12 : 6),
    2,
  );
  const bottomClearance =
    Platform.OS === "android"
      ? Math.max(insets.bottom + 6, 18)
      : iosBottomClearance;

  const shellStyle = [
    styles.shell,
    {
      bottom: 0,
      paddingBottom: bottomClearance,
      paddingHorizontal: isCompact ? 10 : 14,
      paddingTop: 10,
      backgroundColor: "transparent",
      marginBottom: 0,
    },
  ];

  return (
    <View pointerEvents="box-none" style={shellStyle}>
      <View
        style={[
          styles.inner,
          {
            backgroundColor: shouldUseLiquidGlass
              ? "transparent"
              : resolvedTheme === "light"
                ? colors.surfaceStrong
                : colors.surface,
            borderColor: colors.border,
            minHeight: isCompact ? 66 : 70,
            paddingHorizontal: isCompact ? 8 : 10,
            gap: isCompact ? 2 : 5,
            shadowColor: colors.shadow,
          },
        ]}
      >
        {shouldUseLiquidGlass && GlassView ? (
          <GlassView
            pointerEvents="none"
            style={styles.liquidGlassFill}
            glassEffectStyle={{
              style: "regular",
              animate: true,
              animationDuration: 0.35,
            }}
            colorScheme={resolvedTheme === "dark" ? "dark" : "light"}
            tintColor={
              resolvedTheme === "dark"
                ? "rgba(29,29,29,0.28)"
                : "rgba(255,255,255,0.24)"
            }
          />
        ) : null}
        <NavAction
          label="Home"
          icon="home"
          active={currentRouteName === "index"}
          activeColor={activeColor}
          inactiveColor={inactiveColor}
          compact={isCompact}
          showLabel={showSideLabels}
          onPress={() => navigation.navigate("index")}
        />
        <NavAction
          label="Search"
          icon="search"
          active={currentRouteName === "search"}
          activeColor={activeColor}
          inactiveColor={inactiveColor}
          compact={isCompact}
          showLabel={showSideLabels}
          onPress={() => navigation.navigate("search")}
        />

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add new card"
          style={[
            styles.addButton,
            isCompact && styles.addButtonCompact,
            {
              width: isVeryCompact ? 58 : isCompact ? 66 : 80,
              height: isVeryCompact ? 58 : 60,
              borderRadius: isVeryCompact ? 29 : 30,
              backgroundColor: colors.accent,
              shadowColor: colors.shadow,
            },
          ]}
          onPress={openAddCardSheet}
        >
          <Feather
            name="plus"
            size={isVeryCompact ? 24 : 22}
            color={colors.accentText}
          />
          {addButtonLabel ? (
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              style={[
                styles.addButtonText,
                isCompact && styles.addButtonTextCompact,
                { color: colors.accentText },
              ]}
            >
              {addButtonLabel}
            </Text>
          ) : null}
        </Pressable>

        <NavAction
          label="Profile"
          icon="user"
          active={currentRouteName === "profile"}
          activeColor={activeColor}
          inactiveColor={inactiveColor}
          compact={isCompact}
          showLabel={showSideLabels}
          onPress={() => navigation.navigate("profile")}
        />
        <NavAction
          label="Settings"
          icon="settings"
          active={currentRouteName === "settings"}
          activeColor={activeColor}
          inactiveColor={inactiveColor}
          compact={isCompact}
          showLabel={showSideLabels}
          onPress={() => navigation.navigate("settings")}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    position: "absolute",
    left: 0,
    right: 0,
    paddingHorizontal: 14,
    paddingTop: 0,
    marginBottom: 0,
    backgroundColor: "transparent",
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
    overflow: "hidden",
    shadowOpacity: 0.1,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  liquidGlassFill: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 50,
  },
  sideAction: {
    flex: 1,
    minHeight: 50,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingHorizontal: 2,
  },
  sideActionCompact: {
    minHeight: 46,
    gap: 3,
  },
  sideActionText: {
    fontFamily: "ReadexPro-Medium",
    fontSize: 10,
  },
  sideActionTextCompact: {
    fontSize: 9,
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
  addButtonCompact: {
    gap: 1,
  },
  addButtonText: {
    fontFamily: "ReadexPro-Bold",
    fontSize: 10,
  },
  addButtonTextCompact: {
    fontSize: 9,
  },
});
