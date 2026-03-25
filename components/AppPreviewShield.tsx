import { Feather } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import { AppState, StyleSheet, Text, View, useColorScheme } from "react-native";

import { useCardStore } from "@/store/useCardStore";
import { APP_THEME, resolveTheme } from "@/utils/theme";

export function AppPreviewShield() {
  const themePreference = useCardStore((state) => state.themePreference);
  const deviceScheme = useColorScheme();
  const resolvedTheme = resolveTheme(themePreference, deviceScheme);
  const colors = APP_THEME[resolvedTheme];
  const appStateRef = useRef(AppState.currentState);
  const [isPreviewHidden, setIsPreviewHidden] = useState(
    AppState.currentState !== "active",
  );

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      const previousState = appStateRef.current;
      appStateRef.current = nextState;

      if (nextState === "inactive" || nextState === "background") {
        setIsPreviewHidden(true);
        return;
      }

      if (
        previousState.match(/inactive|background/) &&
        nextState === "active"
      ) {
        setIsPreviewHidden(false);
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  if (!isPreviewHidden) {
    return null;
  }

  return (
    <View
      pointerEvents="none"
      style={[styles.overlay, { backgroundColor: colors.background }]}
    >
      <View
        style={[
          styles.card,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <View style={[styles.iconWrap, { backgroundColor: colors.input }]}>
          <Feather name="shield" size={30} color={colors.text} />
        </View>
        <Text style={[styles.title, { color: colors.text }]}>
          App preview unavailable for security reasons
        </Text>
        <Text style={[styles.body, { color: colors.textMuted }]}>
          Return to Pocket ID to continue.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    zIndex: 2000,
    elevation: 2000,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    borderWidth: 1,
    borderRadius: 28,
    paddingHorizontal: 24,
    paddingVertical: 28,
    alignItems: "center",
  },
  iconWrap: {
    width: 68,
    height: 68,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  title: {
    fontFamily: "ReadexPro-Bold",
    fontSize: 28,
    textAlign: "center",
  },
  body: {
    fontFamily: "ReadexPro-Regular",
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    marginTop: 10,
  },
});
