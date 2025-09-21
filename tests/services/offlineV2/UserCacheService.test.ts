/**
 * UserCacheService Test Suite
 * Tests for the UserCacheService class that handles user-specific data
 * with offline CRUD operations and automatic sync capabilities.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import ApiService from "@services/api/apiService";
import { UserValidationService } from "@utils/userValidation";
import {
  STORAGE_KEYS_V2,
  SyncableItem,
  PendingOperation,
  Recipe,
} from "@src/types";

// Mock AsyncStorage
jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

// Mock ApiService
jest.mock("@services/api/apiService", () => ({
  recipes: {
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
}));

// Mock UserValidationService
jest.mock("@utils/userValidation", () => ({
  UserValidationService: {
    validateOwnershipFromToken: jest.fn(),
    getCurrentUserIdFromToken: jest.fn(),
  },
}));

// Import the service
import { UserCacheService } from "@services/offlineV2/UserCacheService";

describe("UserCacheService", () => {
  const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
  const mockApiService = ApiService as jest.Mocked<typeof ApiService>;
  const mockUserValidation = UserValidationService as jest.Mocked<
    typeof UserValidationService
  >;

  const mockUserId = "test-user-id";
  const mockRecipe: Recipe = {
    id: "recipe-1",
    name: "Test Recipe",
    description: "A test recipe",
    style: "IPA",
    batch_size: 5,
    batch_size_unit: "gal",
    unit_system: "imperial",
    efficiency: 75,
    boil_time: 60,
    mash_temperature: 152,
    mash_temp_unit: "F",
    notes: "",
    ingredients: [],
    created_at: "1640995200000",
    updated_at: "1640995200000",
    user_id: mockUserId,
    is_public: false,
  };

  const mockSyncableRecipe: SyncableItem<Recipe> = {
    id: "recipe-1",
    data: mockRecipe,
    lastModified: 1640995200000,
    syncStatus: "synced",
    needsSync: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2024-01-01T00:00:00Z"));

    // Reset static properties
    (UserCacheService as any).syncInProgress = false;

    // Setup UserValidationService mocks
    mockUserValidation.validateOwnershipFromToken.mockResolvedValue({
      currentUserId: mockUserId,
      isValid: true,
    });
    mockUserValidation.getCurrentUserIdFromToken.mockResolvedValue(mockUserId);

    // Mock all background sync operations to be synchronous
    jest
      .spyOn(UserCacheService as any, "backgroundSync")
      .mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe("getRecipes", () => {
    it("should return cached recipes for user", async () => {
      const cachedRecipes = [mockSyncableRecipe];
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(cachedRecipes));

      const result = await UserCacheService.getRecipes(mockUserId);

      expect(result).toEqual([mockRecipe]);
      expect(mockAsyncStorage.getItem).toHaveBeenCalledWith(
        STORAGE_KEYS_V2.USER_RECIPES
      );
    });

    it("should filter out deleted recipes", async () => {
      const deletedRecipe: SyncableItem<Recipe> = {
        ...mockSyncableRecipe,
        isDeleted: true,
        deletedAt: Date.now(),
      };
      const cachedRecipes = [mockSyncableRecipe, deletedRecipe];
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(cachedRecipes));

      const result = await UserCacheService.getRecipes(mockUserId);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("recipe-1");
    });

    it("should return empty array when no recipes cached", async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);

      const result = await UserCacheService.getRecipes(mockUserId);

      expect(result).toEqual([]);
    });

    it("should sort recipes by creation date (newest first)", async () => {
      const olderRecipe: SyncableItem<Recipe> = {
        ...mockSyncableRecipe,
        id: "recipe-2",
        data: {
          ...mockRecipe,
          id: "recipe-2",
          created_at: "1640995100000", // Earlier timestamp
        },
      };
      const cachedRecipes = [olderRecipe, mockSyncableRecipe];
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(cachedRecipes));

      const result = await UserCacheService.getRecipes(mockUserId);

      expect(result[0].id).toBe("recipe-1"); // Newer recipe first
      expect(result[1].id).toBe("recipe-2"); // Older recipe second
    });

    it("should throw OfflineError when getting recipes fails", async () => {
      mockAsyncStorage.getItem.mockRejectedValue(new Error("Storage error"));

      await expect(UserCacheService.getRecipes(mockUserId)).rejects.toThrow(
        "Failed to get recipes"
      );
    });
  });

  describe("createRecipe", () => {
    it("should create a new recipe with temporary ID", async () => {
      mockAsyncStorage.getItem
        .mockResolvedValueOnce("[]") // existing recipes
        .mockResolvedValueOnce("[]"); // pending operations

      const recipeData = {
        name: "New Recipe",
        description: "A new test recipe",
        user_id: mockUserId,
      };

      const result = await UserCacheService.createRecipe(recipeData);

      expect(result.name).toBe("New Recipe");
      expect(result.user_id).toBe(mockUserId);
      expect(result.id).toMatch(/^temp_/);
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        STORAGE_KEYS_V2.USER_RECIPES,
        expect.stringContaining('"tempId"')
      );
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        STORAGE_KEYS_V2.PENDING_OPERATIONS,
        expect.stringContaining('"type":"create"')
      );
    });

    it("should add recipe to cache with pending sync status", async () => {
      mockAsyncStorage.getItem
        .mockResolvedValueOnce("[]")
        .mockResolvedValueOnce("[]");

      const recipeData = { name: "New Recipe", user_id: mockUserId };

      await UserCacheService.createRecipe(recipeData);

      const setItemCalls = mockAsyncStorage.setItem.mock.calls;
      const recipeCacheCall = setItemCalls.find(
        call => call[0] === STORAGE_KEYS_V2.USER_RECIPES
      );

      expect(recipeCacheCall).toBeDefined();
      const cachedData = JSON.parse(recipeCacheCall![1]);
      expect(cachedData[0].syncStatus).toBe("pending");
      expect(cachedData[0].needsSync).toBe(true);
    });

    it("should add pending operation for background sync", async () => {
      mockAsyncStorage.getItem
        .mockResolvedValueOnce("[]")
        .mockResolvedValueOnce("[]");

      const recipeData = { name: "New Recipe", user_id: mockUserId };

      await UserCacheService.createRecipe(recipeData);

      const setItemCalls = mockAsyncStorage.setItem.mock.calls;
      const operationCall = setItemCalls.find(
        call => call[0] === STORAGE_KEYS_V2.PENDING_OPERATIONS
      );

      expect(operationCall).toBeDefined();
      const operations = JSON.parse(operationCall![1]);
      expect(operations[0].type).toBe("create");
      expect(operations[0].entityType).toBe("recipe");
    });
  });

  describe("updateRecipe", () => {
    it("should update existing recipe", async () => {
      const cachedRecipes = [mockSyncableRecipe];
      mockAsyncStorage.getItem
        .mockResolvedValueOnce(JSON.stringify(cachedRecipes)) // getCachedRecipes
        .mockResolvedValueOnce("[]") // getPendingOperations for addPendingOperation
        .mockResolvedValueOnce(JSON.stringify(cachedRecipes)) // updateRecipeInCache read
        .mockResolvedValueOnce("[]"); // addPendingOperation read

      const updates = { name: "Updated Recipe" };

      const result = await UserCacheService.updateRecipe("recipe-1", {
        ...updates,
        user_id: mockUserId,
      });

      expect(result.name).toBe("Updated Recipe");
      expect(result.updated_at).toBe(
        "Mon Jan 01 2024 00:00:00 GMT+0000 (Greenwich Mean Time)"
      ); // 2024-01-01T00:00:00Z
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        STORAGE_KEYS_V2.USER_RECIPES,
        expect.stringContaining('"Updated Recipe"')
      );
    });

    it("should throw error when recipe not found", async () => {
      mockAsyncStorage.getItem.mockResolvedValue("[]");

      await expect(
        UserCacheService.updateRecipe("nonexistent", { user_id: mockUserId })
      ).rejects.toThrow("Recipe not found");
    });

    it("should mark recipe as pending sync", async () => {
      const cachedRecipes = [mockSyncableRecipe];
      mockAsyncStorage.getItem
        .mockResolvedValueOnce(JSON.stringify(cachedRecipes))
        .mockResolvedValueOnce("[]");

      await UserCacheService.updateRecipe("recipe-1", {
        name: "Updated",
        user_id: mockUserId,
      });

      const setItemCalls = mockAsyncStorage.setItem.mock.calls;
      const recipeCacheCall = setItemCalls.find(
        call => call[0] === STORAGE_KEYS_V2.USER_RECIPES
      );

      const cachedData = JSON.parse(recipeCacheCall![1]);
      expect(cachedData[0].syncStatus).toBe("pending");
      expect(cachedData[0].needsSync).toBe(true);
    });
  });

  describe("deleteRecipe", () => {
    it("should mark recipe as deleted (tombstone)", async () => {
      const cachedRecipes = [mockSyncableRecipe];
      mockAsyncStorage.getItem
        .mockResolvedValueOnce(JSON.stringify(cachedRecipes))
        .mockResolvedValueOnce("[]"); // pending operations

      await UserCacheService.deleteRecipe("recipe-1", mockUserId);

      const setItemCalls = mockAsyncStorage.setItem.mock.calls;
      const recipeCacheCall = setItemCalls.find(
        call => call[0] === STORAGE_KEYS_V2.USER_RECIPES
      );

      const cachedData = JSON.parse(recipeCacheCall![1]);
      expect(cachedData[0].isDeleted).toBe(true);
      expect(cachedData[0].deletedAt).toBe(1704067200000);
      expect(cachedData[0].syncStatus).toBe("pending");
    });

    it("should add delete operation to pending queue", async () => {
      const cachedRecipes = [mockSyncableRecipe];
      mockAsyncStorage.getItem
        .mockResolvedValueOnce(JSON.stringify(cachedRecipes))
        .mockResolvedValueOnce("[]");

      await UserCacheService.deleteRecipe("recipe-1", mockUserId);

      const setItemCalls = mockAsyncStorage.setItem.mock.calls;
      const operationCall = setItemCalls.find(
        call => call[0] === STORAGE_KEYS_V2.PENDING_OPERATIONS
      );

      const operations = JSON.parse(operationCall![1]);
      expect(operations[0].type).toBe("delete");
      expect(operations[0].entityType).toBe("recipe");
      expect(operations[0].entityId).toBe("recipe-1");
    });

    it("should throw error when recipe not found", async () => {
      mockAsyncStorage.getItem.mockResolvedValue("[]");

      await expect(
        UserCacheService.deleteRecipe("nonexistent", mockUserId)
      ).rejects.toThrow("Recipe not found");
    });
  });

  describe("syncPendingOperations", () => {
    it("should process pending create operations", async () => {
      const createOperation: PendingOperation = {
        id: "op-1",
        type: "create",
        entityType: "recipe",
        entityId: "temp-123",
        data: { name: "Test Recipe" },
        timestamp: Date.now(),
        retryCount: 0,
        maxRetries: 3,
      };

      mockAsyncStorage.getItem.mockResolvedValue(
        JSON.stringify([createOperation])
      );
      (mockApiService.recipes.create as jest.Mock).mockResolvedValue({
        data: mockRecipe,
      });

      const result = await UserCacheService.syncPendingOperations();

      expect(result.success).toBe(true);
      expect(result.processed).toBe(1);
      expect(result.failed).toBe(0);
      expect(mockApiService.recipes.create).toHaveBeenCalledWith(
        createOperation.data
      );
    });

    it("should process pending update operations", async () => {
      const updateOperation: PendingOperation = {
        id: "op-1",
        type: "update",
        entityType: "recipe",
        entityId: "recipe-1",
        data: { name: "Updated Recipe" },
        timestamp: Date.now(),
        retryCount: 0,
        maxRetries: 3,
      };

      mockAsyncStorage.getItem.mockResolvedValue(
        JSON.stringify([updateOperation])
      );
      (mockApiService.recipes.update as jest.Mock).mockResolvedValue({
        data: mockRecipe,
      });

      const result = await UserCacheService.syncPendingOperations();

      expect(result.success).toBe(true);
      expect(result.processed).toBe(1);
      expect(mockApiService.recipes.update).toHaveBeenCalledWith(
        "recipe-1",
        updateOperation.data
      );
    });

    it("should process pending delete operations", async () => {
      const deleteOperation: PendingOperation = {
        id: "op-1",
        type: "delete",
        entityType: "recipe",
        entityId: "recipe-1",
        timestamp: Date.now(),
        retryCount: 0,
        maxRetries: 3,
      };

      mockAsyncStorage.getItem.mockResolvedValue(
        JSON.stringify([deleteOperation])
      );
      (mockApiService.recipes.delete as jest.Mock).mockResolvedValue({
        data: {},
      });

      const result = await UserCacheService.syncPendingOperations();

      expect(result.success).toBe(true);
      expect(result.processed).toBe(1);
      expect(mockApiService.recipes.delete).toHaveBeenCalledWith("recipe-1");
    });

    it("should handle sync failures and retry", async () => {
      const failingOperation: PendingOperation = {
        id: "op-1",
        type: "create",
        entityType: "recipe",
        entityId: "temp-123",
        data: { name: "Test Recipe" },
        timestamp: Date.now(),
        retryCount: 0,
        maxRetries: 3,
      };

      mockAsyncStorage.getItem.mockResolvedValue(
        JSON.stringify([failingOperation])
      );
      (mockApiService.recipes.create as jest.Mock).mockRejectedValue(
        new Error("Network error")
      );

      const result = await UserCacheService.syncPendingOperations();

      expect(result.success).toBe(false); // Failed operations mean sync was not fully successful
      expect(result.processed).toBe(0);
      expect(result.failed).toBe(1);
      expect(result.errors).toContain(
        "create recipe: Failed to create recipe: Network error"
      );
    });

    it("should remove operations that exceed max retries", async () => {
      const maxRetriesOperation: PendingOperation = {
        id: "op-1",
        type: "create",
        entityType: "recipe",
        entityId: "temp-123",
        data: { name: "Test Recipe" },
        timestamp: Date.now(),
        retryCount: 3,
        maxRetries: 3,
      };

      mockAsyncStorage.getItem.mockResolvedValue(
        JSON.stringify([maxRetriesOperation])
      );
      (mockApiService.recipes.create as jest.Mock).mockRejectedValue(
        new Error("Network error")
      );

      const result = await UserCacheService.syncPendingOperations();

      expect(result.failed).toBe(1);
      expect(result.errors).toContain("Max retries reached for create recipe");
    });

    it("should prevent concurrent sync operations", async () => {
      (UserCacheService as any).syncInProgress = true;

      await expect(UserCacheService.syncPendingOperations()).rejects.toThrow(
        "Sync already in progress"
      );
    });

    it("should update sync metadata after successful sync", async () => {
      mockAsyncStorage.getItem.mockResolvedValue("[]"); // No pending operations

      await UserCacheService.syncPendingOperations();

      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        STORAGE_KEYS_V2.SYNC_METADATA,
        expect.stringContaining('"last_sync"')
      );
    });
  });

  describe("getPendingOperationsCount", () => {
    it("should return count of pending operations", async () => {
      const operations = [
        { id: "op-1", type: "create" },
        { id: "op-2", type: "update" },
      ];
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(operations));

      const count = await UserCacheService.getPendingOperationsCount();

      expect(count).toBe(2);
    });

    it("should return 0 when no operations pending", async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);

      const count = await UserCacheService.getPendingOperationsCount();

      expect(count).toBe(0);
    });

    it("should return 0 when getting count fails", async () => {
      mockAsyncStorage.getItem.mockRejectedValue(new Error("Storage error"));

      const count = await UserCacheService.getPendingOperationsCount();

      expect(count).toBe(0);
    });
  });

  describe("clearSyncQueue", () => {
    it("should clear all pending operations", async () => {
      await UserCacheService.clearSyncQueue();

      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith(
        STORAGE_KEYS_V2.PENDING_OPERATIONS
      );
    });

    it("should throw OfflineError when clearing fails", async () => {
      mockAsyncStorage.removeItem.mockRejectedValue(new Error("Storage error"));

      await expect(UserCacheService.clearSyncQueue()).rejects.toThrow(
        "Failed to clear sync queue"
      );
    });
  });
});
