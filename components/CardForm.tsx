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

function fieldLabels(category: CardCategory) {
  if (category === 'bank') {
    return [
      { key: 'bankName', label: 'Bank name', keyboardType: 'default' as const },
      { key: 'holderName', label: 'Holder name', keyboardType: 'default' as const },
      { key: 'cardNumber', label: 'Card number', keyboardType: 'number-pad' as const },
      { key: 'expiry', label: 'Expiry date', keyboardType: 'default' as const },
      { key: 'cvc', label: 'CVC number', keyboardType: 'number-pad' as const },
      { key: 'accountNumber', label: 'Account number', keyboardType: 'number-pad' as const },
    ];
  }
  if (category === 'club') {
    return [
      { key: 'clubName', label: 'Club name', keyboardType: 'default' as const },
      { key: 'nameOnCard', label: 'Member name', keyboardType: 'default' as const },
      { key: 'memberId', label: 'Member ID', keyboardType: 'default' as const },
      { key: 'tier', label: 'Membership tier', keyboardType: 'default' as const },
    ];
  }
  return [
    { key: 'issuer', label: 'Issued by', keyboardType: 'default' as const },
    { key: 'nameOnCard', label: 'Name on card', keyboardType: 'default' as const },
    { key: 'cardNumber', label: 'Card number', keyboardType: 'number-pad' as const },
    { key: 'secondaryNumber', label: 'Secondary number', keyboardType: 'default' as const },
  ];
}

function validate(values: CardFormValues) {
  const errors: Partial<Record<FieldName, string>> = {};
  const required: FieldName[] =
    values.category === 'bank'
      ? ['type', 'bankName', 'holderName', 'cardNumber', 'cvc', 'accountNumber']
      : values.category === 'club'
        ? ['type', 'clubName', 'nameOnCard', 'memberId', 'tier']
        : ['type', 'issuer', 'nameOnCard', 'cardNumber', 'secondaryNumber'];
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

  const typeOptions = useMemo<SelectOption[]>(
    () => TYPE_OPTIONS[values.category].map((o) => ({ label: o, value: o })),
    [values.category]
  );
  const previewCard = useMemo(
    () => createPreviewCard(values, previewPalette),
    [previewPalette, values]
  );
  const bankPreviewSide =
    values.category === 'bank' && (values.cvc.trim() || values.accountNumber.trim())
      ? 'back'
      : 'front';

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

        {/* ── Dynamic text fields ───────────────── */}
        {fieldLabels(values.category).map((f) => {
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
        <View style={formSt.previewWrap}>
          <CardPreview bankPreviewSide={bankPreviewSide} card={previewCard} />
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
