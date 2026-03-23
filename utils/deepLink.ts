import * as Linking from "expo-linking";

const PRIMARY_APP_SCHEME = "pocketid";

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
    scheme: PRIMARY_APP_SCHEME,
    queryParams: normalizedQueryParams,
    isTripleSlashed: true,
  });
}

export function getPrimaryAppScheme() {
  return PRIMARY_APP_SCHEME;
}
