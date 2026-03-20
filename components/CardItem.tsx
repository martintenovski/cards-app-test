import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { getContrastColor } from '@/types/card';
import type { WalletCard } from '@/types/card';

// Sizes derived directly from Figma design
const SIZES = {
  full: {
    width: 380,
    height: 252,
    radius: 30,
    padding: 25,
    titleSize: 24,
    issuerSize: 16,
    issuerWidth: 138,
    nameSize: 36,
    footerPrimarySize: 16,
    footerSecondarySize: 20,
    chipSize: 44,
    cardNumSize: 24,
    rotateSize: 20,
    nfcSize: 20,
  },
  compact: {
    width: 335,
    height: 222,
    radius: 26,
    padding: 22,
    titleSize: 21,
    issuerSize: 14,
    issuerWidth: 122,
    nameSize: 32,
    footerPrimarySize: 14,
    footerSecondarySize: 18,
    chipSize: 35,
    cardNumSize: 19,
    rotateSize: 16,
    nfcSize: 16,
  },
  small: {
    width: 302,
    height: 200,
    radius: 24,
    padding: 20,
    titleSize: 19,
    issuerSize: 13,
    issuerWidth: 110,
    nameSize: 28,
    footerPrimarySize: 13,
    footerSecondarySize: 16,
    chipSize: 30,
    cardNumSize: 17,
    rotateSize: 14,
    nfcSize: 14,
  },
};

type CardSize = 'full' | 'compact' | 'small';

type CardItemProps = {
  card: WalletCard;
  side?: 'front' | 'back';
  size?: CardSize;
  onFlip?: () => void;
};

export function CardItem({ card, side = 'front', size = 'full', onFlip }: CardItemProps) {
  const s = SIZES[size];
  const isBankCard = card.category === 'bank';
  const withShadow = size === 'full';

  const gradientStyle = [
    styles.card,
    {
      height: s.height,
      borderRadius: s.radius,
      padding: s.padding,
    },
    withShadow && styles.shadow,
  ];

  const gradient = card.palette.gradient ?? [card.palette.background, card.palette.background];
  // Always derive from gradient at render time — immune to stale persisted palette values
  const primaryColor = getContrastColor(gradient[0]);
  const mutedColor = primaryColor === '#1D1D1D' ? 'rgba(29,29,29,0.65)' : 'rgba(255,255,255,0.65)';
  const iconColor = primaryColor === '#1D1D1D' ? 'rgba(29,29,29,0.6)' : 'rgba(255,255,255,0.7)';
  const chipColor = primaryColor === '#1D1D1D' ? 'rgba(29,29,29,0.35)' : 'rgba(255,255,255,0.5)';

  if (isBankCard && side === 'back') {
    return (
      <LinearGradient
        colors={gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={gradientStyle}
      >
        {/* Header row */}
        <View style={styles.row}>
          <Text style={[styles.title, { fontSize: s.titleSize, color: mutedColor }]}>
            {card.title}
          </Text>
          <Text style={[styles.brandText, { fontSize: s.issuerSize, color: primaryColor }]}>
            {card.brand === 'visa' ? 'VISA' : 'MC'}
          </Text>
        </View>

        {/* CVC + NFC icon */}
        <View style={[styles.row, { marginTop: 'auto', alignItems: 'flex-start' }]}>
          <Text style={[styles.cardNum, { fontSize: s.cardNumSize, color: primaryColor }]}>
            {card.cvc || '000'}
          </Text>
          <MaterialCommunityIcons name="nfc" size={s.nfcSize} color={iconColor} />
        </View>

        {/* Account number + rotate */}
        <View style={[styles.row, { marginTop: 8, alignItems: 'flex-end' }]}>
          <Text style={[styles.cardNum, { fontSize: s.cardNumSize, color: primaryColor }]}>
            {card.accountNumber || '—'}
          </Text>
          <Pressable onPress={onFlip} hitSlop={12}>
            <MaterialCommunityIcons name="refresh" size={s.rotateSize} color={iconColor} />
          </Pressable>
        </View>
      </LinearGradient>
    );
  }

  // Front face
  return (
    <LinearGradient
      colors={gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={gradientStyle}
    >
      {/* Header row */}
      <View style={styles.row}>
        <Text
          style={[styles.title, { fontSize: s.titleSize, color: mutedColor }]}
          numberOfLines={1}
        >
          {card.title}
        </Text>
        <Text
          style={[styles.issuer, { fontSize: s.issuerSize, maxWidth: s.issuerWidth, color: primaryColor }]}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {card.issuer}
        </Text>
      </View>

      {/* Body */}
      {isBankCard ? (
        <>
          <View style={{ marginTop: 'auto' }}>
            <MaterialCommunityIcons name="chip" size={s.chipSize} color={chipColor} />
          </View>
          {/* Card number + rotate */}
          <View style={[styles.row, { marginTop: 'auto', alignItems: 'flex-end' }]}>
            <Text style={[styles.cardNum, { fontSize: s.cardNumSize, color: primaryColor }]}>
              {card.maskedCardNumber}
            </Text>
            <Pressable onPress={onFlip} hitSlop={12}>
              <MaterialCommunityIcons name="refresh" size={s.rotateSize} color={iconColor} />
            </Pressable>
          </View>
        </>
      ) : (
        <>
          {/* Name fills middle */}
          <View style={{ flex: 1, justifyContent: 'center', marginTop: 4 }}>
            <Text style={[styles.name, { fontSize: s.nameSize, color: primaryColor }]}>
              {card.name}
            </Text>
          </View>
          {/* Footer */}
          <View style={styles.row}>
            <Text style={[styles.primaryValue, { fontSize: s.footerPrimarySize, color: primaryColor }]}>
              {card.primaryValue}
            </Text>
            {!!card.secondaryValue && (
              <Text style={[styles.secondaryValue, { fontSize: s.footerSecondarySize, color: mutedColor }]}>
                {card.secondaryValue}
              </Text>
            )}
          </View>
        </>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    overflow: 'hidden',
    flexDirection: 'column',
  },
  shadow: {
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -5 },
    elevation: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontFamily: 'OpenSans-SemiBold',
    color: 'rgba(255,255,255,0.65)',
    flexShrink: 1,
  },
  issuer: {
    fontFamily: 'OpenSans-Bold',
    color: '#FFFFFF',
    textAlign: 'right',
  },
  name: {
    fontFamily: 'OpenSans-ExtraBold',
    color: '#FFFFFF',
    lineHeight: undefined, // let it scale naturally
  },
  primaryValue: {
    fontFamily: 'OpenSans-Regular',
    color: '#FFFFFF',
    flexShrink: 1,
  },
  secondaryValue: {
    fontFamily: 'OpenSans-Bold',
    color: 'rgba(255,255,255,0.65)',
  },
  cardNum: {
    fontFamily: 'OpenSans-SemiBold',
    color: '#FFFFFF',
    flexShrink: 1,
  },
  brandText: {
    fontFamily: 'OpenSans-Bold',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
});
