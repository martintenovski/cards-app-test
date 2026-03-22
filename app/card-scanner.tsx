import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  PermissionsAndroid,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { scanWithBlinkID, type ScannedCardData } from '@/utils/blinkidSetup';

export default function CardScannerScreen() {
  const router = useRouter();
  const [isScanning, setIsScanning] = useState(false);

  const handleClose = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.dismissTo('/');
  };

  const handleScan = async (type: 'document' | 'card') => {
    if (isScanning) {
      return;
    }

    if (Platform.OS === 'android') {
      const status = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.CAMERA,
        {
          title: 'Camera access required',
          message: 'Camera is required to scan identity documents and bank cards.',
          buttonPositive: 'Allow',
          buttonNegative: 'Deny',
        }
      );
      if (status !== PermissionsAndroid.RESULTS.GRANTED) {
        Alert.alert(
          'Camera access required',
          'Please enable camera access in Settings to scan cards and documents.'
        );
        return;
      }
    }

    setIsScanning(true);

    try {
      const result = await scanWithBlinkID(type);

      if (!result) {
        // User likely cancelled or no document was detected — silent return
        return;
      }

      const { rawResult: _rawResult, ...serializableResult } = result;

      router.push({
        pathname: '/card-scan-confirm',
        params: {
          payload: JSON.stringify(serializableResult),
        },
      });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Something went wrong.';
      Alert.alert('Scan error', message);
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <Pressable onPress={handleClose} style={styles.headerButton} hitSlop={12}>
          <Feather name="arrow-left" size={24} color="#FFFFFF" />
        </Pressable>
        <Text style={styles.headerTitle}>Scan Card</Text>
        <View style={styles.headerButton} />
      </View>

      {isScanning ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#FFFFFF" />
          <Text style={styles.loadingText}>Scanning...</Text>
        </View>
      ) : (
        <View style={styles.optionsWrap}>
          <ScanOptionCard
            icon={
              <MaterialCommunityIcons
                name="card-account-details-outline"
                size={32}
                color="#FFFFFF"
              />
            }
            title="Scan ID / Passport / License"
            subtitle="Supports 500+ document types worldwide"
            onPress={() => handleScan('document')}
            disabled={isScanning}
          />

          <ScanOptionCard
            icon={
              <MaterialCommunityIcons
                name="credit-card-outline"
                size={32}
                color="#FFFFFF"
              />
            }
            title="Scan Bank Card"
            subtitle="Extract card number, expiry and name"
            onPress={() => handleScan('card')}
            disabled={isScanning}
          />
        </View>
      )}
    </SafeAreaView>
  );
}

function ScanOptionCard({
  icon,
  title,
  subtitle,
  onPress,
  disabled,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onPress: () => void;
  disabled: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.optionCard,
        pressed && !disabled ? styles.optionCardPressed : null,
        disabled ? styles.optionCardDisabled : null,
      ]}
    >
      <View style={styles.optionIconWrap}>{icon}</View>
      <View style={styles.optionTextWrap}>
        <Text style={styles.optionTitle}>{title}</Text>
        <Text style={styles.optionSubtitle}>{subtitle}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#1D1D1D',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  headerButton: {
    width: 40,
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: 'ReadexPro-Medium',
    fontSize: 17,
    color: '#FFFFFF',
  },
  optionsWrap: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'center',
    gap: 14,
    paddingBottom: 60,
  },
  optionCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: '#252525',
    paddingHorizontal: 20,
    paddingVertical: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  optionCardPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  optionCardDisabled: {
    opacity: 0.5,
  },
  optionIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    flexShrink: 0,
  },
  optionTextWrap: {
    flex: 1,
  },
  optionTitle: {
    fontFamily: 'ReadexPro-Medium',
    fontSize: 18,
    color: '#FFFFFF',
  },
  optionSubtitle: {
    marginTop: 4,
    fontFamily: 'ReadexPro-Regular',
    fontSize: 13,
    lineHeight: 19,
    color: 'rgba(255,255,255,0.55)',
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
  },
  loadingText: {
    fontFamily: 'ReadexPro-Regular',
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
  },
});
