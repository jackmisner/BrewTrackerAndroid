/**
 * useOfflineSync Hook Test Suite
 * Tests for React hooks that manage offline sync operations and monitoring.
 */

import React from "react";
import { renderHook, waitFor, act } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useOfflineSync, useSyncStatus } from "@hooks/offlineV2/useOfflineSync";
import { UserCacheService } from "@services/offlineV2/UserCacheService";
import { StaticDataService } from "@services/offlineV2/StaticDataService";
import { useNetwork } from "@contexts/NetworkContext";

// Mock services
jest.mock("@services/offlineV2/UserCacheService", () => ({
  UserCacheService: {
    syncPendingOperations: jest.fn(),
    getPendingOperationsCount: jest.fn(),
    clearSyncQueue: jest.fn(),
  },
}));

jest.mock("@services/offlineV2/StaticDataService", () => ({
  StaticDataService: {
    checkForUpdates: jest.fn(),
    updateIngredientsCache: jest.fn(),
    updateBeerStylesCache: jest.fn(),
  },
}));

// Mock useNetwork hook
jest.mock("@contexts/NetworkContext", () => ({
  useNetwork: jest.fn(),
}));

// Mock React Native Appearance
jest.mock("react-native", () => ({
  Appearance: {
    getColorScheme: jest.fn(() => "light"),
    addChangeListener: jest.fn(),
    removeChangeListener: jest.fn(),
  },
}));

describe("useOfflineSync hooks", () => {
  // Increase timeout for these tests due to async timing
  jest.setTimeout(15000);
  const mockUserCacheService = UserCacheService as jest.Mocked<
    typeof UserCacheService
  >;
  const mockStaticDataService = StaticDataService as jest.Mocked<
    typeof StaticDataService
  >;
  const mockUseNetwork = useNetwork as jest.MockedFunction<typeof useNetwork>;

  const createWrapper = () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    const Wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    return Wrapper;
  };

  const mockNetwork = (
    overrides: Partial<ReturnType<typeof useNetwork>> = {}
  ) => ({
    isConnected: true,
    isOffline: false,
    networkDetails: {
      strength: null,
      ssid: null,
      bssid: null,
      frequency: null,
      ipAddress: null,
      subnet: null,
    },
    refreshNetworkState: jest.fn(),
    connectionType: "wifi" as const,
    isInternetReachable: true,
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();

    // Set default mock implementations
    mockUserCacheService.getPendingOperationsCount.mockResolvedValue(0);
    mockUserCacheService.syncPendingOperations.mockResolvedValue({
      success: true,
      processed: 0,
      failed: 0,
      conflicts: 0,
      errors: [],
    });
    mockStaticDataService.checkForUpdates.mockResolvedValue({
      ingredients: false,
      beerStyles: false,
    });
    mockUserCacheService.clearSyncQueue.mockResolvedValue();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe("useOfflineSync", () => {
    it("should initialize with correct default state", async () => {
      mockUseNetwork.mockReturnValue(mockNetwork());

      const { result } = renderHook(() => useOfflineSync(), {
        wrapper: createWrapper(),
      });

      // Wait for initial hook to settle
      await waitFor(() => {
        expect(result.current.pendingOperations).toBe(0);
      });

      expect(result.current.isSyncing).toBe(false);
      expect(result.current.conflicts).toBe(0);
      expect(result.current.lastSync).toBeNull();
      expect(typeof result.current.sync).toBe("function");
      expect(typeof result.current.clearPending).toBe("function");
      expect(typeof result.current.resolveConflict).toBe("function");
    });

    it("should load pending operations count on mount", async () => {
      mockUseNetwork.mockReturnValue(mockNetwork());
      mockUserCacheService.getPendingOperationsCount.mockResolvedValue(5);

      const { result } = renderHook(() => useOfflineSync(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.pendingOperations).toBe(5);
      });
    });

    it("should sync successfully when connected", async () => {
      mockUseNetwork.mockReturnValue(mockNetwork());

      const { result } = renderHook(() => useOfflineSync(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.pendingOperations).toBe(0);
      });

      await act(async () => {
        const syncResult = await result.current.sync();
        expect(syncResult.success).toBe(true);
      });

      expect(mockUserCacheService.syncPendingOperations).toHaveBeenCalled();
      expect(mockStaticDataService.checkForUpdates).toHaveBeenCalled();
    });

    it("should throw error when trying to sync while offline", async () => {
      mockUseNetwork.mockReturnValue(
        mockNetwork({
          isConnected: false,
          isOffline: true,
          connectionType: "none",
        })
      );

      const { result } = renderHook(() => useOfflineSync(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.pendingOperations).toBe(0);
      });

      await expect(result.current.sync()).rejects.toThrow(
        "Cannot sync while offline"
      );
    });

    it("should throw error when sync is already in progress", async () => {
      mockUseNetwork.mockReturnValue(mockNetwork());
      // Mock a long-running sync operation that never resolves
      mockUserCacheService.syncPendingOperations.mockImplementation(
        () => new Promise(() => {}) // Never resolves to keep sync in progress
      );

      const { result } = renderHook(() => useOfflineSync(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.pendingOperations).toBe(0);
      });

      // Start first sync (will hang)
      result.current.sync().catch(() => {}); // Ignore the error

      // Give the first sync a moment to start
      await new Promise(resolve => setTimeout(resolve, 10));

      // Try to start second sync while first is still running
      await expect(result.current.sync()).rejects.toThrow(
        "Sync already in progress"
      );
    });

    it("should clear pending operations", async () => {
      mockUseNetwork.mockReturnValue(mockNetwork());

      const { result } = renderHook(() => useOfflineSync(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.pendingOperations).toBe(0);
      });

      await act(async () => {
        await result.current.clearPending();
      });

      expect(mockUserCacheService.clearSyncQueue).toHaveBeenCalled();
    });

    it("should provide conflict resolution function", async () => {
      mockUseNetwork.mockReturnValue(mockNetwork());

      const { result } = renderHook(() => useOfflineSync(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.pendingOperations).toBe(0);
      });

      // Test conflict resolution throws error for unimplemented feature
      await act(async () => {
        await expect(
          result.current.resolveConflict("conflict-1", {
            strategy: "local_wins",
          })
        ).rejects.toThrow("Conflict resolution not implemented");
      });

      // Verify function exists and is callable
      expect(typeof result.current.resolveConflict).toBe("function");
    });
  });

  describe("useSyncStatus", () => {
    it("should return offline status when not connected", async () => {
      mockUseNetwork.mockReturnValue(
        mockNetwork({
          isConnected: false,
          isOffline: true,
          connectionType: "none",
        })
      );

      const { result } = renderHook(() => useSyncStatus(), {
        wrapper: createWrapper(),
      });

      // Wait for initial state, then update the pending operations count
      await waitFor(() => {
        expect(result.current.status).toBe("offline");
      });

      expect(result.current.message).toBe("0 changes pending (offline)");
      expect(result.current.color).toBe("#FF9800");
      expect(result.current.hasIssues).toBe(true);
    });

    it("should return pending status when online with pending operations", async () => {
      mockUseNetwork.mockReturnValue(mockNetwork());

      mockUserCacheService.getPendingOperationsCount.mockResolvedValue(2);

      const { result } = renderHook(() => useSyncStatus(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.status).toBe("pending");
      });

      expect(result.current.message).toBe("2 changes pending");
      expect(result.current.color).toBe("#FF9800");
      expect(result.current.hasIssues).toBe(false);
    });

    it("should return synced status when no pending operations", async () => {
      mockUseNetwork.mockReturnValue(mockNetwork());

      mockUserCacheService.getPendingOperationsCount.mockResolvedValue(0);

      const { result } = renderHook(() => useSyncStatus(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.status).toBe("synced");
      });

      expect(result.current.message).toBe("No changes to sync");
      expect(result.current.color).toBe("#4CAF50");
      expect(result.current.hasIssues).toBe(false);
    });
  });
});
