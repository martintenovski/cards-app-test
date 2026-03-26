import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import Constants from "expo-constants";
import { makeRedirectUri } from "expo-auth-session";
import * as QueryParams from "expo-auth-session/build/QueryParams";
import type { Session, User } from "@supabase/supabase-js";
import { NativeModules, Platform, TurboModuleRegistry } from "react-native";
import * as Crypto from "expo-crypto";

import {
  fetchWalletSnapshot,
  isSupabaseConfigured,
  supabase,
  upsertWalletSnapshot,
} from "@/lib/supabase";
import {
  decryptWalletCards,
  encryptWalletCards,
  getStoredSyncPassphrase,
  isEncryptedWalletCardsPayload,
} from "@/utils/cloudVault";
import {
  getPrimaryAppScheme,
  getRuntimeAppScheme,
  getSupportedAppSchemes,
} from "@/utils/deepLink";
import type { WalletSnapshotRow } from "@/lib/supabase";
import type { AuthProfile } from "@/store/useAuthStore";
import type { WalletCard } from "@/types/card";

type ResolvedWalletSnapshot = Omit<WalletSnapshotRow, "cards"> & {
  cards: WalletCard[];
  storage: "encrypted" | "legacy-plain";
};

type ReconcileWalletSnapshotResult = {
  action: "noop" | "push" | "pull" | "merge";
  remote: ResolvedWalletSnapshot | null;
  cards: WalletCard[];
  lastModifiedAt: string;
  localOnlyCount: number;
  remoteOnlyCount: number;
};

type NativeGoogleSignInPackage =
  typeof import("@react-native-google-signin/google-signin");

WebBrowser.maybeCompleteAuthSession();

const AUTH_CALLBACK_PATH = "auth/callback";
const googleWebClientId =
  getExpoExtraString("EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID") ??
  getExpoExtraString("googleWebClientId") ??
  readEnvValue(process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID);
const googleIosClientId =
  getExpoExtraString("EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID") ??
  getExpoExtraString("googleIosClientId") ??
  readEnvValue(process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID);
let hasConfiguredNativeGoogleSignIn = false;

const redirectTo = makeRedirectUri({
  scheme: getRuntimeAppScheme(),
  path: AUTH_CALLBACK_PATH,
  native: `${getRuntimeAppScheme()}://${AUTH_CALLBACK_PATH}`,
});

function readEnvValue(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function getExpoExtraString(key: string) {
  const extra = Constants.expoConfig?.extra as
    | Record<string, unknown>
    | undefined;
  const value = extra?.[key];
  return typeof value === "string" ? readEnvValue(value) : null;
}

function isInvalidRefreshTokenError(error: unknown) {
  return (
    error instanceof Error &&
    /invalid refresh token|refresh token not found/i.test(error.message)
  );
}

function getNativeGoogleSignInPackage(): NativeGoogleSignInPackage | null {
  const hasNativeGoogleSignInModule =
    Boolean(NativeModules.RNGoogleSignin) ||
    Boolean(TurboModuleRegistry.get?.("RNGoogleSignin"));

  if (!hasNativeGoogleSignInModule) {
    return null;
  }

  try {
    return require("@react-native-google-signin/google-signin") as NativeGoogleSignInPackage;
  } catch {
    return null;
  }
}

function getNativeGoogleConfigError() {
  if (!googleWebClientId) {
    return (
      "Google Sign-In is not configured for native mobile builds. Add " +
      "EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID to your environment and rebuild the app."
    );
  }

  if (Platform.OS === "ios" && !googleIosClientId) {
    return (
      "Google Sign-In is not configured for iOS native sign-in. Add " +
      "EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID to .env.local or your Expo environment, then rebuild iOS."
    );
  }

  return null;
}

function configureNativeGoogleSignInOnce(
  nativeGoogleSignIn: NativeGoogleSignInPackage,
) {
  const configurationError = getNativeGoogleConfigError();

  if (configurationError) {
    throw new Error(configurationError);
  }

  if (hasConfiguredNativeGoogleSignIn) {
    return;
  }

  nativeGoogleSignIn.GoogleSignin.configure({
    webClientId: googleWebClientId!,
    iosClientId: googleIosClientId ?? undefined,
    scopes: ["email", "profile"],
  });

  hasConfiguredNativeGoogleSignIn = true;
}

function isDeveloperConfigurationGoogleSignInError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  return /developer_error|code\s*:?\s*10|developer console is not set up correctly/i.test(
    error.message,
  );
}

function getDeveloperConfigurationGoogleSignInErrorMessage() {
  return Platform.OS === "android"
    ? "Google Sign-In is misconfigured for this Android build. For Play internal testing or production, make sure the Play App Signing SHA-1 for this package is added to the same Google project as your Android OAuth client, and that EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID points to a Web OAuth client from that project."
    : "Google Sign-In is misconfigured for this build. Check that your Google OAuth client IDs match this app and environment.";
}

function toFriendlyGoogleSignInError(
  nativeGoogleSignIn: NativeGoogleSignInPackage,
  error: unknown,
) {
  if (isDeveloperConfigurationGoogleSignInError(error)) {
    return new Error(getDeveloperConfigurationGoogleSignInErrorMessage());
  }

  if (nativeGoogleSignIn.isErrorWithCode(error)) {
    switch (error.code) {
      case nativeGoogleSignIn.statusCodes.SIGN_IN_CANCELLED:
        return null;
      case nativeGoogleSignIn.statusCodes.IN_PROGRESS:
        return new Error("Google sign-in is already in progress.");
      case nativeGoogleSignIn.statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
        return new Error(
          "Google Play Services is unavailable or out of date on this device.",
        );
      default:
        return new Error(error.message || "Google sign-in failed.");
    }
  }

  if (error instanceof Error) {
    return error;
  }

  return new Error("Google sign-in failed.");
}

async function signInWithNativeGoogle(options?: { selectAccount?: boolean }) {
  const nativeGoogleSignIn = getNativeGoogleSignInPackage();

  if (!nativeGoogleSignIn) {
    throw new Error(
      Platform.OS === "ios"
        ? "Native Google Sign-In is not available in this iOS build. Rebuild the app after configuring EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID."
        : "Native Google Sign-In is not available in this build. Rebuild the app to include the Google Sign-In module.",
    );
  }

  configureNativeGoogleSignInOnce(nativeGoogleSignIn);

  try {
    await nativeGoogleSignIn.GoogleSignin.hasPlayServices({
      showPlayServicesUpdateDialog: true,
    });

    if (
      options?.selectAccount &&
      nativeGoogleSignIn.GoogleSignin.hasPreviousSignIn()
    ) {
      await nativeGoogleSignIn.GoogleSignin.signOut().catch(() => null);
    }

    // Generate a nonce so both Google's id_token and Supabase share the same value.
    // On iOS, Google Sign-In embeds a SHA-256 hash of the nonce in the id_token;
    // Supabase verifies this by re-hashing the raw nonce we provide.
    const rawNonce = Crypto.randomUUID();
    const hashedNonce = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      rawNonce,
    );

    const response = await nativeGoogleSignIn.GoogleSignin.signIn({
      nonce: hashedNonce,
    });

    if (nativeGoogleSignIn.isCancelledResponse(response)) {
      return null;
    }

    if (!nativeGoogleSignIn.isSuccessResponse(response)) {
      return null;
    }

    const idToken =
      response.data.idToken ??
      (await nativeGoogleSignIn.GoogleSignin.getTokens()).idToken;

    if (!idToken) {
      throw new Error(
        "Google sign-in did not return an ID token. Check your Google OAuth client IDs.",
      );
    }

    const { data, error } = await supabase!.auth.signInWithIdToken({
      provider: "google",
      token: idToken,
      nonce: rawNonce,
    });

    if (error) {
      throw error;
    }

    return data.session;
  } catch (error) {
    const friendlyError = toFriendlyGoogleSignInError(
      nativeGoogleSignIn,
      error,
    );

    if (!friendlyError) {
      return null;
    }

    throw friendlyError;
  }
}

export const createSessionFromUrl = async (url: string) => {
  const { params, errorCode } = QueryParams.getQueryParams(url);
  if (errorCode) throw new Error(errorCode);

  const { access_token, refresh_token } = params;
  if (!access_token) return null;

  const { data, error } = await supabase!.auth.setSession({
    access_token,
    refresh_token,
  });
  if (error) throw error;
  return data.session;
};

export function mapSupabaseUser(user: User | null): AuthProfile | null {
  if (!user) return null;

  const metadata = user.user_metadata ?? {};
  const derivedName =
    metadata.full_name ??
    metadata.name ??
    metadata.user_name ??
    user.email?.split("@")[0] ??
    null;

  return {
    id: user.id,
    email: user.email ?? null,
    displayName: derivedName,
    provider: user.app_metadata?.provider ?? null,
  };
}

export async function getCurrentSession() {
  if (!supabase) return null;

  try {
    const { data } = await supabase.auth.getSession();
    return data.session;
  } catch (error) {
    if (isInvalidRefreshTokenError(error)) {
      await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
      return null;
    }

    throw error;
  }
}

export function onAuthStateChange(callback: (session: Session | null) => void) {
  if (!supabase) {
    callback(null);
    return { unsubscribe: () => undefined };
  }

  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session);
  });

  return subscription;
}

export async function signInWithProvider(
  provider: "google" | "apple",
  options?: {
    selectAccount?: boolean;
  },
) {
  if (!supabase || !isSupabaseConfigured) {
    throw new Error("Supabase is not configured.");
  }

  if (provider === "google" && Platform.OS !== "web") {
    const nativeGoogleSignIn = getNativeGoogleSignInPackage();

    if (nativeGoogleSignIn) {
      return await signInWithNativeGoogle(options);
    }

    const configurationError = getNativeGoogleConfigError();
    if (configurationError) {
      throw new Error(configurationError);
    }

    throw new Error(
      Platform.OS === "ios"
        ? "Native Google Sign-In is not available in this iOS build. Run `cd ios && pod install`, then rebuild the app."
        : "Native Google Sign-In is not available in this build. Rebuild the app to include the Google Sign-In module.",
    );
  }

  const shouldPromptForGoogleAccount =
    provider === "google" && options?.selectAccount !== false;

  const queryParams = shouldPromptForGoogleAccount
    ? { prompt: "select_account" }
    : undefined;

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo,
      queryParams,
      skipBrowserRedirect: true,
    },
  });

  if (error) throw error;
  if (!data?.url) throw new Error("Could not start sign-in.");

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

  if (result.type !== "success") {
    const fallbackUrl = await Linking.getInitialURL();
    if (
      fallbackUrl &&
      getSupportedAppSchemes().some((scheme) =>
        fallbackUrl.startsWith(`${scheme}://`),
      )
    ) {
      return await createSessionFromUrl(fallbackUrl);
    }
    return null;
  }

  return await createSessionFromUrl(result.url);
}

export async function signOut() {
  if (!supabase) return;

  const nativeGoogleSignIn = getNativeGoogleSignInPackage();
  if (nativeGoogleSignIn && Platform.OS !== "web") {
    await nativeGoogleSignIn.GoogleSignin.signOut().catch(() => null);
  }

  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function reconcileWalletSnapshot(params: {
  user: AuthProfile;
  cards: WalletCard[];
  lastModifiedAt: string;
}): Promise<ReconcileWalletSnapshotResult> {
  const remote = await fetchResolvedWalletSnapshot(params.user.id);

  if (!remote) {
    return {
      action: "push" as const,
      remote: null,
      cards: params.cards,
      lastModifiedAt: params.lastModifiedAt,
      localOnlyCount: params.cards.length,
      remoteOnlyCount: 0,
    };
  }

  const remoteUpdatedAt = Date.parse(remote.updated_at || "0");
  const localUpdatedAt = Date.parse(params.lastModifiedAt || "0");
  const localCardIds = new Set(params.cards.map((card) => card.id));
  const remoteCardIds = new Set(remote.cards.map((card) => card.id));
  const localOnlyCards = params.cards.filter(
    (card) => !remoteCardIds.has(card.id),
  );
  const remoteOnlyCards = remote.cards.filter(
    (card) => !localCardIds.has(card.id),
  );
  const hasLocalOnlyCards = localOnlyCards.length > 0;
  const hasRemoteOnlyCards = remoteOnlyCards.length > 0;

  if (params.cards.length === 0 && remote.cards.length > 0) {
    return {
      action: "pull" as const,
      remote,
      cards: remote.cards,
      lastModifiedAt: remote.updated_at,
      localOnlyCount: 0,
      remoteOnlyCount: remote.cards.length,
    };
  }

  if (remote.cards.length === 0 && params.cards.length > 0) {
    return {
      action: "push" as const,
      remote,
      cards: params.cards,
      lastModifiedAt: params.lastModifiedAt,
      localOnlyCount: params.cards.length,
      remoteOnlyCount: 0,
    };
  }

  if (hasLocalOnlyCards && hasRemoteOnlyCards) {
    const preferRemote = remoteUpdatedAt > localUpdatedAt;
    const mergedCards = mergeWalletCards({
      localCards: params.cards,
      remoteCards: remote.cards,
      preferRemote,
    });

    return {
      action: "merge",
      remote,
      cards: mergedCards,
      lastModifiedAt: new Date().toISOString(),
      localOnlyCount: localOnlyCards.length,
      remoteOnlyCount: remoteOnlyCards.length,
    };
  }

  if (hasRemoteOnlyCards) {
    return {
      action: "pull" as const,
      remote,
      cards: remote.cards,
      lastModifiedAt: remote.updated_at,
      localOnlyCount: 0,
      remoteOnlyCount: remoteOnlyCards.length,
    };
  }

  if (hasLocalOnlyCards) {
    return {
      action: "push" as const,
      remote,
      cards: params.cards,
      lastModifiedAt: params.lastModifiedAt,
      localOnlyCount: localOnlyCards.length,
      remoteOnlyCount: 0,
    };
  }

  const localCardsById = new Map(
    params.cards.map((card) => [card.id, stableSerialize(card)]),
  );
  const remoteCardsById = new Map(
    remote.cards.map((card) => [card.id, stableSerialize(card)]),
  );
  const hasConflictingSharedCards = params.cards.some(
    (card) => localCardsById.get(card.id) !== remoteCardsById.get(card.id),
  );

  if (!hasConflictingSharedCards) {
    return {
      action: "noop",
      remote,
      cards: params.cards,
      lastModifiedAt:
        remoteUpdatedAt > localUpdatedAt
          ? remote.updated_at
          : params.lastModifiedAt,
      localOnlyCount: 0,
      remoteOnlyCount: 0,
    };
  }

  if (remoteUpdatedAt > localUpdatedAt) {
    return {
      action: "pull" as const,
      remote,
      cards: remote.cards,
      lastModifiedAt: remote.updated_at,
      localOnlyCount: 0,
      remoteOnlyCount: 0,
    };
  }

  return {
    action: "push" as const,
    remote,
    cards: params.cards,
    lastModifiedAt: params.lastModifiedAt,
    localOnlyCount: 0,
    remoteOnlyCount: 0,
  };
}

function mergeWalletCards(params: {
  localCards: WalletCard[];
  remoteCards: WalletCard[];
  preferRemote: boolean;
}) {
  const preferredCards = params.preferRemote
    ? params.remoteCards
    : params.localCards;
  const secondaryCards = params.preferRemote
    ? params.localCards
    : params.remoteCards;
  const mergedCards = [...preferredCards];
  const seenCardIds = new Set(preferredCards.map((card) => card.id));

  for (const card of secondaryCards) {
    if (seenCardIds.has(card.id)) {
      continue;
    }

    seenCardIds.add(card.id);
    mergedCards.push(card);
  }

  return mergedCards;
}

function stableSerialize(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableSerialize(item)).join(",")}]`;
  }

  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).sort(
      ([leftKey], [rightKey]) => leftKey.localeCompare(rightKey),
    );

    return `{${entries
      .map(
        ([key, nestedValue]) =>
          `${JSON.stringify(key)}:${stableSerialize(nestedValue)}`,
      )
      .join(",")}}`;
  }

  return JSON.stringify(value);
}

export async function pushWalletSnapshot(params: {
  user: AuthProfile;
  cards: WalletCard[];
  lastModifiedAt: string;
}) {
  const passphrase = await getStoredSyncPassphrase(params.user.id);

  if (!passphrase) {
    throw new Error(
      "Cloud sync is locked on this device until you add your sync passphrase.",
    );
  }

  const snapshot: WalletSnapshotRow = {
    user_id: params.user.id,
    display_name: params.user.displayName,
    email: params.user.email,
    cards: await encryptWalletCards(params.cards, passphrase),
    updated_at: params.lastModifiedAt,
  };

  await upsertWalletSnapshot(snapshot);
}

async function fetchResolvedWalletSnapshot(userId: string) {
  const remote = await fetchWalletSnapshot(userId);

  if (!remote) {
    return null;
  }

  if (Array.isArray(remote.cards)) {
    return {
      ...remote,
      cards: remote.cards,
      storage: "legacy-plain" as const,
    };
  }

  if (!isEncryptedWalletCardsPayload(remote.cards)) {
    throw new Error("Wallet snapshot format is not supported.");
  }

  const passphrase = await getStoredSyncPassphrase(userId);

  if (!passphrase) {
    throw new Error(
      "This device needs your sync passphrase before it can decrypt cloud data.",
    );
  }

  return {
    ...remote,
    cards: await decryptWalletCards(remote.cards, passphrase),
    storage: "encrypted" as const,
  };
}
