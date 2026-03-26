import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { createClient } from "@supabase/supabase-js";

import type { WalletCard } from "@/types/card";
import type { EncryptedWalletCardsPayload } from "@/utils/cloudVault";

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

function isPlaceholderSupabaseUrl(value: string | null) {
  return value === "https://your-project-ref.supabase.co";
}

function isPlaceholderSupabaseAnonKey(value: string | null) {
  return value === "your-supabase-anon-key";
}

function isValidSupabaseUrl(value: string | null) {
  if (!value || isPlaceholderSupabaseUrl(value)) {
    return false;
  }

  try {
    const parsedUrl = new URL(value);
    return parsedUrl.protocol === "https:";
  } catch {
    return false;
  }
}

function isValidSupabaseAnonKey(value: string | null) {
  if (!value || isPlaceholderSupabaseAnonKey(value)) {
    return false;
  }

  return value.split(".").length === 3;
}

const supabaseUrl =
  getExpoExtraString("EXPO_PUBLIC_SUPABASE_URL") ??
  readEnvValue(process.env.EXPO_PUBLIC_SUPABASE_URL);
const supabaseAnonKey =
  getExpoExtraString("EXPO_PUBLIC_SUPABASE_ANON_KEY") ??
  readEnvValue(process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);

export const supabaseConfigStatus =
  !supabaseUrl || !supabaseAnonKey
    ? "missing"
    : !isValidSupabaseUrl(supabaseUrl) ||
        !isValidSupabaseAnonKey(supabaseAnonKey)
      ? "invalid"
      : "ready";

export const isSupabaseConfigured = supabaseConfigStatus === "ready";

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    })
  : null;

export type WalletSnapshotRow = {
  user_id: string;
  display_name: string | null;
  email: string | null;
  cards: WalletCard[] | EncryptedWalletCardsPayload;
  updated_at: string;
};

export async function fetchWalletSnapshot(userId: string) {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("wallet_snapshots")
    .select("user_id, display_name, email, cards, updated_at")
    .eq("user_id", userId)
    .maybeSingle<WalletSnapshotRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function upsertWalletSnapshot(snapshot: WalletSnapshotRow) {
  if (!supabase) return;

  const { error } = await supabase.from("wallet_snapshots").upsert(snapshot, {
    onConflict: "user_id",
  });

  if (error) {
    throw error;
  }
}

export async function deleteWalletSnapshot(userId: string) {
  if (!supabase) return;

  const { error } = await supabase
    .from("wallet_snapshots")
    .delete()
    .eq("user_id", userId);

  if (error) {
    throw error;
  }
}
