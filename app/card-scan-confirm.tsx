import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { CardItem } from '@/components/CardItem';
import { GRADIENTS } from '@/constants/gradients';
import { useCardStore } from '@/store/useCardStore';
import {
  getContrastColor,
  maskCardNumber,
  type BankCard,
  type CardPalette,
  type ClubCard,
  type PersonalDocCard,
  type WalletCard,
} from '@/types/card';
import type { ScannedCardData } from '@/utils/ocrScanner';

type ConfirmFormState = {
  documentType: ScannedCardData['documentType'];
  fullName: string;
  documentNumber: string;
  personalIdNumber: string;
  secondaryNumber: string;
  dateOfBirth: string;
  dateOfIssue: string;
  dateOfExpiry: string;
  nationality: string;
  issuedBy: string;
  sex: string;
  address: string;
  cardNumber: string;
  cardExpiry: string;
  cardHolder: string;
  bankName: string;
  cvc: string;
  accountNumber: string;
  clubName: string;
  memberId: string;
  tier: string;
};

function createScanPalette(gradient: [string, string]): CardPalette {
  const primaryText = getContrastColor(gradient[0]);
  return {
    id: `scan-${gradient[0].replace('#', '').toLowerCase()}`,
    background: gradient[0],
    mutedText: primaryText === '#1D1D1D' ? 'rgba(29,29,29,0.65)' : 'rgba(255,255,255,0.65)',
    primaryText,
    shadow: 'rgba(0,0,0,0.18)',
    gradient,
  };
}

function InputRow({
  label,
  value,
  onChangeText,
  keyboardType = 'default',
  editable = true,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  keyboardType?: 'default' | 'number-pad';
  editable?: boolean;
}) {
  return (
    <View style={styles.pill}>
      <Text style={styles.rowLabel}>{label.toUpperCase()}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        style={styles.input}
        editable={editable}
        placeholderTextColor="rgba(255,255,255,0.25)"
      />
    </View>
  );
}

export default function CardScanConfirmScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const prependCard = useCardStore((state) => state.prependCard);
  const params = useLocalSearchParams<{ payload?: string }>();

  const scannedData = useMemo(() => parsePayload(params.payload), [params.payload]);

  const [form, setForm] = useState<ConfirmFormState>({
    documentType: scannedData?.documentType ?? 'id',
    fullName: scannedData?.fullName ?? '',
    documentNumber: scannedData?.documentNumber ?? '',
    personalIdNumber: scannedData?.personalIdNumber ?? '',
    secondaryNumber: scannedData?.secondaryNumber ?? '',
    dateOfBirth: scannedData?.dateOfBirth ?? '',
    dateOfIssue: scannedData?.dateOfIssue ?? '',
    dateOfExpiry: scannedData?.dateOfExpiry ?? '',
    nationality: scannedData?.nationality ?? '',
    issuedBy: scannedData?.issuedBy ?? '',
    sex: scannedData?.sex ?? '',
    address: scannedData?.address ?? '',
    cardNumber: scannedData?.cardNumber ?? '',
    cardExpiry: scannedData?.cardExpiry ?? '',
    cardHolder: scannedData?.cardHolder ?? '',
    bankName: scannedData?.bankName ?? '',
    cvc: '',
    accountNumber: '',
    clubName: scannedData?.clubName ?? '',
    memberId: scannedData?.memberId ?? '',
    tier: scannedData?.tier ?? '',
  });
  const [toastMessage, setToastMessage] = useState('');
  const [toastVisible, setToastVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [previewSide, setPreviewSide] = useState<'front' | 'back'>('front');
  const [gradient] = useState<[string, string]>(() => {
    return GRADIENTS[Math.floor(Math.random() * GRADIENTS.length)] as [string, string];
  });

  const palette = useMemo(() => createScanPalette(gradient), [gradient]);
  const previewCard = useMemo(
    () => createCardFromScan(form, palette, 'preview'),
    [form, palette]
  );

  useEffect(() => {
    return () => {
      setToastVisible(false);
    };
  }, []);

  const updateField = <K extends keyof ConfirmFormState>(field: K, value: ConfirmFormState[K]) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSave = () => {
    if (isSaving) return;

    if (!scannedData) {
      Alert.alert('Missing scan data', 'Please scan your card again.');
      return;
    }

    setIsSaving(true);
    prependCard(createCardFromScan(form, palette));
    setToastMessage('Card saved successfully!');
    setToastVisible(true);

    setTimeout(() => {
      router.dismissTo('/');
    }, 850);
  };

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.headerBtn}>
          <Feather name="arrow-left" size={24} color="#FFFFFF" />
        </Pressable>
        <Text style={styles.headerTitle}>Confirm Card Info</Text>
        <View style={styles.headerBtn} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.previewToggleRow}>
            {(['front', 'back'] as const).map((side) => {
              const active = previewSide === side;
              return (
                <Pressable
                  key={side}
                  style={[styles.previewToggleBtn, active && styles.previewToggleBtnActive]}
                  onPress={() => setPreviewSide(side)}
                >
                  <Text style={[styles.previewToggleText, active && styles.previewToggleTextActive]}>
                    {side === 'front' ? 'Front' : 'Back'}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <View style={styles.previewCardWrap}>
            <CardItem card={previewCard} side={previewSide} size="full" />
          </View>

          <Text style={styles.sectionTitle}>Extracted Information</Text>

          {form.documentType === 'bank_card' ? (
            <>
              <InputRow
                label="Card number"
                value={form.cardNumber}
                onChangeText={(value) => updateField('cardNumber', value)}
              />
              <InputRow
                label="Expiry date"
                value={form.cardExpiry}
                onChangeText={(value) => updateField('cardExpiry', value)}
              />
              <InputRow
                label="Cardholder name"
                value={form.cardHolder}
                onChangeText={(value) => updateField('cardHolder', value)}
              />
              <InputRow
                label="Bank name"
                value={form.bankName}
                onChangeText={(value) => updateField('bankName', value)}
              />
              <InputRow
                label="CVC"
                value={form.cvc}
                onChangeText={(value) => updateField('cvc', value)}
                keyboardType="number-pad"
              />
              <InputRow
                label="Account number"
                value={form.accountNumber}
                onChangeText={(value) => updateField('accountNumber', value)}
              />
            </>
          ) : form.documentType === 'club_card' ? (
            <>
              <InputRow
                label="Club name"
                value={form.clubName}
                onChangeText={(value) => updateField('clubName', value)}
              />
              <InputRow
                label="Member name"
                value={form.fullName}
                onChangeText={(value) => updateField('fullName', value)}
              />
              <InputRow
                label="Member ID"
                value={form.memberId}
                onChangeText={(value) => updateField('memberId', value)}
              />
              <InputRow
                label="Tier / status"
                value={form.tier}
                onChangeText={(value) => updateField('tier', value)}
              />
              <InputRow
                label="Membership number"
                value={form.secondaryNumber}
                onChangeText={(value) => updateField('secondaryNumber', value)}
              />
              <InputRow
                label="Address"
                value={form.address}
                onChangeText={(value) => updateField('address', value)}
              />
              <InputRow
                label="Member since"
                value={form.dateOfIssue}
                onChangeText={(value) => updateField('dateOfIssue', value)}
              />
              <InputRow
                label="Expiry date"
                value={form.dateOfExpiry}
                onChangeText={(value) => updateField('dateOfExpiry', value)}
              />
            </>
          ) : (
            <>
              <InputRow
                label="Document type"
                value={humanizeDocumentType(form.documentType)}
                onChangeText={() => undefined}
                editable={false}
              />
              <InputRow
                label="Issued by"
                value={form.issuedBy}
                onChangeText={(value) => updateField('issuedBy', value)}
              />
              <InputRow
                label="Full name"
                value={form.fullName}
                onChangeText={(value) => updateField('fullName', value)}
              />
              <InputRow
                label="Document number"
                value={form.documentNumber}
                onChangeText={(value) => updateField('documentNumber', value)}
              />
              {form.documentType === 'id' ? (
                <InputRow
                  label="Personal ID / NIN"
                  value={form.personalIdNumber}
                  onChangeText={(value) => updateField('personalIdNumber', value)}
                />
              ) : null}
              {form.documentType === 'driving_license' ? (
                <InputRow
                  label="Class / restrictions"
                  value={form.secondaryNumber}
                  onChangeText={(value) => updateField('secondaryNumber', value)}
                />
              ) : null}
              {form.documentType === 'passport' ? (
                <InputRow
                  label="Nationality"
                  value={form.nationality}
                  onChangeText={(value) => updateField('nationality', value)}
                />
              ) : null}
              <InputRow
                label="Address"
                value={form.address}
                onChangeText={(value) => updateField('address', value)}
              />
              <InputRow
                label="Date of birth"
                value={form.dateOfBirth}
                onChangeText={(value) => updateField('dateOfBirth', value)}
              />
              <InputRow
                label="Date of issue"
                value={form.dateOfIssue}
                onChangeText={(value) => updateField('dateOfIssue', value)}
              />
              <InputRow
                label="Date of expiry"
                value={form.dateOfExpiry}
                onChangeText={(value) => updateField('dateOfExpiry', value)}
              />
              <InputRow
                label="Sex"
                value={form.sex}
                onChangeText={(value) => updateField('sex', value)}
              />
            </>
          )}
        </ScrollView>

        <View style={[styles.saveWrap, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <Pressable style={styles.saveButton} onPress={handleSave} disabled={isSaving}>
            <Text style={styles.saveButtonText}>{isSaving ? 'Saving…' : 'Save Card'}</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      {toastVisible ? (
        <View style={styles.toast} pointerEvents="none">
          <Text style={styles.toastText}>{toastMessage}</Text>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  root: {
    flex: 1,
    backgroundColor: '#1D1D1D',
  },
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
  content: {
    gap: 10,
    paddingHorizontal: 20,
    paddingBottom: 120,
  },
  sectionTitle: {
    marginTop: 6,
    marginBottom: 2,
    fontFamily: 'ReadexPro-Medium',
    fontSize: 16,
    color: '#FFFFFF',
  },
  previewToggleRow: {
    flexDirection: 'row',
    alignSelf: 'center',
    backgroundColor: '#2A2A2A',
    borderRadius: 999,
    padding: 4,
    gap: 4,
    marginTop: 8,
  },
  previewToggleBtn: {
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  previewToggleBtnActive: {
    backgroundColor: '#EFEFEF',
  },
  previewToggleText: {
    fontFamily: 'ReadexPro-Regular',
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
  },
  previewToggleTextActive: {
    color: '#1D1D1D',
  },
  previewCardWrap: {
    marginBottom: 6,
    marginTop: 14,
  },
  pill: {
    borderRadius: 24,
    backgroundColor: '#3E3E3E',
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  rowLabel: {
    fontFamily: 'ReadexPro-Regular',
    fontSize: 10,
    color: 'rgba(255,255,255,0.4)',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  input: {
    fontFamily: 'ReadexPro-Regular',
    fontSize: 17,
    color: '#FFFFFF',
    padding: 0,
  },
  saveWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: '#1D1D1D',
  },
  saveButton: {
    height: 55,
    borderRadius: 30,
    backgroundColor: '#EFEFEF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    fontFamily: 'ReadexPro-Regular',
    fontSize: 20,
    color: '#1D1D1D',
  },
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

function parsePayload(payload?: string | string[]): ScannedCardData | null {
  const rawPayload = Array.isArray(payload) ? payload[0] : payload;

  if (!rawPayload) {
    return null;
  }

  try {
    return JSON.parse(rawPayload) as ScannedCardData;
  } catch {
    return null;
  }
}

function humanizeDocumentType(type: ScannedCardData['documentType']) {
  switch (type) {
    case 'passport':
      return 'Passport';
    case 'driving_license':
      return 'Driving License';
    case 'bank_card':
      return 'Bank Card';
    case 'club_card':
      return 'Club Card';
    default:
      return 'ID';
  }
}

function formatCardNumber(value: string) {
  const digits = value.replace(/\D/g, '');
  if (!digits) {
    return value;
  }
  return digits.match(/.{1,4}/g)?.join(' ') ?? digits;
}

function createCardFromScan(
  form: ConfirmFormState,
  palette: CardPalette,
  mode: 'save' | 'preview' = 'save'
): WalletCard {
  if (form.documentType === 'bank_card') {
    return createBankCard(form, palette, mode);
  }

  if (form.documentType === 'club_card') {
    return createClubCard(form, palette, mode);
  }

  return createPersonalDocCard(form, palette, mode);
}

function createBankCard(
  form: ConfirmFormState,
  palette: CardPalette,
  mode: 'save' | 'preview'
): BankCard {
  const digits = form.cardNumber.replace(/\D/g, '');

  return {
    id: createCardId('bank', mode),
    category: 'bank',
    title: 'Debit Card',
    issuer: form.bankName.trim() || 'Bank Card',
    name: form.cardHolder.trim() || 'Cardholder Name',
    primaryValue: maskCardNumber(digits || form.cardNumber.trim()),
    palette,
    bankName: form.bankName.trim() || 'Bank Card',
    holderName: form.cardHolder.trim() || 'Cardholder Name',
    cardNumber: digits || form.cardNumber.trim(),
    maskedCardNumber: maskCardNumber(digits || form.cardNumber.trim()),
    expiry: form.cardExpiry.trim(),
    cvc: form.cvc.trim(),
    accountNumber: form.accountNumber.trim(),
    brand: inferBankBrand(digits),
  };
}

function createPersonalDocCard(
  form: ConfirmFormState,
  palette: CardPalette,
  mode: 'save' | 'preview'
): PersonalDocCard {
  return {
    id: createCardId('personal', mode),
    category: 'personal',
    title: mapDocumentTitle(form.documentType),
    issuer: form.issuedBy.trim() || humanizeDocumentType(form.documentType),
    name: form.fullName.trim() || 'Full Name',
    primaryValue: form.personalIdNumber.trim() || form.documentNumber.trim() || 'Document Number',
    secondaryValue: form.documentNumber.trim() || form.secondaryNumber.trim() || undefined,
    palette,
    issuedBy: form.issuedBy.trim() || humanizeDocumentType(form.documentType),
    docNumber: form.documentNumber.trim(),
    secondaryNumber: form.secondaryNumber.trim(),
    personalIdNumber: form.personalIdNumber.trim() || undefined,
    dateOfBirth: form.dateOfBirth.trim() || undefined,
    dateOfIssue: form.dateOfIssue.trim() || undefined,
    dateOfExpiry: form.dateOfExpiry.trim() || undefined,
    nationality: form.nationality.trim() || undefined,
    sex: form.sex.trim() || undefined,
    address: form.address.trim() || undefined,
  };
}

function createClubCard(
  form: ConfirmFormState,
  palette: CardPalette,
  mode: 'save' | 'preview'
): ClubCard {
  return {
    id: createCardId('club', mode),
    category: 'club',
    title: 'Club Card',
    issuer: form.clubName.trim() || 'Club Card',
    name: form.fullName.trim() || 'Member Name',
    primaryValue: form.memberId.trim() || 'Member ID',
    secondaryValue: form.tier.trim() || undefined,
    palette,
    clubName: form.clubName.trim() || 'Club Card',
    memberId: form.memberId.trim() || 'Member ID',
    tier: form.tier.trim() || 'Standard',
    secondaryNumber: form.secondaryNumber.trim() || undefined,
    dateOfIssue: form.dateOfIssue.trim() || undefined,
    dateOfExpiry: form.dateOfExpiry.trim() || undefined,
    address: form.address.trim() || undefined,
  };
}

function mapDocumentTitle(
  type: ScannedCardData['documentType']
): PersonalDocCard['title'] {
  switch (type) {
    case 'passport':
      return 'Passport';
    case 'driving_license':
      return 'Driving License';
    default:
      return 'Identity Card';
  }
}

function inferBankBrand(cardNumber: string): BankCard['brand'] {
  if (/^(5[1-5]|2[2-7])/.test(cardNumber)) {
    return 'mastercard';
  }

  return 'visa';
}

function createCardId(prefix: 'bank' | 'personal' | 'club', mode: 'save' | 'preview') {
  if (mode === 'preview') {
    return `preview-${prefix}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
