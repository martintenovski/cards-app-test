export type CardCategory = 'bank' | 'personal' | 'club';
export type HomeFilter = 'everything' | CardCategory;
export type WalletViewMode = 'stack' | 'list';

export type BankCardType = 'Debit Card' | 'Credit Card';
export type PersonalDocType = 'Identity Card' | 'Driving License' | 'Passport';
export type ClubCardType = 'Club Card' | 'Gym Pass' | 'Loyalty Card';

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
}

export interface ClubCard extends BaseCard {
  category: 'club';
  title: ClubCardType;
  clubName: string;
  memberId: string;
  tier: string;
}

export type WalletCard = BankCard | PersonalDocCard | ClubCard;

export interface CardFormValues {
  category: CardCategory;
  type: string;
  issuer: string;
  nameOnCard: string;
  cardNumber: string;
  secondaryNumber: string;
  cvc: string;
  accountNumber: string;
  bankName: string;
  holderName: string;
  clubName: string;
  memberId: string;
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
  secondaryNumber: '',
  cvc: '',
  accountNumber: '',
  bankName: '',
  holderName: '',
  clubName: '',
  memberId: '',
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
    tier: 'Gold Tier',
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
      name: values.nameOnCard || 'Name on card',
      primaryValue: values.cardNumber || 'Card number',
      secondaryValue: values.secondaryNumber || 'Secondary number',
      palette,
      issuedBy: values.issuer || 'Issued by',
      docNumber: values.cardNumber || 'Card number',
      secondaryNumber: values.secondaryNumber || 'Secondary number',
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
      tier: values.tier || 'Tier',
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
    };
  }
  return {
    ...DEFAULT_FORM_VALUES,
    category: 'club',
    type: card.title,
    clubName: card.clubName,
    nameOnCard: card.name,
    memberId: card.memberId,
    tier: card.tier,
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
      primaryValue: values.cardNumber,
      secondaryNumber: values.secondaryNumber,
      secondaryValue: values.secondaryNumber,
    };
  }

  return {
    ...preview,
    id: createId('club'),
    clubName: values.clubName,
    issuer: values.clubName,
    name: values.nameOnCard || values.holderName,
    memberId: values.memberId,
    primaryValue: values.memberId,
    tier: values.tier,
    secondaryValue: values.tier,
  };
}
