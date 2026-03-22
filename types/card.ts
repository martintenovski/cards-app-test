export type CardCategory = 'bank' | 'personal' | 'club';
export type HomeFilter = 'everything' | CardCategory;
export type WalletViewMode = 'stack' | 'list';

export type BankCardType = 'Debit Card' | 'Credit Card';
export type PersonalDocType = 'Identity Card' | 'Driving License' | 'Passport';
export type ClubCardType = 'Club Card' | 'Gym Pass' | 'Loyalty Card';
export type ClubMemberIdFormat = 'text' | 'barcode';

export interface CardPalette {
  id: string;
  background: string;
  mutedText: string;
  primaryText: string;
  shadow: string;
  gradient: [string, string];
}

import { GRADIENTS } from '@/constants/gradients';
export { GRADIENTS };

interface BaseCard {
  id: string;
  category: CardCategory;
  title: string;
  issuer: string;
  name: string;
  primaryValue: string;
  secondaryValue?: string;
  palette: CardPalette;
}

export interface BankCard extends BaseCard {
  category: 'bank';
  title: BankCardType;
  bankName: string;
  holderName: string;
  cardNumber: string;
  maskedCardNumber: string;
  expiry?: string;
  cvc: string;
  accountNumber: string;
  brand: 'visa' | 'mastercard';
}

export interface PersonalDocCard extends BaseCard {
  category: 'personal';
  title: PersonalDocType;
  issuedBy: string;
  docNumber: string;
  secondaryNumber: string;
  personalIdNumber?: string;
  dateOfBirth?: string;
  dateOfIssue?: string;
  dateOfExpiry?: string;
  nationality?: string;
  sex?: string;
  address?: string;
}

export interface ClubCard extends BaseCard {
  category: 'club';
  title: ClubCardType;
  clubName: string;
  memberId: string;
  memberIdFormat: ClubMemberIdFormat;
  tier: string;
  secondaryNumber?: string;
  dateOfIssue?: string;
  dateOfExpiry?: string;
  address?: string;
}

export type WalletCard = BankCard | PersonalDocCard | ClubCard;

export interface CardFormValues {
  category: CardCategory;
  type: string;
  issuer: string;
  nameOnCard: string;
  cardNumber: string;
  expiry: string;
  dateOfBirth: string;
  dateOfIssue: string;
  dateOfExpiry: string;
  nationality: string;
  sex: string;
  address: string;
  personalIdNumber: string;
  secondaryNumber: string;
  cvc: string;
  accountNumber: string;
  bankName: string;
  holderName: string;
  clubName: string;
  memberId: string;
  memberIdFormat: ClubMemberIdFormat;
  tier: string;
}

export const FILTER_LABELS: Record<HomeFilter, string> = {
  everything: 'Everything',
  personal: 'Personal Docs',
  bank: 'Bank Cards',
  club: 'Club Cards',
};

export const CATEGORY_OPTIONS: Array<{ label: string; value: CardCategory }> = [
  { label: 'Bank Card', value: 'bank' },
  { label: 'Personal Docs', value: 'personal' },
  { label: 'Club Card', value: 'club' },
];

export const TYPE_OPTIONS: Record<CardCategory, string[]> = {
  bank: ['Debit Card', 'Credit Card'],
  personal: ['Identity Card', 'Driving License', 'Passport'],
  club: ['Club Card', 'Gym Pass', 'Loyalty Card'],
};

export const DEFAULT_FORM_VALUES: CardFormValues = {
  category: 'bank',
  type: '',
  issuer: '',
  nameOnCard: '',
  cardNumber: '',
  expiry: '',
  dateOfBirth: '',
  dateOfIssue: '',
  dateOfExpiry: '',
  nationality: '',
  sex: '',
  address: '',
  personalIdNumber: '',
  secondaryNumber: '',
  cvc: '',
  accountNumber: '',
  bankName: '',
  holderName: '',
  clubName: '',
  memberId: '',
  memberIdFormat: 'text',
  tier: '',
};

export const pastelPalettes: CardPalette[] = [
  {
    id: 'lavender',
    background: '#BBA8FF',
    mutedText: 'rgba(29,29,29,0.65)',
    primaryText: '#1D1D1D',
    shadow: 'rgba(187,168,255,0.28)',
    gradient: ['#FF6B6B', '#FF1A1A'],
  },
  {
    id: 'periwinkle',
    background: '#BED0FF',
    mutedText: 'rgba(29,29,29,0.65)',
    primaryText: '#1D1D1D',
    shadow: 'rgba(190,208,255,0.24)',
    gradient: ['#6C63FF', '#4B44CC'],
  },
  {
    id: 'blush',
    background: '#F5C3F1',
    mutedText: 'rgba(29,29,29,0.65)',
    primaryText: '#1D1D1D',
    shadow: 'rgba(245,195,241,0.28)',
    gradient: ['#43C6AC', '#2A9D8F'],
  },
  {
    id: 'rose',
    background: '#FFA0A3',
    mutedText: 'rgba(29,29,29,0.65)',
    primaryText: '#1D1D1D',
    shadow: 'rgba(255,160,163,0.26)',
    gradient: ['#F7B731', '#E5A800'],
  },
  {
    id: 'mint',
    background: '#BFE9DD',
    mutedText: 'rgba(29,29,29,0.65)',
    primaryText: '#1D1D1D',
    shadow: 'rgba(191,233,221,0.24)',
    gradient: ['#A8E063', '#78C800'],
  },
  {
    id: 'butter',
    background: '#E6ED9D',
    mutedText: 'rgba(29,29,29,0.65)',
    primaryText: '#1D1D1D',
    shadow: 'rgba(230,237,157,0.22)',
    gradient: ['#F8A5C2', '#E8749F'],
  },
  {
    id: 'peach',
    background: '#FFD2B5',
    mutedText: 'rgba(29,29,29,0.65)',
    primaryText: '#1D1D1D',
    shadow: 'rgba(255,210,181,0.24)',
    gradient: ['#45B7D1', '#2196A8'],
  },
  {
    id: 'aqua',
    background: '#BCE7F4',
    mutedText: 'rgba(29,29,29,0.65)',
    primaryText: '#1D1D1D',
    shadow: 'rgba(188,231,244,0.24)',
    gradient: ['#FF9A3C', '#FF6600'],
  },
];

/**
 * Returns '#1D1D1D' or '#FFFFFF' — whichever achieves a higher WCAG contrast
 * ratio against the given hex background color.
 */
export function getContrastColor(hex: string): '#1D1D1D' | '#FFFFFF' {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const toLinear = (c: number) =>
    c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  const L = 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
  // Threshold: L >= 0.179 gives higher contrast with black text (WCAG formula)
  return L >= 0.179 ? '#1D1D1D' : '#FFFFFF';
}

export function getRandomPastelPalette(excludedIds: string[] = []) {
  const candidates = pastelPalettes.filter((palette) => !excludedIds.includes(palette.id));
  const source = candidates.length > 0 ? candidates : pastelPalettes;
  const base = source[Math.floor(Math.random() * source.length)];
  // Assign a random gradient independently
  const gradient = GRADIENTS[Math.floor(Math.random() * GRADIENTS.length)] as [string, string];
  // Compute WCAG-compliant text color from the gradient start color
  const primaryText = getContrastColor(gradient[0]);
  const mutedText =
    primaryText === '#1D1D1D' ? 'rgba(29,29,29,0.65)' : 'rgba(255,255,255,0.65)';
  return { ...base, gradient, primaryText, mutedText };
}

function randomizeSeedPalettes(cards: WalletCard[]) {
  const usedIds: string[] = [];

  return cards.map((card) => {
    const palette = getRandomPastelPalette(usedIds);
    usedIds.push(palette.id);

    return {
      ...card,
      palette,
    };
  });
}

export const seedCards: WalletCard[] = [
  {
    id: 'personal-2',
    category: 'personal',
    title: 'Driving License',
    issuer: 'MVR Skopje',
    name: 'Martin\nTenovski',
    primaryValue: '1706000450034',
    secondaryValue: 'D241124',
    palette: pastelPalettes[0],
    issuedBy: 'MVR Skopje',
    docNumber: '1706000450034',
    secondaryNumber: 'D241124',
    dateOfIssue: '15.03.2024',
    dateOfExpiry: '14.03.2029',
    address: 'BUL. ASNOM BR. 42-69',
    dateOfBirth: '17.06.2000',
  },
  {
    id: 'personal-1',
    category: 'personal',
    title: 'Identity Card',
    issuer: 'MVR Skopje',
    name: 'Martin\nTenovski',
    primaryValue: '1706000450034',
    secondaryValue: 'M0800421',
    palette: pastelPalettes[1],
    issuedBy: 'MVR Skopje',
    docNumber: '1706000450034',
    secondaryNumber: 'M0800421',
    personalIdNumber: '1706000450034',
    dateOfIssue: '15.03.2024',
    dateOfExpiry: '14.03.2029',
    address: 'BUL. ASNOM BR. 42-69',
    nationality: 'MKD',
    sex: 'M',
  },
  {
    id: 'personal-3',
    category: 'personal',
    title: 'Passport',
    issuer: 'MVR Skopje',
    name: 'Martin\nTenovski',
    primaryValue: '1706000450034',
    secondaryValue: 'D241124',
    palette: pastelPalettes[2],
    issuedBy: 'MVR Skopje',
    docNumber: '1706000450034',
    secondaryNumber: 'D241124',
    dateOfIssue: '15.03.2024',
    dateOfExpiry: '14.03.2034',
    nationality: 'MKD',
    dateOfBirth: '17.06.2000',
    sex: 'M',
  },
  {
    id: 'bank-1',
    category: 'bank',
    title: 'Debit Card',
    issuer: 'NLB Banka',
    name: 'Martin Tenovski',
    primaryValue: '6218 **** **** 2133',
    palette: pastelPalettes[3],
    bankName: 'NLB Banka',
    holderName: 'Martin Tenovski',
    cardNumber: '6218241226232133',
    maskedCardNumber: '6218 **** **** 2133',
    cvc: '392',
    accountNumber: '1100000450034',
    brand: 'visa',
  },
  {
    id: 'bank-2',
    category: 'bank',
    title: 'Credit Card',
    issuer: 'Sparkasse',
    name: 'Martin Tenovski',
    primaryValue: '6358 **** **** 8933',
    palette: pastelPalettes[4],
    bankName: 'Sparkasse',
    holderName: 'Martin Tenovski',
    cardNumber: '6358241226238933',
    maskedCardNumber: '6358 **** **** 8933',
    cvc: '817',
    accountNumber: '2200000789012',
    brand: 'mastercard',
  },
  {
    id: 'club-1',
    category: 'club',
    title: 'Loyalty Card',
    issuer: 'City Rewards',
    name: 'Premium Member',
    primaryValue: 'CR-4400-7782',
    secondaryValue: 'Gold Tier',
    palette: pastelPalettes[5],
    clubName: 'City Rewards',
    memberId: 'CR-4400-7782',
    memberIdFormat: 'text',
    tier: 'Gold Tier',
    secondaryNumber: 'MEM-2024-99',
    dateOfIssue: '12.02.2024',
    dateOfExpiry: '12.02.2027',
  },
];

export const initialSeedCards: WalletCard[] = [];

export function maskCardNumber(value: string) {
  const digits = value.replace(/\D/g, '');
  if (digits.length <= 8) {
    return value || '0000 **** **** 0000';
  }
  return `${digits.slice(0, 4)} **** **** ${digits.slice(-4)}`;
}

export function maskSecondaryValue(value: string, fallback = '000000') {
  if (!value) {
    return fallback;
  }
  return value;
}

export function getCardsByFilter(cards: WalletCard[], filter: HomeFilter) {
  if (filter === 'everything') {
    return cards;
  }

  return cards.filter((card) => card.category === filter);
}

export function getFilterLabel(filter: HomeFilter) {
  return FILTER_LABELS[filter];
}

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createPreviewCard(values: CardFormValues, paletteOverride?: CardPalette): WalletCard {
  const palette = paletteOverride ?? getRandomPastelPalette();

  if (values.category === 'personal') {
    return {
      id: 'preview-personal',
      category: 'personal',
      title: (values.type as PersonalDocType) || 'Identity Card',
      issuer: values.issuer || 'Issued by',
      name: values.nameOnCard || 'Cardholder',
      primaryValue: values.personalIdNumber || values.cardNumber || 'Primary number',
      secondaryValue: values.cardNumber || values.secondaryNumber || 'Document number',
      palette,
      issuedBy: values.issuer || 'Issued by',
      docNumber: values.cardNumber || 'Document number',
      secondaryNumber: values.secondaryNumber || '',
      personalIdNumber: values.personalIdNumber || undefined,
      dateOfBirth: values.dateOfBirth || undefined,
      dateOfIssue: values.dateOfIssue || undefined,
      dateOfExpiry: values.dateOfExpiry || undefined,
      nationality: values.nationality || undefined,
      sex: values.sex || undefined,
      address: values.address || undefined,
    };
  }

  if (values.category === 'club') {
    return {
      id: 'preview-club',
      category: 'club',
      title: (values.type as ClubCardType) || 'Club Card',
      issuer: values.clubName || 'Club',
      name: values.nameOnCard || values.holderName || 'Member name',
      primaryValue: values.memberId || 'Member ID',
      secondaryValue: values.tier || 'Tier',
      palette,
      clubName: values.clubName || 'Club',
      memberId: values.memberId || 'Member ID',
      memberIdFormat: values.memberIdFormat,
      tier: values.tier || 'Tier',
      secondaryNumber: values.secondaryNumber || undefined,
      dateOfIssue: values.dateOfIssue || undefined,
      dateOfExpiry: values.dateOfExpiry || undefined,
      address: values.address || undefined,
    };
  }

  return {
    id: 'preview-bank',
    category: 'bank',
    title: (values.type as BankCardType) || 'Debit Card',
    issuer: values.bankName || 'Bank name',
    name: values.holderName || values.nameOnCard || 'Holder name',
    primaryValue: maskCardNumber(values.cardNumber || '6358241226238933'),
    palette,
    bankName: values.bankName || 'Bank name',
    holderName: values.holderName || values.nameOnCard || 'Holder name',
    cardNumber: values.cardNumber || '6358241226238933',
    maskedCardNumber: maskCardNumber(values.cardNumber || '6358241226238933'),
    expiry: values.expiry || '',
    cvc: values.cvc || 'CVC',
    accountNumber: values.accountNumber || 'Account number',
    brand: 'visa',
  };
}

export function cardToFormValues(card: WalletCard): CardFormValues {
  if (card.category === 'bank') {
    return {
      ...DEFAULT_FORM_VALUES,
      category: 'bank',
      type: card.title,
      bankName: card.bankName,
      holderName: card.holderName,
      nameOnCard: card.holderName,
      cardNumber: card.cardNumber,
      expiry: card.expiry ?? '',
      cvc: card.cvc,
      accountNumber: card.accountNumber,
    };
  }
  if (card.category === 'personal') {
    return {
      ...DEFAULT_FORM_VALUES,
      category: 'personal',
      type: card.title,
      issuer: card.issuedBy,
      nameOnCard: card.name,
      cardNumber: card.docNumber,
      secondaryNumber: card.secondaryNumber,
      personalIdNumber: card.personalIdNumber ?? '',
      dateOfBirth: card.dateOfBirth ?? '',
      dateOfIssue: card.dateOfIssue ?? '',
      dateOfExpiry: card.dateOfExpiry ?? '',
      nationality: card.nationality ?? '',
      sex: card.sex ?? '',
      address: card.address ?? '',
    };
  }
  return {
    ...DEFAULT_FORM_VALUES,
    category: 'club',
    type: card.title,
    clubName: card.clubName,
    nameOnCard: card.name,
    memberId: card.memberId,
    memberIdFormat: card.memberIdFormat,
    tier: card.tier,
    secondaryNumber: card.secondaryNumber ?? '',
    dateOfIssue: card.dateOfIssue ?? '',
    dateOfExpiry: card.dateOfExpiry ?? '',
    address: card.address ?? '',
  };
}

export function createCardFromForm(values: CardFormValues, paletteOverride?: CardPalette): WalletCard {
  const preview = createPreviewCard(values, paletteOverride);

  if (preview.category === 'bank') {
    return {
      ...preview,
      id: createId('bank'),
      cardNumber: values.cardNumber,
      maskedCardNumber: maskCardNumber(values.cardNumber),
      expiry: values.expiry,
      cvc: values.cvc,
      accountNumber: values.accountNumber,
      holderName: values.holderName || values.nameOnCard,
      bankName: values.bankName,
      issuer: values.bankName,
      name: values.holderName || values.nameOnCard,
      primaryValue: maskCardNumber(values.cardNumber),
    };
  }

  if (preview.category === 'personal') {
    return {
      ...preview,
      id: createId('personal'),
      issuedBy: values.issuer,
      issuer: values.issuer,
      name: values.nameOnCard,
      docNumber: values.cardNumber,
      primaryValue: values.personalIdNumber || values.cardNumber,
      secondaryNumber: values.secondaryNumber,
      secondaryValue: values.cardNumber || values.secondaryNumber,
      personalIdNumber: values.personalIdNumber || undefined,
      dateOfBirth: values.dateOfBirth || undefined,
      dateOfIssue: values.dateOfIssue || undefined,
      dateOfExpiry: values.dateOfExpiry || undefined,
      nationality: values.nationality || undefined,
      sex: values.sex || undefined,
      address: values.address || undefined,
    };
  }

  return {
    ...preview,
    id: createId('club'),
    clubName: values.clubName,
    issuer: values.clubName,
    name: values.nameOnCard || values.holderName,
    memberId: values.memberId,
    memberIdFormat: values.memberIdFormat,
    primaryValue: values.memberId,
    tier: values.tier,
    secondaryValue: values.tier,
    secondaryNumber: values.secondaryNumber || undefined,
    dateOfIssue: values.dateOfIssue || undefined,
    dateOfExpiry: values.dateOfExpiry || undefined,
    address: values.address || undefined,
  };
}

export type CardIconName =
  | 'credit-card-outline'
  | 'card-account-details-outline'
  | 'card-account-details-star-outline';

export interface CardSideContent {
  topLabel: string;
  topValue: string;
  middleLabel: string;
  middleValue: string;
  bottomLeftLabel: string;
  bottomLeftValue: string;
  bottomRightLabel: string;
  bottomRightValue: string;
  iconName: CardIconName;
  footerVariant?: 'default' | 'barcode';
  barcodeValue?: string;
}

export function supportsCardBack(_card: WalletCard) {
  return true;
}

export function getCardSideContent(card: WalletCard, side: 'front' | 'back'): CardSideContent {
  if (card.category === 'bank') {
    return side === 'front'
      ? {
          topLabel: card.title,
          topValue: card.bankName || card.issuer || 'Bank name',
          middleLabel: 'CARDHOLDER',
          middleValue: card.holderName || card.name || 'Cardholder',
          bottomLeftLabel: 'Card Number',
          bottomLeftValue: card.maskedCardNumber || maskCardNumber(card.cardNumber),
          bottomRightLabel: 'Brand',
          bottomRightValue: card.brand === 'mastercard' ? 'Mastercard' : 'Visa',
          iconName: 'credit-card-outline',
        }
      : {
          topLabel: card.title,
          topValue: card.bankName || card.issuer || 'Bank name',
          middleLabel: card.accountNumber ? 'Account Number' : 'Bank',
          middleValue: card.accountNumber || card.bankName || card.issuer,
          bottomLeftLabel: 'Expiry Date',
          bottomLeftValue: card.expiry || 'Not added',
          bottomRightLabel: 'CVC',
          bottomRightValue: card.cvc || 'Not added',
          iconName: 'credit-card-outline',
        };
  }

  if (card.category === 'club') {
    const usesBarcode = card.memberIdFormat === 'barcode' && !!card.memberId;

    return side === 'front'
      ? {
          topLabel: card.title,
          topValue: card.clubName || card.issuer || 'Club',
          middleLabel: 'MEMBER',
          middleValue: card.name || 'Member name',
          bottomLeftLabel: usesBarcode ? 'Member Since' : 'Member ID',
          bottomLeftValue: usesBarcode ? card.dateOfIssue || 'Not added' : card.memberId || 'Not added',
          bottomRightLabel: usesBarcode ? '' : 'Tier',
          bottomRightValue: usesBarcode ? '' : card.tier || 'Standard',
          iconName: 'card-account-details-star-outline',
        }
      : {
          topLabel: card.title,
          topValue: card.clubName || card.issuer || 'Club',
          middleLabel: usesBarcode
            ? ''
            : card.address
              ? 'Address'
              : card.secondaryNumber
                ? 'Membership No.'
                : 'Program',
          middleValue: usesBarcode
            ? ''
            : card.address || card.secondaryNumber || card.clubName || card.issuer || 'Not added',
          bottomLeftLabel: usesBarcode ? '' : 'Member Since',
          bottomLeftValue: usesBarcode ? '' : card.dateOfIssue || 'Not added',
          bottomRightLabel: usesBarcode ? '' : 'Expires',
          bottomRightValue: usesBarcode ? '' : card.dateOfExpiry || card.tier || 'Not added',
          iconName: 'card-account-details-star-outline',
          footerVariant: usesBarcode ? 'barcode' : 'default',
          barcodeValue: usesBarcode ? card.memberId : undefined,
        };
  }

  const personalFront = getPersonalFrontContent(card);
  const personalBackMiddle = getPersonalBackMiddle(card);
  const personalBackLeft = card.dateOfIssue || card.dateOfBirth;

  return side === 'front'
    ? {
        topLabel: card.title,
        topValue: card.issuedBy || card.issuer || 'Issuer',
        middleLabel: 'CARDHOLDER',
        middleValue: card.name || 'Cardholder',
        bottomLeftLabel: personalFront.bottomLeftLabel,
        bottomLeftValue: personalFront.bottomLeftValue,
        bottomRightLabel: personalFront.bottomRightLabel,
        bottomRightValue: personalFront.bottomRightValue,
        iconName: 'card-account-details-outline',
      }
    : {
        topLabel: card.title,
        topValue: card.issuedBy || card.issuer || 'Issuer',
        middleLabel: personalBackMiddle.label,
        middleValue: personalBackMiddle.value,
        bottomLeftLabel: personalBackLeft ? 'Date of Issue' : 'Birth Date',
        bottomLeftValue: personalBackLeft || 'Not added',
        bottomRightLabel: 'Date of Expiry',
        bottomRightValue: card.dateOfExpiry || 'Not added',
        iconName: 'card-account-details-outline',
      };
}

function getPersonalFrontContent(card: PersonalDocCard) {
  if (card.title === 'Driving License') {
    return {
      bottomLeftLabel: 'License Number',
      bottomLeftValue: card.docNumber || 'Not added',
      bottomRightLabel: 'Class',
      bottomRightValue: card.secondaryNumber || card.personalIdNumber || 'Not added',
    };
  }

  if (card.title === 'Passport') {
    return {
      bottomLeftLabel: 'Passport No.',
      bottomLeftValue: card.docNumber || 'Not added',
      bottomRightLabel: 'Nationality',
      bottomRightValue: card.nationality || card.secondaryNumber || 'Not added',
    };
  }

  return {
    bottomLeftLabel: 'National ID Num.',
    bottomLeftValue: card.personalIdNumber || card.docNumber || 'Not added',
    bottomRightLabel: 'ID Number',
    bottomRightValue: card.docNumber || card.secondaryNumber || 'Not added',
  };
}

function getPersonalBackMiddle(card: PersonalDocCard) {
  if (card.address) {
    return { label: 'Address', value: card.address };
  }

  if (card.title === 'Passport') {
    return {
      label: 'Nationality',
      value: card.nationality || 'Not added',
    };
  }

  return {
    label: 'Birth Date',
    value: card.dateOfBirth || 'Not added',
  };
}
