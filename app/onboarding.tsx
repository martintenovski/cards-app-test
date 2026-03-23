import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useColorScheme,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { useCardStore } from "@/store/useCardStore";
import { APP_THEME, resolveTheme } from "@/utils/theme";

const ONBOARDING_STEPS = [
  {
    eyebrow: "Welcome",
    icon: "credit-card",
    title: "Pocket ID keeps your essentials in one refined wallet",
    body: "Store cards and documents in a calm, structured wallet so the important things stay easy to reach without the usual visual clutter.",
    highlights: ["Fast card stacks", "Organized categories", "Clean details"],
    gradient: ["#171717", "#4B5563"] as const,
  },
  {
    eyebrow: "Secure sync",
    icon: "lock",
    title: "Your cloud vault stays encrypted before it leaves the device",
    body: "Connect Google, set a sync passphrase, and Pocket ID encrypts your vault locally before upload so the cloud only sees ciphertext.",
    highlights: [
      "Google sign-in",
      "Local encryption",
      "Manual refresh when you want it",
    ],
    gradient: ["#1D3B2A", "#78A96A"] as const,
  },
  {
    eyebrow: "Sharing",
    icon: "download-cloud",
    title: "Import and share one card at a time without retyping anything",
    body: "Send a single Pocket ID card file when needed, then import it later from Files, Gmail, or Drive with the details already filled in.",
    highlights: ["One-card exports", "Files app import", "Prefilled forms"],
    gradient: ["#7A4A2A", "#D48A63"] as const,
  },
] as const;

export default function OnboardingScreen() {
  const router = useRouter();
  const [stepIndex, setStepIndex] = useState(0);
  const setHasSeenOnboarding = useCardStore(
    (state) => state.setHasSeenOnboarding,
  );
  const themePreference = useCardStore((state) => state.themePreference);
  const deviceScheme = useColorScheme();
  const { width, height } = useWindowDimensions();
  const resolvedTheme = resolveTheme(themePreference, deviceScheme);
  const colors = APP_THEME[resolvedTheme];
  const currentStep = useMemo(() => ONBOARDING_STEPS[stepIndex], [stepIndex]);
  const isLastStep = stepIndex === ONBOARDING_STEPS.length - 1;
  const isCompact = width < 390 || height < 820;
  const isVeryCompact = width < 370 || height < 760;

  const finishOnboarding = () => {
    setHasSeenOnboarding(true);
    router.replace("/");
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingHorizontal: isCompact ? 20 : 24,
            paddingTop: isCompact ? 16 : 24,
            paddingBottom: isCompact ? 24 : 32,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            styles.hero,
            {
              borderRadius: isCompact ? 28 : 32,
              minHeight: isVeryCompact ? 360 : isCompact ? 390 : 420,
            },
          ]}
        >
          <LinearGradient
            colors={currentStep.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[
              styles.heroGradient,
              {
                paddingHorizontal: isCompact ? 20 : 24,
                paddingTop: isCompact ? 18 : 22,
                paddingBottom: isCompact ? 22 : 28,
              },
            ]}
          >
            <View style={styles.heroTopRow}>
              <View style={styles.heroBadge}>
                <Text style={styles.heroBadgeText}>
                  0{stepIndex + 1} / 0{ONBOARDING_STEPS.length}
                </Text>
              </View>
              <View
                style={[
                  styles.heroIconWrap,
                  {
                    width: isCompact ? 38 : 42,
                    height: isCompact ? 38 : 42,
                    borderRadius: isCompact ? 19 : 21,
                  },
                ]}
              >
                <Feather
                  name={currentStep.icon}
                  size={isCompact ? 18 : 20}
                  color="#FFFFFF"
                />
              </View>
            </View>

            <View
              style={[
                styles.heroArt,
                {
                  height: isVeryCompact ? 120 : isCompact ? 140 : 164,
                  marginTop: isCompact ? 18 : 24,
                  marginBottom: isCompact ? 10 : 14,
                },
              ]}
            >
              <View style={styles.heroCardBack} />
              <View style={styles.heroCardMid} />
              <View style={styles.heroCardFront}>
                <Text
                  style={[
                    styles.heroCardLabel,
                    { fontSize: isCompact ? 11 : 12 },
                  ]}
                >
                  Pocket ID
                </Text>
                <Text
                  style={[
                    styles.heroCardValue,
                    {
                      fontSize: isVeryCompact ? 19 : isCompact ? 21 : 24,
                      marginTop: isCompact ? 6 : 8,
                    },
                  ]}
                >
                  {currentStep.eyebrow}
                </Text>
              </View>
            </View>

            <Text
              style={[
                styles.heroEyebrow,
                {
                  color: "rgba(255,255,255,0.72)",
                  fontSize: isCompact ? 12 : 13,
                },
              ]}
            >
              {currentStep.eyebrow}
            </Text>
            <Text
              style={[
                styles.heroTitle,
                {
                  color: "#FFFFFF",
                  fontSize: isVeryCompact ? 22 : isCompact ? 26 : 30,
                  lineHeight: isVeryCompact ? 30 : isCompact ? 33 : 38,
                  marginTop: isCompact ? 10 : 14,
                },
              ]}
            >
              {currentStep.title}
            </Text>
            <Text
              style={[
                styles.heroBody,
                {
                  color: "rgba(255,255,255,0.86)",
                  fontSize: isVeryCompact ? 14 : isCompact ? 14.5 : 15,
                  lineHeight: isVeryCompact ? 21 : isCompact ? 22 : 24,
                  marginTop: isCompact ? 10 : 14,
                },
              ]}
            >
              {currentStep.body}
            </Text>

            <View
              style={[
                styles.highlightRow,
                { gap: isCompact ? 8 : 10, marginTop: isCompact ? 14 : 18 },
              ]}
            >
              {currentStep.highlights.map((item) => (
                <View
                  key={item}
                  style={[
                    styles.highlightChip,
                    {
                      paddingHorizontal: isCompact ? 10 : 12,
                      paddingVertical: isCompact ? 7 : 8,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.highlightChipText,
                      { fontSize: isCompact ? 11 : 12 },
                    ]}
                  >
                    {item}
                  </Text>
                </View>
              ))}
            </View>
          </LinearGradient>
        </View>

        <View style={styles.paginationRow}>
          {ONBOARDING_STEPS.map((step, index) => {
            const active = index === stepIndex;

            return (
              <View
                key={step.title}
                style={[
                  styles.paginationDot,
                  {
                    backgroundColor: active ? colors.accent : colors.border,
                    width: active ? 28 : 10,
                  },
                ]}
              />
            );
          })}
        </View>

        <View style={[styles.actions, { marginTop: isCompact ? 18 : 24 }]}>
          <Pressable
            onPress={
              isLastStep
                ? finishOnboarding
                : () => setStepIndex((value) => value + 1)
            }
            style={[
              styles.primaryButton,
              {
                backgroundColor: colors.accent,
                minHeight: isCompact ? 52 : 56,
                borderRadius: isCompact ? 20 : 22,
              },
            ]}
          >
            <Text
              style={[
                styles.primaryButtonText,
                {
                  color: colors.accentText,
                  fontSize: isCompact ? 15 : 16,
                },
              ]}
            >
              {isLastStep ? "Get started" : "Continue"}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
  },
  hero: {
    borderRadius: 32,
    overflow: "hidden",
    minHeight: 420,
  },
  heroGradient: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 22,
    paddingBottom: 28,
    justifyContent: "flex-end",
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  heroBadge: {
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.14)",
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  heroBadgeText: {
    fontFamily: "ReadexPro-Bold",
    fontSize: 12,
    color: "#FFFFFF",
    letterSpacing: 0.8,
  },
  heroIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.14)",
  },
  heroArt: {
    height: 164,
    justifyContent: "center",
    marginTop: 24,
    marginBottom: 14,
  },
  heroCardBack: {
    position: "absolute",
    right: 18,
    left: 46,
    top: 14,
    bottom: 22,
    borderRadius: 26,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  heroCardMid: {
    position: "absolute",
    right: 34,
    left: 30,
    top: 28,
    bottom: 10,
    borderRadius: 26,
    backgroundColor: "rgba(255,255,255,0.16)",
  },
  heroCardFront: {
    position: "absolute",
    left: 0,
    right: 58,
    top: 0,
    bottom: 18,
    borderRadius: 28,
    backgroundColor: "rgba(255,255,255,0.22)",
    padding: 18,
    justifyContent: "flex-end",
  },
  heroCardLabel: {
    fontFamily: "ReadexPro-Medium",
    fontSize: 12,
    color: "rgba(255,255,255,0.7)",
    textTransform: "uppercase",
    letterSpacing: 0.9,
  },
  heroCardValue: {
    fontFamily: "ReadexPro-Bold",
    fontSize: 24,
    color: "#FFFFFF",
    marginTop: 8,
  },
  heroEyebrow: {
    fontFamily: "ReadexPro-Medium",
    fontSize: 13,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  heroTitle: {
    fontFamily: "ReadexPro-Bold",
    fontSize: 30,
    lineHeight: 38,
    marginTop: 14,
  },
  heroBody: {
    fontFamily: "ReadexPro-Regular",
    fontSize: 15,
    lineHeight: 24,
    marginTop: 14,
  },
  highlightRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 18,
  },
  highlightChip: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "rgba(255,255,255,0.14)",
  },
  highlightChipText: {
    fontFamily: "ReadexPro-Medium",
    fontSize: 12,
    color: "#FFFFFF",
  },
  paginationRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginTop: 22,
  },
  paginationDot: {
    height: 10,
    borderRadius: 999,
  },
  actions: {
    marginTop: 24,
  },
  primaryButton: {
    minHeight: 56,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  primaryButtonText: {
    fontFamily: "ReadexPro-Bold",
    fontSize: 16,
  },
});
