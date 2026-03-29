import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Image, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, ClipPath, Defs, Rect } from "react-native-svg";

const VISA_LOGO = require("@/assets/brands/visa-logo.png");

// Visa: tinted PNG (black-on-transparent adapts to card text color)
// Sized to match Mastercard heights — PNG is square so width === height.
const VISA_SIZE: Record<
  "full" | "compact" | "small",
  { h: number; w: number }
> = {
  full: { h: 55, w: 55 },
  compact: { h: 40, w: 40 },
  small: { h: 34, w: 34 },
};

// Mastercard: always fixed colors — white left circle, gray overlap, dark right circle
const MC_SIZE: Record<"full" | "compact" | "small", number> = {
  full: 50,
  compact: 40,
  small: 34,
};

function MastercardMark({ size }: { size: "full" | "compact" | "small" }) {
  const h = MC_SIZE[size];
  // viewBox 0 0 50 35 — two circles r=13 centered at (17,17.5) and (33,17.5)
  return (
    <Svg width={h * (50 / 35)} height={h} viewBox="0 0 50 35">
      <Defs>
        <ClipPath id="mcLeftClip">
          <Circle cx={17} cy={17.5} r={13} />
        </ClipPath>
      </Defs>
      {/* Left circle — white */}
      <Circle cx={17} cy={17.5} r={13} fill="#FFFFFF" />
      {/* Right circle — near-black */}
      <Circle cx={33} cy={17.5} r={13} fill="#1A1A1A" />
      {/* Overlap — gray, clipped to the left circle */}
      <Circle
        cx={33}
        cy={17.5}
        r={13}
        fill="#888888"
        clipPath="url(#mcLeftClip)"
      />
    </Svg>
  );
}

import { ExpiryBadge } from "@/components/ExpiryBadge";
import { getCardSideContent, getContrastColor } from "@/types/card";
import type { WalletCard } from "@/types/card";
import { useCardStore } from "@/store/useCardStore";
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

type CardSize = "full" | "compact" | "small";

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
  const language = useCardStore((state) => state.language);
  const s = SIZES[size];
  const withShadow = size === "full";
  const content = getCardSideContent(card, side);

  const localize = (text: string) => {
    if (language !== "mk") return text;

    const labels: Record<string, string> = {
      "Card Number": "Број на картичка",
      "Expiry Date": "Важи до",
      Expires: "Истекува",
      Brand: "Бренд",
      "Account Number": "Број на сметка",
      CARDHOLDER: "НОСИТЕЛ",
      MEMBER: "ЧЛЕН",
      "Member Since": "Член од",
      "Member ID": "ID на член",
      Tier: "Ниво",
      Program: "Програма",
      "Membership No.": "Бр. членство",
      Address: "Адреса",
      Issued: "Издадено",
      Registration: "Регистрација",
      Vehicle: "Возило",
      VIN: "VIN",
      "BADGE HOLDER": "НОСИТЕЛ НА БЕЏ",
      "Employee ID": "ID на вработен",
      Department: "Оддел",
      "Access Level": "Ниво на пристап",
      "Date of Issue": "Датум на издавање",
      "Date of Expiry": "Датум на истекување",
      "Birth Date": "Датум на раѓање",
      OWNER: "СОПСТВЕНИК",
      "Owner Name": "Име на сопственик",
      "License Number": "Број на дозвола",
      Class: "Класа",
      "Passport No.": "Број на пасош",
      Nationality: "Националност",
      "National ID Num.": "Матичен број",
      "ID Number": "ID број",
      "Document Number": "Број на документ",
      "Secondary Number": "Секундарен број",
      "Group Number": "Групен број",
      Authority: "Орган",
      Company: "Компанија",
      Provider: "Провајдер",
      Club: "Клуб",
      "Not added": "Не е додадено",
      Mastercard: "Мастеркард",
      Visa: "Виза",
      "Debit Card": "Дебитна картичка",
      "Credit Card": "Кредитна картичка",
      "Identity Card": "Лична карта",
      "Driving License": "Возачка дозвола",
      Passport: "Пасош",
      "Club Card": "Клуб картичка",
      "Gym Pass": "Фитнес пропусница",
      "Loyalty Card": "Лојалти картичка",
      "Health Insurance": "Здравствено осигурување",
      "Travel Insurance": "Патничко осигурување",
      "Pet Insurance": "Осигурување за миленик",
      "Vehicle Registration": "Сообраќајна дозвола",
      "Insurance Green Card": "Зелен картон",
      "Roadside Assistance": "Помош на пат",
      "Employee Badge": "Беџ за вработен",
      "Office Access": "Канцелариски пристап",
      "Visitor Pass": "Посетителска пропусница",
    };

    return labels[text] ?? text;
  };

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
            {localize(content.topLabel)}
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
            {localize(content.topValue)}
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
              {localize(content.middleLabel)}
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
              {localize(content.middleValue)}
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
                    {localize(content.bottomLeftLabel)}
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
                    {localize(content.bottomLeftValue)}
                  </Text>
                ) : null}
              </View>
            ) : null}
            {hasBottomRight ? (
              <View style={styles.footerColRight}>
                {content.bottomRightLabel === "Brand" &&
                (card.brand === "visa" || card.brand === "mastercard") ? (
                  card.brand === "visa" ? (
                    <Image
                      source={VISA_LOGO}
                      style={{
                        width: VISA_SIZE[size].w,
                        height: VISA_SIZE[size].h,
                        tintColor: primaryColor,
                      }}
                      resizeMode="contain"
                    />
                  ) : (
                    <MastercardMark size={size} />
                  )
                ) : (
                  <>
                    {content.bottomRightLabel ? (
                      <Text
                        style={[
                          styles.metaLabel,
                          { fontSize: s.metaLabelSize, color: mutedColor },
                        ]}
                      >
                        {localize(content.bottomRightLabel)}
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
                        {localize(content.bottomRightValue)}
                      </Text>
                    ) : null}
                  </>
                )}
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
