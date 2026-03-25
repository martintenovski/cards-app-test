import { useRef, useState } from "react";
import {
  FlatList,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type ListRenderItemInfo,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { AppPreviewShield } from "@/components/AppPreviewShield";
import { useCardStore } from "@/store/useCardStore";

const ONBOARDING_STEPS = [
  {
    illustration: require("@/assets/onboarding/cloud.png"),
    title: "Keep your wallet local or sync it across your devices",
    body: "Pocket ID works beautifully on one device, but it can also keep your cards in the cloud so the same wallet is ready when you switch phones, add a tablet, or come back later.",
  },
  {
    illustration: require("@/assets/onboarding/encrypt.png"),
    title: "Your information is encrypted before it is stored",
    body: "Sensitive card details are protected on-device first, so synced data stays encrypted in transit and at rest instead of being uploaded as plain readable information.",
  },
  {
    illustration: require("@/assets/onboarding/share.png"),
    title: "Share cards quickly when someone else needs them",
    body: "Send a card in a few taps, import shared details without retyping, and move information between people or devices with a flow that stays simple and fast.",
  },
  {
    illustration: require("@/assets/onboarding/customize.png"),
    title: "Customize the app to fit how you organize things",
    body: "Tune colors, themes, layout preferences, and security options so Pocket ID feels personal, stays easy to scan, and matches the way you like to manage important cards.",
  },
] as const;

const COLORS = {
  background: "#FFFFFF",
  title: "#2D2B2E",
  body: "rgba(45, 43, 46, 0.6)",
  dot: "#D7D6DB",
  dotActive: "#2D2B2E",
  skip: "rgba(45, 43, 46, 0.4)",
  actionBlue: "#1A6BC8",
  actionBlueText: "#FFFFFF",
} as const;

export default function OnboardingScreen() {
  const router = useRouter();
  const listRef = useRef<FlatList<(typeof ONBOARDING_STEPS)[number]> | null>(
    null,
  );
  const [stepIndex, setStepIndex] = useState(0);
  const { width, height } = useWindowDimensions();
  const setHasSeenOnboarding = useCardStore(
    (state) => state.setHasSeenOnboarding,
  );

  const isCompact = width < 390 || height < 820;
  const isVeryCompact = width < 360 || height < 740;
  const slideWidth = width;
  const imageHeight = isVeryCompact ? 170 : isCompact ? 210 : 250;
  const imageWidth = Math.min(width - (isCompact ? 92 : 110), 300);
  const titleFontSize = isVeryCompact ? 22 : isCompact ? 24 : 27;
  const bodyFontSize = isVeryCompact ? 12.5 : 13.5;

  const finishOnboarding = () => {
    setHasSeenOnboarding(true);
    router.replace("/");
  };

  const scrollToStep = (index: number, animated: boolean) => {
    const boundedIndex = Math.max(
      0,
      Math.min(index, ONBOARDING_STEPS.length - 1),
    );
    listRef.current?.scrollToIndex({ index: boundedIndex, animated });
    setStepIndex(boundedIndex);
  };

  const handleNext = () => {
    if (stepIndex === ONBOARDING_STEPS.length - 1) {
      finishOnboarding();
      return;
    }

    scrollToStep(stepIndex + 1, true);
  };

  const handleMomentumEnd = (
    event: NativeSyntheticEvent<NativeScrollEvent>,
  ) => {
    const nextIndex = Math.round(
      event.nativeEvent.contentOffset.x / slideWidth,
    );
    if (nextIndex !== stepIndex) {
      setStepIndex(nextIndex);
    }
  };

  const renderSlide = ({
    item,
  }: ListRenderItemInfo<(typeof ONBOARDING_STEPS)[number]>) => (
    <View
      style={[
        styles.slide,
        {
          width: slideWidth,
          paddingHorizontal: isCompact ? 24 : 32,
          paddingTop: isVeryCompact ? 8 : 20,
        },
      ]}
    >
      <ScrollView
        style={styles.slideScroll}
        contentContainerStyle={[
          styles.slideScrollContent,
          {
            paddingBottom: isVeryCompact ? 16 : 24,
            paddingTop: isVeryCompact ? 2 : 8,
          },
        ]}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <View
          style={[
            styles.illustrationWrap,
            {
              height: imageHeight,
              marginTop: isVeryCompact ? 6 : 16,
            },
          ]}
        >
          <Image
            source={item.illustration}
            resizeMode="contain"
            style={{ width: imageWidth, height: imageHeight }}
          />
        </View>

        <View style={styles.copyWrap}>
          <Text
            style={[
              styles.title,
              {
                fontSize: titleFontSize,
                lineHeight: Math.round(titleFontSize * 1.16),
                marginTop: isVeryCompact ? 14 : 22,
              },
            ]}
          >
            {item.title}
          </Text>
          <Text
            style={[
              styles.body,
              {
                fontSize: bodyFontSize,
                lineHeight: isVeryCompact ? 19 : 21,
                marginTop: isVeryCompact ? 10 : 14,
              },
            ]}
          >
            {item.body}
          </Text>
        </View>
      </ScrollView>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <View style={styles.screen}>
        <View style={styles.carouselWrap}>
          <FlatList
            ref={listRef}
            data={ONBOARDING_STEPS}
            keyExtractor={(item) => item.title}
            horizontal
            pagingEnabled
            bounces={false}
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={handleMomentumEnd}
            renderItem={renderSlide}
            style={styles.carousel}
            contentContainerStyle={styles.carouselContent}
            getItemLayout={(_, index) => ({
              length: slideWidth,
              offset: slideWidth * index,
              index,
            })}
          />
        </View>

        <View
          style={[
            styles.footer,
            {
              paddingHorizontal: isCompact ? 24 : 32,
              paddingTop: 12,
              paddingBottom: isCompact ? 10 : 14,
            },
          ]}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Skip onboarding"
            hitSlop={10}
            onPress={finishOnboarding}
            style={styles.footerAction}
          >
            <Text style={styles.skipText}>Skip</Text>
          </Pressable>

          <View style={styles.paginationRow}>
            {ONBOARDING_STEPS.map((step, index) => (
              <View
                key={step.title}
                style={[
                  styles.dot,
                  {
                    backgroundColor:
                      index === stepIndex ? COLORS.dotActive : COLORS.dot,
                  },
                ]}
              />
            ))}
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              stepIndex === ONBOARDING_STEPS.length - 1
                ? "Finish onboarding"
                : "Next onboarding screen"
            }
            hitSlop={10}
            onPress={handleNext}
            style={[styles.footerAction, styles.primaryAction]}
          >
            <Text style={styles.nextText}>
              {stepIndex === ONBOARDING_STEPS.length - 1 ? "Done" : "Next"}
            </Text>
          </Pressable>
        </View>

        <AppPreviewShield />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  carouselWrap: {
    flex: 1,
  },
  carousel: {
    flex: 1,
  },
  carouselContent: {
    alignItems: "stretch",
  },
  slide: {
    flex: 1,
    alignItems: "center",
  },
  slideScroll: {
    flex: 1,
    alignSelf: "stretch",
  },
  slideScrollContent: {
    flexGrow: 1,
    alignItems: "center",
  },
  illustrationWrap: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  copyWrap: {
    width: "100%",
    maxWidth: 296,
    alignItems: "center",
  },
  title: {
    fontFamily: "OpenSans-Bold",
    color: COLORS.title,
    textAlign: "center",
    letterSpacing: -0.8,
  },
  body: {
    fontFamily: "ReadexPro-Regular",
    color: COLORS.body,
    textAlign: "center",
    letterSpacing: -0.2,
  },
  footer: {
    minHeight: 76,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  footerAction: {
    minWidth: 84,
    minHeight: 44,
    justifyContent: "center",
  },
  primaryAction: {
    backgroundColor: COLORS.actionBlue,
    paddingHorizontal: 18,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  skipText: {
    fontFamily: "ReadexPro-Regular",
    fontSize: 18,
    lineHeight: 28,
    color: COLORS.skip,
  },
  nextText: {
    fontFamily: "ReadexPro-Medium",
    fontSize: 16,
    lineHeight: 22,
    color: COLORS.actionBlueText,
    textAlign: "center",
  },
  paginationRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 999,
  },
});
