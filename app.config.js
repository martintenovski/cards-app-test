const { expo: baseConfig } = require("./app.json");

const googleIosUrlScheme = process.env.EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME?.trim();

module.exports = () => {
  const plugins = [...(baseConfig.plugins ?? [])];
  const hasGoogleSigninPlugin = plugins.some((plugin) =>
    Array.isArray(plugin)
      ? plugin[0] === "@react-native-google-signin/google-signin"
      : plugin === "@react-native-google-signin/google-signin",
  );

  // This app uses Google Cloud OAuth directly instead of Firebase config files.
  // When the reversed iOS client ID is available, add the Expo config plugin so
  // the native iOS URL scheme is registered during prebuild/EAS build.
  if (!hasGoogleSigninPlugin && googleIosUrlScheme) {
    plugins.push([
      "@react-native-google-signin/google-signin",
      { iosUrlScheme: googleIosUrlScheme },
    ]);
  }

  return {
    ...baseConfig,
    plugins,
  };
};
