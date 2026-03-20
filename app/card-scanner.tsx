import { Feather } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import type { ComponentType } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const scannerSupported =
  Platform.OS !== 'web' &&
  Constants.executionEnvironment !== 'storeClient' &&
  Constants.appOwnership !== 'expo';

const NativeCardScannerScreen = scannerSupported
  ? (require('../components/CardScannerNative').default as ComponentType)
  : null;

export default function CardScannerScreen() {
  const router = useRouter();
  const handleClose = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.dismissTo('/');
  };

  if (NativeCardScannerScreen) {
    return <NativeCardScannerScreen />;
  }

  return (
    <SafeAreaView style={styles.permissionRoot}>
      <Pressable onPress={handleClose} style={styles.topClose} hitSlop={12}>
        <Feather name="arrow-left" size={24} color="#FFFFFF" />
      </Pressable>
      <View style={styles.permissionContent}>
        <Text style={styles.permissionTitle}>
          {Platform.OS === 'web'
            ? 'Camera scanning is not available on web.'
            : 'Camera scanning needs a development build.'}
        </Text>
        <Text style={styles.permissionBody}>
          {Platform.OS === 'web'
            ? 'Open the app on iOS or Android to scan cards.'
            : 'Expo Go cannot load the native camera and OCR modules for this feature. Run the app with a native development build instead.'}
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
