/**
 * Developer Context for BrewTracker Android
 *
 * Provides development-only utilities for testing and debugging.
 * Includes features like simulated offline mode for testing offline functionality.
 *
 * Features:
 * - Simulated offline mode toggle
 * - Development mode detection
 * - Debug settings persistence
 *
 * Note: This context is only active in development builds.
 *
 * @example
 * ```typescript
 * const { isSimulatedOffline, toggleSimulatedOffline } = useDeveloper();
 *
 * if (isSimulatedOffline) {
 *   console.log('Simulating offline mode for testing');
 * }
 * ```
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { STORAGE_KEYS } from "@services/config";
import { UnifiedLogger } from "@services/logger/UnifiedLogger";

/**
 * Network simulation modes for testing
 */
export type NetworkSimulationMode = "normal" | "slow" | "offline";

/**
 * Sync status for developer mode network transitions
 */
export type SyncStatus = "idle" | "syncing" | "success" | "failed";

/**
 * Developer context interface defining all available state and actions
 */
interface DeveloperContextValue {
  // Development state
  isDeveloperMode: boolean;
  networkSimulationMode: NetworkSimulationMode;
  syncStatus: SyncStatus;
  syncError?: string;

  // Computed states (for backwards compatibility)
  isSimulatedOffline: boolean;
  isSimulatedSlow: boolean;

  // Actions
  setNetworkSimulationMode: (mode: NetworkSimulationMode) => Promise<void>;
  toggleSimulatedOffline: () => Promise<void>; // Keep for backwards compatibility
  resetDeveloperSettings: () => Promise<void>;
  cleanupTombstones: () => Promise<{
    removedTombstones: number;
    tombstoneNames: string[];
  }>;

  // Cache manipulation actions (for testing)
  makeQueryCacheStale: (ageHours: number) => Promise<void>;
  clearQueryCache: () => Promise<void>;
  invalidateAuthToken: (revalidateAuth?: () => Promise<void>) => Promise<void>;
}

/**
 * Props for the DeveloperProvider component
 */
interface DeveloperProviderProps {
  children: ReactNode;
}

const DeveloperContext = createContext<DeveloperContextValue | undefined>(
  undefined
);

/**
 * Storage key for network simulation mode
 */
const NETWORK_SIMULATION_KEY = `${STORAGE_KEYS.USER_SETTINGS}_network_simulation`;

/**
 * Custom hook to access developer context
 * Must be used within a DeveloperProvider
 *
 * @returns DeveloperContextValue with all developer state and actions
 * @throws Error if used outside DeveloperProvider
 */
export const useDeveloper = (): DeveloperContextValue => {
  const context = useContext(DeveloperContext);
  if (!context) {
    throw new Error("useDeveloper must be used within a DeveloperProvider");
  }
  return context;
};

/**
 * Developer Provider Component
 *
 * Provides development utilities and state management.
 * Only active in development builds - returns no-op in production.
 *
 * @param children - Child components
 */
export const DeveloperProvider: React.FC<DeveloperProviderProps> = ({
  children,
}) => {
  const [networkSimulationMode, setNetworkSimulationModeState] =
    useState<NetworkSimulationMode>("normal");
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const [syncError, setSyncError] = useState<string | undefined>(undefined);

  // Check if we're in development mode
  const isDeveloperMode =
    __DEV__ || process.env.EXPO_PUBLIC_DEBUG_MODE === "true";

  // Computed states for backwards compatibility and convenience
  const isSimulatedOffline = networkSimulationMode === "offline";
  const isSimulatedSlow = networkSimulationMode === "slow";

  /**
   * Initialize developer settings from storage
   */
  useEffect(() => {
    const initializeDeveloperSettings = async () => {
      try {
        const storedMode = await AsyncStorage.getItem(NETWORK_SIMULATION_KEY);
        if (storedMode !== null) {
          let mode: NetworkSimulationMode | null = null;

          // Try to parse as JSON, but handle legacy string "undefined" and other cases
          try {
            mode = JSON.parse(storedMode) as NetworkSimulationMode;
          } catch {
            // If JSON parsing fails, treat as raw string (legacy case)
            if (storedMode !== "undefined") {
              mode = storedMode as NetworkSimulationMode;
            }
          }

          // Validate the mode value
          if (mode && ["normal", "slow", "offline"].includes(mode)) {
            setNetworkSimulationModeState(mode);
          } else {
            // Self-heal by removing invalid value and setting safe default
            await AsyncStorage.removeItem(NETWORK_SIMULATION_KEY);
            setNetworkSimulationModeState("normal");
          }
        }
      } catch (error) {
        UnifiedLogger.warn(
          "developer",
          "Failed to load developer settings:",
          error
        );
        // Self-heal on any error by ensuring we have a safe default
        setNetworkSimulationModeState("normal");
      }
    };

    if (isDeveloperMode) {
      initializeDeveloperSettings();
    }
  }, [isDeveloperMode]);

  /**
   * Helper function to sync pending operations with proper error handling and state management
   */
  const syncPendingOperationsWithState = async (): Promise<void> => {
    setSyncStatus("syncing");
    setSyncError(undefined);

    try {
      await UnifiedLogger.info(
        "DeveloperContext.syncPendingOperations",
        "Starting pending operations sync"
      );

      const { UserCacheService } = await import(
        "@services/offlineV2/UserCacheService"
      );

      const result = await UserCacheService.syncPendingOperations();
      if (result && result.success === false) {
        const errorSummary =
          Array.isArray(result.errors) && result.errors.length
            ? result.errors
                .map((e: any) =>
                  typeof e === "string" ? e : e?.message || String(e)
                )
                .join("; ")
            : "Sync reported failures";
        setSyncStatus("failed");
        setSyncError(errorSummary);
        await UnifiedLogger.warn(
          "DeveloperContext.syncPendingOperations",
          `Pending operations sync completed with failures`,
          { errorSummary }
        );
        return;
      }
      setSyncStatus("success");
      await UnifiedLogger.info(
        "DeveloperContext.syncPendingOperations",
        "Successfully synced pending operations"
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      setSyncStatus("failed");
      setSyncError(errorMessage);

      await UnifiedLogger.error(
        "DeveloperContext.syncPendingOperations",
        `Failed to sync pending operations: ${errorMessage}`,
        { error: errorMessage }
      );

      UnifiedLogger.warn(
        "developer",
        "Developer mode sync of pending operations failed:",
        error
      );
      throw error; // Re-throw so callers can handle if needed
    }
  };

  /**
   * Set network simulation mode
   */
  const setNetworkSimulationMode = async (
    mode: NetworkSimulationMode
  ): Promise<void> => {
    const previousMode = networkSimulationMode;
    try {
      await AsyncStorage.setItem(NETWORK_SIMULATION_KEY, JSON.stringify(mode));
      setNetworkSimulationModeState(mode);

      await UnifiedLogger.info(
        "DeveloperContext.setNetworkSimulationMode",
        `Network simulation changed: ${previousMode} → ${mode}`,
        {
          previousMode,
          newMode: mode,
          isOffline: mode === "offline",
          isSlow: mode === "slow",
          timestamp: new Date().toISOString(),
        }
      );

      // **CRITICAL FIX**: If switching from offline/slow to normal simulation, trigger pending operations sync
      if (
        (previousMode === "offline" || previousMode === "slow") &&
        mode === "normal"
      ) {
        await UnifiedLogger.info(
          "DeveloperContext.setNetworkSimulationMode",
          `Switching from ${previousMode} to online simulation - triggering pending operations sync`
        );

        try {
          await syncPendingOperationsWithState();
        } catch (syncError) {
          // Error already handled by syncPendingOperationsWithState, just log the transition context
          await UnifiedLogger.error(
            "DeveloperContext.setNetworkSimulationMode",
            `Sync failed during ${previousMode} → ${mode} transition`,
            {
              previousMode,
              newMode: mode,
              syncError:
                syncError instanceof Error
                  ? syncError.message
                  : "Unknown error",
            }
          );
        }
      }

      console.log(`Developer mode: Network simulation set to "${mode}"`);
    } catch (error) {
      await UnifiedLogger.error(
        "DeveloperContext.setNetworkSimulationMode",
        `Failed to set network simulation mode: ${error instanceof Error ? error.message : "Unknown error"}`,
        {
          targetMode: mode,
          error: error instanceof Error ? error.message : "Unknown error",
        }
      );
      UnifiedLogger.error(
        "developer",
        "Failed to set network simulation mode:",
        error
      );
    }
  };

  /**
   * Toggle simulated offline mode (backwards compatibility)
   */
  const toggleSimulatedOffline = async (): Promise<void> => {
    const newMode: NetworkSimulationMode = isSimulatedOffline
      ? "normal"
      : "offline";
    await setNetworkSimulationMode(newMode);
  };

  /**
   * Reset all developer settings to defaults
   */
  const resetDeveloperSettings = async (): Promise<void> => {
    try {
      await AsyncStorage.removeItem(NETWORK_SIMULATION_KEY);
      setNetworkSimulationModeState("normal");
      console.log("Developer settings reset to defaults");
    } catch (error) {
      UnifiedLogger.error(
        "developer",
        "Failed to reset developer settings:",
        error
      );
    }
  };

  /**
   * Clean up all tombstones (dev only - for when database is manually cleaned)
   */
  const cleanupTombstones = async (): Promise<{
    removedTombstones: number;
    tombstoneNames: string[];
  }> => {
    if (!isDeveloperMode) {
      throw new Error(
        "cleanupTombstones is only available in development mode"
      );
    }

    try {
      // V2 system handles cleanup automatically - no manual tombstone cleanup needed
      console.log("Developer: V2 system handles cleanup automatically");
      return { removedTombstones: 0, tombstoneNames: [] };
    } catch (error) {
      UnifiedLogger.error("developer", "Failed to cleanup tombstones:", error);
      throw error;
    }
  };

  /**
   * Make React Query cache appear stale by modifying dataUpdatedAt timestamps
   * Useful for testing stale data banners and cache invalidation
   */
  const makeQueryCacheStale = async (ageHours: number): Promise<void> => {
    if (!isDeveloperMode) {
      throw new Error(
        "makeQueryCacheStale is only available in development mode"
      );
    }

    try {
      const { queryClient } = await import("@services/api/queryClient");
      const queryCache = queryClient.getQueryCache();
      const queries = queryCache.getAll();

      const targetTimestamp = Date.now() - ageHours * 60 * 60 * 1000;

      queries.forEach(query => {
        // Update the dataUpdatedAt timestamp to make queries appear old
        query.state.dataUpdatedAt = targetTimestamp;
      });

      await UnifiedLogger.info(
        "DeveloperContext.makeQueryCacheStale",
        `Made ${queries.length} queries appear ${ageHours} hours old`,
        { ageHours, queryCount: queries.length }
      );

      console.log(
        `Developer: Made ${queries.length} queries appear ${ageHours} hours old`
      );
    } catch (error) {
      await UnifiedLogger.error(
        "DeveloperContext.makeQueryCacheStale",
        "Failed to make cache stale",
        { error }
      );
      UnifiedLogger.error("developer", "Failed to make cache stale:", error);
      throw error;
    }
  };

  /**
   * Clear all React Query cache
   * Useful for testing initial load states and cache behavior
   */
  const clearQueryCache = async (): Promise<void> => {
    if (!isDeveloperMode) {
      throw new Error("clearQueryCache is only available in development mode");
    }

    try {
      const { queryClient } = await import("@services/api/queryClient");
      await queryClient.clear();

      await UnifiedLogger.info(
        "DeveloperContext.clearQueryCache",
        "Cleared all React Query cache"
      );

      console.log("Developer: Cleared all React Query cache");
    } catch (error) {
      await UnifiedLogger.error(
        "DeveloperContext.clearQueryCache",
        "Failed to clear cache",
        { error }
      );
      UnifiedLogger.error("developer", "Failed to clear cache:", error);
      throw error;
    }
  };

  /**
   * Invalidate the current auth token to test expired/unauthenticated states
   * Sets expiration to 1 hour ago and optionally triggers auth re-validation
   *
   * @param revalidateAuth - Optional callback to re-validate auth status after invalidation
   */
  const invalidateAuthToken = async (
    revalidateAuth?: () => Promise<void>
  ): Promise<void> => {
    if (!isDeveloperMode) {
      throw new Error(
        "invalidateAuthToken is only available in development mode"
      );
    }

    try {
      const SecureStore = await import("expo-secure-store");
      const { STORAGE_KEYS } = await import("@services/config");

      // Get current token
      const token = await SecureStore.getItemAsync(STORAGE_KEYS.ACCESS_TOKEN);
      if (!token) {
        console.log("Developer: No token to invalidate");
        return;
      }

      // Decode and modify token (set exp to 1 hour ago)
      const { base64Decode, base64Encode } = await import("@utils/base64");
      const parts = token.split(".");
      if (parts.length !== 3) {
        throw new Error("Invalid JWT format");
      }

      const payload = JSON.parse(base64Decode(parts[1]));
      payload.exp = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago

      // Encode modified payload
      const modifiedPayload = base64Encode(JSON.stringify(payload));
      const modifiedToken = `${parts[0]}.${modifiedPayload}.${parts[2]}`;

      // Save modified token
      await SecureStore.setItemAsync(STORAGE_KEYS.ACCESS_TOKEN, modifiedToken);

      await UnifiedLogger.info(
        "DeveloperContext.invalidateAuthToken",
        "Invalidated auth token (set exp to 1 hour ago)"
      );

      console.log("Developer: Invalidated auth token");

      // Trigger auth re-validation if callback provided
      if (revalidateAuth) {
        await revalidateAuth();
        console.log(
          "Developer: Auth status revalidated after token invalidation"
        );
      }
    } catch (error) {
      await UnifiedLogger.error(
        "DeveloperContext.invalidateAuthToken",
        "Failed to invalidate token",
        { error }
      );
      UnifiedLogger.error("developer", "Failed to invalidate token:", error);
      throw error;
    }
  };

  const contextValue: DeveloperContextValue = {
    isDeveloperMode,
    networkSimulationMode,
    syncStatus,
    syncError,
    isSimulatedOffline,
    isSimulatedSlow,
    setNetworkSimulationMode,
    toggleSimulatedOffline,
    resetDeveloperSettings,
    cleanupTombstones,
    makeQueryCacheStale,
    clearQueryCache,
    invalidateAuthToken,
  };

  return (
    <DeveloperContext.Provider value={contextValue}>
      {children}
    </DeveloperContext.Provider>
  );
};

export default DeveloperContext;
