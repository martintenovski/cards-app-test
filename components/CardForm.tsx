import { useMemo, useState } from 'react';
import { Feather } from '@expo/vector-icons';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { CardPreview } from '@/components/CardPreview';
import {
  CATEGORY_OPTIONS,
  DEFAULT_FORM_VALUES,
  TYPE_OPTIONS,
  createPreviewCard,
  getRandomPastelPalette,
  type CardPalette,
  type CardCategory,
  type CardFormValues,
} from '@/types/card';

type CardFormProps = {
  onSubmit: (values: CardFormValues, palette: CardPalette) => void;
  initialValues?: CardFormValues;
  initialPalette?: CardPalette;
  submitLabel?: string;
};

type FieldName = keyof CardFormValues;
type SelectOption = { label: string; value: string };
type FieldConfig = { key: FieldName; label: string; keyboardType: 'default' | 'number-pad' };

function getFormSections(values: CardFormValues): { front: FieldConfig[]; back: FieldConfig[] } {
  if (values.category === 'bank') {
    return {
      front: [
        { key: 'bankName', label: 'Bank name', keyboardType: 'default' },
        { key: 'holderName', label: 'Cardholder name', keyboardType: 'default' },
        { key: 'cardNumber', label: 'Card number', keyboardType: 'number-pad' },
      ],
      back: [
        { key: 'expiry', label: 'Expiry date', keyboardType: 'default' },
        { key: 'cvc', label: 'CVC', keyboardType: 'number-pad' },
        { key: 'accountNumber', label: 'Account number', keyboardType: 'default' },
      ],
    };
  }

  if (values.category === 'club') {
    return {
      front: [
        { key: 'clubName', label: 'Club name', keyboardType: 'default' },
        { key: 'nameOnCard', label: 'Member name', keyboardType: 'default' },
        { key: 'memberId', label: 'Member ID', keyboardType: 'default' },
        { key: 'tier', label: 'Tier / status', keyboardType: 'default' },
      ],
      back: [
        { key: 'secondaryNumber', label: 'Membership number', keyboardType: 'default' },
        { key: 'address', label: 'Address', keyboardType: 'default' },
        { key: 'dateOfIssue', label: 'Member since', keyboardType: 'default' },
        { key: 'dateOfExpiry', label: 'Expiry date', keyboardType: 'default' },
      ],
    };
  }

  if (values.type === 'Driving License') {
    return {
      front: [
        { key: 'issuer', label: 'Issued by', keyboardType: 'default' },
        { key: 'nameOnCard', label: 'Full name', keyboardType: 'default' },
        { key: 'cardNumber', label: 'License number', keyboardType: 'default' },
        { key: 'secondaryNumber', label: 'Class / restrictions', keyboardType: 'default' },
      ],
      back: [
        { key: 'address', label: 'Address', keyboardType: 'default' },
        { key: 'dateOfIssue', label: 'Date of issue', keyboardType: 'default' },
        { key: 'dateOfExpiry', label: 'Date of expiry', keyboardType: 'default' },
        { key: 'dateOfBirth', label: 'Date of birth', keyboardType: 'default' },
        { key: 'sex', label: 'Sex', keyboardType: 'default' },
      ],
    };
  }

  if (values.type === 'Passport') {
    return {
      front: [
        { key: 'issuer', label: 'Issued by', keyboardType: 'default' },
        { key: 'nameOnCard', label: 'Full name', keyboardType: 'default' },
        { key: 'cardNumber', label: 'Passport number', keyboardType: 'default' },
        { key: 'nationality', label: 'Nationality', keyboardType: 'default' },
      ],
      back: [
        { key: 'dateOfBirth', label: 'Date of birth', keyboardType: 'default' },
        { key: 'dateOfIssue', label: 'Date of issue', keyboardType: 'default' },
        { key: 'dateOfExpiry', label: 'Date of expiry', keyboardType: 'default' },
        { key: 'sex', label: 'Sex', keyboardType: 'default' },
      ],
    };
  }

  return {
    front: [
      { key: 'issuer', label: 'Issued by', keyboardType: 'default' },
      { key: 'nameOnCard', label: 'Full name', keyboardType: 'default' },
      { key: 'personalIdNumber', label: 'National ID number', keyboardType: 'default' },
      { key: 'cardNumber', label: 'Identity card number', keyboardType: 'default' },
    ],
    back: [
      { key: 'address', label: 'Address', keyboardType: 'default' },
      { key: 'dateOfIssue', label: 'Date of issue', keyboardType: 'default' },
      { key: 'dateOfExpiry', label: 'Date of expiry', keyboardType: 'default' },
      { key: 'dateOfBirth', label: 'Date of birth', keyboardType: 'default' },
      { key: 'nationality', label: 'Nationality', keyboardType: 'default' },
      { key: 'sex', label: 'Sex', keyboardType: 'default' },
    ],
  };
}

function validate(values: CardFormValues) {
  const errors: Partial<Record<FieldName, string>> = {};
  const required: FieldName[] =
    values.category === 'bank'
      ? ['type', 'bankName', 'holderName', 'cardNumber', 'expiry', 'cvc']
      : values.category === 'club'
        ? ['type', 'clubName', 'nameOnCard', 'memberId', 'tier']
        : values.type === 'Driving License'
          ? ['type', 'issuer', 'nameOnCard', 'cardNumber', 'address', 'dateOfExpiry']
          : values.type === 'Passport'
            ? ['type', 'issuer', 'nameOnCard', 'cardNumber', 'nationality', 'dateOfExpiry']
            : ['type', 'issuer', 'nameOnCard', 'personalIdNumber', 'cardNumber', 'dateOfExpiry'];
  required.forEach((f) => {
    if (!String(values[f] ?? '').trim()) errors[f] = 'Required';
  });
  return errors;
}

/** Inline pill-style text input — label above, value below */
function FormRow({
  label, value, onChange, keyboardType,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  keyboardType?: 'default' | 'number-pad';
}) {
  const filled = value.trim().length > 0;
  return (
    <View style={rowSt.pill}>
      <View style={rowSt.pillInner}>
        <Text style={rowSt.rowLabel}>{label.toUpperCase()}</Text>
        <TextInput
          style={rowSt.input}
          value={value}
          onChangeText={onChange}
          keyboardType={keyboardType}
          returnKeyType="done"
          placeholderTextColor="rgba(255,255,255,0.0)"
        />
      </View>
      {filled && <Feather name="check" size={18} color="rgba(255,255,255,0.7)" />}
    </View>
  );
}

/** Pill-style dropdown — tapping opens a bottom-sheet modal */
function SelectRow({
  label, value, options, onChange,
}: {
  label: string;
  value: string;
  options: SelectOption[];
  onChange: (v: string) => void;
}) {
  const [modalVisible, setModalVisible] = useState(false);
  const translateY = useSharedValue(400);
  const selectedLabel = options.find((o) => o.value === value)?.label ?? '';

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
      <Pressable style={rowSt.pill} onPress={openSheet} accessibilityRole="button">
        <View style={rowSt.pillInner}>
          <Text style={rowSt.rowLabel}>{label.toUpperCase()}</Text>
          <Text style={[rowSt.selectValue, !selectedLabel && rowSt.selectPlaceholder]}>
            {selectedLabel || 'Choose one'}
          </Text>
        </View>
        <Feather name="chevron-down" size={18} color="rgba(255,255,255,0.7)" />
      </Pressable>

      <Modal
        transparent
        visible={modalVisible}
        animationType="none"
        onRequestClose={closeSheet}
      >
        <Pressable style={sheetSt.backdrop} onPress={closeSheet} />
        <Animated.View style={[sheetSt.sheet, sheetAnim]}>
          {/* Handle bar */}
          <View style={sheetSt.handle} />
          {options.map((o) => {
            const active = o.value === value;
            return (
              <Pressable
                key={o.value}
                style={sheetSt.item}
                onPress={() => { onChange(o.value); closeSheet(); }}
                accessibilityRole="radio"
              >
                <Text style={[sheetSt.itemText, active && sheetSt.itemTextActive]}>
                  {o.label}
                </Text>
                {active && <Feather name="check" size={18} color="#FFFFFF" />}
              </Pressable>
            );
          })}
        </Animated.View>
      </Modal>
    </>
  );
}

export function CardForm({ onSubmit, initialValues, initialPalette, submitLabel }: CardFormProps) {
  const insets = useSafeAreaInsets();
  const [values, setValues] = useState<CardFormValues>(initialValues ?? DEFAULT_FORM_VALUES);
  const [errors, setErrors] = useState<Partial<Record<FieldName, string>>>({});
  const [previewPalette, setPreviewPalette] = useState<CardPalette>(() => initialPalette ?? getRandomPastelPalette());
  const [previewSide, setPreviewSide] = useState<'front' | 'back'>('front');

  const typeOptions = useMemo<SelectOption[]>(
    () => TYPE_OPTIONS[values.category].map((o) => ({ label: o, value: o })),
    [values.category]
  );
  const sections = useMemo(() => getFormSections(values), [values]);
  const previewCard = useMemo(
    () => createPreviewCard(values, previewPalette),
    [previewPalette, values]
  );

  const updateField = (field: FieldName, val: string) => {
    setValues((c) => ({ ...c, [field]: val }));
    setErrors((c) => ({ ...c, [field]: undefined }));
  };

  const handleCategoryChange = (cat: string) => {
    const next = cat as CardCategory;
    setValues((c) => ({
      ...DEFAULT_FORM_VALUES,
      category: next,
      type: '',
      nameOnCard: c.nameOnCard,
      holderName: c.holderName,
    }));
    setPreviewSide('front');
    setPreviewPalette((c) => getRandomPastelPalette([c.id]));
    setErrors({});
  };

  const handleSubmit = () => {
    const errs = validate(values);
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    onSubmit(values, previewPalette);
    // Do not reset state here — the screen unmounts after onSubmit navigates away
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      <ScrollView
        style={formSt.scroll}
        contentContainerStyle={formSt.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Category dropdown ─────────────────── */}
        <SelectRow
          label="Card category"
          value={values.category}
          options={CATEGORY_OPTIONS.map((o) => ({ label: o.label, value: o.value }))}
          onChange={handleCategoryChange}
        />

        {/* ── Type dropdown ─────────────────────── */}
        <SelectRow
          label="Card type"
          value={values.type}
          options={typeOptions}
          onChange={(v) => updateField('type', v)}
        />

        <Text style={formSt.sectionLabel}>Front details</Text>
        {sections.front.map((f) => {
          const key = f.key as FieldName;
          return (
            <FormRow
              key={f.key}
              label={f.label}
              value={String(values[key] ?? '')}
              onChange={(v) => updateField(key, v)}
              keyboardType={f.keyboardType}
            />
          );
        })}

        <Text style={formSt.sectionLabel}>Back details</Text>
        {sections.back.map((f) => {
          const key = f.key as FieldName;
          return (
            <FormRow
              key={f.key}
              label={f.label}
              value={String(values[key] ?? '')}
              onChange={(v) => updateField(key, v)}
              keyboardType={f.keyboardType}
            />
          );
        })}

        {/* ── Live card preview ─────────────────── */}
        <View style={formSt.sideToggle}>
          {(['front', 'back'] as const).map((side) => {
            const active = previewSide === side;
            return (
              <Pressable
                key={side}
                onPress={() => setPreviewSide(side)}
                style={[formSt.sideToggleBtn, active && formSt.sideToggleBtnActive]}
              >
                <Text style={[formSt.sideToggleText, active && formSt.sideToggleTextActive]}>
                  {side === 'front' ? 'Front' : 'Back'}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <View style={formSt.previewWrap}>
          <CardPreview previewSide={previewSide} card={previewCard} />
        </View>
      </ScrollView>

      {/* ── Submit — fixed at bottom ──────────── */}
      <View style={[formSt.submitContainer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <Pressable
          style={formSt.submitBtn}
          onPress={handleSubmit}
          accessibilityRole="button"
        >
          <Text style={formSt.submitText}>{submitLabel ?? 'Add Card'}</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const rowSt = StyleSheet.create({
  pill: {
    borderRadius: 30,
    backgroundColor: '#3E3E3E',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  pillInner: {
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
  selectPlaceholder: {
    color: 'rgba(255,255,255,0.3)',
  },
});

const sheetSt = StyleSheet.create({
  backdrop: {
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
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginBottom: 16,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderRadius: 14,
  },
  itemText: {
    fontFamily: 'ReadexPro-Regular',
    fontSize: 18,
    color: 'rgba(255,255,255,0.55)',
  },
  itemTextActive: {
    color: '#FFFFFF',
  },
});

const formSt = StyleSheet.create({
  scroll: { flex: 1 },
  content: { gap: 10, paddingBottom: 100, paddingHorizontal: 20 },
  sectionLabel: {
    marginTop: 10,
    marginBottom: 2,
    fontFamily: 'ReadexPro-Medium',
    fontSize: 14,
    color: '#FFFFFF',
  },
  sideToggle: {
    flexDirection: 'row',
    alignSelf: 'center',
    backgroundColor: '#2A2A2A',
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
  sideToggleBtnActive: {
    backgroundColor: '#EFEFEF',
  },
  sideToggleText: {
    fontFamily: 'ReadexPro-Regular',
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
  },
  sideToggleTextActive: {
    color: '#1D1D1D',
  },
  previewWrap: { marginTop: 6 },
  submitContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: '#1D1D1D',
  },
  submitBtn: {
    height: 55,
    borderRadius: 30,
    backgroundColor: '#EFEFEF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitText: {
    fontFamily: 'ReadexPro-Regular',
    fontSize: 20,
    color: '#1D1D1D',
  },
});
