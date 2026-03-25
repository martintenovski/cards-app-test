import * as QueryParams from "expo-auth-session/build/QueryParams";
import {
  GoogleSignin,
  isCancelledResponse,
  isErrorWithCode,
  isSuccessResponse,
  statusCodes,
} from "@react-native-google-signin/google-signin";
import type { Session, User } from "@supabase/supabase-js";
import { Platform } from "react-native";

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

function readEnvValue(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

const googleWebClientId = readEnvValue(
  process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
);
const googleIosClientId = readEnvValue(
  process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
);

let hasConfiguredNativeGoogleSignIn = false;

function getNativeGoogleConfigError() {
  if (!googleWebClientId) {
    return (
      "Google Sign-In is not configured. Add EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID " +
      "to your environment and rebuild the native app."
    );
  }

  if (Platform.OS === "ios" && !googleIosClientId) {
    return (
      "Google Sign-In is not configured for iOS. Add " +
      "EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID to your environment and rebuild the native app."
    );
  }

  return null;
}

function configureNativeGoogleSignInOnce() {
  const configurationError = getNativeGoogleConfigError();

  if (configurationError) {
    throw new Error(configurationError);
  }

  if (hasConfiguredNativeGoogleSignIn) {
    return;
  }

  // Configure the native Google SDK once near app startup. We pass the web
  // client ID because Google uses it to mint the OpenID Connect ID token that
  // Supabase accepts in signInWithIdToken(). iOS also needs its platform client
  // ID because this project is configured directly from Google Cloud, not from
  // Firebase plist files.
  GoogleSignin.configure({
    webClientId: googleWebClientId!,
    iosClientId: googleIosClientId ?? undefined,
    scopes: ["email", "profile"],
  });

  hasConfiguredNativeGoogleSignIn = true;
}

function toFriendlyGoogleSignInError(error: unknown) {
  if (isErrorWithCode(error)) {
    switch (error.code) {
      case statusCodes.SIGN_IN_CANCELLED:
        return null;
      case statusCodes.IN_PROGRESS:
        return new Error("Google sign-in is already in progress.");
      case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
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
  const { data } = await supabase.auth.getSession();
  return data.session;
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

  if (provider !== "google") {
    throw new Error("Only native Google sign-in is implemented on mobile.");
  }

  configureNativeGoogleSignInOnce();

  try {
    // On Android, make sure Play Services is present before opening the chooser.
    // iOS resolves this call successfully and simply skips the Android-only check.
    await GoogleSignin.hasPlayServices({
      showPlayServicesUpdateDialog: true,
    });

    if (options?.selectAccount && GoogleSignin.hasPreviousSignIn()) {
      // Clear the cached Google account before prompting again. This keeps the
      // existing Supabase session alive until the user actually completes the
      // new selection, so cancelling the picker does not log the app out.
      await GoogleSignin.signOut().catch(() => null);
    }

    const response = await GoogleSignin.signIn();

    if (isCancelledResponse(response)) {
      return null;
    }

    if (!isSuccessResponse(response)) {
      return null;
    }

    // Prefer the ID token returned by the native Google SDK. If it is absent,
    // ask the SDK for fresh tokens before calling Supabase.
    const idToken = response.data.idToken ?? (await GoogleSignin.getTokens()).idToken;

    if (!idToken) {
      throw new Error(
        "Google sign-in did not return an ID token. Check your Google OAuth client IDs.",
      );
    }

    // This is the Supabase-specific handoff: we keep Supabase as the auth
    // backend and simply replace the browser OAuth redirect with a native
    // Google account chooser that yields an ID token.
    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: "google",
      token: idToken,
    });

    if (error) {
      throw error;
    }

    // Supabase persists the resulting session automatically because the client
    // was created with AsyncStorage-backed auth persistence in lib/supabase.ts.
    return data.session;
  } catch (error) {
    const friendlyError = toFriendlyGoogleSignInError(error);

    if (!friendlyError) {
      return null;
    }

    throw friendlyError;
  }
}

export async function signOut() {
  if (!supabase) return;

  // Best-effort cleanup of the cached native Google session. Even if this fails,
  // we still sign out from Supabase so the app session is cleared locally.
  if (!getNativeGoogleConfigError()) {
    configureNativeGoogleSignInOnce();
    await GoogleSignin.signOut().catch(() => null);
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
