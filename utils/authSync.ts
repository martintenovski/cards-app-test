import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { makeRedirectUri } from "expo-auth-session";
import * as QueryParams from "expo-auth-session/build/QueryParams";
import type { Session, User } from "@supabase/supabase-js";

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

export type ResolvedWalletSnapshot = Omit<WalletSnapshotRow, "cards"> & {
  cards: WalletCard[];
  storage: "encrypted" | "legacy-plain";
};

WebBrowser.maybeCompleteAuthSession();

const AUTH_CALLBACK_PATH = "auth/callback";

export const redirectTo = makeRedirectUri({
  scheme: getRuntimeAppScheme(),
  path: AUTH_CALLBACK_PATH,
  native: `${getRuntimeAppScheme()}://${AUTH_CALLBACK_PATH}`,
});

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

  const queryParams =
    provider === "google" && options?.selectAccount
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
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function reconcileWalletSnapshot(params: {
  user: AuthProfile;
  cards: WalletCard[];
  lastModifiedAt: string;
}) {
  const remote = await fetchResolvedWalletSnapshot(params.user.id);

  if (!remote) {
    return {
      action: "push" as const,
      remote: null,
    };
  }

  const remoteUpdatedAt = Date.parse(remote.updated_at || "0");
  const localUpdatedAt = Date.parse(params.lastModifiedAt || "0");

  if (params.cards.length === 0 && remote.cards.length > 0) {
    return {
      action: "pull" as const,
      remote,
    };
  }

  if (remoteUpdatedAt > localUpdatedAt) {
    return {
      action: "pull" as const,
      remote,
    };
  }

  return {
    action: "push" as const,
    remote,
  };
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

export async function fetchResolvedWalletSnapshot(userId: string) {
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