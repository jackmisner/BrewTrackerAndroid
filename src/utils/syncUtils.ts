/**
 * Sync utility functions for BrewTracker Offline V2
 *
 * Shared helper functions for sync status messaging and UI state management
 * across different screens (recipes, brew sessions, etc.)
 *
 * Note: For more comprehensive sync status needs, consider using the useSyncStatus()
 * hook from @hooks/offlineV2 which provides status types, colors, and messages.
 */

/**
 * Pure helper function to generate sync status message
 * Used in tab screens for simple sync status display in banners.
 *
 * @param pendingOperations - Number of pending operations
 * @param isSyncing - Whether sync is currently in progress
 * @returns The appropriate sync status message string
 *
 * @example
 * const message = getSyncStatusMessage(3, false);
 * // Returns: "3 changes need sync"
 *
 * @example
 * const message = getSyncStatusMessage(0, false);
 * // Returns: "All synced"
 */
export function getSyncStatusMessage(
  pendingOperations: number,
  isSyncing: boolean
): string {
  if (isSyncing) {
    return "Syncing...";
  }

  if (pendingOperations === 0) {
    return "All synced";
  }

  return `${pendingOperations} change${pendingOperations !== 1 ? "s" : ""} need${pendingOperations === 1 ? "s" : ""} sync`;
}

/**
 * Handles pull-to-refresh sync logic for tab screens
 * Triggers sync if online and there are pending operations.
 *
 * @param isConnected - Whether the device is online
 * @param pendingOperations - Number of pending operations
 * @param syncFn - The sync function to call (typically from useOfflineSync)
 * @returns Promise that resolves when sync completes or is skipped
 *
 * @example
 * const onRefresh = async () => {
 *   setRefreshing(true);
 *   try {
 *     await handlePullToRefreshSync(isConnected, pendingOperations, syncMutation);
 *     await refreshData();
 *   } finally {
 *     setRefreshing(false);
 *   }
 * };
 */
export async function handlePullToRefreshSync(
  isConnected: boolean,
  pendingOperations: number,
  syncFn: () => Promise<unknown>
): Promise<void> {
  // Only sync if online and there are pending changes
  if (isConnected && pendingOperations > 0) {
    try {
      console.log("🔄 Pull-to-refresh triggering sync...");
      await syncFn();
      console.log("✅ Pull-to-refresh sync completed");
    } catch (error) {
      console.warn("Pull-to-refresh sync failed:", error);
      // Don't throw - let sync errors be non-blocking for refresh
    }
  }
}
