import { Feather } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import DocumentScanner, {
  ResponseType,
  ScanDocumentResponseStatus,
} from "react-native-document-scanner-plugin";
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useColorScheme,
  type ScrollView as ScrollViewType,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useCardStore } from "@/store/useCardStore";
import { runDocumentScanPipeline } from "@/src/services/documentScanner/scanPipeline";
import { useDocumentScannerStore } from "@/src/store/useDocumentScannerStore";
import type { DocumentScannerPhase } from "@/types/documentScanner";
import { APP_THEME, resolveTheme } from "@/utils/theme";

const PHASE_MESSAGES: Record<DocumentScannerPhase, string> = {
  idle: "Opening camera…",
  capturing: "Opening camera…",
  confirming: "Review your scans",
  preprocessing: "Enhancing images",
  "ocr-mlkit": "Reading text",
  "ocr-paddle": "Reading text",
  classifying: "Reading text",
  extracting: "Extracting fields",
  "creating-draft": "Finalizing",
  completed: "Returning to the form.",
  failed: "Something went wrong.",
};

export default function DocumentScannerScreen() {
  const router = useRouter();
  const themePreference = useCardStore((state) => state.themePreference);
  const openAddCardSheet = useCardStore((state) => state.openAddCardSheet);
  const setPendingDraft = useDocumentScannerStore(
    (state) => state.setPendingDraft,
  );
  const deviceScheme = useColorScheme();
  const resolvedTheme = resolveTheme(themePreference, deviceScheme);
  const colors = APP_THEME[resolvedTheme];

  const [front, setFront] = useState<string | null>(null);
  const [back, setBack] = useState<string | null>(null);
  const [phase, setPhase] = useState<DocumentScannerPhase>("idle");
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  // null = closed; 0 = open on front; 1 = open on back
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [lightboxPage, setLightboxPage] = useState(0);
  const lightboxScrollRef = useRef<ScrollViewType>(null);

  const lightboxImages = [front, back].filter(Boolean) as string[];

  // When opening the lightbox, scroll to the tapped image
  useEffect(() => {
    if (previewIndex !== null) {
      setLightboxPage(previewIndex);
      setTimeout(() => {
        lightboxScrollRef.current?.scrollTo({
          x: previewIndex * SCREEN_W,
          animated: false,
        });
      }, 50);
    }
  }, [previewIndex]);

  const launchNativeScanner = async () => {
    setErrorMessage("");
    setFront(null);
    setBack(null);
    setPhase("capturing");

    try {
      const response = await DocumentScanner.scanDocument({
        croppedImageQuality: 100,
        maxNumDocuments: 2,
        responseType: ResponseType.ImageFilePath,
      });

      if (response.status === ScanDocumentResponseStatus.Cancel) {
        if (!front) {
          openAddCardSheet();
          router.back();
          return;
        }
        setPhase("confirming");
        return;
      }

      const images = response.scannedImages ?? [];
      if (images.length === 0) {
        throw new Error("No images were returned from the scanner.");
      }

      // Cap at 2 — ignore any extra pages scanned beyond front+back
      setFront(images[0] ?? null);
      setBack(images[1] ?? null);
      setPhase("confirming");
    } catch (error) {
      setPhase("failed");
      setErrorMessage(
        error instanceof Error ? error.message : "Scanner could not start.",
      );
    }
  };

  const launchBackScanner = async () => {
    setErrorMessage("");
    setPhase("capturing");

    try {
      const response = await DocumentScanner.scanDocument({
        croppedImageQuality: 100,
        maxNumDocuments: 1,
        responseType: ResponseType.ImageFilePath,
      });

      if (response.status === ScanDocumentResponseStatus.Cancel) {
        setPhase("confirming");
        return;
      }

      const image = response.scannedImages?.[0];
      if (!image) {
        throw new Error("No image was returned from the scanner.");
      }

      setBack(image);
      setPhase("confirming");
    } catch (error) {
      setPhase("failed");
      setErrorMessage(
        error instanceof Error ? error.message : "Back scan could not start.",
      );
    }
  };

  // Auto-launch on mount — delay so the screen transition finishes before
  // the native camera sheet tries to present itself.
  useEffect(() => {
    const timer = setTimeout(() => {
      void launchNativeScanner();
    }, 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleReturnToForm = () => {
    openAddCardSheet();
    router.back();
  };

  const finalizeScan = async () => {
    if (!front) {
      return;
    }

    setErrorMessage("");
    setIsProcessing(true);

    try {
      const result = await runDocumentScanPipeline({
        captureMode: "manual",
        requiresBackSide: Boolean(back),
        frontUri: front,
        backUri: back,
        onPhaseChange: setPhase,
      });

      setPendingDraft(result.draft, result.record);
      setPhase("completed");
      requestAnimationFrame(() => {
        openAddCardSheet();
        router.back();
      });
    } catch (error) {
      setPhase("failed");
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "The scan could not be processed.",
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const isReviewing = !isProcessing && front !== null;

  const subtitleText = isProcessing
    ? PHASE_MESSAGES[phase]
    : isReviewing
      ? "Review your captures"
      : "";

  const renderReview = () => (
    <View style={[styles.panel, { backgroundColor: colors.surface }]}>
      <Text style={[styles.panelTitle, { color: colors.text }]}>
        Review your scans
      </Text>
      <Text style={[styles.panelBody, { color: colors.textMuted }]}>
        Check that both sides are sharp and complete, then tap Process to
        extract the data.
      </Text>

      <View style={styles.imagesRow}>
        <View style={styles.imageWrap}>
          <Text style={[styles.imageLabel, { color: colors.textSoft }]}>
            FRONT
          </Text>
          <Pressable onPress={() => setPreviewIndex(0)}>
            <Image
              source={{ uri: front! }}
              style={styles.previewThumbnail}
              resizeMode="cover"
            />
            <View style={styles.thumbnailOverlay}>
              <Feather name="maximize-2" size={16} color="#fff" />
            </View>
          </Pressable>
        </View>

        {back ? (
          <View style={styles.imageWrap}>
            <Text style={[styles.imageLabel, { color: colors.textSoft }]}>
              BACK
            </Text>
            <Pressable onPress={() => setPreviewIndex(1)}>
              <Image
                source={{ uri: back }}
                style={styles.previewThumbnail}
                resizeMode="cover"
              />
              <View style={styles.thumbnailOverlay}>
                <Feather name="maximize-2" size={16} color="#fff" />
              </View>
            </Pressable>
          </View>
        ) : (
          <Pressable
            onPress={() => void launchBackScanner()}
            accessibilityRole="button"
            accessibilityLabel="Scan back side"
            style={{ flex: 1 }}
          >
            <View
            style={[
              styles.imageWrap,
              styles.imageWrapEmpty,
              { borderColor: colors.buttonBorder },
            ]}
            >
              <Text style={[styles.imageLabel, { color: colors.textSoft }]}>
                BACK
              </Text>
              <Feather name="camera" size={28} color={colors.textMuted} />
              <Text style={[styles.emptyImageHint, { color: colors.textMuted }]}>
                Tap to scan back side
              </Text>
            </View>
          </Pressable>
        )}
      </View>

      <View style={styles.actionRow}>
        <Pressable
          onPress={() => void launchNativeScanner()}
          style={[
            styles.secondaryAction,
            {
              backgroundColor: colors.surfaceMuted,
              borderColor: colors.buttonBorder,
            },
          ]}
        >
          <Feather name="camera" size={15} color={colors.text} />
          <Text style={[styles.secondaryActionText, { color: colors.text }]}>
            Retake
          </Text>
        </Pressable>
        <Pressable
          onPress={() => void finalizeScan()}
          style={[
            styles.primaryButton,
            { backgroundColor: colors.accent, borderColor: colors.accent },
          ]}
        >
          <Text
            style={[styles.primaryButtonText, { color: colors.accentText }]}
          >
            Process
          </Text>
        </Pressable>
      </View>
    </View>
  );

  const renderProcessing = () => (
    <View style={styles.processingWrap}>
      <View
        style={[
          styles.processingCard,
          { backgroundColor: colors.surface, borderColor: colors.buttonBorder },
        ]}
      >
        <View
          style={[styles.processingOrb, { backgroundColor: colors.accent }]}
        >
          <ActivityIndicator size="large" color={colors.accentText} />
        </View>
        <Text style={[styles.processingTitle, { color: colors.text }]}>
          {PHASE_MESSAGES[phase]}
        </Text>
        <Text style={[styles.processingBody, { color: colors.textMuted }]}>
          We are enhancing the scan, reading detected text, and building a
          prefilled draft for the add-card form.
        </Text>
      </View>
    </View>
  );

  const renderBody = () => {
    if (isProcessing) return renderProcessing();
    if (isReviewing) return renderReview();
    // Camera is covering the screen — render nothing to avoid a flash
    return null;
  };

  return (
    <SafeAreaView
      edges={["top", "bottom"]}
      style={[styles.root, { backgroundColor: colors.background }]}
    >
      <StatusBar style={resolvedTheme === "dark" ? "light" : "dark"} />
      <View style={styles.headerRow}>
        <Pressable
          onPress={handleReturnToForm}
          hitSlop={12}
          style={styles.headerButton}
        >
          <Feather name="arrow-left" size={22} color={colors.text} />
        </Pressable>
        <View style={styles.headerTextWrap}>
          <Text style={[styles.title, { color: colors.text }]}>
            Scanned
          </Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            {subtitleText}
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {renderBody()}

        {errorMessage ? (
          <View
            style={[
              styles.errorCard,
              { backgroundColor: colors.surface, borderColor: colors.danger },
            ]}
          >
            <Feather name="alert-triangle" size={18} color={colors.danger} />
            <Text style={[styles.errorText, { color: colors.text }]}>
              {errorMessage}
            </Text>
            <Pressable
              onPress={() => void launchNativeScanner()}
              style={styles.retryButton}
            >
              <Text style={[styles.retryButtonText, { color: colors.accent }]}>
                Try again
              </Text>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>
      {/* Full-screen swipeable image preview lightbox */}
      <Modal
        visible={previewIndex !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewIndex(null)}
      >
        <View style={styles.lightboxBackdrop}>
          <ScrollView
            ref={lightboxScrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            scrollEventThrottle={16}
            onMomentumScrollEnd={(e) => {
              const page = Math.round(e.nativeEvent.contentOffset.x / SCREEN_W);
              setLightboxPage(page);
            }}
            style={styles.lightboxPager}
            contentContainerStyle={styles.lightboxPagerContent}
            decelerationRate="fast"
          >
            {lightboxImages.map((uri, i) => (
              <View key={i} style={styles.lightboxPage}>
                <Image
                  source={{ uri }}
                  style={styles.lightboxImage}
                  resizeMode="contain"
                />
              </View>
            ))}
          </ScrollView>

          {/* Page dots — only when both sides were scanned */}
          {lightboxImages.length > 1 ? (
            <View style={styles.lightboxDots}>
              {lightboxImages.map((_, i) => (
                <View
                  key={i}
                  style={[styles.dot, i === lightboxPage && styles.dotActive]}
                />
              ))}
            </View>
          ) : null}
        </View>

        {/* Close button — sits above everything */}
        <Pressable
          style={styles.lightboxClose}
          onPress={() => setPreviewIndex(null)}
          hitSlop={12}
        >
          <Feather name="x" size={22} color="#fff" />
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("screen");

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  headerButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTextWrap: {
    flex: 1,
  },
  title: {
    fontFamily: "ReadexPro-Bold",
    fontSize: 28,
    lineHeight: 34,
  },
  subtitle: {
    fontFamily: "ReadexPro-Regular",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    gap: 16,
  },
  panel: {
    borderRadius: 28,
    padding: 20,
  },
  panelTitle: {
    fontFamily: "ReadexPro-Bold",
    fontSize: 22,
    lineHeight: 28,
  },
  panelBody: {
    fontFamily: "ReadexPro-Regular",
    fontSize: 14,
    lineHeight: 22,
    marginTop: 8,
  },
  imagesRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 18,
  },
  imageWrap: {
    flex: 1,
    gap: 6,
  },
  imageWrapEmpty: {
    borderWidth: 1,
    borderRadius: 20,
    borderStyle: "dashed",
    minHeight: 160,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  imageLabel: {
    fontFamily: "ReadexPro-Medium",
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  previewThumbnail: {
    width: "100%",
    height: 180,
    borderRadius: 18,
  },
  emptyImageHint: {
    fontFamily: "ReadexPro-Regular",
    fontSize: 13,
  },
  actionRow: {
    marginTop: 18,
    flexDirection: "row",
    gap: 12,
  },
  secondaryAction: {
    flex: 1,
    minHeight: 52,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    flexDirection: "row",
    gap: 8,
  },
  secondaryActionText: {
    fontFamily: "ReadexPro-Medium",
    fontSize: 14,
  },
  primaryButton: {
    flex: 2,
    minHeight: 52,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  primaryButtonText: {
    fontFamily: "ReadexPro-Bold",
    fontSize: 14,
  },
  processingWrap: {
    flex: 1,
    justifyContent: "center",
    paddingTop: 80,
    paddingBottom: 80,
  },
  processingCard: {
    borderRadius: 32,
    borderWidth: 1,
    paddingHorizontal: 24,
    paddingVertical: 28,
    alignItems: "center",
  },
  processingOrb: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  processingTitle: {
    fontFamily: "ReadexPro-Bold",
    fontSize: 24,
    lineHeight: 30,
    textAlign: "center",
  },
  processingBody: {
    marginTop: 10,
    fontFamily: "ReadexPro-Regular",
    fontSize: 14,
    lineHeight: 22,
    textAlign: "center",
  },
  errorCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 14,
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  errorText: {
    flex: 1,
    fontFamily: "ReadexPro-Regular",
    fontSize: 14,
    lineHeight: 20,
  },
  retryButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  thumbnailOverlay: {
    position: "absolute",
    bottom: 8,
    right: 8,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  lightboxBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.92)",
    justifyContent: "center",
  },
  lightboxPager: {
    width: SCREEN_W,
    height: SCREEN_H * 0.78,
    flexGrow: 0,
    flexShrink: 0,
  },
  lightboxPagerContent: {
    flexDirection: "row",
  },
  lightboxPage: {
    width: SCREEN_W,
    height: SCREEN_H * 0.78,
    alignItems: "center",
    justifyContent: "center",
  },
  lightboxImage: {
    width: SCREEN_W,
    height: SCREEN_H * 0.78,
  },
  lightboxDots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    marginTop: 14,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.35)",
  },
  dotActive: {
    backgroundColor: "#fff",
  },
  lightboxClose: {
    position: "absolute",
    top: 56,
    right: 20,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  retryButtonText: {
    fontFamily: "ReadexPro-Medium",
    fontSize: 14,
  },
});
