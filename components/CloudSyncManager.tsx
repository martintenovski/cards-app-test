import { useEffect, useRef } from "react";

import { isSupabaseConfigured } from "@/lib/supabase";
import { useAuthStore } from "@/store/useAuthStore";
import { useCardStore } from "@/store/useCardStore";
import { pushWalletSnapshot, reconcileWalletSnapshot } from "@/utils/authSync";

export function CloudSyncManager() {
  const user = useAuthStore((state) => state.user);
  const authReady = useAuthStore((state) => state.isReady);
  const cards = useCardStore((state) => state.cards);
  const hasHydrated = useCardStore((state) => state.hasHydrated);
  const lastModifiedAt = useCardStore((state) => state.lastModifiedAt);
  const replaceCards = useCardStore((state) => state.replaceCards);
  const hasReconciled = useRef(false);
  const lastPushedAt = useRef<string | null>(null);

  useEffect(() => {
    hasReconciled.current = false;
    lastPushedAt.current = null;
  }, [user?.id]);

  useEffect(() => {
    if (!isSupabaseConfigured || !authReady || !hasHydrated || !user) {
      return undefined;
    }

    const currentUser = user;

    let cancelled = false;

    async function reconcile() {
      try {
        const result = await reconcileWalletSnapshot({
          user: currentUser,
          cards,
          lastModifiedAt,
        });

        if (cancelled) return;

        if (result.action === "pull" && result.remote) {
          replaceCards(result.remote.cards, result.remote.updated_at);
          lastPushedAt.current = result.remote.updated_at;
        } else {
          await pushWalletSnapshot({
            user: currentUser,
            cards,
            lastModifiedAt,
          });
          lastPushedAt.current = lastModifiedAt;
        }

        hasReconciled.current = true;
      } catch {
        hasReconciled.current = true;
      }
    }

    if (!hasReconciled.current) {
      void reconcile();
    }

    return () => {
      cancelled = true;
    };
  }, [authReady, cards, hasHydrated, lastModifiedAt, replaceCards, user]);

  useEffect(() => {
    if (
      !isSupabaseConfigured ||
      !authReady ||
      !hasHydrated ||
      !user ||
      !hasReconciled.current ||
      lastPushedAt.current === lastModifiedAt
    ) {
      return undefined;
    }

    const currentUser = user;

    const timer = setTimeout(() => {
      void pushWalletSnapshot({
        user: currentUser,
        cards,
        lastModifiedAt,
      })
        .then(() => {
          lastPushedAt.current = lastModifiedAt;
        })
        .catch(() => undefined);
    }, 800);

    return () => clearTimeout(timer);
  }, [authReady, cards, hasHydrated, lastModifiedAt, user]);

  return null;
}
