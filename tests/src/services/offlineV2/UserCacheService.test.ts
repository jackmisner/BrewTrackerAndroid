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
  BrewSession,
} from "@src/types";

// Mock AsyncStorage
jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

// Mock ApiService
jest.mock("@services/api/apiService", () => ({
  __esModule: true,
  default: {
    recipes: {
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    brewSessions: {
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      getAll: jest.fn(),
    },
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

  const mockBrewSession: BrewSession = {
    id: "session-1",
    name: "Test Brew Session",
    recipe_id: "recipe-1",
    brew_date: "2024-01-01",
    status: "fermenting",
    notes: "Test session notes",
    user_id: mockUserId,
    created_at: "1640995200000",
    updated_at: "1640995200000",
    temperature_unit: "F",
    batch_size: 5,
    batch_size_unit: "gal",
  };

  const mockSyncableBrewSession: SyncableItem<BrewSession> = {
    id: "session-1",
    data: mockBrewSession,
    lastModified: 1640995200000,
    syncStatus: "synced",
    needsSync: false,
  };
  let backgroundSyncSpy: jest.SpyInstance;
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2024-01-01T00:00:00Z"));

    // Reset static properties
    (UserCacheService as any).syncInProgress = false;

    // Setup UserValidationService mocks - reset them completely
    mockUserValidation.validateOwnershipFromToken.mockReset();
    mockUserValidation.getCurrentUserIdFromToken.mockReset();

    mockUserValidation.validateOwnershipFromToken.mockResolvedValue({
      currentUserId: mockUserId,
      isValid: true,
    });
    mockUserValidation.getCurrentUserIdFromToken.mockResolvedValue(mockUserId);

    // Mock all background sync operations to be synchronous
    backgroundSyncSpy = jest
      .spyOn(UserCacheService as any, "backgroundSync")
      .mockResolvedValue(undefined);

    // Mock API service calls to prevent network calls in tests
    (mockApiService.brewSessions.getAll as jest.Mock).mockResolvedValue({
      data: { brew_sessions: [] },
    });

    // Reset AsyncStorage mocks to ensure clean state between tests
    mockAsyncStorage.getItem.mockReset();
    mockAsyncStorage.setItem.mockReset();
  });

  afterEach(() => {
    backgroundSyncSpy?.mockRestore();
    jest.useRealTimers();
  });

  describe("getRecipes", () => {
    it("should return cached recipes for user", async () => {
      const cachedRecipes = [mockSyncableRecipe];
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(cachedRecipes));

      const result = await UserCacheService.getRecipes(mockUserId, "imperial");

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

      const result = await UserCacheService.getRecipes(mockUserId, "imperial");

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("recipe-1");
    });

    it("should return empty array when no recipes cached", async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);

      const result = await UserCacheService.getRecipes(mockUserId, "imperial");

      expect(result).toEqual([]);
    });

    it("should sort recipes by most recent update", async () => {
      const newerUpdatedRecipe: SyncableItem<Recipe> = {
        ...mockSyncableRecipe,
        id: "recipe-2",
        data: {
          ...mockRecipe,
          id: "recipe-2",
          updated_at: "1640995300000", // Later timestamp (newer)
        },
      };
      const cachedRecipes = [newerUpdatedRecipe, mockSyncableRecipe];

      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(cachedRecipes));

      const result = await UserCacheService.getRecipes(mockUserId, "imperial");

      expect(result[0].id).toBe("recipe-2"); // Updated more recently
      expect(result[1].id).toBe("recipe-1"); // Updated less recently
    });

    it("recovers from storage error and returns []", async () => {
      mockAsyncStorage.getItem.mockRejectedValue(new Error("Storage error"));

      await expect(
        UserCacheService.getRecipes(mockUserId)
      ).resolves.toStrictEqual([]);
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
      expect(result.updated_at).toBe("2024-01-01T00:00:00.000Z");
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
        userId: mockUserId,
        data: { name: "Test Recipe" },
        timestamp: Date.now(),
        retryCount: 0,
        maxRetries: 3,
      };

      const tempRecipe: SyncableItem<Recipe> = {
        id: "temp-123",
        data: { ...mockRecipe, id: "temp-123" },
        lastModified: Date.now(),
        syncStatus: "pending",
        needsSync: true,
        tempId: "temp-123",
      };

      // Mock getPendingOperations sequence: first with operation, then empty after processing
      mockAsyncStorage.getItem
        .mockResolvedValueOnce(JSON.stringify([createOperation])) // Initial getPendingOperations
        .mockResolvedValueOnce(JSON.stringify([createOperation])) // removePendingOperation read
        .mockResolvedValueOnce(JSON.stringify([tempRecipe])) // mapTempIdToRealId - read USER_RECIPES
        .mockResolvedValueOnce("[]") // mapTempIdToRealId - read USER_BREW_SESSIONS (no sessions)
        .mockResolvedValueOnce("[]") // mapTempIdToRealId - read USER_BREW_SESSIONS again for recipe_id references
        .mockResolvedValueOnce(JSON.stringify([createOperation])) // mapTempIdToRealId - read PENDING_OPERATIONS
        .mockResolvedValueOnce("[]"); // getPendingOperations after ID mapping (empty queue)

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
        userId: mockUserId,
        data: { name: "Updated Recipe" },
        timestamp: Date.now(),
        retryCount: 0,
        maxRetries: 3,
      };

      // Mock sequence for update operation
      mockAsyncStorage.getItem
        .mockResolvedValueOnce(JSON.stringify([updateOperation])) // Initial getPendingOperations
        .mockResolvedValueOnce(JSON.stringify([updateOperation])) // removePendingOperation read
        .mockResolvedValueOnce(JSON.stringify([])) // getCachedRecipes for markItemAsSynced
        .mockResolvedValueOnce("[]"); // getPendingOperations after processing (empty)

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
        userId: mockUserId,
        timestamp: Date.now(),
        retryCount: 0,
        maxRetries: 3,
      };

      // Mock sequence for delete operation
      mockAsyncStorage.getItem
        .mockResolvedValueOnce(JSON.stringify([deleteOperation])) // Initial getPendingOperations
        .mockResolvedValueOnce(JSON.stringify([deleteOperation])) // removePendingOperation read
        .mockResolvedValueOnce(JSON.stringify([])) // getCachedRecipes for removeItemFromCache
        .mockResolvedValueOnce("[]"); // getPendingOperations after processing (empty)

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
        userId: mockUserId,
        data: { name: "Test Recipe" },
        timestamp: Date.now(),
        retryCount: 0,
        maxRetries: 3,
      };

      // Mock sequence for failed operation
      mockAsyncStorage.getItem
        .mockResolvedValueOnce(JSON.stringify([failingOperation])) // Initial getPendingOperations
        .mockResolvedValueOnce(JSON.stringify([failingOperation])) // updatePendingOperation read
        .mockResolvedValueOnce("[]"); // getPendingOperations after error handling (empty to exit loop)

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
        userId: mockUserId,
        data: { name: "Test Recipe" },
        timestamp: Date.now(),
        retryCount: 3,
        maxRetries: 3,
      };

      // Mock sequence for max retries reached
      mockAsyncStorage.getItem
        .mockResolvedValueOnce(JSON.stringify([maxRetriesOperation])) // Initial getPendingOperations
        .mockResolvedValueOnce(JSON.stringify([maxRetriesOperation])) // removePendingOperation read
        .mockResolvedValueOnce("[]"); // getPendingOperations after removal (empty)

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

  describe("getRecipeById", () => {
    it("should return recipe by ID", async () => {
      const cachedRecipes = [mockSyncableRecipe];
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(cachedRecipes));

      const result = await UserCacheService.getRecipeById(
        "recipe-1",
        mockUserId
      );

      expect(result).toEqual(mockRecipe);
    });

    it("should return null when recipe not found", async () => {
      mockAsyncStorage.getItem.mockResolvedValue("[]");

      const result = await UserCacheService.getRecipeById(
        "nonexistent",
        mockUserId
      );

      expect(result).toBeNull();
    });

    it("should return null when recipe is deleted", async () => {
      const deletedRecipe: SyncableItem<Recipe> = {
        ...mockSyncableRecipe,
        isDeleted: true,
      };
      mockAsyncStorage.getItem.mockResolvedValue(
        JSON.stringify([deletedRecipe])
      );

      const result = await UserCacheService.getRecipeById(
        "recipe-1",
        mockUserId
      );

      expect(result).toBeNull();
    });

    it("should return null when no cache exists", async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);

      const result = await UserCacheService.getRecipeById(
        "recipe-1",
        mockUserId
      );

      expect(result).toBeNull();
    });

    it("should handle storage errors gracefully", async () => {
      mockAsyncStorage.getItem.mockRejectedValue(new Error("Storage error"));

      const result = await UserCacheService.getRecipeById(
        "recipe-1",
        mockUserId
      );

      expect(result).toBeNull();
    });

    it("should find recipe by tempId", async () => {
      const tempRecipe: SyncableItem<Recipe> = {
        ...mockSyncableRecipe,
        tempId: "temp-123",
      };
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify([tempRecipe]));

      const result = await UserCacheService.getRecipeById(
        "temp-123",
        mockUserId
      );

      expect(result).toEqual(mockRecipe);
    });
  });

  describe("getRecipeByIdIncludingDeleted", () => {
    it("should return recipe and deletion status", async () => {
      const cachedRecipes = [mockSyncableRecipe];
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(cachedRecipes));

      const result = await UserCacheService.getRecipeByIdIncludingDeleted(
        "recipe-1",
        mockUserId
      );

      expect(result).toEqual({
        recipe: mockRecipe,
        isDeleted: false,
      });
    });

    it("should return deleted recipe with correct status", async () => {
      const deletedRecipe: SyncableItem<Recipe> = {
        ...mockSyncableRecipe,
        isDeleted: true,
      };
      mockAsyncStorage.getItem.mockResolvedValue(
        JSON.stringify([deletedRecipe])
      );

      const result = await UserCacheService.getRecipeByIdIncludingDeleted(
        "recipe-1",
        mockUserId
      );

      expect(result).toEqual({
        recipe: mockRecipe,
        isDeleted: true,
      });
    });

    it("should return null for non-existent recipe", async () => {
      mockAsyncStorage.getItem.mockResolvedValue("[]");

      const result = await UserCacheService.getRecipeByIdIncludingDeleted(
        "nonexistent",
        mockUserId
      );

      expect(result).toEqual({
        recipe: null,
        isDeleted: false,
      });
    });

    it("should handle no cache gracefully", async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);

      const result = await UserCacheService.getRecipeByIdIncludingDeleted(
        "recipe-1",
        mockUserId
      );

      expect(result).toEqual({
        recipe: null,
        isDeleted: false,
      });
    });

    it("should handle storage errors gracefully", async () => {
      mockAsyncStorage.getItem.mockRejectedValue(new Error("Storage error"));

      const result = await UserCacheService.getRecipeByIdIncludingDeleted(
        "recipe-1",
        mockUserId
      );

      expect(result).toEqual({
        recipe: null,
        isDeleted: false,
      });
    });
  });

  describe("createRecipe with improved coverage", () => {
    it("should handle missing user_id by getting from token", async () => {
      mockAsyncStorage.getItem
        .mockResolvedValueOnce("[]") // existing recipes
        .mockResolvedValueOnce("[]"); // pending operations

      const recipeData = {
        name: "New Recipe",
        description: "A new test recipe",
        // user_id is missing - should get from token
      };

      const result = await UserCacheService.createRecipe(recipeData);

      expect(result.user_id).toBe(mockUserId);
      expect(mockUserValidation.getCurrentUserIdFromToken).toHaveBeenCalled();
    });

    it("should throw error when no user ID available", async () => {
      mockUserValidation.getCurrentUserIdFromToken.mockResolvedValue(null);

      const recipeData = { name: "New Recipe" };

      await expect(UserCacheService.createRecipe(recipeData)).rejects.toThrow(
        "Failed to create recipe"
      );
    });

    it("should handle storage errors during creation", async () => {
      mockAsyncStorage.getItem.mockRejectedValue(new Error("Storage error"));

      const recipeData = { name: "New Recipe", user_id: mockUserId };

      await expect(UserCacheService.createRecipe(recipeData)).rejects.toThrow(
        "Failed to create recipe"
      );
    });
  });

  describe("updateRecipe with improved coverage", () => {
    it("should handle missing user_id by getting from token", async () => {
      const cachedRecipes = [mockSyncableRecipe];
      mockAsyncStorage.getItem
        .mockResolvedValueOnce(JSON.stringify(cachedRecipes)) // getCachedRecipes
        .mockResolvedValueOnce("[]") // getPendingOperations for addPendingOperation
        .mockResolvedValueOnce(JSON.stringify(cachedRecipes)) // updateRecipeInCache read
        .mockResolvedValueOnce("[]"); // addPendingOperation read

      const updates = { name: "Updated Recipe" };

      const result = await UserCacheService.updateRecipe("recipe-1", updates);

      expect(result.name).toBe("Updated Recipe");
      expect(mockUserValidation.getCurrentUserIdFromToken).toHaveBeenCalled();
    });

    it("should throw error when no user ID available", async () => {
      mockUserValidation.getCurrentUserIdFromToken.mockResolvedValue(null);

      const updates = { name: "Updated Recipe" };

      await expect(
        UserCacheService.updateRecipe("recipe-1", updates)
      ).rejects.toThrow("User ID is required for updating recipes");
    });
  });

  // ============================================================================
  // Brew Session Tests
  // ============================================================================

  describe("BrewSession CRUD Operations", () => {
    describe("getBrewSessions", () => {
      it("should return cached brew sessions for user", async () => {
        const cachedSessions = [mockSyncableBrewSession];
        mockAsyncStorage.getItem.mockResolvedValue(
          JSON.stringify(cachedSessions)
        );

        const result = await UserCacheService.getBrewSessions(
          mockUserId,
          "imperial"
        );

        expect(result).toEqual([mockBrewSession]);
        expect(mockAsyncStorage.getItem).toHaveBeenCalledWith(
          STORAGE_KEYS_V2.USER_BREW_SESSIONS
        );
      });

      it("should filter out deleted brew sessions", async () => {
        const deletedSession: SyncableItem<BrewSession> = {
          ...mockSyncableBrewSession,
          isDeleted: true,
          deletedAt: Date.now(),
        };
        const cachedSessions = [mockSyncableBrewSession, deletedSession];
        mockAsyncStorage.getItem.mockResolvedValue(
          JSON.stringify(cachedSessions)
        );

        const result = await UserCacheService.getBrewSessions(
          mockUserId,
          "imperial"
        );

        expect(result).toHaveLength(1);
        expect(result[0].id).toBe("session-1");
      });

      it("should return empty array when no sessions cached", async () => {
        mockAsyncStorage.getItem.mockResolvedValue(null);

        const result = await UserCacheService.getBrewSessions(
          mockUserId,
          "imperial"
        );

        expect(result).toEqual([]);
      });

      it("should filter sessions by user ID", async () => {
        const otherUserSession: SyncableItem<BrewSession> = {
          ...mockSyncableBrewSession,
          id: "session-2",
          data: { ...mockBrewSession, id: "session-2", user_id: "other-user" },
        };
        const cachedSessions = [mockSyncableBrewSession, otherUserSession];
        mockAsyncStorage.getItem.mockResolvedValue(
          JSON.stringify(cachedSessions)
        );

        const result = await UserCacheService.getBrewSessions(
          mockUserId,
          "imperial"
        );

        expect(result).toHaveLength(1);
        expect(result[0].user_id).toBe(mockUserId);
      });

      it("should sort sessions by most recent update", async () => {
        const newerSession: SyncableItem<BrewSession> = {
          ...mockSyncableBrewSession,
          id: "session-2",
          data: {
            ...mockBrewSession,
            id: "session-2",
            updated_at: "1640995300000", // More recent updated_at
          },
          lastModified: 1640995300000,
        };
        const cachedSessions = [mockSyncableBrewSession, newerSession];
        mockAsyncStorage.getItem.mockResolvedValue(
          JSON.stringify(cachedSessions)
        );

        const result = await UserCacheService.getBrewSessions(
          mockUserId,
          "imperial"
        );

        expect(result[0].id).toBe("session-2"); // Newer session first
        expect(result[1].id).toBe("session-1");
      });
    });

    describe("createBrewSession", () => {
      it("should create new brew session with temp ID", async () => {
        const newSession = {
          name: "New Brew Session",
          recipe_id: "recipe-1",
          brew_date: "2024-01-15",
          user_id: mockUserId,
        };

        // Mock storage calls
        mockAsyncStorage.getItem
          .mockResolvedValueOnce("[]") // getCachedBrewSessions
          .mockResolvedValueOnce("[]"); // getPendingOperations for addPendingOperation

        const result = await UserCacheService.createBrewSession(newSession);

        expect(result.name).toBe("New Brew Session");
        expect(result.user_id).toBe(mockUserId);
        expect(result.id).toMatch(/^temp_/); // Should have temp ID
        expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
          STORAGE_KEYS_V2.USER_BREW_SESSIONS,
          expect.any(String)
        );
      });

      it("should add pending operation for sync", async () => {
        const newSession = {
          name: "New Brew Session",
          recipe_id: "recipe-1",
          brew_date: "2024-01-15",
          user_id: mockUserId,
        };

        mockAsyncStorage.getItem
          .mockResolvedValueOnce("[]") // getCachedBrewSessions
          .mockResolvedValueOnce("[]"); // getPendingOperations

        await UserCacheService.createBrewSession(newSession);

        // Check that pending operations were set with CREATE operation
        const setItemCalls = (mockAsyncStorage.setItem as jest.Mock).mock.calls;
        const pendingOpsCall = setItemCalls.find(
          call => call[0] === STORAGE_KEYS_V2.PENDING_OPERATIONS
        );
        expect(pendingOpsCall).toBeDefined();
        expect(pendingOpsCall[1]).toContain('"type":"create"');
        expect(pendingOpsCall[1]).toContain('"entityType":"brew_session"');
      });

      it("should throw error when user ID is missing", async () => {
        const newSession = {
          name: "New Brew Session",
          recipe_id: "recipe-1",
          brew_date: "2024-01-15",
        };

        // Mock no user ID available from token
        mockUserValidation.getCurrentUserIdFromToken.mockResolvedValue(null);

        await expect(
          UserCacheService.createBrewSession(newSession)
        ).rejects.toThrow("Failed to create brew session");
      });
    });

    describe("updateBrewSession", () => {
      it("should update existing brew session", async () => {
        const cachedSessions = [mockSyncableBrewSession];
        const updates = {
          name: "Updated Session Name",
          status: "completed" as const,
        };

        mockAsyncStorage.getItem
          .mockResolvedValueOnce(JSON.stringify(cachedSessions)) // getCachedBrewSessions
          .mockResolvedValueOnce("[]") // getPendingOperations for addPendingOperation
          .mockResolvedValueOnce(JSON.stringify(cachedSessions)) // updateBrewSessionInCache read
          .mockResolvedValueOnce("[]"); // addPendingOperation read

        const result = await UserCacheService.updateBrewSession(
          "session-1",
          updates
        );

        expect(result.name).toBe("Updated Session Name");
        expect(result.status).toBe("completed");
        expect(result.user_id).toBe(mockUserId);
      });

      it("should add pending operation for update", async () => {
        const cachedSessions = [mockSyncableBrewSession];
        const updates = { name: "Updated Session Name" };

        mockAsyncStorage.getItem
          .mockResolvedValueOnce(JSON.stringify(cachedSessions)) // getCachedBrewSessions
          .mockResolvedValueOnce("[]") // getPendingOperations
          .mockResolvedValueOnce(JSON.stringify(cachedSessions)) // updateBrewSessionInCache read
          .mockResolvedValueOnce("[]"); // addPendingOperation read

        await UserCacheService.updateBrewSession("session-1", updates);

        // Check that pending operations were set with UPDATE operation
        const setItemCalls = (mockAsyncStorage.setItem as jest.Mock).mock.calls;
        const pendingOpsCall = setItemCalls.find(
          call => call[0] === STORAGE_KEYS_V2.PENDING_OPERATIONS
        );
        expect(pendingOpsCall).toBeDefined();
        expect(pendingOpsCall[1]).toContain('"type":"update"');
        expect(pendingOpsCall[1]).toContain('"entityType":"brew_session"');
      });

      it("should throw error when session not found", async () => {
        mockAsyncStorage.getItem.mockResolvedValue("[]");

        const updates = { name: "Updated Session Name" };

        await expect(
          UserCacheService.updateBrewSession("nonexistent-session", updates)
        ).rejects.toThrow("Brew session not found");
      });

      it("should handle missing user_id by getting from token", async () => {
        const cachedSessions = [mockSyncableBrewSession];
        mockAsyncStorage.getItem
          .mockResolvedValueOnce(JSON.stringify(cachedSessions)) // getCachedBrewSessions
          .mockResolvedValueOnce("[]") // getPendingOperations for addPendingOperation
          .mockResolvedValueOnce(JSON.stringify(cachedSessions)) // updateBrewSessionInCache read
          .mockResolvedValueOnce("[]"); // addPendingOperation read

        const updates = { name: "Updated Session" };

        const result = await UserCacheService.updateBrewSession(
          "session-1",
          updates
        );

        expect(result.name).toBe("Updated Session");
        expect(mockUserValidation.getCurrentUserIdFromToken).toHaveBeenCalled();
      });
    });

    describe("deleteBrewSession", () => {
      it("should mark brew session as deleted (tombstone)", async () => {
        const cachedSessions = [mockSyncableBrewSession];

        mockAsyncStorage.getItem
          .mockResolvedValueOnce(JSON.stringify(cachedSessions)) // getCachedBrewSessions
          .mockResolvedValueOnce("[]") // getPendingOperations for addPendingOperation
          .mockResolvedValueOnce(JSON.stringify(cachedSessions)) // updateBrewSessionInCache read
          .mockResolvedValueOnce("[]"); // addPendingOperation read

        await UserCacheService.deleteBrewSession("session-1", mockUserId);

        // Verify the session was marked as deleted but not removed
        const setItemCalls = (mockAsyncStorage.setItem as jest.Mock).mock.calls;
        const brewSessionsCall = setItemCalls.find(
          call => call[0] === STORAGE_KEYS_V2.USER_BREW_SESSIONS
        );
        expect(brewSessionsCall).toBeDefined();

        const updatedSessions = JSON.parse(brewSessionsCall[1]);
        const deletedSession = updatedSessions.find(
          (s: any) => s.id === "session-1"
        );
        expect(deletedSession.isDeleted).toBe(true);
        expect(deletedSession.deletedAt).toBeDefined();
      });

      it("should add pending operation for deletion", async () => {
        const cachedSessions = [mockSyncableBrewSession];

        mockAsyncStorage.getItem
          .mockResolvedValueOnce(JSON.stringify(cachedSessions)) // getCachedBrewSessions
          .mockResolvedValueOnce("[]") // getPendingOperations
          .mockResolvedValueOnce(JSON.stringify(cachedSessions)) // updateBrewSessionInCache read
          .mockResolvedValueOnce("[]"); // addPendingOperation read

        await UserCacheService.deleteBrewSession("session-1", mockUserId);

        // Check that pending operations were set with DELETE operation
        const setItemCalls = (mockAsyncStorage.setItem as jest.Mock).mock.calls;
        const pendingOpsCall = setItemCalls.find(
          call => call[0] === STORAGE_KEYS_V2.PENDING_OPERATIONS
        );
        expect(pendingOpsCall).toBeDefined();
        expect(pendingOpsCall[1]).toContain('"type":"delete"');
        expect(pendingOpsCall[1]).toContain('"entityType":"brew_session"');
      });

      it("should throw error when session not found", async () => {
        mockAsyncStorage.getItem.mockResolvedValue("[]");

        await expect(
          UserCacheService.deleteBrewSession("nonexistent-session", mockUserId)
        ).rejects.toThrow("Brew session not found");
      });

      it("should throw error when user ID is missing", async () => {
        await expect(
          UserCacheService.deleteBrewSession("session-1", "")
        ).rejects.toThrow("User ID is required for deleting brew sessions");
      });
    });

    describe("getBrewSessionById", () => {
      it("should return specific brew session when found", async () => {
        const cachedSessions = [mockSyncableBrewSession];
        mockAsyncStorage.getItem.mockResolvedValue(
          JSON.stringify(cachedSessions)
        );

        const result = await UserCacheService.getBrewSessionById(
          "session-1",
          mockUserId
        );

        expect(result).toEqual(mockBrewSession);
      });

      it("should return null when session not found", async () => {
        mockAsyncStorage.getItem.mockResolvedValue("[]");

        const result = await UserCacheService.getBrewSessionById(
          "nonexistent",
          mockUserId
        );

        expect(result).toBeNull();
      });

      it("should return null when session belongs to different user", async () => {
        const otherUserSession: SyncableItem<BrewSession> = {
          ...mockSyncableBrewSession,
          data: { ...mockBrewSession, user_id: "other-user" },
        };
        const cachedSessions = [otherUserSession];
        mockAsyncStorage.getItem.mockResolvedValue(
          JSON.stringify(cachedSessions)
        );

        const result = await UserCacheService.getBrewSessionById(
          "session-1",
          mockUserId
        );

        expect(result).toBeNull();
      });

      it("should return null when session is deleted", async () => {
        const deletedSession: SyncableItem<BrewSession> = {
          ...mockSyncableBrewSession,
          isDeleted: true,
          deletedAt: Date.now(),
        };
        const cachedSessions = [deletedSession];
        mockAsyncStorage.getItem.mockResolvedValue(
          JSON.stringify(cachedSessions)
        );

        const result = await UserCacheService.getBrewSessionById(
          "session-1",
          mockUserId
        );

        expect(result).toBeNull();
      });
    });
  });
});
