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

import { GRADIENTS } from '@/constants/gradients';
import { useCardStore } from '@/store/useCardStore';
import {
  getContrastColor,
  maskCardNumber,
  type BankCard,
  type CardPalette,
  type PersonalDocCard,
  type WalletCard,
} from '@/types/card';
import type { ScannedCardData } from '@/utils/blinkidSetup';

type ConfirmFormState = {
  documentType: ScannedCardData['documentType'];
  fullName: string;
  documentNumber: string;
  personalIdNumber: string;
  dateOfBirth: string;
  dateOfExpiry: string;
  nationality: string;
  issuedBy: string;
  sex: string;
  cardNumber: string;
  cardExpiry: string;
  cardHolder: string;
  bankName: string;
  cvc: string;
  accountNumber: string;
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

function ScannerCardPreview({ form, palette }: { form: ConfirmFormState; palette: CardPalette }) {
  const isBankCard = form.documentType === 'bank_card';
  const numberText = isBankCard
    ? formatCardNumber(form.cardNumber || '0000 0000 0000 0000')
    : form.documentNumber || 'DOCUMENT NUMBER';
  const holderText = isBankCard
    ? form.cardHolder || 'CARDHOLDER NAME'
    : form.fullName || 'FULL NAME';
  const issuerText = isBankCard
    ? form.bankName || 'Bank Card'
    : humanizeDocumentType(form.documentType);
  const expiryText = isBankCard ? form.cardExpiry || 'MM/YY' : form.dateOfExpiry || '—';

  return (
    <LinearGradient
      colors={palette.gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.previewCard}
    >
      <View style={styles.previewTopRow}>
        <Text style={[styles.previewLabel, { color: palette.mutedText }]}>
          {humanizeDocumentType(form.documentType)}
        </Text>
        <Feather name="credit-card" size={18} color={palette.primaryText} />
      </View>
      <View style={styles.previewBody}>
        <Text style={[styles.previewIssuer, { color: palette.primaryText }]}>{issuerText}</Text>
        <Text style={[styles.previewNumber, { color: palette.primaryText }]}>{numberText}</Text>
      </View>
      <View style={styles.previewBottomRow}>
        <View>
          <Text style={[styles.previewMetaLabel, { color: palette.mutedText }]}>Cardholder</Text>
          <Text style={[styles.previewMetaValue, { color: palette.primaryText }]}>{holderText}</Text>
        </View>
        <View>
          <Text style={[styles.previewMetaLabel, { color: palette.mutedText }]}>Expiry</Text>
          <Text style={[styles.previewMetaValue, { color: palette.primaryText }]}>{expiryText}</Text>
        </View>
      </View>
    </LinearGradient>
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
    dateOfBirth: scannedData?.dateOfBirth ?? '',
    dateOfExpiry: scannedData?.dateOfExpiry ?? '',
    nationality: scannedData?.nationality ?? '',
    issuedBy: scannedData?.issuedBy ?? '',
    sex: scannedData?.sex ?? '',
    cardNumber: scannedData?.cardNumber ?? '',
    cardExpiry: scannedData?.cardExpiry ?? '',
    cardHolder: scannedData?.cardHolder ?? '',
    bankName: '',
    cvc: '',
    accountNumber: '',
  });
  const [toastMessage, setToastMessage] = useState('');
  const [toastVisible, setToastVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [gradient] = useState<[string, string]>(() => {
    return GRADIENTS[Math.floor(Math.random() * GRADIENTS.length)] as [string, string];
  });

  const palette = useMemo(() => createScanPalette(gradient), [gradient]);

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
          <ScannerCardPreview form={form} palette={palette} />

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
          ) : (
            <>
              <InputRow
                label="Document type"
                value={humanizeDocumentType(form.documentType)}
                onChangeText={() => undefined}
                editable={false}
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
              <InputRow
                label="Personal ID / NIN"
                value={form.personalIdNumber}
                onChangeText={(value) => updateField('personalIdNumber', value)}
              />
              <InputRow
                label="Date of birth"
                value={form.dateOfBirth}
                onChangeText={(value) => updateField('dateOfBirth', value)}
              />
              <InputRow
                label="Date of expiry"
                value={form.dateOfExpiry}
                onChangeText={(value) => updateField('dateOfExpiry', value)}
              />
              <InputRow
                label="Nationality"
                value={form.nationality}
                onChangeText={(value) => updateField('nationality', value)}
              />
              <InputRow
                label="Issued by"
                value={form.issuedBy}
                onChangeText={(value) => updateField('issuedBy', value)}
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
  previewCard: {
    width: '100%',
    aspectRatio: 1.586,
    borderRadius: 30,
    padding: 24,
    marginTop: 8,
    marginBottom: 6,
    justifyContent: 'space-between',
  },
  previewTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  previewLabel: {
    fontFamily: 'ReadexPro-Regular',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.9,
  },
  previewBody: {
    gap: 8,
  },
  previewIssuer: {
    fontFamily: 'ReadexPro-Medium',
    fontSize: 22,
  },
  previewNumber: {
    fontFamily: 'ReadexPro-Bold',
    fontSize: 24,
    letterSpacing: 1,
  },
  previewBottomRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 16,
  },
  previewMetaLabel: {
    fontFamily: 'ReadexPro-Regular',
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  previewMetaValue: {
    fontFamily: 'ReadexPro-Regular',
    fontSize: 16,
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

function createCardFromScan(form: ConfirmFormState, palette: CardPalette): WalletCard {
  return form.documentType === 'bank_card'
    ? createBankCard(form, palette)
    : createPersonalDocCard(form, palette);
}

function createBankCard(form: ConfirmFormState, palette: CardPalette): BankCard {
  const digits = form.cardNumber.replace(/\D/g, '');

  return {
    id: createCardId('bank'),
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
  palette: CardPalette
): PersonalDocCard {
  return {
    id: createCardId('personal'),
    category: 'personal',
    title: mapDocumentTitle(form.documentType),
    issuer: form.issuedBy.trim() || humanizeDocumentType(form.documentType),
    name: form.fullName.trim() || 'Full Name',
    primaryValue: form.documentNumber.trim() || 'Document Number',
    secondaryValue: form.personalIdNumber.trim() || undefined,
    palette,
    issuedBy: form.issuedBy.trim() || humanizeDocumentType(form.documentType),
    docNumber: form.documentNumber.trim(),
    secondaryNumber: form.personalIdNumber.trim(),
    personalIdNumber: form.personalIdNumber.trim() || undefined,
    dateOfBirth: form.dateOfBirth.trim() || undefined,
    dateOfExpiry: form.dateOfExpiry.trim() || undefined,
    nationality: form.nationality.trim() || undefined,
    sex: form.sex.trim() || undefined,
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

function createCardId(prefix: 'bank' | 'personal') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
