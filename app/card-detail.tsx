import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import ViewShot from 'react-native-view-shot';

import { CardItem } from '@/components/CardItem';
import { EditCardSheet } from '@/components/EditCardSheet';
import { useCardStore } from '@/store/useCardStore';
import { supportsCardBack, type WalletCard } from '@/types/card';
import { APP_THEME, CARD_SIDE_TOGGLE_THEME, resolveTheme } from '@/utils/theme';

export default function CardDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const cards = useCardStore((state) => state.cards);
  const deleteCard = useCardStore((state) => state.deleteCard);
  const themePreference = useCardStore((state) => state.themePreference);
  const deviceScheme = useColorScheme();
  const resolvedTheme = resolveTheme(themePreference, deviceScheme);
  const colors = APP_THEME[resolvedTheme];
  const sideToggleColors = CARD_SIDE_TOGGLE_THEME[resolvedTheme];

  const [toastMessage, setToastMessage] = useState('');
  const [toastVisible, setToastVisible] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);
  const [editSheetOpen, setEditSheetOpen] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const flipProgress = useSharedValue(0);
  const shareCaptureRef = useRef<ViewShot | null>(null);
  const currentSide = isFlipped ? 'back' : 'front';

  const frontStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 1200 },
      { rotateY: `${interpolate(flipProgress.value, [0, 1], [0, 180])}deg` },
    ],
    backfaceVisibility: 'hidden',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  }));

  const backStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 1200 },
      { rotateY: `${interpolate(flipProgress.value, [0, 1], [180, 360])}deg` },
    ],
    backfaceVisibility: 'hidden',
  }));

  const card = cards.find((c) => c.id === id);

  if (!card) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
        <View style={styles.centeredError}>
          <Text style={[styles.errorText, { color: colors.textMuted }]}>Card not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const canFlip = supportsCardBack(card);

  function setCardSide(side: 'front' | 'back') {
    if (!canFlip) return;
    const nextIsFlipped = side === 'back';
    setIsFlipped(nextIsFlipped);
    flipProgress.value = withTiming(nextIsFlipped ? 1 : 0, { duration: 400 });
  }

  function handleFlip() {
    if (!canFlip) return;
    setCardSide(isFlipped ? 'front' : 'back');
  }

  async function handleCopy(value: string, label: string) {
    if (!value) return;
    await Clipboard.setStringAsync(value);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setToastMessage(`${label} copied!`);
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 2000);
  }

  function handleDelete() {
    Alert.alert(
      'Delete Card',
      'This card will be permanently removed. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteCard(id!);
            router.back();
          },
        },
      ],
    );
  }

  async function handleShare() {
    if (isSharing) return;

    const cardToShare = card;

    if (!cardToShare) {
      return;
    }

    try {
      setIsSharing(true);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await new Promise((resolve) => setTimeout(resolve, 80));

      const imageUri = await shareCaptureRef.current?.capture?.();

      if (!imageUri) {
        throw new Error('Card capture failed');
      }

      await Share.share({
        title: `${cardToShare.title} details`,
        message: buildShareMessage(cardToShare, fields),
        url: imageUri,
      });
    } catch {
      Alert.alert(
        'Share unavailable',
        'We could not prepare this card for sharing right now. Please try again.',
      );
    } finally {
      setIsSharing(false);
    }
  }

  const fields = getCardFields(card);

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
      {/* ── Header ─────────────────────────────── */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.headerBtn}>
          <Feather name="arrow-left" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{card.title}</Text>
        <Pressable hitSlop={12} style={styles.headerBtn} onPress={() => setEditSheetOpen(true)}>
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
            <View style={[styles.sideToggle, { backgroundColor: sideToggleColors.containerBackground }] }>
              {(['front', 'back'] as const).map((side) => {
                const active = currentSide === side;
                return (
                  <Pressable
                    key={side}
                    onPress={() => setCardSide(side)}
                    style={[
                      styles.sideToggleBtn,
                      { backgroundColor: active ? sideToggleColors.activeBackground : 'transparent' },
                    ]}
                  >
                    <Text
                      style={[
                        styles.sideToggleText,
                        { color: active ? sideToggleColors.activeText : sideToggleColors.inactiveText },
                      ]}
                    >
                      {side === 'front' ? 'Front' : 'Back'}
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
                <CardItem card={card} side="front" size="full" />
              </Animated.View>
              <Animated.View style={backStyle}>
                <CardItem card={card} side="back" size="full" />
              </Animated.View>
            </Pressable>
            {canFlip && <Text style={[styles.flipHint, { color: colors.textSoft }]}>Tap card to flip</Text>}
          </View>
        </View>

        {/* ── Field list ─────────────────────── */}
        <View style={styles.fieldList}>
          {fields.map(({ label, value }) => (
            <Pressable
              key={label}
              style={[styles.fieldRow, { backgroundColor: colors.input, borderColor: colors.inputBorder }]}
              onPress={() => handleCopy(value, label)}
              android_ripple={{ color: colors.border, borderless: false }}
            >
              <View style={styles.fieldText}>
                <Text style={[styles.fieldLabel, { color: colors.textSoft }]}>{label}</Text>
                <Text style={[styles.fieldValue, { color: colors.text }]} numberOfLines={1}>
                  {value || '—'}
                </Text>
              </View>
              <Feather name="copy" size={16} color={colors.textSoft} />
            </Pressable>
          ))}
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Share card"
          disabled={isSharing}
          onPress={handleShare}
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
            {isSharing ? 'Preparing share…' : 'Share Card'}
          </Text>
        </Pressable>

        {/* ── Delete button ──────────────────── */}
        <Pressable onPress={handleDelete} style={[styles.deleteBtn, { borderColor: colors.danger }] }>
          <Feather name="trash-2" size={18} color={colors.danger} />
          <Text style={[styles.deleteText, { color: colors.danger }]}>Delete Card</Text>
        </Pressable>
      </ScrollView>

      {/* ── Toast ─────────────────────────────── */}
      {toastVisible && (
        <View style={[styles.toast, { backgroundColor: colors.surfaceStrong }]} pointerEvents="none">
          <Text style={[styles.toastText, { color: colors.text }]}>{toastMessage}</Text>
        </View>
      )}

      <View pointerEvents="none" style={styles.captureStage} collapsable={false}>
        <ViewShot
          ref={shareCaptureRef}
          options={{ format: 'jpg', quality: 0.95, result: 'tmpfile' }}
          style={[styles.captureCanvas, { backgroundColor: colors.surface }]}
        >
          <Text style={[styles.captureTitle, { color: colors.text }]}>{card.title}</Text>
          <Text style={[styles.captureSubtitle, { color: colors.textMuted }]}>
            Front and back card preview
          </Text>

          <View style={styles.captureCardBlock} collapsable={false}>
            <Text style={[styles.captureSideLabel, { color: colors.textSoft }]}>Front</Text>
            <View style={styles.captureCardFrame} collapsable={false}>
              <CardItem card={card} side="front" size="full" />
            </View>
          </View>

          {canFlip ? (
            <View style={styles.captureCardBlock} collapsable={false}>
              <Text style={[styles.captureSideLabel, { color: colors.textSoft }]}>Back</Text>
              <View style={styles.captureCardFrame} collapsable={false}>
                <CardItem card={card} side="back" size="full" />
              </View>
            </View>
          ) : null}
        </ViewShot>
      </View>

      {/* ── Edit sheet ────────────────────────── */}
      <EditCardSheet
        card={card}
        isOpen={editSheetOpen}
        onClose={() => setEditSheetOpen(false)}
      />
    </SafeAreaView>
  );
}

function getCardFields(card: WalletCard): { label: string; value: string }[] {
  if (card.category === 'bank') {
    return [
      { label: 'Bank Name', value: card.bankName },
      { label: 'Card Type', value: card.title },
      { label: 'Cardholder Name', value: card.holderName },
      { label: 'Card Number', value: card.cardNumber },
      { label: 'Expiry Date', value: card.expiry ?? '' },
      { label: 'CVC', value: card.cvc },
      { label: 'Account Number', value: card.accountNumber },
    ].filter((field) => field.value);
  }
  if (card.category === 'personal') {
    return [
      { label: 'Type', value: card.title },
      { label: 'Issuer', value: card.issuedBy },
      { label: 'Full Name', value: card.name },
      { label: 'Document Number', value: card.docNumber },
      { label: 'Secondary Number', value: card.secondaryNumber },
      { label: 'Personal ID / NIN', value: card.personalIdNumber ?? '' },
      { label: 'Date of Birth', value: card.dateOfBirth ?? '' },
      { label: 'Date of Issue', value: card.dateOfIssue ?? '' },
      { label: 'Date of Expiry', value: card.dateOfExpiry ?? '' },
      { label: 'Address', value: card.address ?? '' },
      { label: 'Nationality', value: card.nationality ?? '' },
      { label: 'Sex', value: card.sex ?? '' },
    ].filter((field) => field.value);
  }
  return [
    { label: 'Club Name', value: card.clubName },
    { label: 'Member Name', value: card.name },
    { label: card.memberIdFormat === 'barcode' ? 'Barcode Value' : 'Member ID', value: card.memberId },
    { label: 'Member ID Format', value: card.memberIdFormat === 'barcode' ? 'Barcode' : 'Typed ID' },
    { label: 'Tier', value: card.tier },
    { label: 'Membership Number', value: card.secondaryNumber ?? '' },
    { label: 'Address', value: card.address ?? '' },
    { label: 'Member Since', value: card.dateOfIssue ?? '' },
    { label: 'Expiry Date', value: card.dateOfExpiry ?? '' },
  ].filter((field) => field.value);
}

function buildShareMessage(card: WalletCard, fields: { label: string; value: string }[]) {
  return [
    `${card.title}`,
    `Category: ${getCategoryLabel(card.category)}`,
    '',
    ...fields.map(({ label, value }) => `${label}: ${value}`),
  ].join('\n');
}

function getCategoryLabel(category: WalletCard['category']) {
  if (category === 'bank') return 'Bank Card';
  if (category === 'personal') return 'Personal Document';
  return 'Club Card';
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#1D1D1D',
  },
  centeredError: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontFamily: 'ReadexPro-Regular',
    fontSize: 16,
    color: 'rgba(255,255,255,0.5)',
  },
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  headerBtn: {
    width: 40,
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: 'ReadexPro-Medium',
    fontSize: 17,
    color: '#FFFFFF',
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
    flexDirection: 'row',
    alignSelf: 'center',
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
    fontFamily: 'ReadexPro-Regular',
    fontSize: 13,
  },
  previewWrap: {
    marginTop: 6,
  },
  cardContainer: {
    width: '100%',
    height: 225,
  },
  flipHint: {
    marginTop: 10,
    fontFamily: 'ReadexPro-Regular',
    fontSize: 12,
    color: 'rgba(255,255,255,0.3)',
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  shareText: {
    fontFamily: 'ReadexPro-Medium',
    fontSize: 15,
    color: '#FFFFFF',
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 30,
    paddingHorizontal: 20,
    paddingVertical: 12,
    overflow: 'hidden',
    gap: 12,
  },
  fieldText: {
    flex: 1,
  },
  fieldLabel: {
    fontFamily: 'ReadexPro-Regular',
    fontSize: 10,
    color: 'rgba(255,255,255,0.4)',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  fieldValue: {
    fontFamily: 'ReadexPro-Regular',
    fontSize: 18,
    color: '#FFFFFF',
  },
  // Delete
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 32,
    marginHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  deleteText: {
    fontFamily: 'ReadexPro-Medium',
    fontSize: 15,
    color: '#FF4D4D',
  },
  // Toast
  toast: {
    position: 'absolute',
    bottom: 52,
    alignSelf: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 30,
  },
  toastText: {
    fontFamily: 'ReadexPro-Regular',
    fontSize: 14,
    color: '#FFFFFF',
  },
  captureStage: {
    position: 'absolute',
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
    fontFamily: 'ReadexPro-Bold',
    fontSize: 24,
    color: '#1D1D1D',
  },
  captureSubtitle: {
    marginTop: 4,
    marginBottom: 18,
    fontFamily: 'ReadexPro-Regular',
    fontSize: 13,
    color: 'rgba(29,29,29,0.62)',
  },
  captureCardBlock: {
    marginTop: 14,
  },
  captureSideLabel: {
    marginBottom: 8,
    fontFamily: 'ReadexPro-Medium',
    fontSize: 12,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: 'rgba(29,29,29,0.38)',
  },
  captureCardFrame: {
    width: 380,
  },
});
