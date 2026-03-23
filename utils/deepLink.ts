import * as Linking from "expo-linking";
import { Platform } from "react-native";

const PRIMARY_APP_SCHEME = "pocketid";
const LEGACY_ANDROID_SCHEME = "cards-app";

export function getSupportedAppSchemes() {
  return Platform.OS === "android"
    ? [PRIMARY_APP_SCHEME, LEGACY_ANDROID_SCHEME]
    : [PRIMARY_APP_SCHEME];
}

export function getRuntimeAppScheme() {
  return Platform.OS === "android"
    ? LEGACY_ANDROID_SCHEME
    : PRIMARY_APP_SCHEME;
}

export function createAppUrl(
  path: string,
  queryParams?: Record<string, string | number | boolean | null | undefined>,
) {
  const normalizedQueryParams = queryParams
    ? Object.fromEntries(
        Object.entries(queryParams)
          .filter(([, value]) => value !== null && value !== undefined)
          .map(([key, value]) => [key, String(value)]),
      )
    : undefined;

  return Linking.createURL(`/${path.replace(/^\/+/, "")}`, {
    scheme: getRuntimeAppScheme(),
    queryParams: normalizedQueryParams,
  });
}

export function getPrimaryAppScheme() {
  return PRIMARY_APP_SCHEME;
}
