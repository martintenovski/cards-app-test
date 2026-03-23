import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

import type { WalletCard } from "@/types/card";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

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
  cards: WalletCard[];
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
