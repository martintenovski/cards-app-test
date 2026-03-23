import { useEffect, useRef } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from "react-native";

import { isSupabaseConfigured } from "@/lib/supabase";
import { useAuthStore } from "@/store/useAuthStore";
import { useCardStore } from "@/store/useCardStore";
import { useCloudVaultStore } from "@/store/useCloudVaultStore";
import { hasStoredSyncPassphrase } from "@/utils/cloudVault";
import { pushWalletSnapshot, reconcileWalletSnapshot } from "@/utils/authSync";
import { APP_THEME, resolveTheme } from "@/utils/theme";

function isPassphraseMissingError(error: unknown) {
  return (
    error instanceof Error &&
    /sync passphrase|cloud sync is locked/i.test(error.message)
  );
}

export function CloudSyncManager() {
  const user = useAuthStore((state) => state.user);
  const authReady = useAuthStore((state) => state.isReady);
  const cards = useCardStore((state) => state.cards);
  const hasHydrated = useCardStore((state) => state.hasHydrated);
  const lastModifiedAt = useCardStore((state) => state.lastModifiedAt);
  const replaceCards = useCardStore((state) => state.replaceCards);
  const cloudVaultChangeToken = useCloudVaultStore(
    (state) => state.changeToken,
  );
  const syncRequestToken = useCloudVaultStore(
    (state) => state.syncRequestToken,
  );
  const syncStatus = useCloudVaultStore((state) => state.syncStatus);
  const syncMessage = useCloudVaultStore((state) => state.syncMessage);
  const setSyncState = useCloudVaultStore((state) => state.setSyncState);
  const deviceScheme = useColorScheme();
  const colors = APP_THEME[resolveTheme("system", deviceScheme)];
  const hasReconciled = useRef(false);
  const lastPushedAt = useRef<string | null>(null);
  const lastObservedModifiedAt = useRef<string | null>(null);
  const handledSyncRequestToken = useRef(0);

  useEffect(() => {
    hasReconciled.current = false;
    lastPushedAt.current = lastModifiedAt;
    lastObservedModifiedAt.current = lastModifiedAt;
  }, [cloudVaultChangeToken, lastModifiedAt, user?.id]);

  useEffect(() => {
    if (!isSupabaseConfigured || !authReady || !hasHydrated || !user) {
      return undefined;
    }

    const currentUser = user;

    let cancelled = false;
    const hasPendingSyncRequest =
      syncRequestToken > handledSyncRequestToken.current;
    const shouldAutoReconcile = !hasReconciled.current && cards.length === 0;

    if (!hasPendingSyncRequest && !shouldAutoReconcile) {
      if (!hasReconciled.current) {
        hasReconciled.current = true;
        lastPushedAt.current = lastModifiedAt;
        lastObservedModifiedAt.current = lastModifiedAt;
      }
      return undefined;
    }

    async function reconcile() {
      try {
        const hasPassphrase = await hasStoredSyncPassphrase(currentUser.id);

        if (!hasPassphrase) {
          setSyncState("idle");
          hasReconciled.current = true;
          handledSyncRequestToken.current = syncRequestToken;
          return;
        }

        const result = await reconcileWalletSnapshot({
          user: currentUser,
          cards,
          lastModifiedAt,
        });

        if (cancelled) return;

        if (result.action === "pull" && result.remote) {
          replaceCards(result.remote.cards, result.remote.updated_at);
          lastPushedAt.current = result.remote.updated_at;
          lastObservedModifiedAt.current = result.remote.updated_at;

          if (result.remote.storage === "legacy-plain") {
            await pushWalletSnapshot({
              user: currentUser,
              cards: result.remote.cards,
              lastModifiedAt: result.remote.updated_at,
            });
            lastPushedAt.current = result.remote.updated_at;
          }
        } else {
          await pushWalletSnapshot({
            user: currentUser,
            cards,
            lastModifiedAt,
          });
          lastPushedAt.current = lastModifiedAt;
          lastObservedModifiedAt.current = lastModifiedAt;
        }

        handledSyncRequestToken.current = syncRequestToken;
        setSyncState("idle");
        hasReconciled.current = true;
      } catch (error) {
        if (!isPassphraseMissingError(error)) {
          console.warn("Cloud sync reconcile failed", error);
        }
        handledSyncRequestToken.current = syncRequestToken;
        setSyncState("error", "Could not fetch the latest cloud data.");
        hasReconciled.current = true;
      }
    }

    void reconcile();

    return () => {
      cancelled = true;
    };
  }, [
    authReady,
    cards,
    cloudVaultChangeToken,
    hasHydrated,
    lastModifiedAt,
    replaceCards,
    setSyncState,
    syncRequestToken,
    user,
  ]);

  useEffect(() => {
    if (lastObservedModifiedAt.current == null) {
      lastObservedModifiedAt.current = lastModifiedAt;
      return undefined;
    }

    if (
      !isSupabaseConfigured ||
      !authReady ||
      !hasHydrated ||
      !user ||
      !hasReconciled.current ||
      lastObservedModifiedAt.current === lastModifiedAt ||
      lastPushedAt.current === lastModifiedAt
    ) {
      return undefined;
    }

    const currentUser = user;
    lastObservedModifiedAt.current = lastModifiedAt;

    const timer = setTimeout(() => {
      void hasStoredSyncPassphrase(currentUser.id)
        .then((hasPassphrase) => {
          if (!hasPassphrase) {
            return;
          }

          return pushWalletSnapshot({
            user: currentUser,
            cards,
            lastModifiedAt,
          }).then(() => {
            lastPushedAt.current = lastModifiedAt;
          });
        })
        .then(() => {
          return undefined;
        })
        .catch((error) => {
          if (!isPassphraseMissingError(error)) {
            console.warn("Cloud sync push failed", error);
          }
          return undefined;
        });
    }, 800);

    return () => clearTimeout(timer);
  }, [
    authReady,
    cards,
    cloudVaultChangeToken,
    hasHydrated,
    lastModifiedAt,
    user,
  ]);

  return syncStatus === "syncing" ? (
    <View
      pointerEvents="auto"
      style={[styles.overlay, { backgroundColor: colors.overlay }]}
    >
      <View
        style={[
          styles.modal,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            shadowColor: colors.shadow,
          },
        ]}
      >
        <ActivityIndicator size="small" color={colors.text} />
        <Text style={[styles.title, { color: colors.text }]}>
          Syncing Pocket ID
        </Text>
        <Text style={[styles.body, { color: colors.textMuted }]}>
          {syncMessage ?? "Fetching your latest cards…"}
        </Text>
      </View>
    </View>
  ) : null;
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 999,
    elevation: 999,
    paddingHorizontal: 24,
  },
  modal: {
    minWidth: 260,
    maxWidth: 340,
    borderRadius: 28,
    borderWidth: 1,
    paddingHorizontal: 22,
    paddingVertical: 20,
    alignItems: "center",
    gap: 12,
    shadowOpacity: 0.14,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 16 },
  },
  title: {
    fontFamily: "ReadexPro-Bold",
    fontSize: 18,
  },
  body: {
    fontFamily: "ReadexPro-Regular",
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
  },
});
