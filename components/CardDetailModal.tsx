import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as FileSystem from "expo-file-system/legacy";
import * as Haptics from "expo-haptics";
import Animated, {
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import ViewShot from "react-native-view-shot";

import { AppPreviewShield } from "@/components/AppPreviewShield";
import { CardItem } from "@/components/CardItem";
import { EditCardSheet } from "@/components/EditCardSheet";
import { ExpiryBadge } from "@/components/ExpiryBadge";
import { findDemoCardById } from "@/constants/demoCards";
import { useTranslation } from "@/src/hooks/useTranslation";
import { useCardStore } from "@/store/useCardStore";
import {
  createSharedCardFileName,
  createSharedCardPayload,
  SHARED_CARD_FILE_MIME_TYPE,
  stringifySharedCardPayload,
} from "@/utils/cardShare";
import {
  getCategoryLabel,
  supportsCardBack,
  type WalletCard,
} from "@/types/card";
import { getExpiryStatus, supportsValidityBadge } from "@/utils/expiry";
import { APP_THEME, CARD_SIDE_TOGGLE_THEME, resolveTheme } from "@/utils/theme";

type CardDetailModalProps = {
  cardId: string | null;
  onClose: () => void;
};

export function CardDetailModal({ cardId, onClose }: CardDetailModalProps) {
  const tr = useTranslation();
  const cards = useCardStore((state) => state.cards);
  const deleteCard = useCardStore((state) => state.deleteCard);
  const language = useCardStore((state) => state.language);
  const themePreference = useCardStore((state) => state.themePreference);
  const deviceScheme = useColorScheme();
  const resolvedTheme = resolveTheme(themePreference, deviceScheme);
  const colors = APP_THEME[resolvedTheme];
  const sideToggleColors = CARD_SIDE_TOGGLE_THEME[resolvedTheme];

  const demoCard = cardId ? findDemoCardById(cardId) : null;
  const cardData =
    (cardId ? cards.find((c) => c.id === cardId) : null) ?? demoCard ?? null;
  const isDemoCard = Boolean(demoCard);
  const defaultsToBack =
    cardData?.category === "club" &&
    (cardData as import("@/types/card").ClubCard).memberIdFormat === "barcode";

  const [isFlipped, setIsFlipped] = useState(defaultsToBack ?? false);
  const [editSheetOpen, setEditSheetOpen] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [shareSheetOpen, setShareSheetOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastVisible, setToastVisible] = useState(false);

  const flipProgress = useSharedValue(defaultsToBack ? 1 : 0);
  const shareCaptureRef = useRef<ViewShot | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset internal state whenever a new card is selected
  useEffect(() => {
    if (!cardId) return;
    const nextDemoCard = findDemoCardById(cardId);
    const nextCard = cards.find((c) => c.id === cardId) ?? nextDemoCard ?? null;
    const nextDefaultsToBack =
      nextCard?.category === "club" &&
      (nextCard as import("@/types/card").ClubCard).memberIdFormat ===
        "barcode";

    cancelAnimation(flipProgress);
    setIsFlipped(nextDefaultsToBack ?? false);
    flipProgress.value = nextDefaultsToBack ? 1 : 0;
    setEditSheetOpen(false);
    setIsSharing(false);
    setShareSheetOpen(false);
    setToastVisible(false);
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
      toastTimerRef.current = null;
    }
  }, [cardId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cancel in-flight animations and timers on unmount
  useEffect(() => {
    return () => {
      cancelAnimation(flipProgress);
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const currentSide = isFlipped ? "back" : "front";

  const frontStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 1200 },
      { rotateY: `${interpolate(flipProgress.value, [0, 1], [0, 180])}deg` },
    ],
    backfaceVisibility: "hidden",
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
  }));

  const backStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 1200 },
      { rotateY: `${interpolate(flipProgress.value, [0, 1], [180, 360])}deg` },
    ],
    backfaceVisibility: "hidden",
  }));

  const card = cardData;
  const canFlip = card ? supportsCardBack(card) : false;

  // Memoised so only recomputes when the card data or language changes,
  // not on every toast / flip / share state update.
  const fields = useMemo(
    () => (card ? getCardFields(card, tr) : []),
    [card, language], // eslint-disable-line react-hooks/exhaustive-deps
  );

  // All hooks must be called before any early return.
  // Render the "not found" shell when cardId is set but no card exists.
  if (!card) {
    return (
      <Modal
        visible={cardId !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={onClose}
      >
        <SafeAreaView
          style={[styles.root, { backgroundColor: colors.background }]}
        >
          <View style={styles.centeredError}>
            <Text style={[styles.errorText, { color: colors.textMuted }]}>
              {tr("card_detail_not_found")}
            </Text>
          </View>
        </SafeAreaView>
      </Modal>
    );
  }

  // Beyond this point card is guaranteed non-null (WalletCard).

  function showDemoActionWarning(actionLabel: string) {
    Alert.alert(
      language === "mk" ? "Демо картичка" : "Demo card",
      language === "mk"
        ? `${actionLabel} не е достапно за демо картички. Додај своја картичка или синхронизирај ги зачуваните картички за оваа акција.`
        : `${actionLabel} is not available for demo cards. Add your own card or sync your saved cards to use this action.`,
    );
  }

  function setCardSide(side: "front" | "back") {
    if (!canFlip) return;
    const nextIsFlipped = side === "back";
    setIsFlipped(nextIsFlipped);
    flipProgress.value = withTiming(nextIsFlipped ? 1 : 0, { duration: 400 });
  }

  function handleFlip() {
    if (!canFlip) return;
    setCardSide(isFlipped ? "front" : "back");
  }

  async function handleCopy(value: string, label: string) {
    if (!value) return;
    await Clipboard.setStringAsync(value);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setToastMessage(`${label} ${tr("card_detail_copy_toast_suffix")}`);
    setToastVisible(true);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToastVisible(false), 2000);
  }

  function handleDelete() {
    if (isDemoCard) {
      showDemoActionWarning("Delete");
      return;
    }

    Alert.alert(
      language === "mk" ? "Избриши картичка" : "Delete Card",
      language === "mk"
        ? "Оваа картичка веднаш ќе се отстрани од уредот. Ако cloud sync е отклучен на овој уред, Pocket ID ќе ја синхронизира оваа промена и со вашиот шифриран облак трезор. Да продолжам?"
        : "This card will be removed from this device immediately. If cloud sync is unlocked on this device, Pocket ID will also sync that deletion to your encrypted cloud vault. Continue?",
      [
        { text: language === "mk" ? "Откажи" : "Cancel", style: "cancel" },
        {
          text: language === "mk" ? "Избриши" : "Delete",
          style: "destructive",
          onPress: () => {
            deleteCard(cardId!);
            onClose();
          },
        },
      ],
    );
  }

  const shareAsImage = async () => {
    if (isSharing) return;

    try {
      setIsSharing(true);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await new Promise((resolve) => setTimeout(resolve, 80));

      const imageUri = await shareCaptureRef.current?.capture?.();

      if (!imageUri) {
        throw new Error(
          language === "mk"
            ? "Неуспешно снимање картичка"
            : "Card capture failed",
        );
      }

      await Share.share({
        title: `${card.title} details`,
        message: buildShareMessage(card, fields),
        url: imageUri,
      });
    } catch {
      Alert.alert(
        language === "mk" ? "Споделувањето не е достапно" : "Share unavailable",
        language === "mk"
          ? "Не можевме да ја подготвиме картичката за споделување во моментов. Обиди се повторно."
          : "We could not prepare this card for sharing right now. Please try again.",
      );
    } finally {
      setIsSharing(false);
    }
  };

  const shareAsText = async () => {
    if (isSharing) return;

    try {
      setIsSharing(true);
      await Share.share({
        title: `${card.title} details`,
        message: buildShareMessage(card, fields),
      });
    } finally {
      setIsSharing(false);
    }
  };

  async function createPocketIdShareFile(fileName: string, payload: string) {
    const writableDirectory =
      FileSystem.cacheDirectory ?? FileSystem.documentDirectory;

    if (!writableDirectory) {
      throw new Error("No writable app directory is available.");
    }

    const exportFileUri = `${writableDirectory}${fileName}`;
    const existingFile = await FileSystem.getInfoAsync(exportFileUri);

    if (existingFile.exists) {
      await FileSystem.deleteAsync(exportFileUri, { idempotent: true });
    }

    await FileSystem.writeAsStringAsync(exportFileUri, payload, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    return exportFileUri;
  }

  const sharePocketIdFileThroughApps = async (
    fileName: string,
    payload: string,
  ) => {
    try {
      setIsSharing(true);
      const exportFileUri = await createPocketIdShareFile(fileName, payload);
      const shareUri =
        Platform.OS === "android"
          ? await FileSystem.getContentUriAsync(exportFileUri).catch(
              () => exportFileUri,
            )
          : exportFileUri;

      await Share.share({
        title: `Send ${card.title} as a Pocket ID card`,
        url: shareUri,
      });
    } catch (error) {
      const details = error instanceof Error ? `\n\n${error.message}` : "";
      Alert.alert(
        language === "mk" ? "Споделувањето не е достапно" : "Share unavailable",
        language === "mk"
          ? `Не можевме да го отвориме прозорецот за споделување. Обиди се повторно.${details}`
          : `We could not open the app share sheet right now. Please try again.${details}`,
      );
    } finally {
      setIsSharing(false);
    }
  };

  const shareAsPocketIdFile = async () => {
    if (isSharing) return;

    try {
      setIsSharing(true);
      const fileName = createSharedCardFileName(card);
      const payload = stringifySharedCardPayload(createSharedCardPayload(card));

      if (Platform.OS === "android") {
        const permissions =
          await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();

        if (!permissions.granted || !permissions.directoryUri) {
          return;
        }

        const exportedFileUri =
          await FileSystem.StorageAccessFramework.createFileAsync(
            permissions.directoryUri,
            fileName,
            SHARED_CARD_FILE_MIME_TYPE,
          );

        await FileSystem.StorageAccessFramework.writeAsStringAsync(
          exportedFileUri,
          payload,
          { encoding: FileSystem.EncodingType.UTF8 },
        );

        Alert.alert(
          language === "mk"
            ? "Pocket ID датотеката е зачувана"
            : "Pocket ID file saved",
          language === "mk"
            ? `Зачувано е ${fileName} во избраната папка. Ако имаш инсталирано Viber, Messenger, WhatsApp, Gmail, Drive или слични апликации, ќе се појават автоматски кога ќе допреш „Сподели сега".`
            : `Saved ${fileName} to the folder you selected. If Viber, Messenger, WhatsApp, Gmail, Drive, or similar apps are installed, they will show up automatically when you tap Share now.`,
          [
            { text: language === "mk" ? "Готово" : "Done", style: "cancel" },
            {
              text: language === "mk" ? "Сподели сега" : "Share now",
              onPress: () => {
                void sharePocketIdFileThroughApps(fileName, payload);
              },
            },
          ],
        );
        return;
      }

      await createPocketIdShareFile(fileName, payload);

      Alert.alert(
        language === "mk"
          ? "Pocket ID датотеката е подготвена"
          : "Pocket ID file ready",
        language === "mk"
          ? `Подготвено е ${fileName}. Ако имаш инсталирано Messages, Mail, WhatsApp, Messenger, Viber, Drive или слични апликации, ќе се појават автоматски кога ќе допреш „Сподели сега".`
          : `Prepared ${fileName}. If Messages, Mail, WhatsApp, Messenger, Viber, Drive, or similar apps are installed, they will show up automatically when you tap Share now.`,
        [
          { text: language === "mk" ? "Готово" : "Done", style: "cancel" },
          {
            text: language === "mk" ? "Сподели сега" : "Share now",
            onPress: () => {
              void sharePocketIdFileThroughApps(fileName, payload);
            },
          },
        ],
      );
    } catch (error) {
      const details = error instanceof Error ? `\n\n${error.message}` : "";
      Alert.alert(
        language === "mk" ? "Споделувањето не е достапно" : "Share unavailable",
        language === "mk"
          ? `Не можевме да ја извеземе Pocket ID датотеката во моментов. Обиди се повторно.${details}`
          : `We could not export this Pocket ID card file right now. Please try again.${details}`,
      );
    } finally {
      setIsSharing(false);
    }
  };

  async function handleShareOption(
    option: "image" | "text" | "pocket-id-file",
  ) {
    if (isDemoCard) {
      setShareSheetOpen(false);
      showDemoActionWarning("Share");
      return;
    }

    setShareSheetOpen(false);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (option === "image") {
      await shareAsImage();
      return;
    }

    if (option === "text") {
      await shareAsText();
      return;
    }

    await shareAsPocketIdFile();
  }

  return (
    <Modal
      visible={cardId !== null}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView
        style={[styles.root, { backgroundColor: colors.background }]}
      >
        {/* ── Header ─────────────────────────────── */}
        <View style={styles.header}>
          <Pressable onPress={onClose} hitSlop={12} style={styles.headerBtn}>
            <Feather name="arrow-left" size={24} color={colors.text} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {card.title}
          </Text>
          <Pressable
            hitSlop={12}
            style={styles.headerBtn}
            onPress={() => {
              if (isDemoCard) {
                showDemoActionWarning("Edit");
                return;
              }
              setEditSheetOpen(true);
            }}
          >
            <Feather name="edit-2" size={20} color={colors.text} />
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Card visual with flip ───────────── */}
          <View style={styles.cardWrapper}>
            {canFlip ? (
              <View
                style={[
                  styles.sideToggle,
                  { backgroundColor: sideToggleColors.containerBackground },
                ]}
              >
                {(["front", "back"] as const).map((side) => {
                  const active = currentSide === side;
                  return (
                    <Pressable
                      key={side}
                      onPress={() => setCardSide(side)}
                      style={[
                        styles.sideToggleBtn,
                        {
                          backgroundColor: active
                            ? sideToggleColors.activeBackground
                            : "transparent",
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.sideToggleText,
                          {
                            color: active
                              ? sideToggleColors.activeText
                              : sideToggleColors.inactiveText,
                          },
                        ]}
                      >
                        {side === "front"
                          ? tr("card_detail_front")
                          : tr("card_detail_back")}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}
            <View style={styles.previewWrap}>
              <Pressable
                onPress={handleFlip}
                style={styles.cardContainer}
                disabled={!canFlip}
              >
                <Animated.View style={frontStyle}>
                  <CardItem
                    card={card}
                    side="front"
                    size="full"
                    showExpirySuffix
                    showExpiryBadge={false}
                  />
                </Animated.View>
                <Animated.View style={backStyle}>
                  <CardItem
                    card={card}
                    side="back"
                    size="full"
                    showExpirySuffix
                    showExpiryBadge={false}
                  />
                </Animated.View>
              </Pressable>
              {canFlip && (
                <Text style={[styles.flipHint, { color: colors.textSoft }]}>
                  {tr("card_detail_flip_hint")}
                </Text>
              )}
            </View>
          </View>

          {/* ── Field list ─────────────────────── */}
          <View style={styles.fieldList}>
            {(() => {
              if (isDemoCard) return null;
              const expiryStatus = supportsValidityBadge(card)
                ? getExpiryStatus(card)
                : null;
              if (!expiryStatus?.isExpired) return null;
              const daysSinceExpiry = Math.floor(-expiryStatus.daysUntilExpiry);
              const daysLeft = Math.max(0, 7 - daysSinceExpiry);
              const bannerText =
                daysLeft > 0
                  ? tr("card_detail_auto_delete_banner").replace(
                      "{days}",
                      String(daysLeft),
                    )
                  : tr("card_detail_auto_delete_today");
              return (
                <View
                  style={[
                    styles.autoDeleteBanner,
                    {
                      backgroundColor: colors.dangerSoft,
                      borderColor: colors.danger,
                    },
                  ]}
                >
                  <Feather name="clock" size={14} color={colors.danger} />
                  <Text
                    style={[
                      styles.autoDeleteBannerText,
                      { color: colors.danger },
                    ]}
                  >
                    {bannerText}
                  </Text>
                </View>
              );
            })()}
            {supportsValidityBadge(card) ? (
              <ExpiryBadge
                card={card}
                appearance={resolvedTheme === "light" ? "surface" : "default"}
              />
            ) : null}
            {fields.map(({ label, value }) => (
              <Pressable
                key={label}
                style={[
                  styles.fieldRow,
                  {
                    backgroundColor: colors.input,
                    borderColor: colors.inputBorder,
                  },
                ]}
                onPress={() => handleCopy(value, label)}
                android_ripple={{ color: colors.border, borderless: false }}
              >
                <View style={styles.fieldText}>
                  <Text style={[styles.fieldLabel, { color: colors.textSoft }]}>
                    {label}
                  </Text>
                  <Text
                    style={[styles.fieldValue, { color: colors.text }]}
                    numberOfLines={1}
                  >
                    {value || "—"}
                  </Text>
                </View>
                <Feather name="copy" size={16} color={colors.textSoft} />
              </Pressable>
            ))}
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={tr("cards_share_card")}
            disabled={isSharing}
            onPress={() => {
              if (isDemoCard) {
                showDemoActionWarning("Share");
                return;
              }
              setShareSheetOpen(true);
            }}
            style={[
              styles.shareBtn,
              {
                backgroundColor: colors.accent,
                opacity: isSharing ? 0.72 : 1,
              },
            ]}
          >
            {isSharing ? (
              <ActivityIndicator size="small" color={colors.accentText} />
            ) : (
              <Feather name="share-2" size={18} color={colors.accentText} />
            )}
            <Text style={[styles.shareText, { color: colors.accentText }]}>
              {isSharing
                ? tr("card_detail_share_preparing")
                : tr("cards_share_card")}
            </Text>
          </Pressable>

          {/* ── Delete button ──────────────────── */}
          <Pressable
            onPress={handleDelete}
            style={[styles.deleteBtn, { borderColor: colors.danger }]}
          >
            <Feather name="trash-2" size={18} color={colors.danger} />
            <Text style={[styles.deleteText, { color: colors.danger }]}>
              {tr("card_detail_delete_card")}
            </Text>
          </Pressable>
        </ScrollView>

        {/* ── Toast ─────────────────────────────── */}
        {toastVisible && (
          <View
            style={[styles.toast, { backgroundColor: colors.surfaceStrong }]}
            pointerEvents="none"
          >
            <Text style={[styles.toastText, { color: colors.text }]}>
              {toastMessage}
            </Text>
          </View>
        )}

        <Modal
          transparent
          visible={shareSheetOpen}
          animationType="fade"
          onRequestClose={() => setShareSheetOpen(false)}
        >
          <View
            style={[
              styles.shareSheetBackdrop,
              { backgroundColor: colors.overlay },
            ]}
          >
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={() => setShareSheetOpen(false)}
            />
            <View
              style={[styles.shareSheet, { backgroundColor: colors.surface }]}
            >
              <Text style={[styles.shareSheetTitle, { color: colors.text }]}>
                {tr("card_detail_share_title")}
              </Text>
              <Text
                style={[styles.shareSheetBody, { color: colors.textMuted }]}
              >
                {tr("card_detail_share_body")}
              </Text>

              <Pressable
                onPress={() => handleShareOption("image")}
                style={[
                  styles.shareOption,
                  { borderColor: colors.buttonBorder },
                ]}
              >
                <View>
                  <Text
                    style={[styles.shareOptionTitle, { color: colors.text }]}
                  >
                    {tr("card_detail_share_image")}
                  </Text>
                  <Text
                    style={[
                      styles.shareOptionBody,
                      { color: colors.textMuted },
                    ]}
                  >
                    {tr("card_detail_share_image_body")}
                  </Text>
                </View>
                <Feather name="image" size={18} color={colors.textSoft} />
              </Pressable>

              <Pressable
                onPress={() => handleShareOption("text")}
                style={[
                  styles.shareOption,
                  { borderColor: colors.buttonBorder },
                ]}
              >
                <View>
                  <Text
                    style={[styles.shareOptionTitle, { color: colors.text }]}
                  >
                    {tr("card_detail_share_text")}
                  </Text>
                  <Text
                    style={[
                      styles.shareOptionBody,
                      { color: colors.textMuted },
                    ]}
                  >
                    {tr("card_detail_share_text_body")}
                  </Text>
                </View>
                <Feather name="file-text" size={18} color={colors.textSoft} />
              </Pressable>

              <Pressable
                onPress={() => handleShareOption("pocket-id-file")}
                style={[
                  styles.shareOption,
                  { borderColor: colors.buttonBorder },
                ]}
              >
                <View>
                  <Text
                    style={[styles.shareOptionTitle, { color: colors.text }]}
                  >
                    {tr("card_detail_share_file")}
                  </Text>
                  <Text
                    style={[
                      styles.shareOptionBody,
                      { color: colors.textMuted },
                    ]}
                  >
                    {tr("card_detail_share_file_body")}
                  </Text>
                </View>
                <Feather
                  name="download-cloud"
                  size={18}
                  color={colors.textSoft}
                />
              </Pressable>

              <Pressable
                onPress={() => setShareSheetOpen(false)}
                style={[
                  styles.shareCancel,
                  { backgroundColor: colors.surfaceMuted },
                ]}
              >
                <Text style={[styles.shareCancelText, { color: colors.text }]}>
                  {tr("common_cancel")}
                </Text>
              </Pressable>
            </View>
          </View>
        </Modal>

        {shareSheetOpen || isSharing ? (
          <View
            pointerEvents="none"
            style={styles.captureStage}
            collapsable={false}
          >
            <ViewShot
              ref={shareCaptureRef}
              options={{ format: "jpg", quality: 0.95, result: "tmpfile" }}
              style={[
                styles.captureCanvas,
                { backgroundColor: colors.surface },
              ]}
            >
              <Text style={[styles.captureTitle, { color: colors.text }]}>
                {card.title}
              </Text>
              <Text
                style={[styles.captureSubtitle, { color: colors.textMuted }]}
              >
                {language === "mk"
                  ? "Преглед на предна и задна страна"
                  : "Front and back card preview"}
              </Text>

              <View style={styles.captureCardBlock} collapsable={false}>
                <Text
                  style={[styles.captureSideLabel, { color: colors.textSoft }]}
                >
                  {tr("card_detail_front")}
                </Text>
                <View style={styles.captureCardFrame} collapsable={false}>
                  <CardItem
                    card={card}
                    side="front"
                    size="full"
                    showExpirySuffix
                    showExpiryBadge={false}
                  />
                </View>
              </View>

              {canFlip ? (
                <View style={styles.captureCardBlock} collapsable={false}>
                  <Text
                    style={[
                      styles.captureSideLabel,
                      { color: colors.textSoft },
                    ]}
                  >
                    {tr("card_detail_back")}
                  </Text>
                  <View style={styles.captureCardFrame} collapsable={false}>
                    <CardItem
                      card={card}
                      side="back"
                      size="full"
                      showExpirySuffix
                      showExpiryBadge={false}
                    />
                  </View>
                </View>
              ) : null}
            </ViewShot>
          </View>
        ) : null}

        {/* ── Edit sheet ────────────────────────── */}
        {editSheetOpen ? (
          <EditCardSheet
            card={card}
            isOpen={editSheetOpen}
            onClose={() => setEditSheetOpen(false)}
          />
        ) : null}
        <AppPreviewShield />
      </SafeAreaView>
    </Modal>
  );
}

function getCardFields(
  card: WalletCard,
  tr: (key: keyof import("@/src/i18n/translations").TranslationKeys) => string,
): { label: string; value: string }[] {
  const isMk = tr("tab_home") === "Почетна";
  const tLabel = (label: string) => {
    switch (label) {
      case "Type":
        return tr("form_type");
      case "Issuer":
        return tr("cards_issuer_label");
      case "Bank Name":
        return isMk ? "Име на банка" : "Bank Name";
      case "Card Type":
        return isMk ? "Тип на картичка" : "Card Type";
      case "Cardholder Name":
        return isMk ? "Име на носител" : "Cardholder Name";
      case "Card Number":
        return tr("form_card_number");
      case "Account Number":
        return isMk ? "Број на сметка" : "Account Number";
      case "Expiry Date":
      case "Date of Expiry":
        return tr("form_expiry");
      case "Owner Name":
        return isMk ? "Име на сопственик" : "Owner Name";
      case "Registration Number":
        return isMk ? "Регистрациски број" : "Registration Number";
      case "Vehicle Model":
        return isMk ? "Модел на возило" : "Vehicle Model";
      case "VIN / Chassis Number":
        return isMk ? "VIN / број на шасија" : "VIN / Chassis Number";
      case "Badge Holder":
        return isMk ? "Носител на беџ" : "Badge Holder";
      case "Company":
        return isMk ? "Компанија" : "Company";
      case "Employee ID":
        return isMk ? "ID на вработен" : "Employee ID";
      case "Department":
        return isMk ? "Оддел" : "Department";
      case "Access Level":
        return isMk ? "Ниво на пристап" : "Access Level";
      case "Authority":
        return isMk ? "Орган" : "Authority";
      case "Provider":
        return isMk ? "Провајдер" : "Provider";
      case "Member Name":
        return isMk ? "Име на член" : "Member Name";
      case "Policy Number":
        return isMk ? "Број на полиса" : "Policy Number";
      case "Plan Name":
        return isMk ? "Име на план" : "Plan Name";
      case "Member ID":
        return isMk ? "ID на член" : "Member ID";
      case "Group Number":
        return isMk ? "Групен број" : "Group Number";
      case "Support Phone":
        return isMk ? "Телефон за поддршка" : "Support Phone";
      case "Date of Issue":
        return isMk ? "Датум на издавање" : "Date of Issue";
      case "Full Name":
        return isMk ? "Полно име" : "Full Name";
      case "Document Number":
        return isMk ? "Број на документ" : "Document Number";
      case "Secondary Number":
        return isMk ? "Секундарен број" : "Secondary Number";
      case "Personal ID / NIN":
        return isMk ? "Матичен број / NIN" : "Personal ID / NIN";
      case "Date of Birth":
        return isMk ? "Датум на раѓање" : "Date of Birth";
      case "Address":
        return isMk ? "Адреса" : "Address";
      case "Nationality":
        return isMk ? "Националност" : "Nationality";
      case "Sex":
        return isMk ? "Пол" : "Sex";
      case "Club Name":
        return isMk ? "Име на клуб" : "Club Name";
      case "Barcode Value":
        return isMk ? "Вредност на баркод" : "Barcode Value";
      case "Member ID Format":
        return isMk ? "Формат на ID" : "Member ID Format";
      case "Tier":
        return isMk ? "Ниво" : "Tier";
      case "Membership Number":
        return isMk ? "Број на членство" : "Membership Number";
      default:
        return label;
    }
  };

  const withTranslatedLabels = (fields: { label: string; value: string }[]) =>
    fields
      .map((field) => ({ ...field, label: tLabel(field.label) }))
      .filter((field) => field.value);

  if (card.category === "bank") {
    return withTranslatedLabels([
      { label: "Bank Name", value: card.bankName },
      { label: "Card Type", value: card.title },
      { label: "Cardholder Name", value: card.holderName },
      { label: "Card Number", value: card.cardNumber },
      { label: "Expiry Date", value: card.expiry ?? "" },
      { label: "CVC", value: card.cvc },
      { label: "Account Number", value: card.accountNumber },
    ]);
  }
  if (card.category === "personal") {
    return withTranslatedLabels([
      { label: "Type", value: card.title },
      { label: "Issuer", value: card.issuedBy },
      { label: "Full Name", value: card.name },
      { label: "Document Number", value: card.docNumber },
      { label: "Secondary Number", value: card.secondaryNumber },
      { label: "Personal ID / NIN", value: card.personalIdNumber ?? "" },
      { label: "Date of Birth", value: card.dateOfBirth ?? "" },
      { label: "Date of Issue", value: card.dateOfIssue ?? "" },
      { label: "Date of Expiry", value: card.dateOfExpiry ?? "" },
      { label: "Address", value: card.address ?? "" },
      { label: "Nationality", value: card.nationality ?? "" },
      { label: "Sex", value: card.sex ?? "" },
    ]);
  }
  if (card.category === "insurance") {
    return withTranslatedLabels([
      { label: "Type", value: card.title },
      { label: "Provider", value: card.provider },
      { label: "Member Name", value: card.memberName },
      { label: "Policy Number", value: card.policyNumber },
      { label: "Plan Name", value: card.planName ?? "" },
      { label: "Member ID", value: card.memberId ?? "" },
      { label: "Group Number", value: card.groupNumber ?? "" },
      { label: "Support Phone", value: card.phoneNumber ?? "" },
      { label: "Date of Issue", value: card.dateOfIssue ?? "" },
      { label: "Date of Expiry", value: card.dateOfExpiry ?? "" },
    ]);
  }
  if (card.category === "vehicle") {
    return withTranslatedLabels([
      { label: "Type", value: card.title },
      { label: "Authority", value: card.vehicleAuthority },
      { label: "Owner Name", value: card.ownerName },
      { label: "Registration Number", value: card.registrationNumber },
      { label: "Vehicle Model", value: card.model ?? "" },
      { label: "VIN / Chassis Number", value: card.vin ?? "" },
      { label: "Date of Issue", value: card.dateOfIssue ?? "" },
      { label: "Date of Expiry", value: card.dateOfExpiry ?? "" },
    ]);
  }
  if (card.category === "access") {
    return withTranslatedLabels([
      { label: "Type", value: card.title },
      { label: "Company", value: card.companyName },
      { label: "Badge Holder", value: card.employeeName },
      { label: "Employee ID", value: card.employeeId },
      { label: "Department", value: card.department ?? "" },
      { label: "Access Level", value: card.accessLevel ?? "" },
      { label: "Date of Issue", value: card.dateOfIssue ?? "" },
      { label: "Date of Expiry", value: card.dateOfExpiry ?? "" },
    ]);
  }
  return withTranslatedLabels([
    { label: "Club Name", value: card.clubName },
    { label: "Member Name", value: card.name },
    {
      label: card.memberIdFormat === "barcode" ? "Barcode Value" : "Member ID",
      value: card.memberId,
    },
    {
      label: "Member ID Format",
      value: card.memberIdFormat === "barcode" ? "Barcode" : "Typed ID",
    },
    { label: "Tier", value: card.tier },
    { label: "Membership Number", value: card.secondaryNumber ?? "" },
    { label: "Address", value: card.address ?? "" },
    { label: "Member Since", value: card.dateOfIssue ?? "" },
    { label: "Expiry Date", value: card.dateOfExpiry ?? "" },
  ]);
}

function buildShareMessage(
  card: WalletCard,
  fields: { label: string; value: string }[],
) {
  return [
    `${card.title}`,
    `Category: ${getCategoryLabel(card.category)}`,
    "",
    ...fields.map(({ label, value }) => `${label}: ${value}`),
  ].join("\n");
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#1D1D1D",
  },
  centeredError: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  errorText: {
    fontFamily: "ReadexPro-Regular",
    fontSize: 16,
    color: "rgba(255,255,255,0.5)",
  },
  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  headerBtn: {
    width: 40,
    alignItems: "center",
  },
  headerTitle: {
    fontFamily: "ReadexPro-Medium",
    fontSize: 17,
    color: "#FFFFFF",
  },
  // Scroll
  scrollContent: {
    paddingBottom: 48,
  },
  // Card flip area
  cardWrapper: {
    paddingTop: 8,
    paddingBottom: 28,
    paddingHorizontal: 20,
  },
  sideToggle: {
    flexDirection: "row",
    alignSelf: "center",
    borderRadius: 999,
    padding: 4,
    marginTop: 14,
    gap: 4,
  },
  sideToggleBtn: {
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  sideToggleText: {
    fontFamily: "ReadexPro-Regular",
    fontSize: 13,
  },
  previewWrap: {
    marginTop: 6,
  },
  cardContainer: {
    width: "100%",
    height: 225,
  },
  flipHint: {
    marginTop: 10,
    fontFamily: "ReadexPro-Regular",
    fontSize: 12,
    color: "rgba(255,255,255,0.3)",
    letterSpacing: 0.5,
  },
  // Fields
  fieldList: {
    marginHorizontal: 20,
    gap: 10,
  },
  shareBtn: {
    marginTop: 22,
    marginHorizontal: 20,
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  shareText: {
    fontFamily: "ReadexPro-Medium",
    fontSize: 15,
    color: "#FFFFFF",
  },
  shareSheetBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    padding: 16,
  },
  shareSheet: {
    borderRadius: 28,
    padding: 20,
    gap: 12,
  },
  shareSheetTitle: {
    fontFamily: "ReadexPro-Bold",
    fontSize: 24,
  },
  shareSheetBody: {
    fontFamily: "ReadexPro-Regular",
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 4,
  },
  shareOption: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  shareOptionTitle: {
    fontFamily: "ReadexPro-Bold",
    fontSize: 16,
  },
  shareOptionBody: {
    fontFamily: "ReadexPro-Regular",
    fontSize: 13,
    lineHeight: 20,
    marginTop: 4,
    maxWidth: 250,
  },
  shareCancel: {
    marginTop: 4,
    borderRadius: 22,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  shareCancelText: {
    fontFamily: "ReadexPro-Bold",
    fontSize: 15,
  },
  fieldRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 30,
    paddingHorizontal: 20,
    paddingVertical: 12,
    overflow: "hidden",
    gap: 12,
  },
  fieldText: {
    flex: 1,
  },
  fieldLabel: {
    fontFamily: "ReadexPro-Regular",
    fontSize: 10,
    color: "rgba(255,255,255,0.4)",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  fieldValue: {
    fontFamily: "ReadexPro-Regular",
    fontSize: 18,
    color: "#FFFFFF",
  },
  // Delete
  autoDeleteBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  autoDeleteBannerText: {
    fontFamily: "ReadexPro-Regular",
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 22,
    marginHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  deleteText: {
    fontFamily: "ReadexPro-Medium",
    fontSize: 15,
    color: "#FF4D4D",
  },
  // Toast
  toast: {
    position: "absolute",
    bottom: 52,
    alignSelf: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 30,
  },
  toastText: {
    fontFamily: "ReadexPro-Regular",
    fontSize: 14,
    color: "#FFFFFF",
  },
  captureStage: {
    position: "absolute",
    left: -9999,
    top: 0,
    opacity: 0.01,
  },
  captureCanvas: {
    width: 420,
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  captureTitle: {
    fontFamily: "ReadexPro-Bold",
    fontSize: 24,
    color: "#1D1D1D",
  },
  captureSubtitle: {
    marginTop: 4,
    marginBottom: 18,
    fontFamily: "ReadexPro-Regular",
    fontSize: 13,
    color: "rgba(29,29,29,0.62)",
  },
  captureCardBlock: {
    marginTop: 14,
  },
  captureSideLabel: {
    marginBottom: 8,
    fontFamily: "ReadexPro-Medium",
    fontSize: 12,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: "rgba(29,29,29,0.38)",
  },
  captureCardFrame: {
    width: 380,
  },
});
