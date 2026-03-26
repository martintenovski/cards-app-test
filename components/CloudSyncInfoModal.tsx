import { Feather } from "@expo/vector-icons";
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useColorScheme,
  useWindowDimensions,
} from "react-native";
import Svg, { Path } from "react-native-svg";

import { APP_THEME, resolveTheme } from "@/utils/theme";
import { useCardStore } from "@/store/useCardStore";

type Props = {
  visible: boolean;
  onClose: () => void;
};

function GoogleGIcon({ size = 20 }: { size?: number }) {
  return (
    <Svg viewBox="0 0 533.5 544.3" width={size} height={size * (544.3 / 533.5)}>
      <Path
        d="M533.5 278.4c0-18.5-1.5-37.1-4.7-55.3H272.1v104.8h147c-6.1 33.8-25.7 63.7-54.4 82.7v68h87.7c51.5-47.4 81.1-117.4 81.1-200.2z"
        fill="#4285F4"
      />
      <Path
        d="M272.1 544.3c73.4 0 135.3-24.1 180.4-65.7l-87.7-68c-24.4 16.6-55.9 26-92.6 26-71 0-131.2-47.9-152.8-112.3H28.9v70.1c46.2 91.9 140.3 149.9 243.2 149.9z"
        fill="#34A853"
      />
      <Path
        d="M119.3 324.3c-11.4-33.8-11.4-70.4 0-104.2V150H28.9c-38.6 76.9-38.6 167.5 0 244.4l90.4-70.1z"
        fill="#FBBC04"
      />
      <Path
        d="M272.1 107.7c38.8-.6 76.3 14 104.4 40.8l77.7-77.7C405 24.6 339.7-.8 272.1 0 169.2 0 75.1 58 28.9 150l90.4 70.1c21.5-64.5 81.8-112.4 152.8-112.4z"
        fill="#EA4335"
      />
    </Svg>
  );
}

type SectionProps = {
  icon: React.ReactNode;
  title: string;
  body: React.ReactNode;
  colors: (typeof APP_THEME)[keyof typeof APP_THEME];
};

function InfoSection({ icon, title, body, colors }: SectionProps) {
  return (
    <View
      style={[
        styles.infoSection,
        { backgroundColor: colors.surfaceMuted, borderColor: colors.border },
      ]}
    >
      <View style={styles.infoSectionHeader}>
        {icon}
        <Text style={[styles.infoSectionTitle, { color: colors.text }]}>
          {title}
        </Text>
      </View>
      <Text style={[styles.infoSectionBody, { color: colors.textMuted }]}>
        {body}
      </Text>
    </View>
  );
}

export function CloudSyncInfoModal({ visible, onClose }: Props) {
  const themePreference = useCardStore((state) => state.themePreference);
  const deviceScheme = useColorScheme();
  const resolvedTheme = resolveTheme(themePreference, deviceScheme);
  const colors = APP_THEME[resolvedTheme];
  const { height: screenHeight } = useWindowDimensions();
  const scrollMaxHeight = screenHeight * 0.45;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.root}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessible={false}
        >
          <View style={styles.backdrop} />
        </Pressable>
        <View style={styles.centered} pointerEvents="box-none">
          <View
            style={[
              styles.sheet,
              {
                backgroundColor: colors.surface,
                shadowColor: "#000",
              },
            ]}
          >
          <View style={styles.sheetHeader}>
            <Text style={[styles.sheetTitle, { color: colors.text }]}>
              How Cloud Sync Works
            </Text>
            <Pressable
              onPress={onClose}
              style={[
                styles.closeButton,
                { backgroundColor: colors.surfaceMuted },
              ]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Feather name="x" size={18} color={colors.textMuted} />
            </Pressable>
          </View>

          <Text style={[styles.sheetSubtitle, { color: colors.textMuted }]}>
            Your data stays private at every step. Here's what's used and why.
          </Text>

          <ScrollView
            style={[styles.scrollArea, { maxHeight: scrollMaxHeight }]}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            <InfoSection
              icon={<GoogleGIcon size={20} />}
              title="Google Sign-In"
              body={
                <>
                  {"Used for secure, passwordless authentication via Google's official OAuth flow. "}
                  <Text style={styles.bold}>{"Pocket ID never sees or stores your Google password"}</Text>
                  {" — only your user ID, email, and display name are used to link your encrypted vault. All credential handling is done by Google directly on your device."}
                </>
              }
              colors={colors}
            />

            <InfoSection
              icon={
                <Image
                  source={require("../assets/supabase.png")}
                  style={styles.supabaseIcon}
                />
              }
              title="Supabase (Database)"
              body={
                <>
                  {"Your encrypted card snapshots are stored in a Supabase database — an open-source backend built on PostgreSQL. "}
                  <Text style={styles.bold}>{"Your cards are always encrypted on your device before they leave it."}</Text>
                  {" The database only ever stores ciphertext. "}
                  <Text style={styles.bold}>{"Neither the developer nor Supabase can read your card data."}</Text>
                </>
              }
              colors={colors}
            />

            <InfoSection
              icon={<Feather name="lock" size={20} color={colors.textSoft} />}
              title="ChaCha20-Poly1305 Encryption"
              body={
                <>
                  {"Your sync passphrase is stretched into a 256-bit key using the scrypt key-derivation function. That key is used with "}
                  <Text style={styles.bold}>{"ChaCha20-Poly1305"}</Text>
                  {", an authenticated encryption cipher trusted by TLS and used in apps like WhatsApp and Signal. "}
                  <Text style={styles.bold}>{"Every upload uses a fresh random nonce, so each snapshot is uniquely encrypted — even with the same passphrase."}</Text>
                </>
              }
              colors={colors}
            />

            <View
              style={[
                styles.trustBadge,
                { backgroundColor: colors.surfaceMuted, borderColor: colors.border },
              ]}
            >
              <Feather name="shield" size={15} color={colors.textSoft} />
              <Text
                style={[styles.trustBadgeText, { color: colors.textSoft }]}
              >
                End-to-end encrypted · No plaintext ever leaves your device
              </Text>
            </View>
          </ScrollView>
        </View>
      </View>
    </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  centered: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  sheet: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 28,
    padding: 24,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  sheetTitle: {
    fontFamily: "ReadexPro-Bold",
    fontSize: 20,
    flex: 1,
    marginRight: 12,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetSubtitle: {
    fontFamily: "ReadexPro-Regular",
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 18,
  },
  scrollArea: {},
  scrollContent: {
    gap: 12,
    paddingBottom: 4,
  },
  infoSection: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
  },
  infoSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  infoSectionTitle: {
    fontFamily: "ReadexPro-Bold",
    fontSize: 15,
    flex: 1,
  },
  infoSectionBody: {
    fontFamily: "ReadexPro-Regular",
    fontSize: 13,
    lineHeight: 21,
  },
  trustBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginTop: 4,
  },
  trustBadgeText: {
    fontFamily: "ReadexPro-Medium",
    fontSize: 12,
    flex: 1,
  },
  supabaseIcon: {
    width: 20,
    height: 20,
    borderRadius: 4,
  },
  bold: {
    fontFamily: "ReadexPro-Bold",
  },
});
