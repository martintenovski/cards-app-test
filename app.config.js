const fs = require("fs");
const path = require("path");

const { expo: baseConfig } = require("./app.json");

function readEnvValue(value) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function readEnvFileValue(fileContents, key) {
  const match = fileContents.match(
    new RegExp(`^${escapeRegExp(key)}=(.*)$`, "m"),
  );
  if (!match) {
    return null;
  }

  let value = match[1].trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }

  return readEnvValue(value);
}

function readProjectEnvValue(key) {
  const directValue = readEnvValue(process.env[key]);
  if (directValue) {
    return directValue;
  }

  for (const fileName of [".env.local", ".env"]) {
    const filePath = path.join(__dirname, fileName);
    if (!fs.existsSync(filePath)) {
      continue;
    }

    const fileContents = fs.readFileSync(filePath, "utf8");
    const fileValue = readEnvFileValue(fileContents, key);
    if (fileValue) {
      return fileValue;
    }
  }

  return null;
}

function deriveGoogleIosUrlScheme(iosClientId) {
  if (!iosClientId) {
    return null;
  }

  const suffix = ".apps.googleusercontent.com";
  if (!iosClientId.endsWith(suffix)) {
    return null;
  }

  const clientIdPrefix = iosClientId.slice(0, -suffix.length);
  return `com.googleusercontent.apps.${clientIdPrefix}`;
}

const googleWebClientId = readProjectEnvValue(
  "EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID",
);
const googleIosClientId = readProjectEnvValue(
  "EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID",
);
const googleIosUrlScheme =
  readProjectEnvValue("EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME") ??
  deriveGoogleIosUrlScheme(googleIosClientId);

module.exports = () => {
  const plugins = [...(baseConfig.plugins ?? [])];
  const hasGoogleSigninPlugin = plugins.some((plugin) =>
    Array.isArray(plugin)
      ? plugin[0] === "@react-native-google-signin/google-signin"
      : plugin === "@react-native-google-signin/google-signin",
  );

  // Always register the Expo config plugin so the native Google Sign-In module
  // is included in iOS/Android builds. When the iOS scheme is available, pass
  // it through so the callback URL is registered as well.
  if (!hasGoogleSigninPlugin) {
    plugins.push(
      googleIosUrlScheme
        ? [
            "@react-native-google-signin/google-signin",
            { iosUrlScheme: googleIosUrlScheme },
          ]
        : "@react-native-google-signin/google-signin",
    );
  }

  return {
    ...baseConfig,
    extra: {
      ...(baseConfig.extra ?? {}),
      googleWebClientId,
      googleIosClientId,
      googleIosUrlScheme,
    },
    plugins,
  };
};
