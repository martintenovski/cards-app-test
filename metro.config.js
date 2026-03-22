const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// Stub native-only modules that have no web implementation.
// Without this they crash the browser bundle on first import.
const nativeStub = path.resolve(__dirname, 'stubs/native-only.js');
config.resolver = config.resolver ?? {};
config.resolver.resolveRequest = (ctx, moduleName, platform) => {
  if (platform === 'web') {
    const nativeOnlyModules = [
      'expo-secure-store',
      'react-native-worklets',
      '@react-native-ml-kit/text-recognition',
    ];
    if (nativeOnlyModules.some((m) => moduleName === m || moduleName.startsWith(m + '/'))) {
      return { type: 'sourceFile', filePath: nativeStub };
    }
  }
  return ctx.resolveRequest(ctx, moduleName, platform);
};

module.exports = withNativeWind(config, { input: './global.css' });
