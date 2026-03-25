import { useEffect, useRef } from "react";
import { AppState } from "react-native";

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
  const appStateRef = useRef(AppState.currentState);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setUser(null);
      setReady(true);
      return undefined;
    }

    let mounted = true;

    const refreshSession = () => {
      return getCurrentSession()
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
    };

    void refreshSession();

    const subscription = onAuthStateChange((session) => {
      if (!mounted) return;
      setUser(mapSupabaseUser(session?.user ?? null));
      setReady(true);
    });

    const appStateSubscription = AppState.addEventListener(
      "change",
      (nextState) => {
        const previousState = appStateRef.current;
        appStateRef.current = nextState;

        if (
          previousState.match(/inactive|background/) &&
          nextState === "active"
        ) {
          void refreshSession();
        }
      },
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
      appStateSubscription.remove();
    };
  }, [setReady, setUser]);

  return null;
}
