import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
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

import { CardItem } from '@/components/CardItem';
import { EditCardSheet } from '@/components/EditCardSheet';
import { useCardStore } from '@/store/useCardStore';
import { supportsCardBack, type WalletCard } from '@/types/card';

export default function CardDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const cards = useCardStore((state) => state.cards);
  const deleteCard = useCardStore((state) => state.deleteCard);

  const [toastMessage, setToastMessage] = useState('');
  const [toastVisible, setToastVisible] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);
  const [editSheetOpen, setEditSheetOpen] = useState(false);
  const flipProgress = useSharedValue(0);

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
      <SafeAreaView style={styles.root}>
        <View style={styles.centeredError}>
          <Text style={styles.errorText}>Card not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const canFlip = supportsCardBack(card);

  function handleFlip() {
    if (!canFlip) return;
    const next = !isFlipped;
    setIsFlipped(next);
    flipProgress.value = withTiming(next ? 1 : 0, { duration: 400 });
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

  const fields = getCardFields(card);

  return (
    <SafeAreaView style={styles.root}>
      {/* ── Header ─────────────────────────────── */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.headerBtn}>
          <Feather name="arrow-left" size={24} color="#FFFFFF" />
        </Pressable>
        <Text style={styles.headerTitle}>{card.title}</Text>
        <Pressable hitSlop={12} style={styles.headerBtn} onPress={() => setEditSheetOpen(true)}>
          <Feather name="edit-2" size={20} color="#FFFFFF" />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Card visual with flip ───────────── */}
        <View style={styles.cardWrapper}>
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
          {canFlip && <Text style={styles.flipHint}>Tap card to flip</Text>}
        </View>

        {/* ── Field list ─────────────────────── */}
        <View style={styles.fieldList}>
          {fields.map(({ label, value }) => (
            <Pressable
              key={label}
              style={styles.fieldRow}
              onPress={() => handleCopy(value, label)}
              android_ripple={{ color: 'rgba(255,255,255,0.08)', borderless: false }}
            >
              <View style={styles.fieldText}>
                <Text style={styles.fieldLabel}>{label}</Text>
                <Text style={styles.fieldValue} numberOfLines={1}>
                  {value || '—'}
                </Text>
              </View>
              <Feather name="copy" size={16} color="rgba(255,255,255,0.35)" />
            </Pressable>
          ))}
        </View>

        {/* ── Delete button ──────────────────── */}
        <Pressable onPress={handleDelete} style={styles.deleteBtn}>
          <Feather name="trash-2" size={18} color="#FF4D4D" />
          <Text style={styles.deleteText}>Delete Card</Text>
        </Pressable>
      </ScrollView>

      {/* ── Toast ─────────────────────────────── */}
      {toastVisible && (
        <View style={styles.toast} pointerEvents="none">
          <Text style={styles.toastText}>{toastMessage}</Text>
        </View>
      )}

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
      { label: 'Document Type', value: card.title },
      { label: 'Issued By', value: card.issuedBy },
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
    { label: 'Member ID', value: card.memberId },
    { label: 'Tier', value: card.tier },
    { label: 'Membership Number', value: card.secondaryNumber ?? '' },
    { label: 'Address', value: card.address ?? '' },
    { label: 'Member Since', value: card.dateOfIssue ?? '' },
    { label: 'Expiry Date', value: card.dateOfExpiry ?? '' },
  ].filter((field) => field.value);
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
  cardContainer: {
    width: '100%',
    height: 225,
  },
  flipHint: {
    marginTop: 14,
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
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3E3E3E',
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
    borderColor: 'rgba(255,77,77,0.25)',
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
});
