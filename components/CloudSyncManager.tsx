import { Feather } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
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
import { pushWalletSnapshot, reconcileWalletSnapshot } from "@/utils/authSync";
import { hasStoredSyncPassphrase } from "@/utils/cloudVault";
import { APP_THEME, resolveTheme } from "@/utils/theme";

const MAX_BLOCKING_SYNC_MS = 25_000;

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
  const reconcileInFlight = useRef(false);
  const lastPushedAt = useRef<string | null>(null);
  const lastObservedModifiedAt = useRef<string | null>(null);
  const handledSyncRequestToken = useRef(0);
  const [isLocalPushSyncing, setIsLocalPushSyncing] = useState(false);

  useEffect(() => {
    if (syncStatus !== "success" && syncStatus !== "error") {
      return undefined;
    }

    const timer = setTimeout(() => {
      setSyncState("idle");
    }, 2200);

    return () => clearTimeout(timer);
  }, [setSyncState, syncStatus]);

  useEffect(() => {
    hasReconciled.current = false;
    lastPushedAt.current = null;
    lastObservedModifiedAt.current = lastModifiedAt;
    handledSyncRequestToken.current = 0;
  }, [cloudVaultChangeToken, user?.id]);

  useEffect(() => {
    if (syncStatus !== "syncing") {
      return undefined;
    }

    const timer = setTimeout(() => {
      setSyncState("idle");
    }, MAX_BLOCKING_SYNC_MS);

    return () => clearTimeout(timer);
  }, [setSyncState, syncStatus]);

  useEffect(() => {
    if (!isSupabaseConfigured || !authReady || !hasHydrated || !user) {
      return undefined;
    }

    const currentUser = user;
    let cancelled = false;
    const hasPendingSyncRequest =
      syncRequestToken > handledSyncRequestToken.current;
    const shouldAutoReconcile = !hasReconciled.current && cards.length === 0;

    if (reconcileInFlight.current) {
      return undefined;
    }

    if (!hasPendingSyncRequest && !shouldAutoReconcile) {
      if (!hasReconciled.current) {
        hasReconciled.current = true;
        lastObservedModifiedAt.current = lastModifiedAt;
      }
      return undefined;
    }

    async function reconcile() {
      reconcileInFlight.current = true;

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

        if (cancelled) {
          return;
        }

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

          const importedCount = result.remote.cards.length;
          if (hasPendingSyncRequest) {
            setSyncState(
              "success",
              importedCount === 1
                ? "Imported 1 card from your encrypted cloud vault."
                : `Imported ${importedCount} cards from your encrypted cloud vault.`,
            );
          } else {
            setSyncState("idle");
          }
        } else {
          await pushWalletSnapshot({
            user: currentUser,
            cards,
            lastModifiedAt,
          });
          lastPushedAt.current = lastModifiedAt;
          lastObservedModifiedAt.current = lastModifiedAt;

          if (hasPendingSyncRequest) {
            setSyncState("success", "Pocket ID is synced and up to date.");
          } else {
            setSyncState("idle");
          }
        }

        handledSyncRequestToken.current = syncRequestToken;
        hasReconciled.current = true;
      } catch (error) {
        if (!isPassphraseMissingError(error)) {
          console.warn("Cloud sync reconcile failed", error);
        }
        handledSyncRequestToken.current = syncRequestToken;
        if (hasPendingSyncRequest) {
          setSyncState("error", "Could not fetch the latest cloud data.");
        } else {
          setSyncState("idle");
        }
        hasReconciled.current = true;
      } finally {
        reconcileInFlight.current = false;
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
      setIsLocalPushSyncing(true);
      setSyncState(
        "syncing",
        "Syncing your latest card securely to the cloud vault...",
      );

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
            setSyncState("success", "Your latest card is now synced.");
          });
        })
        .then(() => undefined)
        .catch((error) => {
          if (!isPassphraseMissingError(error)) {
            console.warn("Cloud sync push failed", error);
          }
          setSyncState("error", "Could not sync your latest card.");
          return undefined;
        })
        .finally(() => {
          setIsLocalPushSyncing(false);
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

  if (syncStatus === "idle") {
    return null;
  }

  const isSyncing = syncStatus === "syncing";
  const isSuccess = syncStatus === "success";
  const shouldShowLocalSyncModal = isSyncing && isLocalPushSyncing;
  const title = isSyncing
    ? "Fetching latest data"
    : isSuccess
      ? "Sync complete"
      : "Sync issue";
  const body =
    syncMessage ??
    (isSyncing
      ? "This can take a couple of seconds. Please wait before continuing to use Pocket ID."
      : isSuccess
        ? "Your encrypted cloud vault is ready on this device."
        : "Could not fetch the latest cloud data.");

  return (
    <View
      pointerEvents="none"
      style={[
        styles.overlay,
        shouldShowLocalSyncModal ? styles.centeredOverlay : null,
      ]}
    >
      <View
        style={[
          styles.modal,
          shouldShowLocalSyncModal ? styles.centeredModal : null,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            shadowColor: colors.shadow,
          },
        ]}
      >
        {isSyncing ? (
          <ActivityIndicator size="small" color={colors.text} />
        ) : (
          <View
            style={[
              styles.statusIcon,
              {
                backgroundColor: isSuccess ? colors.accent : colors.dangerSoft,
              },
            ]}
          >
            <Feather
              name={isSuccess ? "check" : "alert-triangle"}
              size={18}
              color={isSuccess ? colors.accentText : colors.danger}
            />
          </View>
        )}
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.body, { color: colors.textMuted }]}>{body}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "flex-start",
    zIndex: 999,
    elevation: 999,
    paddingHorizontal: 24,
    paddingTop: 88,
  },
  centeredOverlay: {
    justifyContent: "center",
    paddingTop: 24,
  },
  modal: {
    width: "100%",
    minWidth: 260,
    maxWidth: 420,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    alignItems: "center",
    gap: 10,
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: {
      width: 0,
      height: 8,
    },
    elevation: 4,
  },
  centeredModal: {
    maxWidth: 360,
  },
  statusIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
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
