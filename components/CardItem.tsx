import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { getCardSideContent, getContrastColor } from '@/types/card';
import type { WalletCard } from '@/types/card';

// Sizes derived directly from Figma design
const SIZES = {
  full: {
    width: 380,
    height: 225,
    radius: 30,
    padding: 25,
    topLabelSize: 14,
    topValueSize: 16,
    middleLabelSize: 13,
    middleValueSize: 20,
    metaLabelSize: 13,
    metaValueSize: 16,
    iconSize: 22,
  },
  compact: {
    width: 335,
    height: 198,
    radius: 26,
    padding: 22,
    topLabelSize: 13,
    issuerSize: 16,
    topValueSize: 15,
    middleLabelSize: 12,
    middleValueSize: 18,
    metaLabelSize: 12,
    metaValueSize: 15,
    iconSize: 20,
  },
  small: {
    width: 302,
    height: 178,
    radius: 24,
    padding: 20,
    topLabelSize: 12,
    topValueSize: 14,
    middleLabelSize: 11,
    middleValueSize: 16,
    metaLabelSize: 11,
    metaValueSize: 14,
    iconSize: 18,
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
  const withShadow = size === 'full';
  const content = getCardSideContent(card, side);

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
  const iconColor = primaryColor === '#1D1D1D' ? 'rgba(29,29,29,0.85)' : 'rgba(255,255,255,0.9)';

  return (
    <LinearGradient
      colors={side === 'back' ? [gradient[1], gradient[0]] : gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={gradientStyle}
    >
      <View style={styles.row}>
        <View style={styles.headerTextWrap}>
          <Text style={[styles.topLabel, { fontSize: s.topLabelSize, color: mutedColor }]}>
            {content.topLabel}
          </Text>
          <Text
            style={[styles.topValue, { fontSize: s.topValueSize, color: primaryColor }]}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {content.topValue}
          </Text>
        </View>
        <MaterialCommunityIcons name={content.iconName} size={s.iconSize} color={iconColor} />
      </View>

      <View style={styles.middleWrap}>
        <Text style={[styles.middleLabel, { fontSize: s.middleLabelSize, color: mutedColor }]}>
          {content.middleLabel}
        </Text>
        <Text
          style={[styles.middleValue, { fontSize: s.middleValueSize, color: primaryColor }]}
          numberOfLines={2}
        >
          {content.middleValue}
        </Text>
      </View>

      <View style={styles.footerRow}>
        <View style={styles.footerColLeft}>
          <Text style={[styles.metaLabel, { fontSize: s.metaLabelSize, color: mutedColor }]}>
            {content.bottomLeftLabel}
          </Text>
          <Text
            style={[styles.metaValue, { fontSize: s.metaValueSize, color: primaryColor }]}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {content.bottomLeftValue}
          </Text>
        </View>
        <View style={styles.footerColRight}>
          <Text style={[styles.metaLabel, { fontSize: s.metaLabelSize, color: mutedColor }]}>
            {content.bottomRightLabel}
          </Text>
          <Text
            style={[styles.metaValue, styles.metaValueRight, { fontSize: s.metaValueSize, color: primaryColor }]}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {content.bottomRightValue}
          </Text>
        </View>
      </View>
      {!!onFlip && <View style={styles.hiddenFlipTapArea} />}
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
    alignItems: 'flex-start',
  },
  headerTextWrap: {
    flex: 1,
    paddingRight: 12,
  },
  topLabel: {
    fontFamily: 'ReadexPro-Regular',
    letterSpacing: 0.2,
  },
  topValue: {
    fontFamily: 'ReadexPro-Medium',
    marginTop: 2,
  },
  middleWrap: {
    marginTop: 22,
    flex: 1,
  },
  middleLabel: {
    fontFamily: 'ReadexPro-Regular',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  middleValue: {
    fontFamily: 'OpenSans-SemiBold',
    marginTop: 4,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
  },
  footerColLeft: {
    flex: 1,
  },
  footerColRight: {
    flex: 1,
    alignItems: 'flex-end',
  },
  metaLabel: {
    fontFamily: 'ReadexPro-Regular',
    marginBottom: 4,
  },
  metaValue: {
    fontFamily: 'OpenSans-Bold',
  },
  metaValueRight: {
    textAlign: 'right',
  },
  hiddenFlipTapArea: {
    position: 'absolute',
    width: 0,
    height: 0,
  },
});
