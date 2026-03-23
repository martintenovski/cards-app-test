import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Rect } from "react-native-svg";

import { ExpiryBadge } from "@/components/ExpiryBadge";
import { getCardSideContent, getContrastColor } from "@/types/card";
import type { WalletCard } from "@/types/card";
import { supportsValidityBadge } from "@/utils/expiry";

// Sizes derived directly from Figma design
const SIZES = {
  full: {
    width: 380,
    height: 225,
    radius: 30,
    padding: 25,
    topLabelSize: 14,
    topValueSize: 18,
    middleLabelSize: 13,
    middleValueSize: 18,
    metaLabelSize: 13,
    metaValueSize: 16,
    iconSize: 22,
    sectionGap: 12,
    footerGap: 14,
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
    sectionGap: 10,
    footerGap: 12,
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
    sectionGap: 8,
    footerGap: 10,
  },
};

export type CardSize = "full" | "compact" | "small";

type CardItemProps = {
  card: WalletCard;
  side?: "front" | "back";
  size?: CardSize;
  onFlip?: () => void;
  showExpirySuffix?: boolean;
  showExpiryBadge?: boolean;
};

export function CardItem({
  card,
  side = "front",
  size = "full",
  onFlip,
  showExpirySuffix = false,
  showExpiryBadge = true,
}: CardItemProps) {
  const s = SIZES[size];
  const withShadow = size === "full";
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

  const gradient = card.palette.gradient ?? [
    card.palette.background,
    card.palette.background,
  ];
  // Always derive from gradient at render time — immune to stale persisted palette values
  const primaryColor = getContrastColor(gradient[0]);
  const mutedColor =
    primaryColor === "#1D1D1D"
      ? "rgba(29,29,29,0.65)"
      : "rgba(255,255,255,0.65)";
  const iconColor =
    primaryColor === "#1D1D1D"
      ? "rgba(29,29,29,0.85)"
      : "rgba(255,255,255,0.9)";
  const hasMiddleContent = Boolean(content.middleLabel || content.middleValue);
  const hasBottomLeft = Boolean(
    content.bottomLeftLabel || content.bottomLeftValue,
  );
  const hasBottomRight = Boolean(
    content.bottomRightLabel || content.bottomRightValue,
  );
  const shouldShowBadge = showExpiryBadge && supportsValidityBadge(card);

  return (
    <LinearGradient
      colors={side === "back" ? [gradient[1], gradient[0]] : gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={gradientStyle}
    >
      {shouldShowBadge ? (
        <View
          style={[styles.badgeWrap, { top: s.padding + 36, right: s.padding }]}
        >
          <ExpiryBadge
            card={card}
            compact={size !== "full"}
            showSuffix={showExpirySuffix}
          />
        </View>
      ) : null}

      <View style={styles.row}>
        <View style={styles.headerTextWrap}>
          <Text
            style={[
              styles.topLabel,
              { fontSize: s.topLabelSize, color: mutedColor },
            ]}
          >
            {content.topLabel}
          </Text>
          <Text
            style={[
              styles.topValue,
              {
                fontSize: s.topValueSize,
                lineHeight: Math.round(s.topValueSize * 1.25),
                color: primaryColor,
              },
            ]}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {content.topValue}
          </Text>
        </View>
        <MaterialCommunityIcons
          name={content.iconName}
          size={s.iconSize}
          color={iconColor}
        />
      </View>

      {hasMiddleContent ? (
        <View style={[styles.middleWrap, { marginTop: s.sectionGap }]}>
          {content.middleLabel ? (
            <Text
              style={[
                styles.middleLabel,
                { fontSize: s.middleLabelSize, color: mutedColor },
              ]}
            >
              {content.middleLabel}
            </Text>
          ) : null}
          {content.middleValue ? (
            <Text
              style={[
                styles.middleValue,
                {
                  fontSize: s.middleValueSize,
                  lineHeight: Math.round(s.middleValueSize * 1.25),
                  color: primaryColor,
                },
              ]}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {content.middleValue}
            </Text>
          ) : null}
        </View>
      ) : (
        <View style={styles.middleSpacer} />
      )}

      <View style={[styles.footerRow, { marginTop: s.footerGap }]}>
        {content.footerVariant === "barcode" && content.barcodeValue ? (
          <View style={styles.barcodeWrap}>
            <BarcodeStrip value={content.barcodeValue} color={primaryColor} />
            <Text style={[styles.barcodeDigits, { color: primaryColor }]}>
              {content.barcodeValue}
            </Text>
          </View>
        ) : (
          <>
            {hasBottomLeft ? (
              <View style={styles.footerColLeft}>
                {content.bottomLeftLabel ? (
                  <Text
                    style={[
                      styles.metaLabel,
                      { fontSize: s.metaLabelSize, color: mutedColor },
                    ]}
                  >
                    {content.bottomLeftLabel}
                  </Text>
                ) : null}
                {content.bottomLeftValue ? (
                  <Text
                    style={[
                      styles.metaValue,
                      {
                        fontSize: s.metaValueSize,
                        lineHeight: Math.round(s.metaValueSize * 1.2),
                        color: primaryColor,
                      },
                    ]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                  >
                    {content.bottomLeftValue}
                  </Text>
                ) : null}
              </View>
            ) : null}
            {hasBottomRight ? (
              <View style={styles.footerColRight}>
                {content.bottomRightLabel ? (
                  <Text
                    style={[
                      styles.metaLabel,
                      { fontSize: s.metaLabelSize, color: mutedColor },
                    ]}
                  >
                    {content.bottomRightLabel}
                  </Text>
                ) : null}
                {content.bottomRightValue ? (
                  <Text
                    style={[
                      styles.metaValue,
                      styles.metaValueRight,
                      {
                        fontSize: s.metaValueSize,
                        lineHeight: Math.round(s.metaValueSize * 1.2),
                        color: primaryColor,
                      },
                    ]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                  >
                    {content.bottomRightValue}
                  </Text>
                ) : null}
              </View>
            ) : null}
          </>
        )}
      </View>
      {!!onFlip && <View style={styles.hiddenFlipTapArea} />}
    </LinearGradient>
  );
}

const EAN_DIGIT_PATTERNS: Record<string, string> = {
  "0": "0001101",
  "1": "0011001",
  "2": "0010011",
  "3": "0111101",
  "4": "0100011",
  "5": "0110001",
  "6": "0101111",
  "7": "0111011",
  "8": "0110111",
  "9": "0001011",
};

function BarcodeStrip({ value, color }: { value: string; color: string }) {
  const digits = value.replace(/\D/g, "").slice(0, 18);
  const pattern = [
    "101",
    ...digits.split("").map((digit) => EAN_DIGIT_PATTERNS[digit] ?? "0010011"),
    "101",
  ].join("01");
  const width = pattern.length;

  return (
    <Svg
      width="100%"
      height={46}
      viewBox={`0 0 ${width} 46`}
      preserveAspectRatio="none"
    >
      {pattern
        .split("")
        .map((bar, index) =>
          bar === "1" ? (
            <Rect
              key={`${value}-${index}`}
              x={index}
              y={0}
              width={1}
              height={46}
              fill={color}
            />
          ) : null,
        )}
    </Svg>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "100%",
    overflow: "hidden",
    flexDirection: "column",
  },
  shadow: {
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -5 },
    elevation: 8,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  badgeWrap: {
    position: "absolute",
    zIndex: 4,
  },
  headerTextWrap: {
    flex: 1,
    paddingRight: 12,
  },
  topLabel: {
    fontFamily: "ReadexPro-Regular",
    letterSpacing: 0.2,
  },
  topValue: {
    fontFamily: "ReadexPro-Medium",
    marginTop: 2,
  },
  middleWrap: {
    flex: 1,
    justifyContent: "flex-start",
    minHeight: 48,
  },
  middleSpacer: {
    flex: 1,
  },
  middleLabel: {
    fontFamily: "ReadexPro-Regular",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  middleValue: {
    fontFamily: "OpenSans-SemiBold",
    marginTop: 2,
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 16,
    minHeight: 46,
  },
  footerColLeft: {
    flex: 1,
  },
  footerColRight: {
    flex: 1,
    alignItems: "flex-end",
  },
  metaLabel: {
    fontFamily: "ReadexPro-Regular",
    marginBottom: 4,
  },
  metaValue: {
    fontFamily: "OpenSans-Bold",
  },
  metaValueRight: {
    textAlign: "right",
  },
  barcodeWrap: {
    width: "100%",
    marginTop: 2,
  },
  barcodeDigits: {
    marginTop: 6,
    textAlign: "center",
    fontFamily: "OpenSans-SemiBold",
    fontSize: 12,
    letterSpacing: 1.2,
  },
  hiddenFlipTapArea: {
    position: "absolute",
    width: 0,
    height: 0,
  },
});
