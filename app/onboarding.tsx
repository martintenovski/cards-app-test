import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View, useColorScheme } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { useCardStore } from "@/store/useCardStore";
import { APP_THEME, resolveTheme } from "@/utils/theme";

const ONBOARDING_STEPS = [
  {
    eyebrow: "Welcome",
    title: "Pocket ID keeps your essentials in one place",
    body:
      "Store cards and documents in a clean wallet view so the important stuff is always easy to reach.",
  },
  {
    eyebrow: "Secure sync",
    title: "Your cloud vault stays encrypted",
    body:
      "Sign in, set a sync passphrase, and your card vault is encrypted on-device before upload. Tiny locksmith, big energy.",
  },
  {
    eyebrow: "Sharing",
    title: "Import and share one card at a time",
    body:
      "Save a Pocket ID card file, send it where you need it, and import it again later without retyping everything.",
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
  const resolvedTheme = resolveTheme(themePreference, deviceScheme);
  const colors = APP_THEME[resolvedTheme];
  const currentStep = useMemo(() => ONBOARDING_STEPS[stepIndex], [stepIndex]);
  const isLastStep = stepIndex === ONBOARDING_STEPS.length - 1;

  const finishOnboarding = () => {
    setHasSeenOnboarding(true);
    router.replace("/");
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <View style={[styles.hero, { backgroundColor: colors.accent }]}>
          <Text style={[styles.heroEyebrow, { color: colors.accentText }]}>
            {currentStep.eyebrow}
          </Text>
          <Text style={[styles.heroTitle, { color: colors.accentText }]}>
            {currentStep.title}
          </Text>
          <Text
            style={[styles.heroBody, { color: "rgba(255,255,255,0.86)" }]}
          >
            {currentStep.body}
          </Text>
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

        <View style={[styles.noteCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.noteTitle, { color: colors.text }]}>Heads up</Text>
          <Text style={[styles.noteBody, { color: colors.textMuted }]}>
            These are starter onboarding steps so you can revisit and refine the
            wording later without rebuilding the flow again.
          </Text>
        </View>

        <View style={styles.actions}>
          <Pressable
            onPress={finishOnboarding}
            style={[
              styles.secondaryButton,
              { backgroundColor: colors.surfaceMuted },
            ]}
          >
            <Text style={[styles.secondaryButtonText, { color: colors.text }]}>
              Skip for now
            </Text>
          </Pressable>
          <Pressable
            onPress={
              isLastStep
                ? finishOnboarding
                : () => setStepIndex((value) => value + 1)
            }
            style={[styles.primaryButton, { backgroundColor: colors.accent }]}
          >
            <Text
              style={[styles.primaryButtonText, { color: colors.accentText }]}
            >
              {isLastStep ? "Get started" : "Continue"}
            </Text>
          </Pressable>
        </View>
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
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 32,
    justifyContent: "space-between",
  },
  hero: {
    borderRadius: 32,
    paddingHorizontal: 24,
    paddingVertical: 28,
    minHeight: 320,
    justifyContent: "flex-end",
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
  noteCard: {
    borderRadius: 26,
    padding: 20,
    marginTop: 22,
  },
  noteTitle: {
    fontFamily: "ReadexPro-Bold",
    fontSize: 18,
  },
  noteBody: {
    fontFamily: "ReadexPro-Regular",
    fontSize: 14,
    lineHeight: 22,
    marginTop: 8,
  },
  actions: {
    gap: 12,
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
  secondaryButton: {
    minHeight: 52,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  secondaryButtonText: {
    fontFamily: "ReadexPro-Bold",
    fontSize: 15,
  },
});
