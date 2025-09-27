/**
 * Tests for LegacyMigrationService - Migration from legacy offline system to V2
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { LegacyMigrationService } from "@services/offlineV2/LegacyMigrationService";
import { UserCacheService } from "@services/offlineV2/UserCacheService";
import { STORAGE_KEYS } from "@services/config";
import { OfflineRecipe } from "@src/types/offline";

// Mock AsyncStorage
jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}));

// Mock UserCacheService
jest.mock("@services/offlineV2/UserCacheService", () => ({
  UserCacheService: {
    getRecipes: jest.fn(),
    addRecipeToCache: jest.fn(),
  },
}));

const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
const mockUserCacheService = UserCacheService as jest.Mocked<
  typeof UserCacheService
>;

describe("LegacyMigrationService", () => {
  const testUserId = "test-user-123";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("migrateLegacyRecipesToV2", () => {
    it("should successfully migrate legacy recipes to V2", async () => {
      // Setup legacy data
      const legacyRecipes: OfflineRecipe[] = [
        {
          id: "recipe-1",
          user_id: testUserId,
          name: "Test Recipe 1",
          description: "Test description",
          style: "IPA",
          batch_size: 5,
          batch_size_unit: "gal",
          unit_system: "imperial",
          boil_time: 60,
          efficiency: 75,
          mash_temperature: 152,
          mash_temp_unit: "F",
          notes: "",
          ingredients: [],
          estimated_og: 1.05,
          estimated_fg: 1.01,
          estimated_abv: 5.0,
          estimated_ibu: 30,
          estimated_srm: 6,
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
          is_public: false,
          tempId: "temp-1",
          isOffline: true,
          needsSync: true,
          syncStatus: "pending",
          lastModified: Date.now(),
        },
      ];

      const legacyData = {
        recipes: legacyRecipes,
      };

      // Mock legacy storage
      mockAsyncStorage.getItem.mockResolvedValueOnce(
        JSON.stringify(legacyData)
      );

      // Mock V2 cache (empty)
      mockUserCacheService.getRecipes.mockResolvedValueOnce([]);

      // Mock successful cache addition
      mockUserCacheService.addRecipeToCache.mockResolvedValueOnce(undefined);

      // Run migration
      const result = await LegacyMigrationService.migrateLegacyRecipesToV2(
        testUserId,
        "imperial"
      );

      // Verify results
      expect(result.migrated).toBe(1);
      expect(result.skipped).toBe(0);
      expect(result.errors).toBe(0);

      // Verify V2 cache was called
      expect(mockUserCacheService.addRecipeToCache).toHaveBeenCalledWith({
        id: "recipe-1",
        data: expect.objectContaining({
          id: "recipe-1",
          user_id: testUserId,
          name: "Test Recipe 1",
          batch_size_unit: "gal",
          unit_system: "imperial",
          mash_temperature: 152,
          mash_temp_unit: "F",
        }),
        lastModified: expect.any(Number),
        syncStatus: "pending",
        needsSync: true,
        tempId: "temp-1",
      });
    });

    it("should migrate recipes with metric units when specified", async () => {
      // Setup legacy data
      const legacyRecipes: OfflineRecipe[] = [
        {
          id: "recipe-1",
          user_id: testUserId,
          name: "Test Recipe 1",
          description: "Test description",
          style: "IPA",
          batch_size: 19, // Liters
          batch_size_unit: "l",
          unit_system: "metric",
          boil_time: 60,
          efficiency: 75,
          mash_temperature: 67,
          mash_temp_unit: "C",
          notes: "",
          ingredients: [],
          estimated_og: 1.05,
          estimated_fg: 1.01,
          estimated_abv: 5.0,
          estimated_ibu: 30,
          estimated_srm: 6,
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
          is_public: false,
          tempId: "temp-1",
          isOffline: true,
          needsSync: true,
          syncStatus: "pending",
          lastModified: Date.now(),
        },
      ];

      const legacyData = {
        recipes: legacyRecipes,
      };

      // Mock legacy storage
      mockAsyncStorage.getItem.mockResolvedValueOnce(
        JSON.stringify(legacyData)
      );

      // Mock V2 cache (empty)
      mockUserCacheService.getRecipes.mockResolvedValueOnce([]);

      // Mock successful cache addition
      mockUserCacheService.addRecipeToCache.mockResolvedValueOnce(undefined);

      // Run migration with metric units
      const result = await LegacyMigrationService.migrateLegacyRecipesToV2(
        testUserId,
        "metric"
      );

      // Verify results
      expect(result.migrated).toBe(1);
      expect(result.skipped).toBe(0);
      expect(result.errors).toBe(0);

      // Verify V2 cache was called with metric units
      expect(mockUserCacheService.addRecipeToCache).toHaveBeenCalledWith({
        id: "recipe-1",
        data: expect.objectContaining({
          id: "recipe-1",
          user_id: testUserId,
          name: "Test Recipe 1",
          batch_size_unit: "l",
          unit_system: "metric",
          mash_temperature: 67,
          mash_temp_unit: "C",
        }),
        lastModified: expect.any(Number),
        syncStatus: "pending",
        needsSync: true,
        tempId: "temp-1",
      });
    });

    it("should skip recipes that already exist in V2", async () => {
      const legacyRecipes: OfflineRecipe[] = [
        {
          id: "recipe-1",
          user_id: testUserId,
          name: "Test Recipe 1",
          description: "",
          style: "",
          batch_size: 5,
          batch_size_unit: "gal",
          unit_system: "imperial",
          boil_time: 60,
          efficiency: 75,
          mash_temperature: 152,
          mash_temp_unit: "F",
          notes: "",
          ingredients: [],
          estimated_og: 1.05,
          estimated_fg: 1.01,
          estimated_abv: 5.0,
          estimated_ibu: 30,
          estimated_srm: 6,
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
          is_public: false,
          isOffline: true,
          needsSync: true,
          syncStatus: "pending",
          lastModified: Date.now(),
        } as OfflineRecipe,
      ];

      const legacyData = { recipes: legacyRecipes };
      mockAsyncStorage.getItem.mockResolvedValueOnce(
        JSON.stringify(legacyData)
      );

      // Mock existing V2 recipe
      mockUserCacheService.getRecipes.mockResolvedValueOnce([
        {
          id: "recipe-1",
          user_id: testUserId,
          name: "Existing Recipe",
        } as any,
      ]);

      const result = await LegacyMigrationService.migrateLegacyRecipesToV2(
        testUserId,
        "imperial"
      );

      expect(result.migrated).toBe(0);
      expect(result.skipped).toBe(1);
      expect(result.errors).toBe(0);
      expect(mockUserCacheService.addRecipeToCache).not.toHaveBeenCalled();
    });

    it("should handle migration errors gracefully", async () => {
      const legacyRecipes: OfflineRecipe[] = [
        {
          id: "recipe-1",
          user_id: testUserId,
          name: "Test Recipe 1",
          description: "",
          style: "",
          batch_size: 5,
          batch_size_unit: "gal",
          unit_system: "imperial",
          boil_time: 60,
          efficiency: 75,
          mash_temperature: 152,
          mash_temp_unit: "F",
          notes: "",
          ingredients: [],
          estimated_og: 1.05,
          estimated_fg: 1.01,
          estimated_abv: 5.0,
          estimated_ibu: 30,
          estimated_srm: 6,
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
          is_public: false,
          isOffline: true,
          needsSync: true,
          syncStatus: "pending",
          lastModified: Date.now(),
        } as OfflineRecipe,
      ];

      const legacyData = { recipes: legacyRecipes };
      mockAsyncStorage.getItem.mockResolvedValueOnce(
        JSON.stringify(legacyData)
      );
      mockUserCacheService.getRecipes.mockResolvedValueOnce([]);

      // Mock cache addition failure
      mockUserCacheService.addRecipeToCache.mockRejectedValueOnce(
        new Error("Cache error")
      );

      const result = await LegacyMigrationService.migrateLegacyRecipesToV2(
        testUserId,
        "imperial"
      );

      expect(result.migrated).toBe(0);
      expect(result.skipped).toBe(0);
      expect(result.errors).toBe(1);
      expect(result.errorDetails).toContain("recipe-1: Cache error");
    });
  });

  describe("hasLegacyRecipes", () => {
    it("should return true when legacy recipes exist", async () => {
      const legacyData = {
        recipes: [{ id: "recipe-1", user_id: testUserId, isDeleted: false }],
      };
      mockAsyncStorage.getItem.mockResolvedValueOnce(
        JSON.stringify(legacyData)
      );

      const result = await LegacyMigrationService.hasLegacyRecipes(testUserId);
      expect(result).toBe(true);
    });

    it("should return false when no legacy recipes exist", async () => {
      mockAsyncStorage.getItem.mockResolvedValueOnce(null);

      const result = await LegacyMigrationService.hasLegacyRecipes(testUserId);
      expect(result).toBe(false);
    });
  });

  describe("getLegacyRecipeCount", () => {
    it("should return correct count of legacy recipes", async () => {
      const legacyData = {
        recipes: [
          { id: "recipe-1", user_id: testUserId, isDeleted: false },
          { id: "recipe-2", user_id: testUserId, isDeleted: false },
          { id: "recipe-3", user_id: "other-user", isDeleted: false },
          { id: "recipe-4", user_id: testUserId, isDeleted: true },
        ],
      };
      mockAsyncStorage.getItem.mockResolvedValueOnce(
        JSON.stringify(legacyData)
      );

      const result =
        await LegacyMigrationService.getLegacyRecipeCount(testUserId);
      expect(result).toBe(2); // Only non-deleted recipes for testUserId
    });
  });

  describe("clearLegacyRecipes", () => {
    it("should remove legacy recipes for specific user", async () => {
      const legacyData = {
        recipes: [
          { id: "recipe-1", user_id: testUserId },
          { id: "recipe-2", user_id: "other-user" },
        ],
      };
      mockAsyncStorage.getItem.mockResolvedValueOnce(
        JSON.stringify(legacyData)
      );

      await LegacyMigrationService.clearLegacyRecipes(testUserId);

      // Verify only recipes for testUserId were removed
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        STORAGE_KEYS.OFFLINE_RECIPES,
        JSON.stringify({
          recipes: [{ id: "recipe-2", user_id: "other-user" }],
        })
      );
    });
  });
});
