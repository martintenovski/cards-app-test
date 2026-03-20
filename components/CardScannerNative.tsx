import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import TextRecognition from '@react-native-ml-kit/text-recognition';
import { Camera, useCameraDevice, useCameraPermission } from 'react-native-vision-camera';

import { extractCardInfo } from '@/utils/extractCardInfo';

export default function CardScannerNative() {
  const router = useRouter();
  const camera = useRef<Camera>(null);
  const { width } = useWindowDimensions();
  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice('back');
  const [permissionResolved, setPermissionResolved] = useState(false);
  const [captureError, setCaptureError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const frameWidth = Math.min(width * 0.85, 380);
  const frameHeight = frameWidth / 1.586;
  const scanLineOffset = useSharedValue(0);

  useEffect(() => {
    if (!hasPermission) {
      requestPermission().finally(() => setPermissionResolved(true));
    } else {
      setPermissionResolved(true);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    scanLineOffset.value = withRepeat(
      withTiming(frameHeight - 10, {
        duration: 1800,
        easing: Easing.inOut(Easing.ease),
      }),
      -1,
      true,
    );
  }, [frameHeight, scanLineOffset]);

  const scanLineStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: scanLineOffset.value }],
  }));

  const permissionDenied = permissionResolved && !hasPermission;
  const canShowCamera = hasPermission && device != null;

  const instruction = useMemo(() => 'Hold your card steady inside the frame', []);

  const handleClose = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.dismissTo('/');
  };

  const handleCapture = async () => {
    if (!camera.current || isProcessing) return;

    setCaptureError(null);
    setIsProcessing(true);

    try {
      const photo = await camera.current.takePhoto({
        enableShutterSound: false,
        flash: 'off',
      });

      const result = await TextRecognition.recognize(photo.path);
      const extracted = extractCardInfo(result.text);

      if (!extracted.hasUsefulData) {
        setCaptureError(extracted.errorMessage);
        return;
      }

      router.push({
        pathname: '/card-scan-confirm',
        params: {
          cardNumber: extracted.cardNumber ?? '',
          expiry: extracted.expiry ?? '',
          name: extracted.name ?? '',
          bank: extracted.bank ?? '',
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Scanning failed. Please try again.';
      if (message.includes("doesn't seem to be linked") || message.includes('Expo managed workflow')) {
        setCaptureError('OCR scanning needs a development build after installing native modules.');
      } else {
        setCaptureError('Could not read card. Try better lighting or hold it flatter.');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  if (permissionDenied) {
    return (
      <SafeAreaView style={styles.permissionRoot}>
        <Pressable onPress={handleClose} style={styles.topClose} hitSlop={12}>
          <Feather name="arrow-left" size={24} color="#FFFFFF" />
        </Pressable>
        <View style={styles.permissionContent}>
          <Text style={styles.permissionTitle}>Camera access is required to scan cards.</Text>
          <Pressable style={styles.settingsButton} onPress={() => Linking.openSettings()}>
            <Text style={styles.settingsButtonText}>Open Settings</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (!permissionResolved || (hasPermission && device == null)) {
    return (
      <SafeAreaView style={styles.permissionRoot}>
        <Pressable onPress={handleClose} style={styles.topClose} hitSlop={12}>
          <Feather name="arrow-left" size={24} color="#FFFFFF" />
        </Pressable>
        <View style={styles.permissionContent}>
          <ActivityIndicator size="small" color="#FFFFFF" />
          <Text style={styles.permissionBody}>
            {hasPermission ? 'Preparing camera…' : 'Requesting camera permission…'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.root}>
      {canShowCamera ? (
        <Camera
          ref={camera}
          style={StyleSheet.absoluteFill}
          device={device}
          isActive={!isProcessing}
          photo
        />
      ) : null}

      <SafeAreaView style={styles.overlay}>
        <View style={styles.topBar}>
          <Pressable onPress={handleClose} style={styles.closeButton} hitSlop={12}>
            <Feather name="x" size={22} color="#FFFFFF" />
          </Pressable>
        </View>

        <View style={styles.guideArea}>
          <View style={styles.maskTop} />

          <View style={styles.middleRow}>
            <View style={styles.maskSide} />
            <View style={[styles.guideFrame, { width: frameWidth, height: frameHeight }]}>
              <Animated.View style={[styles.scanLine, scanLineStyle]} />
            </View>
            <View style={styles.maskSide} />
          </View>

          <View style={styles.maskBottom} />
          <Text style={styles.instruction}>{instruction}</Text>
        </View>

        <View style={styles.bottomArea}>
          {captureError ? <Text style={styles.errorText}>{captureError}</Text> : null}

          <Pressable
            accessibilityRole="button"
            disabled={isProcessing}
            onPress={handleCapture}
            style={[styles.captureButton, isProcessing && styles.captureButtonDisabled]}
          >
            {isProcessing ? (
              <ActivityIndicator size="small" color="#1D1D1D" />
            ) : (
              <Text style={styles.captureText}>Capture</Text>
            )}
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000000',
  },
  overlay: {
    flex: 1,
  },
  topBar: {
    paddingHorizontal: 20,
    paddingTop: 4,
  },
  closeButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.28)',
  },
  guideArea: {
    flex: 1,
    justifyContent: 'center',
  },
  maskTop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.58)',
  },
  middleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  maskSide: {
    flex: 1,
    alignSelf: 'stretch',
    backgroundColor: 'rgba(0,0,0,0.58)',
  },
  guideFrame: {
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.92)',
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  maskBottom: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.58)',
  },
  scanLine: {
    position: 'absolute',
    left: 12,
    right: 12,
    top: 5,
    height: 2,
    borderRadius: 999,
    backgroundColor: '#9ED3FF',
    shadowColor: '#9ED3FF',
    shadowOpacity: 0.85,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  instruction: {
    textAlign: 'center',
    marginTop: 18,
    fontFamily: 'ReadexPro-Regular',
    fontSize: 16,
    color: '#FFFFFF',
  },
  bottomArea: {
    paddingHorizontal: 24,
    paddingBottom: 20,
    gap: 14,
  },
  errorText: {
    fontFamily: 'ReadexPro-Regular',
    fontSize: 14,
    color: '#FFFFFF',
    textAlign: 'center',
    backgroundColor: 'rgba(255,77,77,0.22)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 18,
  },
  captureButton: {
    alignSelf: 'center',
    width: 150,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#EFEFEF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureButtonDisabled: {
    opacity: 0.75,
  },
  captureText: {
    fontFamily: 'ReadexPro-Medium',
    fontSize: 18,
    color: '#1D1D1D',
  },
  permissionRoot: {
    flex: 1,
    backgroundColor: '#1D1D1D',
  },
  topClose: {
    marginLeft: 20,
    marginTop: 8,
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  permissionContent: {
    flex: 1,
    paddingHorizontal: 28,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  permissionTitle: {
    fontFamily: 'ReadexPro-Medium',
    fontSize: 20,
    lineHeight: 28,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  permissionBody: {
    fontFamily: 'ReadexPro-Regular',
    fontSize: 15,
    lineHeight: 22,
    color: 'rgba(255,255,255,0.66)',
    textAlign: 'center',
  },
  settingsButton: {
    marginTop: 8,
    height: 54,
    paddingHorizontal: 24,
    borderRadius: 27,
    backgroundColor: '#EFEFEF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsButtonText: {
    fontFamily: 'ReadexPro-Medium',
    fontSize: 17,
    color: '#1D1D1D',
  },
});
