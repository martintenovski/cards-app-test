import { Platform } from "react-native";

const PRIMARY_APP_SCHEME = "pocketid";
const LEGACY_ANDROID_SCHEME = "cards-app";

export function getSupportedAppSchemes() {
  return Platform.OS === "android"
    ? [PRIMARY_APP_SCHEME, LEGACY_ANDROID_SCHEME]
    : [PRIMARY_APP_SCHEME];
}

export function getRuntimeAppScheme() {
  return Platform.OS === "android" ? LEGACY_ANDROID_SCHEME : PRIMARY_APP_SCHEME;
}

export function getPrimaryAppScheme() {
  return PRIMARY_APP_SCHEME;
}
