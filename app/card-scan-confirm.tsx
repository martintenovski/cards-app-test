import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

import { GRADIENTS } from '@/constants/gradients';
import { useCardStore } from '@/store/useCardStore';
import {
  DEFAULT_FORM_VALUES,
  getContrastColor,
  type CardCategory,
  type CardFormValues,
  type CardPalette,
} from '@/types/card';

type SelectOption = { label: string; value: CardCategory };

type ConfirmFormState = {
  category: CardCategory;
  issuerName: string;
  cardholderName: string;
  cardNumber: string;
  expiry: string;
  cvc: string;
  accountNumber: string;
};

const CATEGORY_OPTIONS: SelectOption[] = [
  { label: 'Bank Card', value: 'bank' },
  { label: 'Personal Doc', value: 'personal' },
  { label: 'Club Card', value: 'club' },
];

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

function categoryToFormValues(form: ConfirmFormState): CardFormValues {
  const normalizedCardNumber =
    form.category === 'bank'
      ? form.cardNumber.replace(/\D/g, '') || form.cardNumber.trim()
      : form.cardNumber.trim();

  if (form.category === 'personal') {
    return {
      ...DEFAULT_FORM_VALUES,
      category: 'personal',
      type: 'Identity Card',
      issuer: form.issuerName.trim(),
      nameOnCard: form.cardholderName.trim(),
      cardNumber: normalizedCardNumber,
      secondaryNumber: form.accountNumber.trim(),
    };
  }

  if (form.category === 'club') {
    return {
      ...DEFAULT_FORM_VALUES,
      category: 'club',
      type: 'Club Card',
      clubName: form.issuerName.trim(),
      nameOnCard: form.cardholderName.trim(),
      memberId: normalizedCardNumber,
      tier: form.accountNumber.trim(),
    };
  }

  return {
    ...DEFAULT_FORM_VALUES,
    category: 'bank',
    type: 'Debit Card',
    bankName: form.issuerName.trim(),
    holderName: form.cardholderName.trim(),
    nameOnCard: form.cardholderName.trim(),
    cardNumber: normalizedCardNumber,
    cvc: form.cvc.trim(),
    accountNumber: form.accountNumber.trim(),
  };
}

function previewLabel(category: CardCategory) {
  if (category === 'personal') return 'Personal Document';
  if (category === 'club') return 'Club Card';
  return 'Bank Card';
}

function issuerFieldLabel(category: CardCategory) {
  if (category === 'personal') return 'Issued by';
  if (category === 'club') return 'Club name';
  return 'Bank / issuer';
}

function accountFieldLabel(category: CardCategory) {
  if (category === 'personal') return 'Secondary number';
  if (category === 'club') return 'Membership tier';
  return 'Account number';
}

function InputRow({
  label,
  value,
  onChangeText,
  keyboardType = 'default',
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  keyboardType?: 'default' | 'number-pad';
}) {
  return (
    <View style={styles.pill}>
      <Text style={styles.rowLabel}>{label.toUpperCase()}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        style={styles.input}
        placeholderTextColor="rgba(255,255,255,0.25)"
      />
    </View>
  );
}

function SelectRow({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: CardCategory;
  options: SelectOption[];
  onChange: (value: CardCategory) => void;
}) {
  const [modalVisible, setModalVisible] = useState(false);
  const translateY = useSharedValue(400);
  const selectedLabel = options.find((option) => option.value === value)?.label ?? 'Choose one';

  const openSheet = () => {
    translateY.value = 400;
    setModalVisible(true);
    translateY.value = withTiming(0, { duration: 200 });
  };

  const closeSheet = () => {
    translateY.value = withTiming(400, { duration: 150 }, (done) => {
      if (done) runOnJS(setModalVisible)(false);
    });
  };

  const sheetAnim = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <>
      <Pressable style={styles.pill} onPress={openSheet} accessibilityRole="button">
        <View style={styles.selectContent}>
          <Text style={styles.rowLabel}>{label.toUpperCase()}</Text>
          <Text style={styles.selectValue}>{selectedLabel}</Text>
        </View>
        <Feather name="chevron-down" size={18} color="rgba(255,255,255,0.7)" />
      </Pressable>

      <Modal transparent visible={modalVisible} animationType="none" onRequestClose={closeSheet}>
        <Pressable style={styles.sheetBackdrop} onPress={closeSheet} />
        <Animated.View style={[styles.sheet, sheetAnim]}>
          <View style={styles.sheetHandle} />
          {options.map((option) => {
            const active = option.value === value;
            return (
              <Pressable
                key={option.value}
                style={styles.sheetItem}
                onPress={() => {
                  onChange(option.value);
                  closeSheet();
                }}
              >
                <Text style={[styles.sheetItemText, active && styles.sheetItemTextActive]}>
                  {option.label}
                </Text>
                {active ? <Feather name="check" size={18} color="#FFFFFF" /> : null}
              </Pressable>
            );
          })}
        </Animated.View>
      </Modal>
    </>
  );
}

function ScannerCardPreview({ form, palette }: { form: ConfirmFormState; palette: CardPalette }) {
  const numberText = form.cardNumber || '0000 0000 0000 0000';
  const holderText = form.cardholderName || 'CARDHOLDER NAME';
  const issuerText = form.issuerName || 'Issuer';
  const expiryText = form.expiry || 'MM/YY';

  return (
    <LinearGradient colors={palette.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.previewCard}>
      <View style={styles.previewTopRow}>
        <Text style={[styles.previewLabel, { color: palette.mutedText }]}>{previewLabel(form.category)}</Text>
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
  const addCard = useCardStore((state) => state.addCard);
  const params = useLocalSearchParams<{
    cardNumber?: string;
    expiry?: string;
    name?: string;
    bank?: string;
  }>();

  const [form, setForm] = useState<ConfirmFormState>({
    category: 'bank',
    issuerName: params.bank ?? '',
    cardholderName: params.name ?? '',
    cardNumber: params.cardNumber ?? '',
    expiry: params.expiry ?? '',
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

    setIsSaving(true);
    addCard(categoryToFormValues(form), palette);
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

          <SelectRow
            label="Card type"
            value={form.category}
            options={CATEGORY_OPTIONS}
            onChange={(value) => updateField('category', value)}
          />

          <InputRow
            label={issuerFieldLabel(form.category)}
            value={form.issuerName}
            onChangeText={(value) => updateField('issuerName', value)}
          />
          <InputRow
            label="Cardholder name"
            value={form.cardholderName}
            onChangeText={(value) => updateField('cardholderName', value)}
          />
          <InputRow
            label="Card number"
            value={form.cardNumber}
            onChangeText={(value) => updateField('cardNumber', value)}
          />
          <InputRow
            label="Expiry date"
            value={form.expiry}
            onChangeText={(value) => updateField('expiry', value)}
          />
          <InputRow
            label="CVC"
            value={form.cvc}
            onChangeText={(value) => updateField('cvc', value)}
            keyboardType="number-pad"
          />
          <InputRow
            label={accountFieldLabel(form.category)}
            value={form.accountNumber}
            onChangeText={(value) => updateField('accountNumber', value)}
            keyboardType={form.category === 'bank' ? 'number-pad' : 'default'}
          />
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
    borderRadius: 30,
    backgroundColor: '#3E3E3E',
    paddingHorizontal: 20,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectContent: {
    flex: 1,
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
    flex: 1,
    fontFamily: 'ReadexPro-Regular',
    fontSize: 18,
    color: '#FFFFFF',
    padding: 0,
  },
  selectValue: {
    fontFamily: 'ReadexPro-Regular',
    fontSize: 18,
    color: '#FFFFFF',
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
  sheetBackdrop: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  sheet: {
    backgroundColor: '#1D1D1D',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 10,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginBottom: 16,
  },
  sheetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderRadius: 14,
  },
  sheetItemText: {
    fontFamily: 'ReadexPro-Regular',
    fontSize: 18,
    color: 'rgba(255,255,255,0.55)',
  },
  sheetItemTextActive: {
    color: '#FFFFFF',
  },
});
