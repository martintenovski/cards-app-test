import { useRef, useState, useEffect } from "react";
import {
  Animated,
  Easing,
  FlatList,
  Image,
  Pressable,
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
import { Feather } from "@expo/vector-icons";

import { AppPreviewShield } from "@/components/AppPreviewShield";
import { useCardStore } from "@/store/useCardStore";

const ONBOARDING_STEPS = [
  {
    illustration: require("@/assets/onboarding/cloud.png"),
    title: "Local or synced — your choice",
    body: "Works great offline. Sign in to keep your wallet ready across all your devices.",
    bg: "#FFF4B8",
    blobs: [
      { xFrac: -0.18, yFrac: 0.04,  size: 190, color: "#FFDF4D" },
      { xFrac: 0.72,  yFrac: 0.62,  size: 160, color: "#FFE040" },
      { xFrac: 0.60,  yFrac: -0.05, size:  90, color: "#FFE870" },
      { xFrac: 0.78,  yFrac: 0.30,  size:  50, color: "#FFF0A8" },
      { xFrac: -0.06, yFrac: 0.40,  size:  65, color: "#FFEC9A" },
      { xFrac: 0.30,  yFrac: 0.72,  size:  45, color: "#FFDF70" },
    ],
  },
  {
    illustration: require("@/assets/onboarding/encrypt.png"),
    title: "Encrypted before upload",
    body: "Cards are locked on-device first. The cloud never sees your plain data.",
    bg: "#BDD8FF",
    blobs: [
      { xFrac: 0.68,  yFrac: 0.05,  size: 185, color: "#7BB8FF" },
      { xFrac: -0.14, yFrac: 0.55,  size: 155, color: "#82BBFF" },
      { xFrac: -0.08, yFrac: 0.08,  size:  80, color: "#93C8FF" },
      { xFrac: 0.55,  yFrac: 0.70,  size:  55, color: "#AACFFF" },
      { xFrac: 0.84,  yFrac: 0.42,  size:  60, color: "#A0CCFF" },
      { xFrac: 0.22,  yFrac: -0.04, size:  40, color: "#BED9FF" },
    ],
  },
  {
    illustration: require("@/assets/onboarding/share.png"),
    title: "Share in a few taps",
    body: "Send a card or import one from someone else — no retyping needed.",
    bg: "#FFB8D8",
    blobs: [
      { xFrac: 0.75,  yFrac: -0.06, size: 175, color: "#FF75B2" },
      { xFrac: -0.16, yFrac: 0.60,  size: 145, color: "#FF6DAB" },
      { xFrac: -0.10, yFrac: 0.12,  size:  75, color: "#FF91C5" },
      { xFrac: 0.60,  yFrac: 0.65,  size:  48, color: "#FFBCD8" },
      { xFrac: 0.82,  yFrac: 0.35,  size:  68, color: "#FFB0D2" },
      { xFrac: 0.35,  yFrac: 0.78,  size:  42, color: "#FF85BC" },
    ],
  },
  {
    illustration: require("@/assets/onboarding/customize.png"),
    title: "Make it yours",
    body: "Pick colors, themes, and layout options so the app fits how you think.",
    bg: "#D8C8FF",
    blobs: [
      { xFrac: -0.20, yFrac: 0.02,  size: 180, color: "#B49CFF" },
      { xFrac: 0.65,  yFrac: 0.58,  size: 170, color: "#AD95FF" },
      { xFrac: 0.70,  yFrac: -0.04, size:  85, color: "#C2AEFF" },
      { xFrac: -0.05, yFrac: 0.45,  size:  50, color: "#DACEFF" },
      { xFrac: 0.80,  yFrac: 0.22,  size:  58, color: "#CEBEFF" },
      { xFrac: 0.20,  yFrac: 0.68,  size:  44, color: "#BFB0FF" },
    ],
  },
  {
    illustration: require("@/assets/onboarding/demo.png"),
    title: "Explore before you start",
    body: "Demo cards show the layout right away and disappear once you add your own.",
    bg: "#B8F0DC",
    blobs: [
      { xFrac: 0.70,  yFrac: 0.08,  size: 178, color: "#64DEB8" },
      { xFrac: -0.15, yFrac: 0.50,  size: 150, color: "#60D8B0" },
      { xFrac: -0.10, yFrac: 0.04,  size:  72, color: "#7DEAD0" },
      { xFrac: 0.78,  yFrac: 0.62,  size:  60, color: "#A0EDD2" },
      { xFrac: 0.50,  yFrac: -0.05, size:  52, color: "#96EAC8" },
      { xFrac: 0.10,  yFrac: 0.75,  size:  46, color: "#70E4C0" },
    ],
  },
] as const;

export default function OnboardingScreen() {
  const router = useRouter();
  const listRef = useRef<FlatList<(typeof ONBOARDING_STEPS)[number]> | null>(
    null,
  );
  const [stepIndex, setStepIndex] = useState(0);
  const [fromBg, setFromBg] = useState<string>(ONBOARDING_STEPS[0].bg);
  const { width, height } = useWindowDimensions();
  const setHasSeenOnboarding = useCardStore(
    (state) => state.setHasSeenOnboarding,
  );

  const isCompact = width < 390 || height < 820;
  const isVeryCompact = width < 360 || height < 740;
  const slideWidth = width;
  const imageSize = isVeryCompact ? 200 : isCompact ? 240 : 280;
  const titleFontSize = isVeryCompact ? 20 : isCompact ? 22 : 24;
  const bodyFontSize = isVeryCompact ? 13 : 14;

  const currentBg = ONBOARDING_STEPS[stepIndex].bg;

  const blobAnim = useRef(new Animated.Value(1)).current;
  const contentAnim = useRef(new Animated.Value(1)).current;
  const bgFade = useRef(new Animated.Value(1)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    blobAnim.setValue(0);
    contentAnim.setValue(0);
    bgFade.setValue(0);
    Animated.parallel([
      Animated.timing(bgFade, {
        toValue: 1,
        duration: 1000,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(blobAnim, {
        toValue: 1,
        damping: 22,
        stiffness: 140,
        mass: 1,
        useNativeDriver: true,
      }),
      Animated.spring(contentAnim, {
        toValue: 1,
        damping: 18,
        stiffness: 200,
        mass: 1,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) setFromBg(currentBg);
    });
  }, [stepIndex]);

  const handleButtonPressIn = () => {
    Animated.spring(buttonScale, {
      toValue: 0.88,
      damping: 15,
      stiffness: 350,
      useNativeDriver: true,
    }).start();
  };

  const handleButtonPressOut = () => {
    Animated.spring(buttonScale, {
      toValue: 1,
      damping: 10,
      stiffness: 300,
      useNativeDriver: true,
    }).start();
  };

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
    if (!animated) {
      setStepIndex(boundedIndex);
    }
    // When animated, onScroll will update stepIndex naturally as the scroll plays
  };

  const handleNext = () => {
    if (stepIndex === ONBOARDING_STEPS.length - 1) {
      finishOnboarding();
      return;
    }
    scrollToStep(stepIndex + 1, true);
  };

  const handleBack = () => {
    scrollToStep(stepIndex - 1, true);
  };

  const handleScroll = (
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
      style={[styles.slide, { width: slideWidth }]}
    >
      <Image
        source={item.illustration}
        resizeMode="contain"
        style={{ width: imageSize, height: imageSize }}
      />
    </View>
  );

  return (
    <View style={styles.root}>
      {/* Full-screen base color (old color, behind everything) */}
      <View style={[StyleSheet.absoluteFillObject, { backgroundColor: fromBg }]} />
      {/* Full-screen overlay (new color, fades in — covers status bar & home indicator too) */}
      <Animated.View
        style={[StyleSheet.absoluteFillObject, { backgroundColor: currentBg, opacity: bgFade }]}
        pointerEvents="none"
      />
      <SafeAreaView
        style={styles.safeArea}
        edges={["top", "bottom"]}
      >
      <View style={styles.screen}>
        {/* Decorative background blobs */}
        <Animated.View style={[StyleSheet.absoluteFillObject, { opacity: blobAnim, transform: [{ scale: blobAnim.interpolate({ inputRange: [0, 1], outputRange: [1.07, 1] }) }] }]} pointerEvents="none">
          {ONBOARDING_STEPS[stepIndex].blobs.map((blob, i) => (
            <View
              key={i}
              style={{
                position: "absolute",
                left: blob.xFrac * width,
                top: blob.yFrac * height,
                width: blob.size,
                height: blob.size,
                borderRadius: blob.size / 2,
                backgroundColor: blob.color,
                opacity: 0.28,
              }}
            />
          ))}
        </Animated.View>

        <View
          style={[styles.topBar, { paddingHorizontal: isCompact ? 20 : 28 }]}
        >
          {stepIndex > 0 ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Go back"
              hitSlop={12}
              onPress={handleBack}
              style={styles.topBarButton}
            >
              <Feather name="chevron-left" size={22} color="#1A1A2E" />
            </Pressable>
          ) : (
            <Text style={styles.welcomeText}>Welcome! :)</Text>
          )}
          {stepIndex > 0 && stepIndex < ONBOARDING_STEPS.length - 1 ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Skip onboarding"
              hitSlop={12}
              onPress={finishOnboarding}
            >
              <Text style={styles.skipText}>Skip</Text>
            </Pressable>
          ) : (
            <View style={styles.skipPlaceholder} />
          )}
        </View>

        <View style={styles.carouselWrap}>
          <FlatList
            ref={listRef}
            data={ONBOARDING_STEPS}
            keyExtractor={(item) => item.title}
            horizontal
            pagingEnabled
            bounces={false}
            showsHorizontalScrollIndicator={false}
            onScroll={handleScroll}
            scrollEventThrottle={16}
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
            styles.bottomPanel,
            {
              paddingHorizontal: isCompact ? 24 : 32,
              paddingBottom: isCompact ? 20 : 28,
            },
          ]}
        >
          <Animated.View
            style={{
              opacity: contentAnim,
              transform: [
                {
                  translateY: contentAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [22, 0],
                  }),
                },
                {
                  scale: contentAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.96, 1],
                  }),
                },
              ],
              alignItems: "center",
            }}
          >
            <Text
              style={[
                styles.title,
                {
                  fontSize: titleFontSize,
                  lineHeight: Math.round(titleFontSize * 1.2),
                },
              ]}
            >
              {ONBOARDING_STEPS[stepIndex].title}
            </Text>
            <Text
              style={[
                styles.body,
                {
                  fontSize: bodyFontSize,
                  lineHeight: bodyFontSize * 1.6,
                  marginTop: isVeryCompact ? 8 : 12,
                },
              ]}
            >
              {ONBOARDING_STEPS[stepIndex].body}
            </Text>
          </Animated.View>

          <View style={styles.paginationRow}>
            {ONBOARDING_STEPS.map((step, index) => (
              <View
                key={step.title}
                style={[
                  styles.dot,
                  index === stepIndex ? styles.dotActive : styles.dotInactive,
                ]}
              />
            ))}
          </View>

          <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                stepIndex === ONBOARDING_STEPS.length - 1
                  ? "Finish onboarding"
                  : "Next onboarding screen"
              }
              onPress={handleNext}
              onPressIn={handleButtonPressIn}
              onPressOut={handleButtonPressOut}
              style={styles.continueButton}
            >
              <Feather
                name={
                  stepIndex === ONBOARDING_STEPS.length - 1
                    ? "check"
                    : "arrow-right"
                }
                size={24}
                color="#FFFFFF"
              />
            </Pressable>
          </Animated.View>
        </View>

        <AppPreviewShield />
      </View>
    </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    backgroundColor: "transparent",
  },
  screen: {
    flex: 1,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    height: 52,
  },
  topBarButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  skipText: {
    fontFamily: "ReadexPro-Medium",
    fontSize: 15,
    color: "#1A1A2E",
  },
  skipPlaceholder: {
    width: 36,
    height: 24,
  },
  welcomeText: {
    fontFamily: "ReadexPro-Medium",
    fontSize: 15,
    color: "#1A1A2E",
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
    justifyContent: "center",
  },
  bottomPanel: {
    alignItems: "center",
    paddingTop: 24,
  },
  title: {
    fontFamily: "OpenSans-Bold",
    color: "#1A1A2E",
    textAlign: "center",
    letterSpacing: -0.5,
    maxWidth: 320,
  },
  body: {
    fontFamily: "ReadexPro-Regular",
    color: "rgba(26, 26, 46, 0.6)",
    textAlign: "center",
    letterSpacing: -0.1,
    maxWidth: 320,
  },
  paginationRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 20,
    marginBottom: 20,
  },
  dot: {
    height: 8,
    borderRadius: 999,
  },
  dotActive: {
    width: 24,
    backgroundColor: "#1A1A2E",
  },
  dotInactive: {
    width: 8,
    backgroundColor: "rgba(26, 26, 46, 0.2)",
  },
  continueButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#1A1A2E",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 5,
  },
});
