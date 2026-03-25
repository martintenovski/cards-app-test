import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Alert,
  Dimensions,
  InputAccessoryView,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
  NativeModules,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TurboModuleRegistry,
  UIManager,
  View,
  useColorScheme,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import DateTimePicker, {
  DateTimePickerAndroid,
} from "@react-native-community/datetimepicker";

import { CardPreview } from "@/components/CardPreview";
import { GRADIENTS } from "@/constants/gradients";
import { useCardStore } from "@/store/useCardStore";
import {
  CATEGORY_OPTIONS,
  type ClubMemberIdFormat,
  DEFAULT_FORM_VALUES,
  TYPE_OPTIONS,
  createPreviewCard,
  getContrastColor,
  getRandomPastelPalette,
  type CardPalette,
  type CardCategory,
  type CardFormValues,
} from "@/types/card";
import { APP_THEME, CARD_SIDE_TOGGLE_THEME, resolveTheme } from "@/utils/theme";
import {
  buildPaletteFromGradient,
  deriveGradient,
  hslToHex,
} from "@/utils/colorUtils";
import type { ResolvedTheme } from "@/utils/theme";

const HUE_SPECTRUM = [
  "#FF0000",
  "#FF8000",
  "#FFFF00",
  "#00FF00",
  "#00FFFF",
  "#0000FF",
  "#FF00FF",
  "#FF0000",
] as const;

function pickPresetGradients(count = 4): [string, string][] {
  const pool = [...GRADIENTS] as [string, string][];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count);
}

type CardFormProps = {
  onSubmit: (values: CardFormValues, palette: CardPalette) => void;
  initialValues?: CardFormValues;
  initialPalette?: CardPalette;
  submitLabel?: string;
  contentHorizontalPadding?: number;
  forcedTheme?: ResolvedTheme;
  topAccessory?: ReactNode;
  onScrollOffsetChange?: (offsetY: number) => void;
};

type FieldName = keyof CardFormValues;
type SelectOption = { label: string; value: string };
type FieldKind =
  | "text"
  | "bank-card"
  | "date"
  | "expiry"
  | "cvc"
  | "doc-code"
  | "nationality"
  | "select"
  | "phone";
type FieldConfig = {
  key: FieldName;
  label: string;
  keyboardType?: "default" | "number-pad" | "phone-pad";
  kind?: FieldKind;
  helperText: string;
  options?: SelectOption[];
};
type ThemeColors = (typeof APP_THEME)[keyof typeof APP_THEME];

function hasNativeDatePicker() {
  if (Platform.OS === "android") {
    const turboModule =
      typeof TurboModuleRegistry?.get === "function"
        ? TurboModuleRegistry.get("RNCDatePicker")
        : null;

    return Boolean(
      turboModule ||
      NativeModules?.RNCDatePicker ||
      DateTimePickerAndroid?.open,
    );
  }

  const hasViewManager =
    typeof UIManager?.getViewManagerConfig === "function"
      ? UIManager.getViewManagerConfig("RNDateTimePicker")
      : null;

  return Boolean(hasViewManager || NativeModules?.RNDateTimePicker);
}

function getFormSections(values: CardFormValues): {
  front: FieldConfig[];
  back: FieldConfig[];
} {
  if (values.category === "bank") {
    return {
      front: [
        {
          key: "type",
          label: "Card type",
          kind: "select",
          helperText: "Required. Choose Debit Card or Credit Card.",
          options: TYPE_OPTIONS.bank.map((value) => ({ label: value, value })),
        },
        {
          key: "bankName",
          label: "Bank name",
          helperText: "Issuing bank or card program name as shown on the card.",
        },
        {
          key: "holderName",
          label: "Cardholder name",
          helperText: "Enter the holder name exactly as printed on the card.",
        },
        {
          key: "cardNumber",
          label: "Card number",
          kind: "bank-card",
          keyboardType: "number-pad",
          helperText:
            "Primary account number. 12–19 digits, grouped automatically as ####-####-####-####.",
        },
      ],
      back: [
        {
          key: "expiry",
          label: "Expiry date",
          kind: "expiry",
          helperText: "Pick the card expiry month and year.",
        },
        {
          key: "cvc",
          label: "CVC",
          kind: "cvc",
          keyboardType: "number-pad",
          helperText:
            "Security code. Usually 3 digits, 4 for AmEx-style cards.",
        },
        {
          key: "accountNumber",
          label: "Account number",
          keyboardType: "number-pad",
          helperText: "Optional linked account number. Digits only.",
        },
      ],
    };
  }

  if (values.category === "club") {
    return {
      front: [
        {
          key: "type",
          label: "Card type",
          kind: "select",
          helperText: "Required. Choose the membership card style.",
          options: TYPE_OPTIONS.club.map((value) => ({ label: value, value })),
        },
        {
          key: "clubName",
          label: "Club name",
          helperText: "Organisation or program name shown on the card.",
        },
        {
          key: "nameOnCard",
          label: "Member name",
          helperText: "Member or guest name printed on the card.",
        },
        {
          key: "tier",
          label: "Tier / status",
          helperText: "Optional. Example: Gold, Elite or Premium.",
        },
      ],
      back: [
        {
          key: "memberIdFormat",
          label: "Member ID format",
          kind: "select",
          helperText:
            "Choose whether the card shows a typed member ID or a generated barcode on the back.",
          options: [
            { label: "Typed Member ID", value: "text" },
            { label: "Barcode", value: "barcode" },
          ],
        },
        {
          key: "memberId",
          label:
            values.memberIdFormat === "barcode"
              ? "Barcode digits"
              : "Member ID",
          kind: "doc-code",
          keyboardType:
            values.memberIdFormat === "barcode" ? "number-pad" : "default",
          helperText:
            values.memberIdFormat === "barcode"
              ? "Numbers only. These digits will be used to generate the barcode shown on the back."
              : "Use letters, digits, hyphens or slashes exactly as issued.",
        },
        {
          key: "secondaryNumber",
          label: "Membership number",
          kind: "doc-code",
          helperText: "Optional internal membership/reference number.",
        },
        {
          key: "address",
          label: "Address",
          helperText: "Postal or venue address if the card shows one.",
        },
        {
          key: "dateOfIssue",
          label: "Member since",
          kind: "date",
          helperText: "Pick the issue or enrollment date.",
        },
        {
          key: "dateOfExpiry",
          label: "Expiry date",
          kind: "date",
          helperText: "Pick the membership expiration date if applicable.",
        },
      ],
    };
  }

  if (values.category === "insurance") {
    return {
      front: [
        {
          key: "type",
          label: "Insurance type",
          kind: "select",
          helperText:
            "Required. Choose the insurance card format you are saving.",
          options: TYPE_OPTIONS.insurance.map((value) => ({
            label: value,
            value,
          })),
        },
        {
          key: "provider",
          label: "Provider",
          helperText: "Insurance company or plan administrator name.",
        },
        {
          key: "nameOnCard",
          label: "Member name",
          helperText: "Enter the member name exactly as printed on the card.",
        },
        {
          key: "policyNumber",
          label: "Policy number",
          kind: "doc-code",
          helperText:
            "Policy, certificate or coverage number shown on the card.",
        },
        {
          key: "planName",
          label: "Plan name",
          helperText: "Optional plan name such as Basic, Plus or Premium.",
        },
      ],
      back: [
        {
          key: "memberId",
          label: "Member ID",
          kind: "doc-code",
          helperText: "Subscriber or member identifier if the card shows one.",
        },
        {
          key: "groupNumber",
          label: "Group number",
          kind: "doc-code",
          helperText: "Employer or plan group number if applicable.",
        },
        {
          key: "phoneNumber",
          label: "Support phone",
          kind: "phone",
          keyboardType: "phone-pad",
          helperText:
            "Customer support or assistance phone number on the card.",
        },
        {
          key: "dateOfIssue",
          label: "Issue date",
          kind: "date",
          helperText: "Pick the effective or issue date if the card shows one.",
        },
        {
          key: "dateOfExpiry",
          label: "Expiry date",
          kind: "date",
          helperText:
            "Pick the expiration date if coverage or the card expires.",
        },
      ],
    };
  }

  if (values.category === "vehicle") {
    return {
      front: [
        {
          key: "type",
          label: "Document type",
          kind: "select",
          helperText: "Required. Choose the vehicle document style.",
          options: TYPE_OPTIONS.vehicle.map((value) => ({
            label: value,
            value,
          })),
        },
        {
          key: "vehicleAuthority",
          label: "Authority",
          helperText: "Agency, insurer or roadside assistance provider name.",
        },
        {
          key: "nameOnCard",
          label: "Owner name",
          helperText: "Owner or policyholder name shown on the document.",
        },
        {
          key: "registrationNumber",
          label: "Registration number",
          kind: "doc-code",
          helperText: "Plate or registration identifier.",
        },
        {
          key: "model",
          label: "Vehicle model",
          helperText: "Optional make or model shown on the document.",
        },
      ],
      back: [
        {
          key: "vin",
          label: "VIN / chassis number",
          kind: "doc-code",
          helperText: "Vehicle identification number or chassis code.",
        },
        {
          key: "dateOfIssue",
          label: "Issue date",
          kind: "date",
          helperText: "Pick the date the document was issued.",
        },
        {
          key: "dateOfExpiry",
          label: "Expiry date",
          kind: "date",
          helperText: "Pick the validity end date on the document.",
        },
      ],
    };
  }

  if (values.category === "access") {
    return {
      front: [
        {
          key: "type",
          label: "Badge type",
          kind: "select",
          helperText: "Required. Choose the badge or access card style.",
          options: TYPE_OPTIONS.access.map((value) => ({
            label: value,
            value,
          })),
        },
        {
          key: "companyName",
          label: "Company",
          helperText: "Employer, host or office name.",
        },
        {
          key: "nameOnCard",
          label: "Badge holder",
          helperText: "Name printed on the badge.",
        },
        {
          key: "employeeId",
          label: "Employee ID",
          kind: "doc-code",
          helperText: "Badge number, employee number or visitor code.",
        },
        {
          key: "department",
          label: "Department",
          helperText: "Optional team, division or host department.",
        },
      ],
      back: [
        {
          key: "accessLevel",
          label: "Access level",
          helperText: "Examples: Full access, Floor 12, Contractor, Visitor.",
        },
        {
          key: "dateOfIssue",
          label: "Issue date",
          kind: "date",
          helperText: "Pick the activation or issue date.",
        },
        {
          key: "dateOfExpiry",
          label: "Expiry date",
          kind: "date",
          helperText: "Pick the badge expiration date if one exists.",
        },
      ],
    };
  }

  if (values.type === "Driving License") {
    return {
      front: [
        {
          key: "type",
          label: "Type",
          kind: "select",
          helperText:
            "Required. Choose the document type shown on the card. This controls the top Type label on the design.",
          options: TYPE_OPTIONS.personal.map((value) => ({
            label: value,
            value,
          })),
        },
        {
          key: "issuer",
          label: "Issuer",
          helperText: "Issuing DMV, ministry or licensing authority.",
        },
        {
          key: "nameOnCard",
          label: "Full name",
          helperText: "Use the legal name printed on the licence.",
        },
        {
          key: "cardNumber",
          label: "License number",
          kind: "doc-code",
          helperText:
            "Licence number is usually alphanumeric and jurisdiction-specific.",
        },
        {
          key: "secondaryNumber",
          label: "Class / restrictions",
          kind: "doc-code",
          helperText:
            "Use the class, endorsements or restrictions exactly as shown.",
        },
      ],
      back: [
        {
          key: "address",
          label: "Address",
          helperText: "Residential address printed on the licence.",
        },
        {
          key: "dateOfIssue",
          label: "Date of issue",
          kind: "date",
          helperText: "Pick the issue date from the document.",
        },
        {
          key: "dateOfExpiry",
          label: "Date of expiry",
          kind: "date",
          helperText: "Pick the expiry date from the document.",
        },
        {
          key: "dateOfBirth",
          label: "Date of birth",
          kind: "date",
          helperText: "Pick the holder birth date.",
        },
        {
          key: "sex",
          label: "Sex",
          kind: "select",
          helperText: "Use the marker printed on the document: M, F or X.",
          options: [
            { label: "M", value: "M" },
            { label: "F", value: "F" },
            { label: "X", value: "X" },
          ],
        },
      ],
    };
  }

  if (values.type === "Passport") {
    return {
      front: [
        {
          key: "type",
          label: "Type",
          kind: "select",
          helperText:
            "Required. Choose the document type shown on the card. This controls the top Type label on the design.",
          options: TYPE_OPTIONS.personal.map((value) => ({
            label: value,
            value,
          })),
        },
        {
          key: "issuer",
          label: "Issuer",
          helperText: "Passport office, ministry or issuing state authority.",
        },
        {
          key: "nameOnCard",
          label: "Full name",
          helperText: "Use the passport holder name exactly as printed.",
        },
        {
          key: "cardNumber",
          label: "Passport number",
          kind: "doc-code",
          helperText:
            "Passport numbers are alphanumeric and should be entered exactly.",
        },
        {
          key: "nationality",
          label: "Nationality",
          kind: "nationality",
          helperText:
            "Use the 2–3 letter nationality code when shown, e.g. MKD or USA.",
        },
      ],
      back: [
        {
          key: "dateOfBirth",
          label: "Date of birth",
          kind: "date",
          helperText: "Pick the holder birth date.",
        },
        {
          key: "dateOfIssue",
          label: "Date of issue",
          kind: "date",
          helperText: "Pick the issue date from the passport.",
        },
        {
          key: "dateOfExpiry",
          label: "Date of expiry",
          kind: "date",
          helperText: "Pick the expiry date from the passport.",
        },
        {
          key: "sex",
          label: "Sex",
          kind: "select",
          helperText: "Use the passport sex marker: M, F or X.",
          options: [
            { label: "M", value: "M" },
            { label: "F", value: "F" },
            { label: "X", value: "X" },
          ],
        },
      ],
    };
  }

  return {
    front: [
      {
        key: "type",
        label: "Type",
        kind: "select",
        helperText:
          "Required. Choose the document type shown on the card. This controls the top Type label on the design.",
        options: TYPE_OPTIONS.personal.map((value) => ({
          label: value,
          value,
        })),
      },
      {
        key: "issuer",
        label: "Issuer",
        helperText: "Issuing authority or ministry shown on the ID card.",
      },
      {
        key: "nameOnCard",
        label: "Full name",
        helperText: "Use the legal name exactly as printed on the card.",
      },
      {
        key: "personalIdNumber",
        label: "National ID number",
        kind: "doc-code",
        helperText:
          "National personal number or NIN as printed on the document.",
      },
      {
        key: "cardNumber",
        label: "Identity card number",
        kind: "doc-code",
        helperText:
          "Physical document number, usually letters/numbers and separators.",
      },
    ],
    back: [
      {
        key: "address",
        label: "Address",
        helperText: "Residential address printed on the card.",
      },
      {
        key: "dateOfIssue",
        label: "Date of issue",
        kind: "date",
        helperText: "Pick the issue date from the document.",
      },
      {
        key: "dateOfExpiry",
        label: "Date of expiry",
        kind: "date",
        helperText: "Pick the expiry date from the document.",
      },
      {
        key: "dateOfBirth",
        label: "Date of birth",
        kind: "date",
        helperText: "Pick the holder birth date.",
      },
      {
        key: "nationality",
        label: "Nationality",
        kind: "nationality",
        helperText: "Use a 2–3 letter nationality code, e.g. MKD or USA.",
      },
      {
        key: "sex",
        label: "Sex",
        kind: "select",
        helperText: "Use the document sex marker: M, F or X.",
        options: [
          { label: "M", value: "M" },
          { label: "F", value: "F" },
          { label: "X", value: "X" },
        ],
      },
    ],
  };
}

function getRequiredFields(values: CardFormValues): FieldName[] {
  return values.category === "bank"
    ? ["type", "bankName", "holderName", "cardNumber", "expiry", "cvc"]
    : values.category === "club"
      ? ["type", "clubName", "nameOnCard", "memberId"]
      : values.category === "insurance"
        ? ["type", "provider", "nameOnCard", "policyNumber"]
        : values.category === "vehicle"
          ? [
              "type",
              "vehicleAuthority",
              "nameOnCard",
              "registrationNumber",
              "dateOfExpiry",
            ]
          : values.category === "access"
            ? ["type", "companyName", "nameOnCard", "employeeId"]
            : values.type === "Driving License"
              ? [
                  "type",
                  "issuer",
                  "nameOnCard",
                  "cardNumber",
                  "address",
                  "dateOfIssue",
                  "dateOfExpiry",
                ]
              : values.type === "Passport"
                ? [
                    "type",
                    "issuer",
                    "nameOnCard",
                    "cardNumber",
                    "nationality",
                    "dateOfIssue",
                    "dateOfExpiry",
                  ]
                : [
                    "type",
                    "issuer",
                    "nameOnCard",
                    "personalIdNumber",
                    "cardNumber",
                    "dateOfIssue",
                    "dateOfExpiry",
                  ];
}

function validateField(
  field: FieldName,
  values: CardFormValues,
): string | undefined {
  const value = String(values[field] ?? "").trim();
  const requiredFields = getRequiredFields(values);

  if (requiredFields.includes(field) && !value) {
    return "This field is required.";
  }

  if (!value) {
    return undefined;
  }

  switch (field) {
    case "holderName":
    case "nameOnCard":
      return /^[-A-ZÀ-ÿ'.,\s]{2,}$/i.test(value)
        ? undefined
        : "Use letters, spaces and standard punctuation only.";
    case "bankName":
    case "clubName":
    case "issuer":
    case "tier":
    case "provider":
    case "vehicleAuthority":
    case "companyName":
    case "planName":
    case "department":
    case "accessLevel":
      return value.length >= 2
        ? undefined
        : "Please enter at least 2 characters.";
    case "cardNumber": {
      if (values.category === "bank") {
        const digits = value.replace(/\D/g, "");
        if (digits.length < 12 || digits.length > 19)
          return "Card numbers should contain 12 to 19 digits.";
        return passesLuhnCheck(digits)
          ? undefined
          : "Card number checksum looks invalid.";
      }
      return /^[A-Z0-9\-\/ ]{4,24}$/i.test(value)
        ? undefined
        : "Use 4–24 letters, digits, hyphens, slashes or spaces.";
    }
    case "memberId":
      if (values.category === "club" && values.memberIdFormat === "barcode") {
        return /^\d{6,18}$/.test(value)
          ? undefined
          : "Barcode mode needs 6 to 18 digits.";
      }
      return /^[A-Z0-9\-\/ ]{3,24}$/i.test(value)
        ? undefined
        : "Use letters, digits, hyphens, slashes or spaces only.";
    case "policyNumber":
    case "groupNumber":
    case "registrationNumber":
    case "employeeId":
    case "personalIdNumber":
    case "secondaryNumber":
    case "vin":
      return /^[A-Z0-9\-\/ ]{3,24}$/i.test(value)
        ? undefined
        : "Use letters, digits, hyphens, slashes or spaces only.";
    case "cvc":
      return /^\d{3,4}$/.test(value)
        ? undefined
        : "CVC should contain 3 or 4 digits.";
    case "accountNumber":
      return /^\d{6,20}$/.test(value) ? undefined : "Use 6–20 digits.";
    case "dateOfBirth":
    case "dateOfIssue":
    case "dateOfExpiry":
      return isValidDisplayDate(value)
        ? undefined
        : "Please pick a valid date.";
    case "expiry":
      return isValidExpiry(value)
        ? undefined
        : "Please pick a valid expiry date.";
    case "nationality":
      return /^[A-Z]{2,3}$/.test(value)
        ? undefined
        : "Use a 2–3 letter country code, e.g. USA or MKD.";
    case "sex":
      return /^(M|F|X)$/.test(value.toUpperCase())
        ? undefined
        : "Use M, F or X.";
    case "phoneNumber":
      return /^[0-9+()\-\s]{6,20}$/.test(value)
        ? undefined
        : "Use a valid phone number format.";
    case "address":
      return value.length >= 6 ? undefined : "Please enter a fuller address.";
    case "type":
      return value ? undefined : "Please choose a card or document type.";
    default:
      return undefined;
  }
}

function validate(values: CardFormValues) {
  const errors: Partial<Record<FieldName, string>> = {};
  (Object.keys(values) as FieldName[]).forEach((field) => {
    const error = validateField(field, values);
    if (error) errors[field] = error;
  });
  return errors;
}

function formatFieldValue(
  field: FieldName,
  value: string,
  values: CardFormValues,
) {
  switch (field) {
    case "cardNumber":
      return values.category === "bank"
        ? formatBankCardInput(value)
        : sanitizeDocumentCode(value);
    case "cvc":
      return value.replace(/\D/g, "").slice(0, 4);
    case "policyNumber":
    case "groupNumber":
    case "registrationNumber":
    case "vin":
    case "employeeId":
    case "personalIdNumber":
    case "secondaryNumber":
      return sanitizeDocumentCode(value);
    case "accountNumber":
      return value.replace(/\D/g, "").slice(0, 20);
    case "memberId":
      if (values.category === "club" && values.memberIdFormat === "barcode") {
        return value.replace(/\D/g, "").slice(0, 18);
      }
      return sanitizeDocumentCode(value);
    case "nationality":
      return value
        .replace(/[^a-z]/gi, "")
        .toUpperCase()
        .slice(0, 3);
    case "phoneNumber":
      return value.replace(/[^0-9+()\-\s]/g, "").slice(0, 20);
    case "dateOfBirth":
    case "dateOfIssue":
    case "dateOfExpiry":
      return formatLooseDisplayDate(value);
    case "expiry":
      return formatLooseExpiry(value);
    default:
      return value;
  }
}

function passesLuhnCheck(digits: string) {
  let sum = 0;
  let shouldDouble = false;
  for (let index = digits.length - 1; index >= 0; index -= 1) {
    let digit = Number(digits[index]);
    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    shouldDouble = !shouldDouble;
  }
  return sum % 10 === 0;
}

function formatBankCardInput(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 19);
  return digits.match(/.{1,4}/g)?.join("-") ?? digits;
}

function sanitizeDocumentCode(value: string) {
  return value
    .toUpperCase()
    .replace(/[^A-Z0-9\-\/ ]/g, "")
    .slice(0, 34);
}

function formatDisplayDate(date: Date) {
  const day = `${date.getDate()}`.padStart(2, "0");
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const year = date.getFullYear();
  return `${day}.${month}.${year}`;
}

function formatExpiryDate(date: Date) {
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const year = `${date.getFullYear()}`.slice(-2);
  return `${month}.${year}`;
}

function parseDisplayDate(value: string, kind: "date" | "expiry") {
  if (!value) return new Date();

  if (kind === "expiry") {
    const match = value.match(/^(\d{2})\.(\d{2})$/);
    if (!match) return new Date();
    return new Date(Number(`20${match[2]}`), Number(match[1]) - 1, 1);
  }

  const match = value.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (!match) return new Date();
  return new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]));
}

function isValidDisplayDate(value: string) {
  return /^\d{2}\.\d{2}\.\d{4}$/.test(value);
}

function isValidExpiry(value: string) {
  const match = value.match(/^(\d{2})\.(\d{2})$/);
  if (!match) return false;
  const month = Number(match[1]);
  return month >= 1 && month <= 12;
}

function formatLooseDisplayDate(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 4)}.${digits.slice(4)}`;
}

function formatLooseExpiry(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}.${digits.slice(2)}`;
}

function FieldLabel({
  label,
  required,
  colors,
}: {
  label: string;
  required?: boolean;
  colors: ThemeColors;
}) {
  return (
    <View style={fieldSt.rowLabelWrap}>
      <Text style={[fieldSt.rowLabel, { color: colors.textSoft }]}>
        {label.toUpperCase()}
      </Text>
      {required ? (
        <Text style={[fieldSt.requiredMark, { color: colors.danger }]}>*</Text>
      ) : null}
    </View>
  );
}

function FieldHelper({
  error,
  helperText,
  valid,
  colors,
}: {
  error?: string;
  helperText: string;
  valid: boolean;
  colors: ThemeColors;
}) {
  return (
    <View style={fieldSt.helperRow}>
      <Text
        style={[
          fieldSt.helperText,
          { color: error ? colors.danger : colors.textSoft },
        ]}
      >
        {error || helperText}
      </Text>
      {valid ? (
        <Feather name="check-circle" size={16} color={colors.success} />
      ) : null}
    </View>
  );
}

function FormRow({
  label,
  value,
  onChange,
  onFocus,
  onSubmitEditing,
  keyboardType,
  returnKeyType,
  inputAccessoryViewID,
  inputRef,
  colors,
  error,
  helperText,
  valid,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onFocus?: () => void;
  onSubmitEditing?: () => void;
  keyboardType?: "default" | "number-pad" | "phone-pad";
  returnKeyType?: "done" | "next";
  inputAccessoryViewID?: string;
  inputRef?: (input: TextInput | null) => void;
  colors: ThemeColors;
  error?: string;
  helperText: string;
  valid: boolean;
  required?: boolean;
}) {
  return (
    <View style={fieldSt.wrapper}>
      <View
        style={[
          fieldSt.pill,
          {
            backgroundColor: colors.input,
            borderColor: error
              ? colors.danger
              : valid
                ? colors.success
                : colors.inputBorder,
          },
        ]}
      >
        <View style={fieldSt.pillInner}>
          <FieldLabel label={label} required={required} colors={colors} />
          <TextInput
            ref={inputRef}
            style={[fieldSt.input, { color: colors.text }]}
            value={value}
            onChangeText={onChange}
            onFocus={onFocus}
            keyboardType={keyboardType}
            returnKeyType={returnKeyType ?? "done"}
            blurOnSubmit={false}
            onSubmitEditing={onSubmitEditing}
            inputAccessoryViewID={inputAccessoryViewID}
            placeholderTextColor={colors.textSoft}
          />
        </View>
      </View>
      <FieldHelper
        error={error}
        helperText={helperText}
        valid={valid}
        colors={colors}
      />
    </View>
  );
}

function SelectRow({
  label,
  value,
  options,
  onChange,
  colors,
  error,
  helperText,
  valid,
  required,
}: {
  label: string;
  value: string;
  options: SelectOption[];
  onChange: (v: string) => void;
  colors: ThemeColors;
  error?: string;
  helperText: string;
  valid: boolean;
  required?: boolean;
}) {
  const [modalVisible, setModalVisible] = useState(false);
  const translateY = useSharedValue(400);
  const selectedLabel = options.find((o) => o.value === value)?.label ?? "";

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
    <View style={fieldSt.wrapper}>
      <Pressable
        style={[
          fieldSt.pill,
          {
            backgroundColor: colors.input,
            borderColor: error
              ? colors.danger
              : valid
                ? colors.success
                : colors.inputBorder,
          },
        ]}
        onPress={openSheet}
        accessibilityRole="button"
      >
        <View style={fieldSt.pillInner}>
          <FieldLabel label={label} required={required} colors={colors} />
          <Text
            style={[
              fieldSt.selectValue,
              { color: selectedLabel ? colors.text : colors.textSoft },
            ]}
          >
            {selectedLabel || "Choose one"}
          </Text>
        </View>
        <Feather name="chevron-down" size={18} color={colors.textMuted} />
      </Pressable>

      <FieldHelper
        error={error}
        helperText={helperText}
        valid={valid}
        colors={colors}
      />

      <Modal
        transparent
        visible={modalVisible}
        animationType="none"
        onRequestClose={closeSheet}
      >
        <Pressable style={sheetSt.backdrop} onPress={closeSheet} />
        <Animated.View
          style={[
            sheetSt.sheet,
            sheetAnim,
            { backgroundColor: colors.surface },
          ]}
        >
          <View
            style={[sheetSt.handle, { backgroundColor: colors.textSoft }]}
          />
          {options.map((option) => {
            const active = option.value === value;
            return (
              <Pressable
                key={option.value}
                style={sheetSt.item}
                onPress={() => {
                  onChange(option.value);
                  closeSheet();
                }}
                accessibilityRole="radio"
              >
                <Text
                  style={[
                    sheetSt.itemText,
                    { color: active ? colors.text : colors.textMuted },
                  ]}
                >
                  {option.label}
                </Text>
                {active ? (
                  <Feather name="check" size={18} color={colors.text} />
                ) : null}
              </Pressable>
            );
          })}
        </Animated.View>
      </Modal>
    </View>
  );
}

function DateRow({
  label,
  value,
  kind,
  onChange,
  onFocus,
  onSubmitEditing,
  returnKeyType,
  inputAccessoryViewID,
  inputRef,
  colors,
  error,
  helperText,
  valid,
  required,
}: {
  label: string;
  value: string;
  kind: "date" | "expiry";
  onChange: (v: string) => void;
  onFocus?: () => void;
  onSubmitEditing?: () => void;
  returnKeyType?: "done" | "next";
  inputAccessoryViewID?: string;
  inputRef?: (input: TextInput | null) => void;
  colors: ThemeColors;
  error?: string;
  helperText: string;
  valid: boolean;
  required?: boolean;
}) {
  const [iosPickerVisible, setIosPickerVisible] = useState(false);
  const [iosDate, setIosDate] = useState<Date>(() =>
    parseDisplayDate(value, kind),
  );

  const openPicker = () => {
    const initialValue = parseDisplayDate(value, kind);

    if (!hasNativeDatePicker()) {
      Alert.alert(
        "Date picker unavailable",
        `This ${Platform.OS === "ios" ? "iOS" : "Android"} build does not include the native date picker yet. You can still type the date manually for now.`,
      );
      return;
    }

    if (Platform.OS === "android") {
      if (!DateTimePickerAndroid?.open) {
        Alert.alert(
          "Date picker unavailable",
          "This Android build does not expose the native date picker yet. You can still type the date manually for now.",
        );
        return;
      }

      DateTimePickerAndroid.open({
        value: initialValue,
        mode: "date",
        is24Hour: true,
        onChange: (_event, selectedDate) => {
          if (!selectedDate) return;
          onChange(
            kind === "expiry"
              ? formatExpiryDate(selectedDate)
              : formatDisplayDate(selectedDate),
          );
        },
      });
      return;
    }

    setIosDate(initialValue);
    setIosPickerVisible(true);
  };

  return (
    <View style={fieldSt.wrapper}>
      <Pressable
        style={[
          fieldSt.pill,
          {
            backgroundColor: colors.input,
            borderColor: error
              ? colors.danger
              : valid
                ? colors.success
                : colors.inputBorder,
          },
        ]}
      >
        <View style={fieldSt.pillInner}>
          <FieldLabel label={label} required={required} colors={colors} />
          <TextInput
            ref={inputRef}
            style={[fieldSt.input, { color: colors.text }]}
            value={value}
            onChangeText={onChange}
            onFocus={onFocus}
            keyboardType="number-pad"
            returnKeyType={returnKeyType ?? "done"}
            blurOnSubmit={false}
            onSubmitEditing={onSubmitEditing}
            inputAccessoryViewID={inputAccessoryViewID}
            placeholder={kind === "expiry" ? "MM.YY" : "DD.MM.YYYY"}
            placeholderTextColor={colors.textSoft}
            maxLength={kind === "expiry" ? 5 : 10}
          />
        </View>
        <Pressable onPress={openPicker} hitSlop={10} style={fieldSt.iconButton}>
          <Feather name="calendar" size={18} color={colors.textMuted} />
        </Pressable>
      </Pressable>

      <FieldHelper
        error={error}
        helperText={helperText}
        valid={valid}
        colors={colors}
      />

      {Platform.OS !== "android" && iosPickerVisible ? (
        <Modal
          transparent
          visible={iosPickerVisible}
          animationType="fade"
          onRequestClose={() => setIosPickerVisible(false)}
        >
          <View style={[iosSt.backdrop, { backgroundColor: colors.overlay }]}>
            <View
              style={[iosSt.modalCard, { backgroundColor: colors.surface }]}
            >
              <Text style={[iosSt.modalTitle, { color: colors.text }]}>
                {label}
              </Text>
              <DateTimePicker
                value={iosDate}
                mode="date"
                display="spinner"
                onChange={(_event: unknown, selectedDate?: Date) => {
                  if (selectedDate) setIosDate(selectedDate);
                }}
              />
              <View style={iosSt.actions}>
                <Pressable
                  onPress={() => {
                    setIosPickerVisible(false);
                  }}
                  style={iosSt.actionBtn}
                >
                  <Text style={[iosSt.actionText, { color: colors.textMuted }]}>
                    Cancel
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    onChange(
                      kind === "expiry"
                        ? formatExpiryDate(iosDate)
                        : formatDisplayDate(iosDate),
                    );
                    setIosPickerVisible(false);
                  }}
                  style={iosSt.actionBtn}
                >
                  <Text style={[iosSt.actionText, { color: colors.text }]}>
                    Confirm
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      ) : null}
    </View>
  );
}

// Estimate initial bar width from screen so the thumb position is stable
// before onLayout fires (modal card: paddingH 24 + modal paddingH 24, both sides = 96)
const INITIAL_BAR_WIDTH = Math.max(200, Dimensions.get("window").width - 96);

function CardColorPicker({
  presets,
  selectedGradient,
  onSelectGradient,
  colors,
}: {
  presets: [string, string][];
  selectedGradient: [string, string] | null;
  onSelectGradient: (gradient: [string, string]) => void;
  colors: ThemeColors;
}) {
  const [customOpen, setCustomOpen] = useState(false);
  const [huePercent, setHuePercent] = useState(0.5);
  // Use a ref for barWidth so layout updates don't trigger a full re-render
  // and cause the thumb to jump position. Re-render only when huePercent changes.
  const barWidthRef = useRef(INITIAL_BAR_WIDTH);
  const [barWidthReady, setBarWidthReady] = useState(false);

  const barWidth = barWidthRef.current;
  const customHue = huePercent * 360;
  const customHex = hslToHex(customHue, 0.78, 0.55);
  const customGradient = deriveGradient(customHex);
  const thumbLeft = huePercent * Math.max(0, barWidth - 28);

  const isPresetSelected = (grad: [string, string]) =>
    selectedGradient?.[0] === grad[0] && selectedGradient?.[1] === grad[1];
  const isCustomSelected =
    selectedGradient !== null && !presets.some(isPresetSelected);

  const updateHue = (locationX: number) => {
    setHuePercent(Math.max(0, Math.min(1, locationX / Math.max(1, barWidth))));
  };

  return (
    <View style={cpSt.wrap}>
      <Text style={[cpSt.sectionLabel, { color: colors.textSoft }]}>
        CARD COLOR
      </Text>

      <View style={cpSt.row}>
        {presets.map((grad) => {
          const isSelected = isPresetSelected(grad);
          const textColor = getContrastColor(grad[0]);
          // Use gradient colors as key so identity is stable even if array order shifts
          return (
            <Pressable
              key={`${grad[0]}-${grad[1]}`}
              onPress={() => onSelectGradient(grad)}
              style={[
                cpSt.swatchRing,
                {
                  backgroundColor: isSelected ? colors.text : "transparent",
                },
              ]}
              accessibilityRole="radio"
              accessibilityState={{ checked: isSelected }}
            >
              <LinearGradient
                colors={[grad[0], grad[1]]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={cpSt.swatchGradient}
              >
                {isSelected ? (
                  <View style={cpSt.checkBadge}>
                    <Feather name="check" size={13} color={textColor} />
                  </View>
                ) : null}
              </LinearGradient>
            </Pressable>
          );
        })}

        {/*
         * Custom color button.
         * IMPORTANT: we always keep TWO LinearGradients mounted and toggle
         * visibility via opacity — never conditionally swap children.
         * Swapping children forces React Native to destroy/recreate the native
         * view, which briefly shows both (the "two buttons" / flash bug).
         */}
        <Pressable
          onPress={() => setCustomOpen(true)}
          style={[
            cpSt.swatchRing,
            {
              backgroundColor: isCustomSelected ? colors.text : "transparent",
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Pick a custom color"
        >
          {/* Base layer: hue spectrum, always visible underneath */}
          <LinearGradient
            colors={HUE_SPECTRUM}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[cpSt.swatchGradient, StyleSheet.absoluteFill]}
          />
          {/* Overlay layer: selected custom gradient, fades over the spectrum */}
          <LinearGradient
            colors={
              isCustomSelected && selectedGradient
                ? selectedGradient
                : (["transparent", "transparent"] as const)
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[cpSt.swatchGradient, StyleSheet.absoluteFill]}
          />
          {/* Icon: always rendered, centered over both gradient layers */}
          <View style={cpSt.centeredBadge}>
            <View style={isCustomSelected ? cpSt.checkBadge : cpSt.plusBadge}>
              <Feather
                name={isCustomSelected ? "edit-2" : "plus"}
                size={isCustomSelected ? 11 : 14}
                color={
                  isCustomSelected && selectedGradient
                    ? getContrastColor(selectedGradient[0])
                    : "#FFFFFF"
                }
              />
            </View>
          </View>
        </Pressable>
      </View>

      {/* Custom color picker modal */}
      <Modal
        transparent
        visible={customOpen}
        animationType="fade"
        onRequestClose={() => setCustomOpen(false)}
      >
        <View style={[cpSt.modalOverlay, { backgroundColor: colors.overlay }]}>
          <View style={[cpSt.pickerCard, { backgroundColor: colors.surface }]}>
            <Text style={[cpSt.pickerTitle, { color: colors.text }]}>
              Pick a color
            </Text>

            {/* Live gradient preview */}
            <LinearGradient
              colors={customGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={cpSt.gradientPreview}
            />

            {/* Hue spectrum bar */}
            <View
              style={cpSt.hueBarOuter}
              onLayout={(e) => {
                const w = e.nativeEvent.layout.width;
                if (w > 0 && w !== barWidthRef.current) {
                  barWidthRef.current = w;
                  // Only trigger a re-render once to lock in the real width
                  if (!barWidthReady) setBarWidthReady(true);
                }
              }}
              onStartShouldSetResponder={() => true}
              onMoveShouldSetResponder={() => true}
              onResponderGrant={(e) => updateHue(e.nativeEvent.locationX)}
              onResponderMove={(e) => updateHue(e.nativeEvent.locationX)}
            >
              <LinearGradient
                colors={HUE_SPECTRUM}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={[StyleSheet.absoluteFill, { borderRadius: 18 }]}
              />
              <View style={[cpSt.hueThumb, { left: thumbLeft }]} />
            </View>

            <View style={cpSt.pickerActions}>
              <Pressable
                onPress={() => setCustomOpen(false)}
                style={cpSt.cancelBtn}
              >
                <Text style={[cpSt.cancelText, { color: colors.textMuted }]}>
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  onSelectGradient(customGradient);
                  setCustomOpen(false);
                }}
                style={[cpSt.applyBtn, { backgroundColor: colors.accent }]}
              >
                <Text style={[cpSt.applyText, { color: colors.accentText }]}>
                  Apply
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

export function CardForm({
  onSubmit,
  initialValues,
  initialPalette,
  submitLabel,
  contentHorizontalPadding = 20,
  forcedTheme,
  topAccessory,
  onScrollOffsetChange,
}: CardFormProps) {
  const keyboardAccessoryId = "card-form-keyboard-accessory";
  const insets = useSafeAreaInsets();
  const deviceScheme = useColorScheme();
  const themePreference = useCardStore((state) => state.themePreference);
  const resolvedTheme =
    forcedTheme ?? resolveTheme(themePreference, deviceScheme);
  const colors = APP_THEME[resolvedTheme];
  const sideToggleColors = CARD_SIDE_TOGGLE_THEME[resolvedTheme];
  const [values, setValues] = useState<CardFormValues>(
    initialValues ?? DEFAULT_FORM_VALUES,
  );
  const [errors, setErrors] = useState<Partial<Record<FieldName, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<FieldName, boolean>>>(
    {},
  );
  const [previewPalette, setPreviewPalette] = useState<CardPalette>(
    () => initialPalette ?? getRandomPastelPalette(),
  );
  const [previewSide, setPreviewSide] = useState<"front" | "back">("front");
  const [submitErrorMessage, setSubmitErrorMessage] = useState("");
  const [submitAreaHeight, setSubmitAreaHeight] = useState(96);
  const [presetGradients, setPresetGradients] = useState<[string, string][]>(
    () => pickPresetGradients(),
  );
  const [selectedGradient, setSelectedGradient] = useState<
    [string, string] | null
  >(null);
  const [focusedField, setFocusedField] = useState<FieldName | null>(null);
  const [androidKeyboardHeight, setAndroidKeyboardHeight] = useState(0);
  const inputRefs = useRef<Partial<Record<FieldName, TextInput | null>>>({});

  const sections = useMemo(() => getFormSections(values), [values]);
  const editableFieldOrder = useMemo(
    () =>
      [...sections.front, ...sections.back]
        .filter((field) => field.kind !== "select")
        .map((field) => field.key),
    [sections],
  );
  const requiredFields = useMemo(
    () => new Set(getRequiredFields(values)),
    [values],
  );
  const previewCard = useMemo(
    () => createPreviewCard(values, previewPalette),
    [previewPalette, values],
  );

  const updateField = (field: FieldName, rawValue: string) => {
    const formattedValue = formatFieldValue(field, rawValue, values);
    const nextValues = { ...values, [field]: formattedValue };
    setValues(nextValues);
    setSubmitErrorMessage("");

    if (touched[field] || errors[field]) {
      setErrors((current) => ({
        ...current,
        [field]: validateField(field, nextValues),
      }));
    } else {
      setErrors((current) => ({ ...current, [field]: undefined }));
    }
  };

  const markTouched = (field: FieldName, sourceValues = values) => {
    if (!touched[field]) {
      setTouched((current) => ({ ...current, [field]: true }));
    }
    setErrors((current) => ({
      ...current,
      [field]: validateField(field, sourceValues),
    }));
  };

  const handleCategoryChange = (category: string) => {
    const next = category as CardCategory;
    setValues((current) => ({
      ...DEFAULT_FORM_VALUES,
      category: next,
      nameOnCard: current.nameOnCard,
      holderName: current.holderName,
      memberIdFormat: "barcode",
    }));
    setTouched({});
    setErrors({});
    setSubmitErrorMessage("");
    setPreviewSide("front");
    setPreviewPalette((current) => getRandomPastelPalette([current.id]));
    setPresetGradients(pickPresetGradients());
    setSelectedGradient(null);
  };

  const handleSelectGradient = (gradient: [string, string]) => {
    setSelectedGradient(gradient);
    setPreviewPalette(buildPaletteFromGradient(gradient));
  };

  const handleSubmit = () => {
    const nextErrors = validate(values);
    const nextTouched = (Object.keys(values) as FieldName[]).reduce<
      Partial<Record<FieldName, boolean>>
    >((accumulator, key) => {
      accumulator[key] = true;
      return accumulator;
    }, {});

    setTouched(nextTouched);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      setSubmitErrorMessage(
        "Please fix the highlighted fields before adding this card.",
      );
      return;
    }

    setSubmitErrorMessage("");
    onSubmit(values, previewPalette);
  };

  const focusField = (field: FieldName | undefined) => {
    if (!field) {
      Keyboard.dismiss();
      setFocusedField(null);
      return;
    }

    inputRefs.current[field]?.focus();
    setFocusedField(field);
  };

  const focusedFieldIndex = focusedField
    ? editableFieldOrder.indexOf(focusedField)
    : -1;
  const nextField =
    focusedFieldIndex >= 0
      ? editableFieldOrder[focusedFieldIndex + 1]
      : undefined;

  useEffect(() => {
    if (Platform.OS !== "android") {
      return undefined;
    }

    const showSubscription = Keyboard.addListener(
      "keyboardDidShow",
      (event) => {
        setAndroidKeyboardHeight(event.endCoordinates.height);
      },
    );
    const hideSubscription = Keyboard.addListener("keyboardDidHide", () => {
      setAndroidKeyboardHeight(0);
      setFocusedField(null);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  const renderField = (field: FieldConfig) => {
    const value = String(values[field.key] ?? "");
    const error = touched[field.key] ? errors[field.key] : undefined;
    const valid = !!value.trim() && !validateField(field.key, values);
    const required = requiredFields.has(field.key);
    const isLastEditableField =
      editableFieldOrder[editableFieldOrder.length - 1] === field.key;
    const returnKeyType = isLastEditableField ? "done" : "next";
    const registerInput = (input: TextInput | null) => {
      inputRefs.current[field.key] = input;
    };
    const handleFocus = () => {
      setFocusedField(field.key);
    };
    const handleSubmitEditing = () => {
      focusField(isLastEditableField ? undefined : nextField);
    };

    if (field.kind === "select" && field.options) {
      return (
        <SelectRow
          key={field.key}
          label={field.label}
          value={value}
          options={field.options}
          onChange={(nextValue) => {
            const nextValues =
              field.key === "memberIdFormat"
                ? {
                    ...values,
                    memberIdFormat: nextValue as ClubMemberIdFormat,
                    memberId: "",
                  }
                : { ...values, [field.key]: nextValue };
            setValues(nextValues);
            setSubmitErrorMessage("");
            markTouched(field.key, nextValues);
          }}
          colors={colors}
          error={error}
          helperText={field.helperText}
          valid={valid}
          required={required}
        />
      );
    }

    if (field.kind === "date" || field.kind === "expiry") {
      return (
        <DateRow
          key={field.key}
          label={field.label}
          value={value}
          kind={field.kind}
          onChange={(nextValue) => {
            const formattedValue = formatFieldValue(
              field.key,
              nextValue,
              values,
            );
            const nextValues = { ...values, [field.key]: formattedValue };
            setValues(nextValues);
            setSubmitErrorMessage("");
            markTouched(field.key, nextValues);
          }}
          colors={colors}
          error={error}
          helperText={field.helperText}
          valid={valid}
          required={required}
          onFocus={handleFocus}
          onSubmitEditing={handleSubmitEditing}
          returnKeyType={returnKeyType}
          inputAccessoryViewID={keyboardAccessoryId}
          inputRef={registerInput}
        />
      );
    }

    return (
      <FormRow
        key={field.key}
        label={field.label}
        value={value}
        onChange={(nextValue) => {
          updateField(field.key, nextValue);
          if (touched[field.key]) {
            markTouched(field.key, {
              ...values,
              [field.key]: formatFieldValue(field.key, nextValue, values),
            });
          }
        }}
        keyboardType={field.keyboardType}
        colors={colors}
        error={error}
        helperText={field.helperText}
        valid={valid}
        required={required}
        onFocus={handleFocus}
        onSubmitEditing={handleSubmitEditing}
        returnKeyType={returnKeyType}
        inputAccessoryViewID={keyboardAccessoryId}
        inputRef={registerInput}
      />
    );
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={0}
    >
      <ScrollView
        style={formSt.scroll}
        contentContainerStyle={[
          formSt.content,
          {
            paddingBottom: submitAreaHeight + 24,
            paddingHorizontal: contentHorizontalPadding,
          },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        scrollEventThrottle={16}
        onScroll={(event: NativeSyntheticEvent<NativeScrollEvent>) => {
          onScrollOffsetChange?.(event.nativeEvent.contentOffset.y);
        }}
      >
        {topAccessory ? topAccessory : null}

        <SelectRow
          label="Card category"
          value={values.category}
          options={CATEGORY_OPTIONS.map((option) => ({
            label: option.label,
            value: option.value,
          }))}
          onChange={handleCategoryChange}
          colors={colors}
          helperText="Choose the broad card family first — this changes the available fields below."
          valid
        />

        <Text style={[formSt.sectionLabel, { color: colors.text }]}>
          Front details
        </Text>
        {sections.front.map(renderField)}

        <Text style={[formSt.sectionLabel, { color: colors.text }]}>
          Back details
        </Text>
        {sections.back.map(renderField)}

        <View
          style={[
            formSt.sideToggle,
            { backgroundColor: sideToggleColors.containerBackground },
          ]}
        >
          {(["front", "back"] as const).map((side) => {
            const active = previewSide === side;
            return (
              <Pressable
                key={side}
                onPress={() => setPreviewSide(side)}
                style={[
                  formSt.sideToggleBtn,
                  {
                    backgroundColor: active
                      ? sideToggleColors.activeBackground
                      : "transparent",
                  },
                ]}
              >
                <Text
                  style={[
                    formSt.sideToggleText,
                    {
                      color: active
                        ? sideToggleColors.activeText
                        : sideToggleColors.inactiveText,
                    },
                  ]}
                >
                  {side === "front" ? "Front" : "Back"}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Pressable
          style={formSt.previewWrap}
          onPress={() =>
            setPreviewSide((current) =>
              current === "front" ? "back" : "front",
            )
          }
          accessibilityRole="button"
          accessibilityLabel="Flip card preview"
        >
          <CardPreview previewSide={previewSide} card={previewCard} />
          <Text style={[formSt.previewHint, { color: colors.textSoft }]}>
            Tap the card preview to flip
          </Text>
        </Pressable>

        <CardColorPicker
          presets={presetGradients}
          selectedGradient={selectedGradient}
          onSelectGradient={handleSelectGradient}
          colors={colors}
        />
      </ScrollView>

      {Platform.OS === "ios" ? (
        <InputAccessoryView nativeID={keyboardAccessoryId}>
          <View
            style={[
              accessorySt.toolbar,
              {
                backgroundColor: colors.surface,
                borderTopColor: colors.border,
              },
            ]}
          >
            <Pressable
              accessibilityRole="button"
              disabled={!nextField}
              onPress={() => focusField(nextField)}
              style={({ pressed }) => [
                accessorySt.actionButton,
                !nextField ? accessorySt.actionButtonDisabled : null,
                pressed && nextField ? accessorySt.actionButtonPressed : null,
              ]}
            >
              <Text
                style={[
                  accessorySt.actionText,
                  { color: nextField ? colors.accent : colors.textSoft },
                ]}
              >
                Next
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              onPress={() => focusField(undefined)}
              style={({ pressed }) => [
                accessorySt.doneButton,
                { backgroundColor: colors.accent },
                pressed ? accessorySt.actionButtonPressed : null,
              ]}
            >
              <Text
                style={[accessorySt.doneText, { color: colors.accentText }]}
              >
                Done
              </Text>
            </Pressable>
          </View>
        </InputAccessoryView>
      ) : null}

      {Platform.OS === "android" && focusedField ? (
        <View
          pointerEvents="box-none"
          style={[
            accessorySt.androidToolbarWrap,
            { bottom: androidKeyboardHeight },
          ]}
        >
          <View
            style={[
              accessorySt.toolbar,
              accessorySt.androidToolbar,
              {
                backgroundColor: colors.surface,
                borderTopColor: colors.border,
                borderColor: colors.border,
              },
            ]}
          >
            <Pressable
              accessibilityRole="button"
              disabled={!nextField}
              onPress={() => focusField(nextField)}
              style={({ pressed }) => [
                accessorySt.actionButton,
                !nextField ? accessorySt.actionButtonDisabled : null,
                pressed && nextField ? accessorySt.actionButtonPressed : null,
              ]}
            >
              <Text
                style={[
                  accessorySt.actionText,
                  { color: nextField ? colors.accent : colors.textSoft },
                ]}
              >
                Next
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              onPress={() => focusField(undefined)}
              style={({ pressed }) => [
                accessorySt.doneButton,
                { backgroundColor: colors.accent },
                pressed ? accessorySt.actionButtonPressed : null,
              ]}
            >
              <Text
                style={[accessorySt.doneText, { color: colors.accentText }]}
              >
                Done
              </Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      <View
        style={[
          formSt.submitContainer,
          {
            paddingBottom: Math.max(insets.bottom, 12),
            paddingHorizontal: contentHorizontalPadding,
            backgroundColor: colors.surface,
          },
        ]}
        onLayout={(event) => {
          const nextHeight = Math.ceil(event.nativeEvent.layout.height);
          if (nextHeight !== submitAreaHeight) {
            setSubmitAreaHeight(nextHeight);
          }
        }}
      >
        {submitErrorMessage ? (
          <Text style={[formSt.submitErrorText, { color: colors.danger }]}>
            {submitErrorMessage}
          </Text>
        ) : null}
        <Pressable
          style={[formSt.submitBtn, { backgroundColor: colors.accent }]}
          onPress={handleSubmit}
        >
          <Text style={[formSt.submitText, { color: colors.accentText }]}>
            {submitLabel ?? "Add Card"}
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const fieldSt = StyleSheet.create({
  wrapper: {
    gap: 6,
  },
  pill: {
    borderRadius: 24,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  pillInner: {
    flex: 1,
  },
  rowLabel: {
    fontFamily: "ReadexPro-Regular",
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  rowLabelWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 2,
  },
  requiredMark: {
    fontFamily: "ReadexPro-Bold",
    fontSize: 12,
    lineHeight: 12,
  },
  input: {
    fontFamily: "ReadexPro-Regular",
    fontSize: 18,
    padding: 0,
  },
  selectValue: {
    fontFamily: "ReadexPro-Regular",
    fontSize: 18,
  },
  helperRow: {
    minHeight: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    paddingHorizontal: 6,
  },
  helperText: {
    flex: 1,
    fontFamily: "ReadexPro-Regular",
    fontSize: 11,
    lineHeight: 16,
  },
  iconButton: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
});

const sheetSt = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "transparent",
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 10,
    shadowColor: "#000000",
    shadowOpacity: 0.2,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: -8 },
    elevation: 20,
  },
  handle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: 16,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderRadius: 14,
  },
  itemText: {
    fontFamily: "ReadexPro-Regular",
    fontSize: 18,
  },
});

const iosSt = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  modalCard: {
    width: "100%",
    borderRadius: 24,
    padding: 18,
  },
  modalTitle: {
    fontFamily: "ReadexPro-Medium",
    fontSize: 18,
    marginBottom: 8,
    textAlign: "center",
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 18,
    marginTop: 8,
  },
  actionBtn: {
    paddingVertical: 8,
  },
  actionText: {
    fontFamily: "ReadexPro-Medium",
    fontSize: 15,
  },
});

const formSt = StyleSheet.create({
  scroll: { flex: 1 },
  content: { gap: 10, paddingHorizontal: 20 },
  sectionLabel: {
    marginTop: 10,
    marginBottom: 2,
    fontFamily: "ReadexPro-Medium",
    fontSize: 14,
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
  previewWrap: { marginTop: 6 },
  previewHint: {
    marginTop: 10,
    textAlign: "center",
    fontFamily: "ReadexPro-Regular",
    fontSize: 12,
  },
  submitContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  submitErrorText: {
    marginBottom: 10,
    textAlign: "center",
    fontFamily: "ReadexPro-Regular",
    fontSize: 13,
  },
  submitBtn: {
    height: 55,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  submitText: {
    fontFamily: "ReadexPro-Regular",
    fontSize: 20,
  },
});

const cpSt = StyleSheet.create({
  wrap: {
    marginTop: 14,
    gap: 10,
  },
  sectionLabel: {
    fontFamily: "ReadexPro-Regular",
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginLeft: 4,
  },
  row: {
    flexDirection: "row",
    gap: 10,
    justifyContent: "center",
  },
  swatchRing: {
    width: 54,
    height: 54,
    borderRadius: 18,
    padding: 3,
  },
  swatchGradient: {
    flex: 1,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  checkBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(0,0,0,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  plusBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.22)",
    alignItems: "center",
    justifyContent: "center",
  },
  // Full-bounds transparent overlay for centering the icon badge
  centeredBadge: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  modalOverlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  pickerCard: {
    width: "100%",
    borderRadius: 28,
    padding: 24,
    gap: 18,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  pickerTitle: {
    fontFamily: "ReadexPro-Medium",
    fontSize: 18,
    textAlign: "center",
  },
  gradientPreview: {
    height: 58,
    borderRadius: 18,
  },
  hueBarOuter: {
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
  },
  hueThumb: {
    position: "absolute",
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 3,
    borderColor: "#FFFFFF",
    backgroundColor: "transparent",
    top: 4,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  pickerActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 16,
  },
  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  cancelText: {
    fontFamily: "ReadexPro-Regular",
    fontSize: 16,
  },
  applyBtn: {
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  applyText: {
    fontFamily: "ReadexPro-Medium",
    fontSize: 16,
  },
});

const accessorySt = StyleSheet.create({
  androidToolbarWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    zIndex: 20,
    elevation: 20,
  },
  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  androidToolbar: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    paddingHorizontal: 18,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: -2 },
    elevation: 8,
  },
  actionButton: {
    minWidth: 64,
    paddingVertical: 8,
  },
  actionButtonDisabled: {
    opacity: 0.45,
  },
  actionButtonPressed: {
    opacity: 0.72,
  },
  actionText: {
    fontFamily: "ReadexPro-Medium",
    fontSize: 16,
  },
  doneButton: {
    minWidth: 76,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  doneText: {
    fontFamily: "ReadexPro-Medium",
    fontSize: 16,
  },
});
