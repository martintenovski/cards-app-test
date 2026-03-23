import { useEffect } from "react";

import { isSupabaseConfigured } from "@/lib/supabase";
import { useAuthStore } from "@/store/useAuthStore";
import {
  getCurrentSession,
  mapSupabaseUser,
  onAuthStateChange,
} from "@/utils/authSync";

export function AuthSessionManager() {
  const setUser = useAuthStore((state) => state.setUser);
  const setReady = useAuthStore((state) => state.setReady);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setUser(null);
      setReady(true);
      return undefined;
    }

    let mounted = true;

    getCurrentSession()
      .then((session) => {
        if (!mounted) return;
        setUser(mapSupabaseUser(session?.user ?? null));
        setReady(true);
      })
      .catch(() => {
        if (!mounted) return;
        setUser(null);
        setReady(true);
      });

    const subscription = onAuthStateChange((session) => {
      if (!mounted) return;
      setUser(mapSupabaseUser(session?.user ?? null));
      setReady(true);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [setReady, setUser]);

  return null;
}
