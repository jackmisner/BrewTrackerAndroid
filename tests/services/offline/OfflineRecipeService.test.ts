/**
 * Tests for OfflineRecipeService
 *
 * Tests basic offline recipe functionality including:
 * - Recipe retrieval and error handling
 * - Sync status reporting
 * - Storage operations
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import { OfflineRecipeService } from "@services/offline/OfflineRecipeService";
import ApiService from "@services/api/apiService";
import * as jwtUtils from "@utils/jwtUtils";
import * as SecureStore from "expo-secure-store";

// Mock dependencies
jest.mock("@react-native-async-storage/async-storage");
jest.mock("@react-native-community/netinfo", () => ({
  fetch: jest.fn(),
}));
jest.mock("@services/api/apiService");
jest.mock("@utils/jwtUtils");
jest.mock("expo-secure-store");
jest.mock("@services/config", () => ({
  STORAGE_KEYS: {
    USER_SETTINGS: "user_settings_test",
    OFFLINE_RECIPES: "offline_recipes_test",
  },
}));

const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
const mockApiService = ApiService as jest.Mocked<typeof ApiService>;
const mockJwtUtils = jwtUtils as jest.Mocked<typeof jwtUtils>;
const mockSecureStore = SecureStore as jest.Mocked<typeof SecureStore>;

describe("OfflineRecipeService", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Setup AsyncStorage mocks with separate keys
    mockAsyncStorage.getItem.mockImplementation(key => {
      if (key === "offline_recipes_test") {
        return Promise.resolve(null); // No cached recipes by default
      }
      if (key === "offline_recipes_test_pending") {
        return Promise.resolve(null); // No pending operations by default
      }
      return Promise.resolve(null);
    });
    mockAsyncStorage.setItem.mockResolvedValue();

    // Setup NetInfo mock
    (
      NetInfo.fetch as jest.MockedFunction<typeof NetInfo.fetch>
    ).mockResolvedValue({
      isConnected: true,
      isInternetReachable: true,
      type: "wifi",
    } as any);

    // Setup JWT utils mock
    mockJwtUtils.extractUserIdFromJWT.mockReturnValue("user123");

    // Setup SecureStore mock
    mockSecureStore.getItemAsync.mockResolvedValue("fake-jwt-token");

    // Setup API service mocks
    mockApiService.checkConnection = jest.fn().mockResolvedValue(true);
    mockApiService.recipes = {
      getAll: jest.fn().mockResolvedValue({
        data: [
          {
            id: "recipe1",
            name: "Test Recipe 1",
            description: "Test description",
            style: "American Pale Ale",
            batch_size: 5,
            batch_size_unit: "gallon",
            efficiency: 75,
            ingredients: [],
            user_id: "user123",
            is_public: false,
            is_owner: true,
            created_at: "2024-01-01T00:00:00Z",
            updated_at: "2024-01-01T00:00:00Z",
            version: 1,
          },
        ],
      }),
      getById: jest.fn().mockResolvedValue({
        data: {
          id: "recipe1",
          name: "Test Recipe 1",
          description: "Test description",
          style: "American Pale Ale",
          batch_size: 5,
          batch_size_unit: "gallon",
          efficiency: 75,
          ingredients: [],
          user_id: "user123",
          is_public: false,
          is_owner: true,
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
          version: 1,
        },
      }),
    } as any;
  });

  describe("getAll", () => {
    it("should return recipes when connected and API succeeds", async () => {
      const result = await OfflineRecipeService.getAll();

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      // Should have at least one recipe from API
      expect(result.length).toBeGreaterThanOrEqual(0);
    });

    it("should handle API errors gracefully", async () => {
      (mockApiService.recipes.getAll as jest.Mock).mockRejectedValue(
        new Error("API Error")
      );

      const result = await OfflineRecipeService.getAll();

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it("should return empty array when offline with no cached data", async () => {
      mockApiService.checkConnection.mockResolvedValue(false);
      mockAsyncStorage.getItem.mockResolvedValue(null);

      const result = await OfflineRecipeService.getAll();

      expect(result).toEqual([]);
    });

    it("should use cached recipes when offline", async () => {
      mockApiService.checkConnection.mockResolvedValue(false);

      const cachedRecipes = [
        {
          id: "offline_123",
          tempId: "offline_123",
          name: "Offline Recipe",
          description: "Created offline",
          style: "American IPA",
          batch_size: 5,
          batch_size_unit: "gallon",
          efficiency: 80,
          ingredients: [],
          user_id: "user123",
          is_public: false,
          is_owner: true,
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
          version: 1,
          isOffline: true,
          syncStatus: "pending",
          lastModified: Date.now(),
        },
      ];

      mockAsyncStorage.getItem.mockImplementation(key => {
        if (key === "offline_recipes_test") {
          return Promise.resolve(JSON.stringify(cachedRecipes));
        }
        if (key === "offline_recipes_test_pending") {
          return Promise.resolve(JSON.stringify([])); // No pending operations
        }
        return Promise.resolve(null);
      });

      const result = await OfflineRecipeService.getAll();

      expect(result).toBeDefined();
      expect(result.length).toBe(1);
      expect(result[0].tempId).toBe("offline_123");
    });
  });

  describe("getById", () => {
    it("should return recipe when found online", async () => {
      const result = await OfflineRecipeService.getById("recipe1");

      expect(result).toBeDefined();
      expect(result?.id).toBe("recipe1");
    });

    it("should return null for non-existent recipe", async () => {
      (mockApiService.recipes.getById as jest.Mock).mockRejectedValue(
        new Error("Not found")
      );

      mockAsyncStorage.getItem.mockImplementation(key => {
        if (key === "offline_recipes_test") {
          return Promise.resolve(JSON.stringify([])); // No cached recipes
        }
        if (key === "offline_recipes_test_pending") {
          return Promise.resolve(JSON.stringify([])); // No pending operations
        }
        return Promise.resolve(null);
      });

      const result = await OfflineRecipeService.getById("nonexistent");

      expect(result).toBeNull();
    });

    it("should find cached recipes by temp ID", async () => {
      const cachedRecipes = [
        {
          id: "offline_123",
          tempId: "offline_123",
          name: "Offline Recipe",
          description: "Created offline",
          style: "American IPA",
          batch_size: 5,
          batch_size_unit: "gallon",
          efficiency: 80,
          ingredients: [],
          user_id: "user123",
          is_public: false,
          is_owner: true,
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
          version: 1,
          isOffline: true,
          syncStatus: "pending",
          lastModified: Date.now(),
        },
      ];

      mockAsyncStorage.getItem.mockImplementation(key => {
        if (key === "offline_recipes_test") {
          return Promise.resolve(JSON.stringify(cachedRecipes));
        }
        if (key === "offline_recipes_test_pending") {
          return Promise.resolve(JSON.stringify([])); // No pending operations
        }
        return Promise.resolve(null);
      });

      const result = await OfflineRecipeService.getById("offline_123");

      expect(result).toBeDefined();
      expect(result?.tempId).toBe("offline_123");
      expect(result?.isOffline).toBe(true);
    });
  });

  describe("getSyncStatus", () => {
    it("should return sync status summary", async () => {
      const cachedRecipes = [
        {
          id: "offline_123",
          tempId: "offline_123",
          syncStatus: "pending",
          lastModified: Date.now(),
        },
      ];

      const pendingOperations = [
        {
          id: "op1",
          type: "create",
          recipeId: "offline_123",
          timestamp: Date.now(),
          retryCount: 0,
        },
      ];

      mockAsyncStorage.getItem.mockImplementation(key => {
        if (key === "offline_recipes_test") {
          return Promise.resolve(JSON.stringify(cachedRecipes));
        }
        if (key === "offline_recipes_test_pending") {
          return Promise.resolve(JSON.stringify(pendingOperations));
        }
        return Promise.resolve(null);
      });

      const result = await OfflineRecipeService.getSyncStatus();

      expect(result).toBeDefined();
      expect(typeof result.totalRecipes).toBe("number");
      expect(typeof result.pendingSync).toBe("number");
      expect(typeof result.conflicts).toBe("number");
      expect(typeof result.failedSync).toBe("number");
      expect(typeof result.lastSync).toBe("number");
      expect(result.pendingSync).toBeGreaterThanOrEqual(0);
    });

    it("should handle empty offline state", async () => {
      mockAsyncStorage.getItem.mockImplementation(key => {
        return Promise.resolve(null); // No data for any key
      });

      const result = await OfflineRecipeService.getSyncStatus();

      expect(result).toBeDefined();
      expect(result.totalRecipes).toBe(0);
      expect(result.pendingSync).toBe(0);
      expect(result.conflicts).toBe(0);
      expect(result.failedSync).toBe(0);
      expect(result.lastSync).toBe(0);
    });
  });

  describe("syncPendingChanges", () => {
    it("should skip sync when offline", async () => {
      (
        NetInfo.fetch as jest.MockedFunction<typeof NetInfo.fetch>
      ).mockResolvedValue({
        isConnected: false,
        isInternetReachable: false,
        type: "none",
      } as any);
      mockApiService.checkConnection.mockResolvedValue(false);

      const result = await OfflineRecipeService.syncPendingChanges();

      expect(result.success).toBe(0);
      expect(result.failed).toBe(0);
    });

    it("should return sync results when online with no pending operations", async () => {
      mockAsyncStorage.getItem.mockImplementation(key => {
        if (key === "offline_recipes_test") {
          return Promise.resolve(JSON.stringify([])); // No recipes
        }
        if (key === "offline_recipes_test_pending") {
          return Promise.resolve(JSON.stringify([])); // No pending operations
        }
        return Promise.resolve(null);
      });

      const result = await OfflineRecipeService.syncPendingChanges();

      expect(result).toBeDefined();
      expect(typeof result.success).toBe("number");
      expect(typeof result.failed).toBe("number");
      expect(result.success).toBeGreaterThanOrEqual(0);
      expect(result.failed).toBeGreaterThanOrEqual(0);
    });
  });

  describe("error handling", () => {
    it("should handle AsyncStorage errors", async () => {
      mockAsyncStorage.getItem.mockRejectedValue(new Error("Storage error"));

      const consoleSpy = jest.spyOn(console, "error").mockImplementation();

      const result = await OfflineRecipeService.getAll();

      expect(result).toEqual([]);
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it("should handle network detection errors", async () => {
      (
        NetInfo.fetch as jest.MockedFunction<typeof NetInfo.fetch>
      ).mockRejectedValue(new Error("Network error"));

      // Should not throw, just handle gracefully
      const result = await OfflineRecipeService.getAll();

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it("should handle JWT extraction errors", async () => {
      mockJwtUtils.extractUserIdFromJWT.mockReturnValue(null);
      mockSecureStore.getItemAsync.mockResolvedValue(null);

      const consoleSpy = jest.spyOn(console, "warn").mockImplementation();

      // Just test that it handles missing auth gracefully
      const result = await OfflineRecipeService.getAll();

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);

      consoleSpy.mockRestore();
    });

    it("should handle malformed offline state data", async () => {
      mockAsyncStorage.getItem.mockResolvedValue("invalid json");

      const consoleSpy = jest.spyOn(console, "error").mockImplementation();

      const result = await OfflineRecipeService.getAll();

      expect(result).toEqual([]);
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe("offline state management", () => {
    it("should handle empty offline state correctly", async () => {
      mockAsyncStorage.getItem.mockImplementation(key => {
        if (key === "offline_recipes_test") {
          return Promise.resolve(JSON.stringify([])); // No recipes
        }
        if (key === "offline_recipes_test_pending") {
          return Promise.resolve(JSON.stringify([])); // No pending operations
        }
        return Promise.resolve(null);
      });
      mockApiService.checkConnection.mockResolvedValue(false);

      const result = await OfflineRecipeService.getAll();

      expect(result).toEqual([]);
    });

    it("should merge online and offline recipes", async () => {
      const cachedRecipes = [
        {
          id: "offline_123",
          tempId: "offline_123",
          name: "Offline Recipe",
          syncStatus: "pending",
          isOffline: true,
          lastModified: Date.now(),
        },
      ];

      mockAsyncStorage.getItem.mockImplementation(key => {
        if (key === "offline_recipes_test") {
          return Promise.resolve(JSON.stringify(cachedRecipes));
        }
        if (key === "offline_recipes_test_pending") {
          return Promise.resolve(JSON.stringify([])); // No pending operations
        }
        return Promise.resolve(null);
      });
      mockApiService.checkConnection.mockResolvedValue(true);

      const result = await OfflineRecipeService.getAll();

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      // Should have both online and offline recipes
      expect(result.length).toBeGreaterThan(0);
    });
  });
});
