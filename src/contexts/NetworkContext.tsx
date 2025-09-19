/**
 * Network Context for BrewTracker Android
 *
 * Provides comprehensive network connectivity state management including:
 * - Real-time network connectivity monitoring
 * - Connection type detection (WiFi, Cellular, etc.)
 * - Network state persistence for offline handling
 * - Integration with React Query for cache management
 *
 * Built on @react-native-community/netinfo for reliable cross-platform
 * network detection with automatic state updates.
 *
 * @example
 * ```typescript
 * const { isConnected, connectionType, isOffline } = useNetwork();
 *
 * // Check connectivity
 * if (isOffline) {
 *   console.log('App is offline');
 * } else {
 *   console.log('Connected via:', connectionType);
 * }
 * ```
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  ReactNode,
} from "react";
import NetInfo, { NetInfoState } from "@react-native-community/netinfo";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { STORAGE_KEYS } from "@services/config";
import OfflineCacheService from "@services/offline/OfflineCacheService";
import { useDeveloper } from "./DeveloperContext";

/**
 * Network connection types supported by NetInfo
 */
type ConnectionType =
  | "wifi"
  | "cellular"
  | "ethernet"
  | "bluetooth"
  | "wimax"
  | "vpn"
  | "other"
  | "unknown"
  | "none";

/**
 * Network context interface defining all available state and actions
 */
interface NetworkContextValue {
  // Connection State
  isConnected: boolean;
  isOffline: boolean;
  connectionType: ConnectionType;

  // Connection Quality
  isInternetReachable: boolean | null;

  // Network Details (for advanced features)
  networkDetails: {
    strength: number | null;
    ssid: string | null;
    bssid: string | null;
    frequency: number | null;
    ipAddress: string | null;
    subnet: string | null;
  };

  // Actions
  refreshNetworkState: () => Promise<void>;
}

/**
 * Props for the NetworkProvider component
 */
interface NetworkProviderProps {
  children: ReactNode;
  initialState?: Partial<NetworkContextValue>;
}

const NetworkContext = createContext<NetworkContextValue | undefined>(
  undefined
);

/**
 * Custom hook to access network context
 * Must be used within a NetworkProvider
 *
 * @returns NetworkContextValue with all network state and actions
 * @throws Error if used outside NetworkProvider
 */
export const useNetwork = (): NetworkContextValue => {
  const context = useContext(NetworkContext);
  if (!context) {
    throw new Error("useNetwork must be used within a NetworkProvider");
  }
  return context;
};

/**
 * Network Provider Component
 *
 * Manages global network connectivity state and provides network context to child components.
 * Automatically monitors network changes and persists network state for offline handling.
 * Integrates with React Query cache management for optimal offline experience.
 *
 * @param children - Child components that need access to network context
 * @param initialState - Optional initial state for testing purposes
 */
export const NetworkProvider: React.FC<NetworkProviderProps> = ({
  children,
  initialState,
}) => {
  // Get developer context for network simulation
  const { networkSimulationMode } = useDeveloper();

  const [isConnected, setIsConnected] = useState<boolean>(
    initialState?.isConnected ?? true
  );
  const [connectionType, setConnectionType] = useState<ConnectionType>(
    initialState?.connectionType ?? "unknown"
  );
  const [isInternetReachable, setIsInternetReachable] = useState<
    boolean | null
  >(initialState?.isInternetReachable ?? null);
  const [networkDetails, setNetworkDetails] = useState(
    initialState?.networkDetails ?? {
      strength: null,
      ssid: null,
      bssid: null,
      frequency: null,
      ipAddress: null,
      subnet: null,
    }
  );

  // Track previous connection state for background refresh detection
  const previousConnectionState = useRef<boolean>(isConnected);
  const lastCacheRefresh = useRef<number>(0);

  // Initialize network monitoring on component mount
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    const initializeNetworkMonitoring = async () => {
      try {
        // Get initial network state
        const initialNetState = await NetInfo.fetch();
        updateNetworkState(initialNetState);

        // Set up real-time monitoring
        unsubscribe = NetInfo.addEventListener(state => {
          updateNetworkState(state);
        });

        // Load any cached network preferences
        await loadCachedNetworkState();
      } catch (error) {
        console.warn("Failed to initialize network monitoring:", error);
        // Fallback to optimistic connected state
        setIsConnected(true);
        setConnectionType("unknown");
      }
    };

    if (!initialState) {
      initializeNetworkMonitoring();
    }

    // Cleanup subscription on unmount
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [initialState]);

  /**
   * Update network state from NetInfo state
   */
  const updateNetworkState = async (state: NetInfoState) => {
    const connected = state.isConnected ?? false;
    const reachable = state.isInternetReachable;
    const type = (state.type as ConnectionType) ?? "unknown";

    // Extract network details based on connection type
    const details = {
      strength: null as number | null,
      ssid: null as string | null,
      bssid: null as string | null,
      frequency: null as number | null,
      ipAddress: (state.details as any)?.ipAddress ?? null,
      subnet: (state.details as any)?.subnet ?? null,
    };

    // Add WiFi-specific details if available
    if (state.type === "wifi" && state.details) {
      const wifiDetails = state.details as any;
      details.strength = wifiDetails.strength ?? null;
      details.ssid = wifiDetails.ssid ?? null;
      details.bssid = wifiDetails.bssid ?? null;
      details.frequency = wifiDetails.frequency ?? null;
    }

    // Update state
    setIsConnected(connected);
    setConnectionType(type);
    setIsInternetReachable(reachable);
    setNetworkDetails(details);

    // Background cache refresh when coming back online
    const wasOffline = !previousConnectionState.current;
    const isNowOnline = connected && reachable;
    const shouldRefresh = wasOffline && isNowOnline;

    // Also refresh if it's been more than 4 hours since last refresh
    const timeSinceRefresh = Date.now() - lastCacheRefresh.current;
    const shouldPeriodicRefresh =
      isNowOnline && timeSinceRefresh > 4 * 60 * 60 * 1000;

    if (shouldRefresh || shouldPeriodicRefresh) {
      lastCacheRefresh.current = Date.now();
      // Trigger comprehensive background cache refresh (non-blocking)
      OfflineCacheService.refreshAllCacheInBackground().catch(error => {
        console.warn("Background cache refresh failed:", error);
      });
    }

    // Update previous connection state
    previousConnectionState.current = connected;

    // Persist network state for offline handling
    try {
      await AsyncStorage.setItem(
        STORAGE_KEYS.NETWORK_STATE,
        JSON.stringify({
          isConnected: connected,
          connectionType: type,
          isInternetReachable: reachable,
          timestamp: Date.now(),
        })
      );
    } catch (error) {
      console.warn("Failed to cache network state:", error);
    }
  };

  /**
   * Load cached network state for initialization
   */
  const loadCachedNetworkState = async () => {
    try {
      const cachedState = await AsyncStorage.getItem(
        STORAGE_KEYS.NETWORK_STATE
      );
      if (cachedState) {
        const parsed = JSON.parse(cachedState);

        // Use cached state only if it's recent (within 5 minutes)
        const isRecent = Date.now() - parsed.timestamp < 5 * 60 * 1000;
        if (isRecent) {
          // Apply cached state for faster initialization
          setIsConnected(parsed.isConnected ?? true);
          setConnectionType(parsed.connectionType ?? "unknown");
          setIsInternetReachable(parsed.isInternetReachable ?? null);
        }
      }
    } catch (error) {
      console.warn("Failed to load cached network state:", error);
    }
  };

  /**
   * Manually refresh network state
   */
  const refreshNetworkState = async (): Promise<void> => {
    try {
      const state = await NetInfo.fetch();
      await updateNetworkState(state);
    } catch (error) {
      console.warn("Failed to refresh network state:", error);
      throw error;
    }
  };

  // Apply developer network simulation overrides
  const isSimulatingOffline = networkSimulationMode === "offline";
  const isSimulatingSlow = networkSimulationMode === "slow";

  const effectiveIsConnected = isSimulatingOffline ? false : isConnected;
  const effectiveConnectionType = isSimulatingOffline
    ? "none"
    : isSimulatingSlow
      ? "cellular" // Simulate cellular for slow mode
      : connectionType;

  const contextValue: NetworkContextValue = {
    // Connection State (with developer overrides)
    isConnected: effectiveIsConnected,
    isOffline: !effectiveIsConnected,
    connectionType: effectiveConnectionType,

    // Connection Quality (modified for simulations)
    isInternetReachable: isSimulatingOffline
      ? false
      : isSimulatingSlow
        ? true // Connected but slow
        : isInternetReachable,

    // Network Details (modified for simulations)
    networkDetails: isSimulatingOffline
      ? {
          strength: null,
          ssid: null,
          bssid: null,
          frequency: null,
          ipAddress: null,
          subnet: null,
        }
      : isSimulatingSlow
        ? {
            ...networkDetails,
            strength: 1, // Weak signal for slow simulation
          }
        : networkDetails,

    // Actions
    refreshNetworkState,
  };

  return (
    <NetworkContext.Provider value={contextValue}>
      {children}
    </NetworkContext.Provider>
  );
};

export default NetworkContext;
