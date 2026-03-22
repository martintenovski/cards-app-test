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
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);

  const handleClose = () => {
    if (isCameraActive) {
      setIsCameraActive(false);
      return;
    }
    if (router.canGoBack()) router.back();
    else router.dismissTo('/');
  };

  const handleStartScanner = async () => {
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
    setIsCameraActive(true);
  };

  const handleCapture = async () => {
    if (!cameraRef.current || isProcessing) return;
    setIsProcessing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.9 });
      if (!photo?.uri) throw new Error('Could not capture photo.');
      const result = await scanImageWithOCR(photo.uri, 'auto');
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
  if (isCameraActive) {
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
              Hold any card or document inside the frame and we’ll detect the type automatically.
            </Text>
          </View>
        </View>

        {/* Header */}
        <View style={[styles.cameraHeader, { paddingTop: insets.top + 8 }]}>
          <Pressable onPress={handleClose} style={styles.cameraHeaderBtn} hitSlop={12}>
            <Feather name="arrow-left" size={24} color="#FFFFFF" />
          </Pressable>
          <Text style={styles.cameraHeaderTitle}>Auto Scan</Text>
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
        <Text style={styles.headerTitle}>Scan Cards</Text>
        <View style={styles.headerButton} />
      </View>

      <View style={styles.heroWrap}>
        <View style={styles.heroCard}>
          <View style={styles.heroIconWrap}>
            <MaterialCommunityIcons name="card-search-outline" size={42} color="#FFFFFF" />
          </View>
          <Text style={styles.heroTitle}>One-tap auto scan</Text>
          <Text style={styles.heroSubtitle}>
            Detects bank cards, IDs, passports and driving licences without making you pick a type first.
          </Text>

          <View style={styles.heroChipRow}>
            <View style={styles.heroChip}>
              <Text style={styles.heroChipText}>Bank</Text>
            </View>
            <View style={styles.heroChip}>
              <Text style={styles.heroChipText}>ID</Text>
            </View>
            <View style={styles.heroChip}>
              <Text style={styles.heroChipText}>License</Text>
            </View>
            <View style={styles.heroChip}>
              <Text style={styles.heroChipText}>Passport</Text>
            </View>
          </View>

          <Pressable style={styles.heroButton} onPress={handleStartScanner}>
            <Text style={styles.heroButtonText}>Start Auto Scan</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
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
  heroWrap: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 40,
  },
  heroCard: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: '#252525',
    paddingHorizontal: 24,
    paddingVertical: 28,
    alignItems: 'center',
    gap: 16,
  },
  heroIconWrap: {
    width: 86,
    height: 86,
    borderRadius: 43,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  heroTitle: {
    fontFamily: 'ReadexPro-Medium',
    fontSize: 24,
    color: '#FFFFFF',
  },
  heroSubtitle: {
    fontFamily: 'ReadexPro-Regular',
    fontSize: 15,
    lineHeight: 22,
    color: 'rgba(255,255,255,0.55)',
    textAlign: 'center',
  },
  heroChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  heroChip: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  heroChipText: {
    fontFamily: 'ReadexPro-Regular',
    fontSize: 13,
    color: '#FFFFFF',
  },
  heroButton: {
    width: '100%',
    marginTop: 6,
    height: 58,
    borderRadius: 999,
    backgroundColor: '#EFEFEF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroButtonText: {
    fontFamily: 'ReadexPro-Medium',
    fontSize: 18,
    color: '#1D1D1D',
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
    fontSize: 15,
    lineHeight: 21,
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

