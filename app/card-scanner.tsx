import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
  const [permission, requestPermission] = useCameraPermissions();

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

    if (!permission?.granted) {
      const { granted } = await requestPermission();
      if (!granted) {
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
        Alert.alert('Scan failed', 'Please try again in better lighting.');
        return;
      }

      const { rawResult: _rawResult, ...serializableResult } = result;

      router.push({
        pathname: '/card-scan-confirm',
        params: {
          payload: JSON.stringify(serializableResult),
        },
      });
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
                size={34}
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
                size={34}
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
      <Text style={styles.optionTitle}>{title}</Text>
      <Text style={styles.optionSubtitle}>{subtitle}</Text>
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
    paddingHorizontal: 24,
    justifyContent: 'center',
    gap: 18,
  },
  optionCard: {
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: '#252525',
    paddingHorizontal: 24,
    paddingVertical: 28,
    alignItems: 'center',
  },
  optionCardPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.995 }],
  },
  optionCardDisabled: {
    opacity: 0.6,
  },
  optionIconWrap: {
    width: 68,
    height: 68,
    borderRadius: 34,
    marginBottom: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  optionTitle: {
    fontFamily: 'ReadexPro-Medium',
    fontSize: 20,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  optionSubtitle: {
    marginTop: 8,
    fontFamily: 'ReadexPro-Regular',
    fontSize: 14,
    lineHeight: 22,
    color: 'rgba(255,255,255,0.66)',
    textAlign: 'center',
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
