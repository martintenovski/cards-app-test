import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from "react-native";
import { useEffect, useState } from "react";
import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { APP_THEME, resolveTheme } from "@/utils/theme";
import { useCardStore } from "@/store/useCardStore";
import { createSessionFromUrl } from "@/utils/authSync";

export default function AuthCallbackScreen() {
  const router = useRouter();
  const themePreference = useCardStore((state) => state.themePreference);
  const deviceScheme = useColorScheme();
  const resolvedTheme = resolveTheme(themePreference, deviceScheme);
  const colors = APP_THEME[resolvedTheme];
  const url = Linking.useURL();
  const [message, setMessage] = useState(
    "You can close this screen if it does not dismiss automatically.",
  );

  useEffect(() => {
    if (!url) return;

    let cancelled = false;

    createSessionFromUrl(url)
      .then(() => {
        if (cancelled) return;
        router.replace("/profile");
      })
      .catch(() => {
        if (cancelled) return;
        setMessage(
          "We could not finish sign in automatically. Please go back and try again.",
        );
      });

    return () => {
      cancelled = true;
    };
  }, [router, url]);

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <ActivityIndicator size="small" color={colors.text} />
        <Text style={[styles.title, { color: colors.text }]}>
          Finishing Sign In
        </Text>
        <Text style={[styles.body, { color: colors.textMuted }]}>
          {message}
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 24,
  },
  title: {
    fontFamily: "ReadexPro-Bold",
    fontSize: 20,
  },
  body: {
    fontFamily: "ReadexPro-Regular",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 22,
  },
});
