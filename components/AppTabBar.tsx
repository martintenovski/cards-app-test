import { Feather } from "@expo/vector-icons";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useEffect, useRef, type ComponentType } from "react";
import { requireOptionalNativeModule } from "expo";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useColorScheme,
  useWindowDimensions,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useCardStore } from "@/store/useCardStore";
import { APP_THEME, resolveTheme } from "@/utils/theme";
import { useTranslation } from "@/src/hooks/useTranslation";

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
  onLayout: (e: {
    nativeEvent: { layout: { x: number; width: number } };
  }) => void;
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
  onLayout,
  showLabel = true,
  compact = false,
}: NavActionProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      onLayout={onLayout}
      style={[styles.navAction, compact && styles.navActionCompact]}
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
            styles.navActionText,
            compact && styles.navActionTextCompact,
            { color: active ? activeColor : inactiveColor },
          ]}
        >
          {label}
        </Text>
      ) : null}
    </Pressable>
  );
}

const SPRING = { damping: 18, stiffness: 200, mass: 0.8 } as const;

const TAB_ROUTES = ["index", "search", "profile", "settings"] as const;

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
  const tr = useTranslation();
  const activeIndex = TAB_ROUTES.indexOf(
    state.routes[state.index]?.name as (typeof TAB_ROUTES)[number],
  );
  const currentRouteName = state.routes[state.index]?.name;
  const activeColor = colors.accent;
  const inactiveColor = colors.textSoft;
  const activePillColor =
    resolvedTheme === "dark" ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)";
  const isCompact = width < 390;
  const isVeryCompact = width < 360;
  const showLabels = !isVeryCompact;
  const shouldUseLiquidGlass = Platform.OS === "ios" && glassEffect !== null;

  const iosBottomClearance = Math.max(
    insets.bottom - (insets.bottom >= 24 ? 12 : 6),
    2,
  );
  const bottomClearance =
    Platform.OS === "android"
      ? Math.max(insets.bottom + 6, 18)
      : iosBottomClearance;

  const circleSize = isCompact ? 62 : 70;

  const barBackground = shouldUseLiquidGlass
    ? "transparent"
    : resolvedTheme === "light"
      ? colors.surfaceStrong
      : colors.surface;

  // ── Sliding pill ─────────────────────────────────────────────────
  const tabLayouts = useRef<Array<{ x: number; width: number } | null>>([
    null,
    null,
    null,
    null,
  ]);
  const pillX = useSharedValue(-300);
  const pillW = useSharedValue(80);

  const handleTabLayout =
    (index: number) =>
    (e: { nativeEvent: { layout: { x: number; width: number } } }) => {
      const { x, width: w } = e.nativeEvent.layout;
      tabLayouts.current[index] = { x, width: w };
      if (index === activeIndex && pillX.value < -200) {
        pillX.value = x;
        pillW.value = w;
      }
    };

  useEffect(() => {
    const layout = tabLayouts.current[activeIndex];
    if (!layout) return;
    pillX.value = withSpring(layout.x, SPRING);
    pillW.value = withSpring(layout.width, SPRING);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex]);

  const pillAnimStyle = useAnimatedStyle(() => ({
    left: pillX.value,
    width: pillW.value,
  }));
  // ─────────────────────────────────────────────────────────────────

  const commonActionProps = {
    activeColor,
    inactiveColor,
    showLabel: showLabels,
    compact: isCompact,
  };

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.shell,
        {
          paddingBottom: bottomClearance,
          paddingHorizontal: isCompact ? 10 : 14,
        },
      ]}
    >
      <View style={styles.row}>
        {/* ── Main pill bar ── */}
        <View
          style={[
            styles.bar,
            {
              backgroundColor: barBackground,
              borderColor: colors.border,
              minHeight: isCompact ? 62 : 70,
              paddingHorizontal: isCompact ? 6 : 8,
              gap: isCompact ? 0 : 2,
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

          {/* Sliding bubble behind the tab icons */}
          <Animated.View
            pointerEvents="none"
            style={[
              styles.slidingPill,
              pillAnimStyle,
              { backgroundColor: activePillColor },
            ]}
          />

          <NavAction
            {...commonActionProps}
            label={tr("tab_home")}
            icon="home"
            active={currentRouteName === "index"}
            onPress={() => navigation.navigate("index")}
            onLayout={handleTabLayout(0)}
          />
          <NavAction
            {...commonActionProps}
            label={tr("tab_search")}
            icon="search"
            active={currentRouteName === "search"}
            onPress={() => navigation.navigate("search")}
            onLayout={handleTabLayout(1)}
          />
          <NavAction
            {...commonActionProps}
            label={tr("tab_profile")}
            icon="user"
            active={currentRouteName === "profile"}
            onPress={() => navigation.navigate("profile")}
            onLayout={handleTabLayout(2)}
          />
          <NavAction
            {...commonActionProps}
            label={tr("tab_settings")}
            icon="settings"
            active={currentRouteName === "settings"}
            onPress={() => navigation.navigate("settings")}
            onLayout={handleTabLayout(3)}
          />
        </View>

        {/* ── Add circle (right) ── */}
        <View
          style={[
            styles.addCircle,
            {
              width: circleSize,
              height: circleSize,
              borderRadius: circleSize / 2,
              backgroundColor: barBackground,
              borderColor: colors.border,
              shadowColor: colors.shadow,
            },
          ]}
        >
          {shouldUseLiquidGlass && GlassView ? (
            <GlassView
              pointerEvents="none"
              style={[styles.liquidGlassFill, { borderRadius: circleSize / 2 }]}
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
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={tr("add_card_title")}
            onPress={openAddCardSheet}
            style={styles.addPressable}
          >
            <Feather
              name="plus"
              size={isCompact ? 26 : 28}
              color={colors.text}
            />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "transparent",
  },
  // horizontal row: main bar (flex:1) + add circle
  row: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 6,
  },
  // main pill bar
  bar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 50,
    borderWidth: 1,
    overflow: "hidden",
    shadowOpacity: 0.1,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  // floating circle add button
  addCircle: {
    borderWidth: 1,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    shadowOpacity: 0.1,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  addPressable: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  liquidGlassFill: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 50,
  },
  navAction: {
    flex: 1,
    minHeight: 50,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingHorizontal: 4,
    overflow: "hidden",
  },
  navActionCompact: {
    minHeight: 46,
    gap: 3,
  },
  navActionText: {
    fontFamily: "ReadexPro-Medium",
    fontSize: 10,
  },
  navActionTextCompact: {
    fontSize: 9,
  },
  slidingPill: {
    position: "absolute",
    top: 5,
    bottom: 5,
    borderRadius: 999,
    overflow: "hidden",
  },
});
