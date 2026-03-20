module.exports = function (api) {
  // Invalidate the Babel cache whenever the target platform changes.
  // Without this, if native compiled first the cached config (with worklets
  // plugin) would be reused for web, crashing the browser bundle.
  api.cache.invalidate(() => process.env.EXPO_OS ?? 'native');

  const isWeb = process.env.EXPO_OS === 'web';

  return {
    presets: [['babel-preset-expo'], 'nativewind/babel'],

    plugins: [
      [
        'module-resolver',
        {
          root: ['./'],

          alias: {
            '@': './',
            'tailwind.config': './tailwind.config.js',
          },
        },
      ],
      // worklets plugin is native-only; crash on web if included
      ...(isWeb ? [] : ['react-native-worklets/plugin']),
      // Reanimated uses import.meta.url in its web worker code. Metro bundles
      // as CommonJS (not ESM), so import.meta is illegal syntax on web.
      // This plugin rewrites import.meta → {} so the bundle loads cleanly.
      ...(isWeb ? ['babel-plugin-transform-import-meta'] : []),
    ],
  };
};
