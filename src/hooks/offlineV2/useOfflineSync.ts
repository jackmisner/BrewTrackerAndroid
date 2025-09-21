/**
 * useOfflineSync Hook - BrewTracker Offline V2
 *
 * React hook for managing offline sync operations and monitoring sync state.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { UserCacheService } from "@services/offlineV2/UserCacheService";
import { StaticDataService } from "@services/offlineV2/StaticDataService";
import {
  UseOfflineSyncReturn,
  SyncResult,
  ConflictResolution,
} from "@src/types";
import { useNetwork } from "@contexts/NetworkContext";

/**
 * Hook for managing offline sync operations
 */
export function useOfflineSync(): UseOfflineSyncReturn {
  const { isConnected } = useNetwork();
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingOperations, setPendingOperations] = useState(0);
  const [conflicts, setConflicts] = useState(0);
  const [lastSync, setLastSync] = useState<number | null>(null);
  const [, setLastSyncResult] = useState<SyncResult | null>(null);

  // Single-flight protection - prevent multiple concurrent sync operations
  const syncInProgressRef = useRef<Promise<SyncResult> | null>(null);

  // Load sync state
  const loadSyncState = useCallback(async () => {
    try {
      const pending = await UserCacheService.getPendingOperationsCount();
      setPendingOperations(pending);

      // TODO: Load conflict count when implemented
      setConflicts(0);

      // Load last sync time from metadata
      // TODO: Implement metadata storage in UserCacheService
    } catch (error) {
      console.error("Error loading sync state:", error);
    }
  }, []);

  // Sync all pending operations
  const sync = useCallback(async (): Promise<SyncResult> => {
    if (!isConnected) {
      throw new Error("Cannot sync while offline");
    }

    // Return existing sync promise if one is in progress (single-flight protection)
    if (syncInProgressRef.current) {
      return syncInProgressRef.current;
    }

    // Create new sync promise
    const syncPromise = (async (): Promise<SyncResult> => {
      try {
        setIsSyncing(true);

        // Sync user data
        const userResult = await UserCacheService.syncPendingOperations();

        // Check for static data updates
        const updates = await StaticDataService.checkForUpdates();

        if (updates.ingredients) {
          await StaticDataService.updateIngredientsCache();
        }

        if (updates.beerStyles) {
          await StaticDataService.updateBeerStylesCache();
        }

        // Update state
        setLastSync(Date.now());
        setLastSyncResult(userResult);
        await loadSyncState();

        return userResult;
      } catch (error) {
        console.error("Sync failed:", error);
        const errorResult: SyncResult = {
          success: false,
          processed: 0,
          failed: 0,
          conflicts: 0,
          errors: [
            error instanceof Error ? error.message : "Unknown sync error",
          ],
        };
        setLastSyncResult(errorResult);
        throw error;
      } finally {
        setIsSyncing(false);
        // Clear the sync promise when done
        syncInProgressRef.current = null;
      }
    })();

    // Store the promise for single-flight protection
    syncInProgressRef.current = syncPromise;

    return syncPromise;
  }, [isConnected, loadSyncState]);

  // Clear all pending operations
  const clearPending = useCallback(async (): Promise<void> => {
    try {
      await UserCacheService.clearSyncQueue();
      await loadSyncState();
    } catch (error) {
      console.error("Error clearing pending operations:", error);
      throw error;
    }
  }, [loadSyncState]);

  // Resolve a conflict
  const resolveConflict = useCallback(
    async (_id: string, _resolution: ConflictResolution): Promise<void> => {
      throw new Error("Conflict resolution not implemented");
    },
    []
  );

  // Auto-sync when network becomes available
  useEffect(() => {
    // Disable auto-sync in test environment to prevent timeout issues
    if (process.env.NODE_ENV === "test") {
      return;
    }

    if (isConnected && pendingOperations > 0 && !isSyncing) {
      // Auto-sync with a small delay to avoid immediate sync on network reconnection
      const timer = setTimeout(() => {
        sync().catch(error => {
          console.warn("Auto-sync failed:", error);
        });
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [isConnected, pendingOperations, isSyncing, sync]);

  // Load initial sync state
  useEffect(() => {
    loadSyncState();
  }, [loadSyncState]);

  return {
    isSyncing,
    pendingOperations,
    conflicts,
    lastSync,
    sync,
    clearPending,
    resolveConflict,
  };
}

/**
 * Hook for monitoring sync status across the app
 */
export function useSyncStatus() {
  const { isSyncing, pendingOperations, conflicts, lastSync } =
    useOfflineSync();

  const { isConnected } = useNetwork();

  // Determine overall sync status
  const syncStatus = (() => {
    if (isSyncing) {
      return "syncing";
    }
    if (!isConnected) {
      return "offline";
    }
    if (conflicts > 0) {
      return "conflicts";
    }
    if (pendingOperations > 0) {
      return "pending";
    }
    return "synced";
  })();

  // Get human-readable status message
  const getStatusMessage = useCallback(() => {
    switch (syncStatus) {
      case "syncing":
        return "Syncing changes...";
      case "offline":
        return `${pendingOperations} changes pending (offline)`;
      case "conflicts":
        return `${conflicts} conflicts need resolution`;
      case "pending":
        return `${pendingOperations} changes pending`;
      case "synced":
        return lastSync ? "All changes synced" : "No changes to sync";
      default:
        return "Unknown sync status";
    }
  }, [syncStatus, pendingOperations, conflicts, lastSync]);

  // Get status color for UI
  const getStatusColor = useCallback(() => {
    switch (syncStatus) {
      case "syncing":
        return "#2196F3"; // blue
      case "offline":
        return "#FF9800"; // orange
      case "conflicts":
        return "#F44336"; // red
      case "pending":
        return "#FF9800"; // orange
      case "synced":
        return "#4CAF50"; // green
      default:
        return "#757575"; // gray
    }
  }, [syncStatus]);

  return {
    status: syncStatus,
    message: getStatusMessage(),
    color: getStatusColor(),
    hasIssues: syncStatus === "conflicts" || syncStatus === "offline",
    needsAttention: conflicts > 0,
    isWorking: isSyncing,
  };
}
