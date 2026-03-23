import * as WebBrowser from "expo-web-browser";
import { Platform } from "react-native";
import type { Session, User } from "@supabase/supabase-js";

import {
  fetchWalletSnapshot,
  isSupabaseConfigured,
  supabase,
  upsertWalletSnapshot,
} from "@/lib/supabase";
import { createAppUrl } from "@/utils/deepLink";
import type { WalletSnapshotRow } from "@/lib/supabase";
import type { AuthProfile } from "@/store/useAuthStore";
import type { WalletCard } from "@/types/card";

WebBrowser.maybeCompleteAuthSession();

const SUPABASE_CALLBACK_URL =
  "https://rmtucmjvehyplrcdnmxh.supabase.co/auth/v1/callback";

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

export async function signInWithProvider(provider: "google" | "apple") {
  if (!supabase || !isSupabaseConfigured) {
    throw new Error("Supabase is not configured.");
  }

  const redirectTo =
    Platform.OS === "android"
      ? SUPABASE_CALLBACK_URL
      : createAppUrl("auth/callback");

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo,
      skipBrowserRedirect: true,
    },
  });

  if (error) throw error;
  if (!data?.url) throw new Error("Could not start sign-in.");

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

  if (result.type !== "success") return null;

  const callbackUrl = new URL(result.url);
  const code = callbackUrl.searchParams.get("code");

  if (!code) throw new Error("No auth code returned from provider.");

  const { data: exchangeData, error: exchangeError } =
    await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError) throw exchangeError;

  return exchangeData.session;
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
  const remote = await fetchWalletSnapshot(params.user.id);

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
  const snapshot: WalletSnapshotRow = {
    user_id: params.user.id,
    display_name: params.user.displayName,
    email: params.user.email,
    cards: params.cards,
    updated_at: params.lastModifiedAt,
  };

  await upsertWalletSnapshot(snapshot);
}