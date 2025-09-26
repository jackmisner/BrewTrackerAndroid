import React from "react";
import { renderHook, act } from "@testing-library/react-native";

// Mock STORAGE_KEYS before any imports
jest.mock("@services/config", () => ({
  STORAGE_KEYS: {
    NETWORK_STATE: "networkState",
    USER_DATA: "userData",
    USER_SETTINGS: "userSettings",
    OFFLINE_RECIPES: "offlineRecipes",
    CACHED_INGREDIENTS: "cachedIngredients",
  },
}));

// Mock AsyncStorage
jest.mock("@react-native-async-storage/async-storage", () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    multiRemove: jest.fn(),
  },
}));

// Mock StaticDataService
jest.mock("@services/offlineV2/StaticDataService", () => ({
  StaticDataService: {
    updateIngredientsCache: jest.fn(),
    updateBeerStylesCache: jest.fn(),
  },
}));

// Mock UserCacheService
jest.mock("@services/offlineV2/UserCacheService", () => ({
  UserCacheService: {
    syncPendingOperations: jest.fn(),
  },
}));

// Mock UnifiedLogger
jest.mock("@services/logger/UnifiedLogger", () => ({
  UnifiedLogger: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock DeveloperContext
jest.mock("@contexts/DeveloperContext", () => ({
  useDeveloper: jest.fn(() => ({
    networkSimulationMode: "normal",
  })),
}));

// Mock NetInfo
jest.mock("@react-native-community/netinfo", () => ({
  fetch: jest.fn(() =>
    Promise.resolve({
      type: "wifi",
      isConnected: true,
      isInternetReachable: true,
      details: {
        strength: -50,
        ssid: "MockWiFi",
        bssid: "00:00:00:00:00:00",
        frequency: 2450,
        ipAddress: "192.168.1.1",
        subnet: "255.255.255.0",
      },
    })
  ),
  addEventListener: jest.fn(listener => {
    // Immediately call listener with connected state
    listener({
      type: "wifi",
      isConnected: true,
      isInternetReachable: true,
      details: {
        strength: -50,
        ssid: "MockWiFi",
        bssid: "00:00:00:00:00:00",
        frequency: 2450,
        ipAddress: "192.168.1.1",
        subnet: "255.255.255.0",
      },
    });
    // Return unsubscribe function
    return jest.fn();
  }),
}));

// Unmock NetworkContext to test the real implementation
jest.unmock("@contexts/NetworkContext");

// Import after mocks
import AsyncStorage from "@react-native-async-storage/async-storage";
import { NetworkProvider, useNetwork } from "@contexts/NetworkContext";

describe("NetworkContext", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("NetworkProvider", () => {
    it("should render without throwing", () => {
      expect(() => {
        renderHook(() => useNetwork(), {
          wrapper: ({ children }) => (
            <NetworkProvider>{children}</NetworkProvider>
          ),
        });
      }).not.toThrow();
    });

    it("should provide default network state", () => {
      const { result } = renderHook(() => useNetwork(), {
        wrapper: ({ children }) => (
          <NetworkProvider>{children}</NetworkProvider>
        ),
      });

      // Initial state before NetInfo data is loaded
      expect(result.current.isConnected).toBe(true);
      expect(result.current.isOffline).toBe(false);
      expect(result.current.connectionType).toBe("unknown"); // Default before NetInfo fetch
      expect(result.current.isInternetReachable).toBe(null); // Default before NetInfo fetch
      expect(typeof result.current.refreshNetworkState).toBe("function");
    });

    it("should provide network details structure", () => {
      const { result } = renderHook(() => useNetwork(), {
        wrapper: ({ children }) => (
          <NetworkProvider>{children}</NetworkProvider>
        ),
      });

      // Initial network details before NetInfo data is loaded
      expect(result.current.networkDetails).toEqual({
        strength: null,
        ssid: null,
        bssid: null,
        frequency: null,
        ipAddress: null,
        subnet: null,
      });
    });
  });

  describe("useNetwork hook", () => {
    it("should throw error when used outside NetworkProvider", () => {
      expect(() => {
        renderHook(() => useNetwork());
      }).toThrow("useNetwork must be used within a NetworkProvider");
    });
  });
});
