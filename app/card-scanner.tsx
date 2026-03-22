import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { scanImageWithOCR } from '@/utils/ocrScanner';
import type { ScannedCardData } from '@/utils/ocrScanner';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const VIEWFINDER_WIDTH = SCREEN_WIDTH - 48;
const VIEWFINDER_HEIGHT = VIEWFINDER_WIDTH * 0.63;
const CORNER_SIZE = 22;
const CORNER_THICKNESS = 3;

export default function CardScannerScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [scanType, setScanType] = useState<'document' | 'card' | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);

  const handleClose = () => {
    if (scanType !== null) {
      setScanType(null);
      return;
    }
    if (router.canGoBack()) router.back();
    else router.dismissTo('/');
  };

  const handleSelectType = async (type: 'document' | 'card') => {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        Alert.alert(
          'Camera access required',
          'Please enable camera access in Settings to scan cards and documents.'
        );
        return;
      }
    }
    setScanType(type);
  };

  const handleCapture = async () => {
    if (!cameraRef.current || isProcessing || !scanType) return;
    setIsProcessing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.9 });
      if (!photo?.uri) throw new Error('Could not capture photo.');
      const result = await scanImageWithOCR(photo.uri, scanType);
      router.push({
        pathname: '/card-scan-confirm',
        params: { payload: JSON.stringify(result) },
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Something went wrong.';
      Alert.alert('Scan error', message);
    } finally {
      setIsProcessing(false);
    }
  };

  // ── Camera capture stage ──────────────────────────────────────────────────
  if (scanType !== null) {
    return (
      <View style={styles.cameraRoot}>
        <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" />

        {/* Dimmed overlay with transparent viewfinder slot */}
        <View style={[StyleSheet.absoluteFill, styles.overlayColumn]}>
          {/* top dark band */}
          <View style={[styles.darkBand, styles.overlayTop]} />
          {/* middle row */}
          <View style={styles.overlayMiddle}>
            <View style={styles.darkStrip} />
            <View style={styles.viewfinder}>
              <View style={[styles.corner, styles.cornerTL]} />
              <View style={[styles.corner, styles.cornerTR]} />
              <View style={[styles.corner, styles.cornerBL]} />
              <View style={[styles.corner, styles.cornerBR]} />
            </View>
            <View style={styles.darkStrip} />
          </View>
          {/* bottom dark band — contains instruction text */}
          <View style={[styles.darkBand, styles.overlayBottom]}>
            <Text style={styles.instructionText}>
              {scanType === 'card'
                ? 'Position your card within the frame'
                : 'Position your document within the frame'}
            </Text>
          </View>
        </View>

        {/* Header */}
        <View style={[styles.cameraHeader, { paddingTop: insets.top + 8 }]}>
          <Pressable onPress={handleClose} style={styles.cameraHeaderBtn} hitSlop={12}>
            <Feather name="arrow-left" size={24} color="#FFFFFF" />
          </Pressable>
          <Text style={styles.cameraHeaderTitle}>
            {scanType === 'card' ? 'Scan Bank Card' : 'Scan Document'}
          </Text>
          <View style={styles.cameraHeaderBtn} />
        </View>

        {/* Capture button */}
        <View style={[styles.captureWrap, { paddingBottom: insets.bottom + 24 }]}>
          <Pressable
            onPress={handleCapture}
            disabled={isProcessing}
            style={({ pressed }) => [styles.captureBtn, pressed && { opacity: 0.75 }]}
          >
            {isProcessing ? (
              <ActivityIndicator size="small" color="#1D1D1D" />
            ) : (
              <View style={styles.captureInner} />
            )}
          </Pressable>
        </View>

        {/* Full-screen processing overlay */}
        {isProcessing && (
          <View style={styles.processingOverlay}>
            <ActivityIndicator size="large" color="#FFFFFF" />
            <Text style={styles.processingText}>Scanning…</Text>
          </View>
        )}
      </View>
    );
  }

  // ── Picker stage ──────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <Pressable onPress={handleClose} style={styles.headerButton} hitSlop={12}>
          <Feather name="arrow-left" size={24} color="#FFFFFF" />
        </Pressable>
        <Text style={styles.headerTitle}>Scan Card</Text>
        <View style={styles.headerButton} />
      </View>

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
          subtitle="Supports IDs, passports and driving licences"
          onPress={() => handleSelectType('document')}
        />
        <ScanOptionCard
          icon={
            <MaterialCommunityIcons name="credit-card-outline" size={32} color="#FFFFFF" />
          }
          title="Scan Bank Card"
          subtitle="Extract card number, expiry and name"
          onPress={() => handleSelectType('card')}
        />
      </View>
    </SafeAreaView>
  );
}

function ScanOptionCard({
  icon,
  title,
  subtitle,
  onPress,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.optionCard, pressed ? styles.optionCardPressed : null]}
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
  // ── Picker stage ────────────────────────────────────────────────────────
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
  // ── Camera stage ─────────────────────────────────────────────────────────
  cameraRoot: {
    flex: 1,
    backgroundColor: '#000',
  },
  overlayColumn: {
    flexDirection: 'column',
  },
  darkBand: {
    backgroundColor: 'rgba(0,0,0,0.62)',
  },
  overlayTop: {
    flex: 1,
  },
  overlayMiddle: {
    flexDirection: 'row',
    height: VIEWFINDER_HEIGHT,
  },
  darkStrip: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.62)',
  },
  overlayBottom: {
    flex: 1.4,
    alignItems: 'center',
    paddingTop: 20,
  },
  viewfinder: {
    width: VIEWFINDER_WIDTH,
    height: VIEWFINDER_HEIGHT,
  },
  corner: {
    position: 'absolute',
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderColor: '#FFFFFF',
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: CORNER_THICKNESS,
    borderLeftWidth: CORNER_THICKNESS,
    borderTopLeftRadius: 4,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: CORNER_THICKNESS,
    borderRightWidth: CORNER_THICKNESS,
    borderTopRightRadius: 4,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: CORNER_THICKNESS,
    borderLeftWidth: CORNER_THICKNESS,
    borderBottomLeftRadius: 4,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: CORNER_THICKNESS,
    borderRightWidth: CORNER_THICKNESS,
    borderBottomRightRadius: 4,
  },
  cameraHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 14,
  },
  cameraHeaderBtn: {
    width: 40,
    alignItems: 'center',
  },
  cameraHeaderTitle: {
    fontFamily: 'ReadexPro-Medium',
    fontSize: 17,
    color: '#FFFFFF',
  },
  instructionText: {
    fontFamily: 'ReadexPro-Regular',
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  captureWrap: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  captureBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  captureInner: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#1D1D1D',
  },
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
  },
  processingText: {
    fontFamily: 'ReadexPro-Regular',
    fontSize: 16,
    color: '#FFFFFF',
  },
});

