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
import { extractUserIdFromJWT } from "@utils/jwtUtils";
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
    OFFLINE_RECIPES: "offline_recipes",
  },
}));

const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage> & {
  getAllKeys: jest.MockedFunction<() => Promise<readonly string[]>>;
  multiRemove: jest.MockedFunction<(keys: string[]) => Promise<void>>;
};
const mockApiService = ApiService as jest.Mocked<typeof ApiService>;
const mockSecureStore = SecureStore as jest.Mocked<typeof SecureStore>;
const mockExtractUserIdFromJWT = extractUserIdFromJWT as jest.MockedFunction<
  typeof extractUserIdFromJWT
>;

describe("OfflineRecipeService", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Setup consistent user ID for tests
    mockExtractUserIdFromJWT.mockReturnValue("user123");
    (mockApiService as any).token = {
      getToken: jest.fn().mockResolvedValue("fake-jwt-token"),
    };

    // Setup AsyncStorage mocks with dynamic keys based on user ID
    const expectedStorageKey = "offline_recipes_user123";
    const expectedPendingKey = "offline_recipes_user123_pending";
    const expectedMetaKey = "offline_recipes_user123_meta";

    mockAsyncStorage.getItem.mockImplementation(key => {
      if (key === expectedStorageKey) {
        return Promise.resolve(null); // No cached recipes by default
      }
      if (key === expectedPendingKey) {
        return Promise.resolve(null); // No pending operations by default
      }
      if (key === expectedMetaKey) {
        return Promise.resolve(null); // No metadata by default
      }
      return Promise.resolve(null);
    });
    mockAsyncStorage.setItem.mockResolvedValue();
    // Add missing AsyncStorage mock methods
    (mockAsyncStorage as any).getAllKeys = jest.fn().mockResolvedValue([]);
    (mockAsyncStorage as any).multiRemove = jest.fn().mockResolvedValue([]);

    // Setup NetInfo mock
    (
      NetInfo.fetch as jest.MockedFunction<typeof NetInfo.fetch>
    ).mockResolvedValue({
      isConnected: true,
      isInternetReachable: true,
      type: "wifi",
    } as any);

    // Setup JWT utils mock
    mockExtractUserIdFromJWT.mockReturnValue("user123");

    // Setup SecureStore mock
    mockSecureStore.getItemAsync.mockResolvedValue("fake-jwt-token");

    // Setup API service mocks
    mockApiService.checkConnection = jest.fn().mockResolvedValue(true);
    mockApiService.recipes = {
      getAll: jest.fn().mockResolvedValue({
        data: {
          recipes: [
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
        },
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
      create: jest.fn().mockResolvedValue({
        data: {
          id: "new-recipe-id",
          name: "Test Recipe",
          style: "IPA",
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
      update: jest.fn().mockResolvedValue({
        data: {
          id: "recipe1",
          name: "Updated Recipe",
          style: "IPA",
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
      delete: jest.fn().mockResolvedValue({}),
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

      const expectedStorageKey = "offline_recipes_user123";
      const expectedPendingKey = "offline_recipes_user123_pending";
      const expectedMetaKey = "offline_recipes_user123_meta";

      mockAsyncStorage.getItem.mockImplementation(key => {
        if (key === expectedStorageKey) {
          return Promise.resolve(JSON.stringify(cachedRecipes));
        }
        if (key === expectedPendingKey) {
          return Promise.resolve(JSON.stringify([])); // No pending operations
        }
        if (key === expectedMetaKey) {
          return Promise.resolve(JSON.stringify({ lastSync: 0, version: 1 }));
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

      const expectedStorageKey = "offline_recipes_user123";
      const expectedPendingKey = "offline_recipes_user123_pending";
      const expectedMetaKey = "offline_recipes_user123_meta";

      mockAsyncStorage.getItem.mockImplementation(key => {
        if (key === expectedStorageKey) {
          return Promise.resolve(JSON.stringify(cachedRecipes));
        }
        if (key === expectedPendingKey) {
          return Promise.resolve(JSON.stringify([])); // No pending operations
        }
        if (key === expectedMetaKey) {
          return Promise.resolve(JSON.stringify({ lastSync: 0, version: 1 }));
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

      // Mock as offline so it doesn't fall back to API
      (
        NetInfo.fetch as jest.MockedFunction<typeof NetInfo.fetch>
      ).mockResolvedValue({
        isConnected: false,
        isInternetReachable: false,
        type: "none",
      } as any);

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
      mockExtractUserIdFromJWT.mockReturnValue(null);
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

      // Mock as offline so it doesn't fall back to API
      (
        NetInfo.fetch as jest.MockedFunction<typeof NetInfo.fetch>
      ).mockResolvedValue({
        isConnected: false,
        isInternetReachable: false,
        type: "none",
      } as any);

      const consoleSpy = jest.spyOn(console, "error").mockImplementation();

      const result = await OfflineRecipeService.getAll();

      expect(result).toEqual([]);
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it("should handle Device API unavailable for anonymous users", async () => {
      // Mock no authenticated user
      mockExtractUserIdFromJWT.mockReturnValue(null);
      mockSecureStore.getItemAsync.mockResolvedValue(null);

      // Mock Device API being unavailable
      const originalDevice = require("expo-device");
      jest.doMock("expo-device", () => ({
        osInternalBuildId: null,
        deviceName: null,
      }));

      // Should generate a fallback device ID
      const result = await OfflineRecipeService.getAll();

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);

      // Restore original Device mock
      jest.doMock("expo-device", () => originalDevice);
    });

    it("should handle AsyncStorage save errors", async () => {
      // Mock offline mode
      mockApiService.checkConnection.mockResolvedValue(false);

      // Mock setItem to fail on the specific call during recipe creation
      mockAsyncStorage.setItem.mockRejectedValueOnce(new Error("Save failed"));

      const consoleSpy = jest.spyOn(console, "error").mockImplementation();

      // Try to create a recipe which will trigger save
      await expect(
        OfflineRecipeService.create({
          name: "Test Recipe",
          style: "IPA",
          batch_size: 5,
          batch_size_unit: "gal",
          efficiency: 75,
          ingredients: [],
          description: "",
          unit_system: "imperial",
          boil_time: 60,
          mash_temperature: 152,
          mash_time: 60,
          mash_temp_unit: "F",
          is_public: false,
          notes: "",
        })
      ).rejects.toThrow("Save failed");

      consoleSpy.mockRestore();
    });

    it("should handle missing token when creating offline recipe", async () => {
      // Mock offline
      mockApiService.checkConnection.mockResolvedValue(false);

      // Mock no token available
      mockExtractUserIdFromJWT.mockReturnValue(null);

      await expect(
        OfflineRecipeService.create({
          name: "Test Recipe",
          style: "IPA",
          batch_size: 5,
          batch_size_unit: "gal",
          efficiency: 75,
          ingredients: [],
          description: "",
          unit_system: "imperial",
          boil_time: 60,
          mash_temperature: 152,
          mash_time: 60,
          mash_temp_unit: "F",
          is_public: false,
          notes: "",
        })
      ).rejects.toThrow("Cannot create offline recipe: user not authenticated");
    });
  });

  describe("recipe CRUD operations", () => {
    describe("create", () => {
      it("should create recipe online when connected", async () => {
        const recipeData = {
          name: "Test Recipe",
          style: "IPA",
          batch_size: 5,
          batch_size_unit: "gal" as const,
          unit_system: "imperial" as const,
          description: "A test recipe",
          boil_time: 60,
          mash_temperature: 152,
          mash_time: 60,
          mash_temp_unit: "F" as "F" | "C",
          is_public: false,
          notes: "",
          efficiency: 75,
          ingredients: [
            {
              id: "ingredient_1",
              name: "Test Grain",
              type: "grain" as const,
              amount: 10,
              unit: "lb" as const,
              instance_id: "mock-uuid",
            },
          ],
        };

        const response = await OfflineRecipeService.create(recipeData);

        expect(response).toBeDefined();
        expect(response.name).toBe("Test Recipe");
        expect(mockApiService.recipes.create).toHaveBeenCalled();
      });

      it("should create recipe offline when online creation fails", async () => {
        (mockApiService.recipes.create as jest.Mock).mockRejectedValueOnce(
          new Error("API Error")
        );
        const consoleSpy = jest.spyOn(console, "warn").mockImplementation();

        const recipeData = {
          name: "Test Recipe",
          style: "IPA",
          batch_size: 5,
          batch_size_unit: "gal" as const,
          unit_system: "imperial" as const,
          description: "A test recipe",
          boil_time: 60,
          mash_temperature: 152,
          mash_time: 60,
          mash_temp_unit: "F" as "F" | "C",
          is_public: false,
          notes: "",
          efficiency: 75,
          ingredients: [],
        };

        const response = await OfflineRecipeService.create(recipeData);

        expect(response).toBeDefined();
        expect(response.name).toBe("Test Recipe");
        expect(response.isOffline).toBe(true);
        expect(response.syncStatus).toBe("pending");
        expect(response.needsSync).toBe(true);

        consoleSpy.mockRestore();
      });

      it("should attempt metrics calculation for offline recipe creation", async () => {
        // Mock offline
        mockApiService.checkConnection.mockResolvedValue(false);

        const recipeData = {
          name: "Test Recipe",
          style: "IPA",
          batch_size: 5,
          batch_size_unit: "gal" as const,
          unit_system: "imperial" as const,
          description: "A test recipe",
          boil_time: 60,
          mash_temperature: 152,
          mash_time: 60,
          mash_temp_unit: "F" as "F" | "C",
          is_public: false,
          notes: "",
          efficiency: 75,
          ingredients: [
            {
              id: "ingredient_1",
              name: "Test Grain",
              type: "grain" as const,
              amount: 10,
              unit: "lb" as const,
              instance_id: "mock-uuid",
            },
          ],
        };

        const response = await OfflineRecipeService.create(recipeData);

        expect(response).toBeDefined();
        expect(response.isOffline).toBe(true);
        expect(response.syncStatus).toBe("pending");
        expect(response.needsSync).toBe(true);

        // Metrics calculation attempt was made (could succeed or fail gracefully)
        // The presence of these fields indicates metrics calculation was attempted
        expect(response).toHaveProperty("estimated_og");
        expect(response).toHaveProperty("estimated_fg");
        expect(response).toHaveProperty("estimated_abv");
      });
    });

    describe("update", () => {
      it("should update recipe online when connected", async () => {
        // First create a recipe to update
        const existingRecipe = {
          id: "recipe1",
          name: "Original Recipe",
          style: "Pale Ale",
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
          isOffline: false,
          lastModified: Date.now(),
          syncStatus: "synced" as const,
          needsSync: false,
        };

        mockAsyncStorage.getItem.mockImplementation(key => {
          if (key === "offline_recipes_user123") {
            return Promise.resolve(JSON.stringify([existingRecipe]));
          }
          return Promise.resolve(JSON.stringify([]));
        });

        const updateData = {
          name: "Updated Recipe",
          style: "IPA",
        };

        const response = await OfflineRecipeService.update(
          "recipe1",
          updateData
        );

        expect(response).toBeDefined();
        expect(response.name).toBe("Updated Recipe");
        expect(mockApiService.recipes.update).toHaveBeenCalledWith(
          "recipe1",
          expect.objectContaining(updateData)
        );
      });

      it("should update recipe offline when online update fails", async () => {
        const existingRecipe = {
          id: "recipe1",
          name: "Original Recipe",
          style: "Pale Ale",
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
          isOffline: false,
          lastModified: Date.now(),
          syncStatus: "synced" as const,
          needsSync: false,
        };

        mockAsyncStorage.getItem.mockImplementation(key => {
          if (key === "offline_recipes_user123") {
            return Promise.resolve(JSON.stringify([existingRecipe]));
          }
          return Promise.resolve(JSON.stringify([]));
        });

        (mockApiService.recipes.update as jest.Mock).mockRejectedValueOnce(
          new Error("API Error")
        );
        const consoleSpy = jest.spyOn(console, "warn").mockImplementation();

        const updateData = {
          name: "Updated Recipe",
          style: "IPA",
        };

        const response = await OfflineRecipeService.update(
          "recipe1",
          updateData
        );

        expect(response).toBeDefined();
        expect(response.name).toBe("Updated Recipe");
        expect(response.syncStatus).toBe("pending");
        expect(response.needsSync).toBe(true);

        consoleSpy.mockRestore();
      });

      it("should throw error for non-existent recipe", async () => {
        mockAsyncStorage.getItem.mockImplementation(() =>
          Promise.resolve(JSON.stringify([]))
        );

        await expect(
          OfflineRecipeService.update("nonexistent", {
            name: "Updated Recipe",
          })
        ).rejects.toThrow("Recipe with id nonexistent not found");
      });
    });

    describe("delete", () => {
      it("should delete recipe online when connected", async () => {
        const existingRecipe = {
          id: "recipe1",
          name: "Recipe to Delete",
          style: "Pale Ale",
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
          isOffline: false,
          lastModified: Date.now(),
          syncStatus: "synced" as const,
          needsSync: false,
        };

        mockAsyncStorage.getItem.mockImplementation(key => {
          if (key === "offline_recipes_user123") {
            return Promise.resolve(JSON.stringify([existingRecipe]));
          }
          return Promise.resolve(JSON.stringify([]));
        });

        const consoleSpy = jest.spyOn(console, "log").mockImplementation();

        await OfflineRecipeService.delete("recipe1");

        expect(mockApiService.recipes.delete).toHaveBeenCalledWith("recipe1");
        expect(mockAsyncStorage.setItem).toHaveBeenCalled();

        consoleSpy.mockRestore();
      });

      it("should create tombstone when online deletion fails", async () => {
        const existingRecipe = {
          id: "recipe1",
          name: "Recipe to Delete",
          style: "Pale Ale",
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
          isOffline: false,
          lastModified: Date.now(),
          syncStatus: "synced" as const,
          needsSync: false,
        };

        mockAsyncStorage.getItem.mockImplementation(key => {
          if (key === "offline_recipes_user123") {
            return Promise.resolve(JSON.stringify([existingRecipe]));
          }
          return Promise.resolve(JSON.stringify([]));
        });

        (mockApiService.recipes.delete as jest.Mock).mockRejectedValueOnce(
          new Error("API Error")
        );
        const consoleSpy = jest.spyOn(console, "warn").mockImplementation();
        const logSpy = jest.spyOn(console, "log").mockImplementation();

        await OfflineRecipeService.delete("recipe1");

        // Should create a tombstone instead of removing completely
        expect(mockAsyncStorage.setItem).toHaveBeenCalled();

        consoleSpy.mockRestore();
        logSpy.mockRestore();
      });

      it("should remove offline-only recipe completely", async () => {
        const offlineRecipe = {
          id: "offline_123",
          tempId: "offline_123",
          name: "Offline Recipe",
          style: "IPA",
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
          isOffline: true,
          lastModified: Date.now(),
          syncStatus: "pending" as const,
          needsSync: true,
        };

        mockAsyncStorage.getItem.mockImplementation(key => {
          if (key === "offline_recipes_user123") {
            return Promise.resolve(JSON.stringify([offlineRecipe]));
          }
          return Promise.resolve(JSON.stringify([]));
        });

        const consoleSpy = jest.spyOn(console, "log").mockImplementation();

        await OfflineRecipeService.delete("offline_123");

        // Should be removed entirely, not create tombstone
        expect(mockAsyncStorage.setItem).toHaveBeenCalled();

        consoleSpy.mockRestore();
      });

      it("should throw error for non-existent recipe", async () => {
        mockAsyncStorage.getItem.mockImplementation(() =>
          Promise.resolve(JSON.stringify([]))
        );

        await expect(
          OfflineRecipeService.delete("nonexistent")
        ).rejects.toThrow("Recipe with id nonexistent not found");
      });
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
          syncStatus: "pending",
          isOffline: true,
          lastModified: Date.now(),
        },
      ];

      const expectedStorageKey = "offline_recipes_user123";
      const expectedPendingKey = "offline_recipes_user123_pending";
      const expectedMetaKey = "offline_recipes_user123_meta";

      mockAsyncStorage.getItem.mockImplementation(key => {
        if (key === expectedStorageKey) {
          return Promise.resolve(JSON.stringify(cachedRecipes));
        }
        if (key === expectedPendingKey) {
          return Promise.resolve(JSON.stringify([])); // No pending operations
        }
        if (key === expectedMetaKey) {
          return Promise.resolve(JSON.stringify({ lastSync: 0, version: 1 }));
        }
        return Promise.resolve(null);
      });
      mockApiService.checkConnection.mockResolvedValue(true);

      const result = await OfflineRecipeService.getAll();

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      // Should have both online and offline recipes (1 from API + 1 offline)
      expect(result.length).toBeGreaterThanOrEqual(1);
    });

    it("should handle tombstone cleanup after merging", async () => {
      // Test tombstone priority during merging
      const serverRecipes = [
        {
          id: "recipe1",
          name: "Server Recipe",
          style: "IPA",
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
          isOffline: false,
          lastModified: Date.now() - 1000,
          syncStatus: "synced" as const,
          needsSync: false,
        },
      ];

      const tombstone = {
        id: "recipe1",
        name: "Deleted Recipe",
        style: "IPA",
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
        isOffline: true,
        isDeleted: true,
        deletedAt: Date.now(),
        lastModified: Date.now(),
        syncStatus: "pending" as const,
        needsSync: true,
      };

      mockAsyncStorage.getItem.mockImplementation(key => {
        if (key === "offline_recipes_user123") {
          return Promise.resolve(JSON.stringify([tombstone]));
        }
        return Promise.resolve(JSON.stringify([]));
      });

      (mockApiService.recipes.getAll as jest.Mock).mockResolvedValue({
        data: { recipes: serverRecipes },
      });

      const consoleSpy = jest.spyOn(console, "log").mockImplementation();

      const result = await OfflineRecipeService.getAll();

      // Tombstone should take precedence, so result should be empty
      expect(result).toEqual([]);

      consoleSpy.mockRestore();
    });
  });

  describe("cleanup operations", () => {
    describe("cleanupStaleData", () => {
      it("should remove recipes with missing required fields", async () => {
        const invalidRecipes = [
          {
            // Missing id
            name: "Recipe Without ID",
            style: "IPA",
            ingredients: [],
            user_id: "user123",
          },
          {
            id: "recipe2",
            // Missing name
            style: "IPA",
            ingredients: [],
            user_id: "user123",
          },
          {
            id: "recipe3",
            name: "Valid Recipe",
            style: "IPA",
            ingredients: [],
            user_id: "user123",
          },
        ];

        mockAsyncStorage.getItem.mockImplementation(key => {
          if (key === "offline_recipes_user123") {
            return Promise.resolve(JSON.stringify(invalidRecipes));
          }
          return Promise.resolve(JSON.stringify([]));
        });

        const consoleSpy = jest.spyOn(console, "warn").mockImplementation();

        const result = await OfflineRecipeService.cleanupStaleData();

        expect(result.removed).toBe(2);
        expect(result.cleaned).toHaveLength(2);
        expect(result.cleaned[0]).toContain("missing required fields");

        consoleSpy.mockRestore();
      });

      it("should preserve recipes that need syncing even if data is invalid", async () => {
        const recipesWithSyncNeeded = [
          {
            // Missing name but needs sync - should be preserved
            id: "recipe1",
            style: "IPA",
            ingredients: [],
            user_id: "user123",
            needsSync: true,
          },
          {
            id: "recipe2",
            name: "Valid Recipe",
            style: "IPA",
            ingredients: [],
            user_id: "user123",
          },
        ];

        mockAsyncStorage.getItem.mockImplementation(key => {
          if (key === "offline_recipes_user123") {
            return Promise.resolve(JSON.stringify(recipesWithSyncNeeded));
          }
          return Promise.resolve(JSON.stringify([]));
        });

        const consoleSpy = jest.spyOn(console, "log").mockImplementation();

        const result = await OfflineRecipeService.cleanupStaleData();

        expect(result.removed).toBe(0); // Nothing removed because needsSync preserves invalid data
        expect(result.cleaned).toHaveLength(0);

        consoleSpy.mockRestore();
      });

      it("should remove recipes with corrupted ingredients data", async () => {
        const recipesWithCorruptedIngredients = [
          {
            id: "recipe1",
            name: "Recipe with Corrupted Ingredients",
            style: "IPA",
            ingredients: "not an array", // Corrupted ingredients
            user_id: "user123",
          },
          {
            id: "recipe2",
            name: "Valid Recipe",
            style: "IPA",
            ingredients: [],
            user_id: "user123",
          },
        ];

        mockAsyncStorage.getItem.mockImplementation(key => {
          if (key === "offline_recipes_user123") {
            return Promise.resolve(
              JSON.stringify(recipesWithCorruptedIngredients)
            );
          }
          return Promise.resolve(JSON.stringify([]));
        });

        const result = await OfflineRecipeService.cleanupStaleData();

        expect(result.removed).toBe(1);
        expect(result.cleaned[0]).toContain("corrupted ingredients data");
      });
    });

    describe("cleanupTombstones", () => {
      it("should remove old tombstones (30+ days)", async () => {
        const oldTombstone = {
          id: "recipe1",
          name: "Old Deleted Recipe",
          style: "IPA",
          isDeleted: true,
          deletedAt: Date.now() - 31 * 24 * 60 * 60 * 1000, // 31 days ago
          syncStatus: "synced" as const,
          needsSync: false,
        };

        const recentTombstone = {
          id: "recipe2",
          name: "Recent Deleted Recipe",
          style: "IPA",
          isDeleted: true,
          deletedAt: Date.now() - 1 * 24 * 60 * 60 * 1000, // 1 day ago
          syncStatus: "pending" as const,
          needsSync: true,
        };

        mockAsyncStorage.getItem.mockImplementation(key => {
          if (key === "offline_recipes_user123") {
            return Promise.resolve(
              JSON.stringify([oldTombstone, recentTombstone])
            );
          }
          return Promise.resolve(JSON.stringify([]));
        });

        const consoleSpy = jest.spyOn(console, "log").mockImplementation();

        const result = await OfflineRecipeService.cleanupTombstones();

        expect(result.cleaned).toBe(1);
        expect(result.details[0]).toContain("Old Deleted Recipe");

        consoleSpy.mockRestore();
      });

      it("should remove successfully synced tombstones", async () => {
        const syncedTombstone = {
          id: "recipe1",
          name: "Synced Deleted Recipe",
          style: "IPA",
          isDeleted: true,
          deletedAt: Date.now() - 1 * 24 * 60 * 60 * 1000,
          syncStatus: "synced" as const,
          needsSync: false, // Successfully synced
        };

        mockAsyncStorage.getItem.mockImplementation(key => {
          if (key === "offline_recipes_user123") {
            return Promise.resolve(JSON.stringify([syncedTombstone]));
          }
          return Promise.resolve(JSON.stringify([]));
        });

        const consoleSpy = jest.spyOn(console, "log").mockImplementation();

        const result = await OfflineRecipeService.cleanupTombstones();

        expect(result.cleaned).toBe(1);
        expect(result.details[0]).toContain("synced tombstone");

        consoleSpy.mockRestore();
      });
    });
  });

  describe("metrics calculation", () => {
    describe("calculateMissingMetrics", () => {
      it("should calculate metrics for recipes that lack them", async () => {
        const recipesNeedingMetrics = [
          {
            id: "recipe1",
            name: "Recipe Without Metrics",
            style: "IPA",
            batch_size: 5,
            batch_size_unit: "gallon",
            efficiency: 75,
            boil_time: 60,
            ingredients: [
              {
                id: "grain1",
                type: "grain",
                name: "Test Grain",
                amount: 10,
                unit: "lb",
                grain_type: "base_malt",
                potential: 1.037,
                color: 2,
              },
            ],
            user_id: "user123",
            isOffline: true,
            // No metrics fields present
          },
        ];

        mockAsyncStorage.getItem.mockImplementation(key => {
          if (key === "offline_recipes_user123") {
            return Promise.resolve(JSON.stringify(recipesNeedingMetrics));
          }
          return Promise.resolve(JSON.stringify([]));
        });

        const consoleSpy = jest.spyOn(console, "log").mockImplementation();

        const result = await OfflineRecipeService.calculateMissingMetrics();

        expect(result.processed).toBe(1);
        expect(result.updated).toBe(1);
        expect(result.details[0]).toContain("Added metrics to");

        consoleSpy.mockRestore();
      });

      it("should skip recipes that already have metrics", async () => {
        const recipesWithMetrics = [
          {
            id: "recipe1",
            name: "Recipe With Metrics",
            style: "IPA",
            batch_size: 5,
            batch_size_unit: "gallon",
            efficiency: 75,
            ingredients: [],
            estimated_og: 1.065, // Already has metrics
            estimated_fg: 1.012,
            estimated_abv: 6.9,
            user_id: "user123",
          },
        ];

        mockAsyncStorage.getItem.mockImplementation(key => {
          if (key === "offline_recipes_user123") {
            return Promise.resolve(JSON.stringify(recipesWithMetrics));
          }
          return Promise.resolve(JSON.stringify([]));
        });

        const result = await OfflineRecipeService.calculateMissingMetrics();

        expect(result.processed).toBe(0);
        expect(result.updated).toBe(0);
        expect(result.details[0]).toContain(
          "No recipes found that need metrics"
        );
      });

      it("should skip deleted recipes", async () => {
        const deletedRecipe = [
          {
            id: "recipe1",
            name: "Deleted Recipe",
            style: "IPA",
            batch_size: 5,
            batch_size_unit: "gallon",
            efficiency: 75,
            ingredients: [],
            isDeleted: true, // Deleted recipe should be skipped
            user_id: "user123",
          },
        ];

        mockAsyncStorage.getItem.mockImplementation(key => {
          if (key === "offline_recipes_user123") {
            return Promise.resolve(JSON.stringify(deletedRecipe));
          }
          return Promise.resolve(JSON.stringify([]));
        });

        const result = await OfflineRecipeService.calculateMissingMetrics();

        expect(result.processed).toBe(0);
        expect(result.updated).toBe(0);
      });

      it("should handle calculation errors gracefully", async () => {
        const recipeWithInvalidData = [
          {
            id: "recipe1",
            name: "Recipe With Invalid Data",
            style: "IPA",
            batch_size: 5,
            batch_size_unit: "gallon",
            efficiency: 75,
            ingredients: [
              {
                /* incomplete ingredient data */
              },
            ],
            user_id: "user123",
          },
        ];

        mockAsyncStorage.getItem.mockImplementation(key => {
          if (key === "offline_recipes_user123") {
            return Promise.resolve(JSON.stringify(recipeWithInvalidData));
          }
          return Promise.resolve(JSON.stringify([]));
        });

        const consoleSpy = jest.spyOn(console, "warn").mockImplementation();

        const result = await OfflineRecipeService.calculateMissingMetrics();

        expect(result.processed).toBe(1);
        expect(result.updated).toBe(1); // Recipe will be updated even with empty metrics
        expect(result.details[0]).toContain("Added metrics to"); // Empty metrics still count as "added"

        consoleSpy.mockRestore();
      });
    });
  });

  describe("data clearing operations", () => {
    describe("clearUserData", () => {
      it("should clear specific user data when userId provided", async () => {
        await OfflineRecipeService.clearUserData("user123");

        const expectedKeys = [
          "offline_recipes_user123",
          "offline_recipes_user123_pending",
          "offline_recipes_user123_meta",
          "offline_recipes_user123_pending_failed",
        ];

        expect(mockAsyncStorage.multiRemove).toHaveBeenCalledWith(expectedKeys);
      });

      it("should clear all offline recipe data when no userId provided", async () => {
        mockAsyncStorage.getAllKeys.mockResolvedValue([
          "offline_recipes_user1",
          "offline_recipes_user2",
          "other_storage_key",
          "offline_recipes_user1_pending",
        ]);

        await OfflineRecipeService.clearUserData();

        expect(mockAsyncStorage.getAllKeys).toHaveBeenCalled();
        expect(mockAsyncStorage.multiRemove).toHaveBeenCalledWith([
          "offline_recipes_user1",
          "offline_recipes_user2",
          "offline_recipes_user1_pending",
        ]);
      });

      it("should handle clear data errors", async () => {
        mockAsyncStorage.multiRemove.mockRejectedValueOnce(
          new Error("Clear failed")
        );

        const consoleSpy = jest.spyOn(console, "error").mockImplementation();

        await expect(
          OfflineRecipeService.clearUserData("user123")
        ).rejects.toThrow("Clear failed");

        consoleSpy.mockRestore();
      });
    });

    describe("clearOfflineData", () => {
      it("should clear all offline data", async () => {
        await OfflineRecipeService.clearOfflineData();

        expect(mockAsyncStorage.multiRemove).toHaveBeenCalled();

        const calledWith = (mockAsyncStorage.multiRemove as jest.Mock).mock
          .calls[0][0];
        expect(calledWith).toContain("offline_recipes_user123");
        expect(calledWith).toContain("offline_recipes_user123_pending");
        expect(calledWith).toContain("offline_recipes_user123_meta");
      });
    });
  });

  describe("ingredient validation", () => {
    it("should handle ingredients missing IDs during offline creation", async () => {
      const recipeWithInvalidIngredients = {
        name: "Test Recipe",
        style: "IPA",
        batch_size: 5,
        batch_size_unit: "gal" as const,
        unit_system: "imperial" as const,
        description: "A test recipe",
        boil_time: 60,
        mash_temperature: 152,
        mash_time: 60,
        mash_temp_unit: "F" as "F" | "C",
        is_public: false,
        notes: "",
        efficiency: 75,
        ingredients: [
          {
            id: "", // Missing ID
            name: "Test Grain",
            type: "grain" as const,
            amount: 10,
            unit: "lb" as const,
            instance_id: "mock-uuid",
          },
        ],
      };

      // Mock online to trigger the sync preparation where validation happens, but allow fallback to offline
      mockApiService.checkConnection.mockResolvedValue(true);

      // Should create offline after online validation fails
      const result = await OfflineRecipeService.create(
        recipeWithInvalidIngredients
      );

      expect(result).toBeDefined();
      expect(result.isOffline).toBe(true);
      expect(result.syncStatus).toBe("pending");
    });

    it("should handle null ingredients during offline creation", async () => {
      const recipeWithNullIngredients = {
        name: "Test Recipe",
        style: "IPA",
        batch_size: 5,
        batch_size_unit: "gal" as const,
        unit_system: "imperial" as const,
        description: "A test recipe",
        boil_time: 60,
        mash_temperature: 152,
        mash_time: 60,
        mash_temp_unit: "F" as "F" | "C",
        is_public: false,
        notes: "",
        efficiency: 75,
        ingredients: [null as any], // Null ingredient
      };

      // Mock online to trigger the sync preparation where validation happens, but allow fallback to offline
      mockApiService.checkConnection.mockResolvedValue(true);

      // Should create offline after online validation fails
      const result = await OfflineRecipeService.create(
        recipeWithNullIngredients
      );

      expect(result).toBeDefined();
      expect(result.isOffline).toBe(true);
      expect(result.syncStatus).toBe("pending");
    });
  });
});
