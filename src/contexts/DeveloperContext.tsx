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
import OfflineRecipeService from "@services/offline/OfflineRecipeService";

/**
 * Network simulation modes for testing
 */
export type NetworkSimulationMode = "normal" | "slow" | "offline";

/**
 * Developer context interface defining all available state and actions
 */
interface DeveloperContextValue {
  // Development state
  isDeveloperMode: boolean;
  networkSimulationMode: NetworkSimulationMode;

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
            if (typeof storedMode === "string" && storedMode !== "undefined") {
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
        console.warn("Failed to load developer settings:", error);
        // Self-heal on any error by ensuring we have a safe default
        setNetworkSimulationModeState("normal");
      }
    };

    if (isDeveloperMode) {
      initializeDeveloperSettings();
    }
  }, [isDeveloperMode]);

  /**
   * Set network simulation mode
   */
  const setNetworkSimulationMode = async (
    mode: NetworkSimulationMode
  ): Promise<void> => {
    try {
      await AsyncStorage.setItem(NETWORK_SIMULATION_KEY, JSON.stringify(mode));
      setNetworkSimulationModeState(mode);

      console.log(`Developer mode: Network simulation set to "${mode}"`);
    } catch (error) {
      console.error("Failed to set network simulation mode:", error);
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
      console.error("Failed to reset developer settings:", error);
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
      const result = await OfflineRecipeService.devCleanupAllTombstonesAsync();
      console.log("Developer: Tombstone cleanup completed", result);
      return result;
    } catch (error) {
      console.error("Failed to cleanup tombstones:", error);
      throw error;
    }
  };

  const contextValue: DeveloperContextValue = {
    isDeveloperMode,
    networkSimulationMode,
    isSimulatedOffline,
    isSimulatedSlow,
    setNetworkSimulationMode,
    toggleSimulatedOffline,
    resetDeveloperSettings,
    cleanupTombstones,
  };

  return (
    <DeveloperContext.Provider value={contextValue}>
      {children}
    </DeveloperContext.Provider>
  );
};

export default DeveloperContext;
