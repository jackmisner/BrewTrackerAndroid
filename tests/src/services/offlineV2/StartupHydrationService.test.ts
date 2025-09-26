/**
 * Tests for StartupHydrationService
 */

import { StartupHydrationService } from "@services/offlineV2/StartupHydrationService";
import { UserCacheService } from "@services/offlineV2/UserCacheService";
import { StaticDataService } from "@services/offlineV2/StaticDataService";

// Mock the dependencies
jest.mock("@services/offlineV2/UserCacheService");
jest.mock("@services/offlineV2/StaticDataService");

const mockUserCacheService = UserCacheService as jest.Mocked<
  typeof UserCacheService
>;
const mockStaticDataService = StaticDataService as jest.Mocked<
  typeof StaticDataService
>;

describe("StartupHydrationService", () => {
  const mockUserId = "test-user-123";

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Reset hydration state before each test
    StartupHydrationService.resetHydrationState();
  });

  describe("hydrateOnStartup", () => {
    it("should complete hydration successfully with fresh cache", async () => {
      // Mock no existing recipes
      mockUserCacheService.getRecipes.mockResolvedValue([]);

      // Mock cache stats showing no cached data
      mockStaticDataService.getCacheStats.mockResolvedValue({
        ingredients: {
          cached: false,
          version: null,
          record_count: 0,
          last_updated: null,
        },
        beerStyles: {
          cached: false,
          version: null,
          record_count: 0,
          last_updated: null,
        },
      });

      // Mock successful static data fetching
      mockStaticDataService.getIngredients.mockResolvedValue([]);
      mockStaticDataService.getBeerStyles.mockResolvedValue([]);

      await StartupHydrationService.hydrateOnStartup(mockUserId);

      // Verify user data hydration was attempted
      expect(mockUserCacheService.getRecipes).toHaveBeenCalledWith(
        mockUserId,
        "imperial"
      );

      // Verify static data hydration was attempted
      expect(mockStaticDataService.getCacheStats).toHaveBeenCalled();
      expect(mockStaticDataService.getIngredients).toHaveBeenCalled();
      expect(mockStaticDataService.getBeerStyles).toHaveBeenCalled();

      // Check hydration status
      const status = StartupHydrationService.getHydrationStatus();
      expect(status.hasHydrated).toBe(true);
      expect(status.isHydrating).toBe(false);
    });

    it("should handle existing cached data correctly", async () => {
      // Mock existing recipes
      const mockRecipes = [{ id: "recipe1", name: "Test Recipe" }] as any;
      mockUserCacheService.getRecipes.mockResolvedValue(mockRecipes);

      // Mock cache stats showing cached data
      mockStaticDataService.getCacheStats.mockResolvedValue({
        ingredients: {
          cached: true,
          version: "v1.0",
          record_count: 100,
          last_updated: 1640995200000,
        },
        beerStyles: {
          cached: true,
          version: "v1.0",
          record_count: 50,
          last_updated: 1640995200000,
        },
      });

      // Mock background update methods
      mockStaticDataService.updateIngredientsCache.mockResolvedValue();
      mockStaticDataService.updateBeerStylesCache.mockResolvedValue();

      await StartupHydrationService.hydrateOnStartup(mockUserId, "metric");

      // Verify user data check was done with metric system
      expect(mockUserCacheService.getRecipes).toHaveBeenCalledWith(
        mockUserId,
        "metric"
      );

      // Verify cache stats were checked
      expect(mockStaticDataService.getCacheStats).toHaveBeenCalled();

      // Since data was cached, these shouldn't be called
      expect(mockStaticDataService.getIngredients).not.toHaveBeenCalled();
      expect(mockStaticDataService.getBeerStyles).not.toHaveBeenCalled();

      // But background updates should be triggered
      expect(mockStaticDataService.updateIngredientsCache).toHaveBeenCalled();
      expect(mockStaticDataService.updateBeerStylesCache).toHaveBeenCalled();
    });

    it("should prevent concurrent hydrations", async () => {
      mockUserCacheService.getRecipes.mockResolvedValue([]);
      mockStaticDataService.getCacheStats.mockResolvedValue({
        ingredients: {
          cached: false,
          version: null,
          record_count: 0,
          last_updated: null,
        },
        beerStyles: {
          cached: false,
          version: null,
          record_count: 0,
          last_updated: null,
        },
      });

      // Start first hydration (don't await)
      const hydration1 = StartupHydrationService.hydrateOnStartup(mockUserId);

      // Immediately start second hydration
      const hydration2 = StartupHydrationService.hydrateOnStartup(mockUserId);

      await Promise.all([hydration1, hydration2]);

      // UserCacheService should only be called once due to concurrent protection
      expect(mockUserCacheService.getRecipes).toHaveBeenCalledTimes(1);
    });

    it("should prevent hydration after completion", async () => {
      mockUserCacheService.getRecipes.mockResolvedValue([]);
      mockStaticDataService.getCacheStats.mockResolvedValue({
        ingredients: {
          cached: false,
          version: null,
          record_count: 0,
          last_updated: null,
        },
        beerStyles: {
          cached: false,
          version: null,
          record_count: 0,
          last_updated: null,
        },
      });

      // Complete first hydration
      await StartupHydrationService.hydrateOnStartup(mockUserId);

      // Clear mocks to check second call
      jest.clearAllMocks();

      // Try second hydration
      await StartupHydrationService.hydrateOnStartup(mockUserId);

      // Nothing should be called on second attempt
      expect(mockUserCacheService.getRecipes).not.toHaveBeenCalled();
      expect(mockStaticDataService.getCacheStats).not.toHaveBeenCalled();
    });

    it("should handle user data hydration errors gracefully", async () => {
      // Mock user data error
      mockUserCacheService.getRecipes.mockRejectedValue(
        new Error("User data error")
      );

      // Mock successful static data
      mockStaticDataService.getCacheStats.mockResolvedValue({
        ingredients: {
          cached: false,
          version: null,
          record_count: 0,
          last_updated: null,
        },
        beerStyles: {
          cached: false,
          version: null,
          record_count: 0,
          last_updated: null,
        },
      });
      mockStaticDataService.getIngredients.mockResolvedValue([]);
      mockStaticDataService.getBeerStyles.mockResolvedValue([]);

      // Should not throw despite user data error
      await expect(
        StartupHydrationService.hydrateOnStartup(mockUserId)
      ).resolves.toBeUndefined();

      // Static data should still be processed
      expect(mockStaticDataService.getCacheStats).toHaveBeenCalled();
      expect(mockStaticDataService.getIngredients).toHaveBeenCalled();
      expect(mockStaticDataService.getBeerStyles).toHaveBeenCalled();

      // Hydration should be marked as complete
      const status = StartupHydrationService.getHydrationStatus();
      expect(status.hasHydrated).toBe(true);
      expect(status.isHydrating).toBe(false);
    });

    it("should handle static data hydration errors gracefully", async () => {
      // Mock successful user data
      mockUserCacheService.getRecipes.mockResolvedValue([]);

      // Mock static data error
      mockStaticDataService.getCacheStats.mockRejectedValue(
        new Error("Static data error")
      );

      // Should not throw despite static data error
      await expect(
        StartupHydrationService.hydrateOnStartup(mockUserId)
      ).resolves.toBeUndefined();

      // User data should still be processed
      expect(mockUserCacheService.getRecipes).toHaveBeenCalled();

      // Hydration should be marked as complete
      const status = StartupHydrationService.getHydrationStatus();
      expect(status.hasHydrated).toBe(true);
      expect(status.isHydrating).toBe(false);
    });

    it("should handle background update failures gracefully", async () => {
      // Mock existing cached data
      mockUserCacheService.getRecipes.mockResolvedValue([
        { id: "recipe1" },
      ] as any);
      mockStaticDataService.getCacheStats.mockResolvedValue({
        ingredients: {
          cached: true,
          version: "v1.0",
          record_count: 100,
          last_updated: 1640995200000,
        },
        beerStyles: {
          cached: true,
          version: "v1.0",
          record_count: 50,
          last_updated: 1640995200000,
        },
      });

      // Mock background update failures
      mockStaticDataService.updateIngredientsCache.mockRejectedValue(
        new Error("Ingredients update failed")
      );
      mockStaticDataService.updateBeerStylesCache.mockRejectedValue(
        new Error("Beer styles update failed")
      );

      // Should complete without throwing
      await expect(
        StartupHydrationService.hydrateOnStartup(mockUserId)
      ).resolves.toBeUndefined();

      // Background updates should still be attempted
      expect(mockStaticDataService.updateIngredientsCache).toHaveBeenCalled();
      expect(mockStaticDataService.updateBeerStylesCache).toHaveBeenCalled();

      const status = StartupHydrationService.getHydrationStatus();
      expect(status.hasHydrated).toBe(true);
    });
  });

  describe("getHydrationStatus", () => {
    it("should return correct initial status", () => {
      const status = StartupHydrationService.getHydrationStatus();
      expect(status.isHydrating).toBe(false);
      expect(status.hasHydrated).toBe(false);
    });

    it("should track hydration in progress", () => {
      // Mock a long-running operation
      mockUserCacheService.getRecipes.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve([]), 100))
      );
      mockStaticDataService.getCacheStats.mockResolvedValue({
        ingredients: {
          cached: false,
          version: null,
          record_count: 0,
          last_updated: null,
        },
        beerStyles: {
          cached: false,
          version: null,
          record_count: 0,
          last_updated: null,
        },
      });

      // Start hydration
      StartupHydrationService.hydrateOnStartup(mockUserId);

      // Check status immediately
      const status = StartupHydrationService.getHydrationStatus();
      expect(status.isHydrating).toBe(true);
      expect(status.hasHydrated).toBe(false);
    });
  });

  describe("resetHydrationState", () => {
    it("should reset hydration state correctly", async () => {
      // Complete a hydration
      mockUserCacheService.getRecipes.mockResolvedValue([]);
      mockStaticDataService.getCacheStats.mockResolvedValue({
        ingredients: {
          cached: false,
          version: null,
          record_count: 0,
          last_updated: null,
        },
        beerStyles: {
          cached: false,
          version: null,
          record_count: 0,
          last_updated: null,
        },
      });

      await StartupHydrationService.hydrateOnStartup(mockUserId);

      // Verify hydration completed
      let status = StartupHydrationService.getHydrationStatus();
      expect(status.hasHydrated).toBe(true);

      // Reset state
      StartupHydrationService.resetHydrationState();

      // Verify state was reset
      status = StartupHydrationService.getHydrationStatus();
      expect(status.isHydrating).toBe(false);
      expect(status.hasHydrated).toBe(false);
    });

    it("should allow hydration after reset", async () => {
      // Complete first hydration
      mockUserCacheService.getRecipes.mockResolvedValue([]);
      mockStaticDataService.getCacheStats.mockResolvedValue({
        ingredients: {
          cached: false,
          version: null,
          record_count: 0,
          last_updated: null,
        },
        beerStyles: {
          cached: false,
          version: null,
          record_count: 0,
          last_updated: null,
        },
      });

      await StartupHydrationService.hydrateOnStartup(mockUserId);

      // Clear mocks and reset state
      jest.clearAllMocks();
      StartupHydrationService.resetHydrationState();

      // Set up mocks again
      mockUserCacheService.getRecipes.mockResolvedValue([]);
      mockStaticDataService.getCacheStats.mockResolvedValue({
        ingredients: {
          cached: false,
          version: null,
          record_count: 0,
          last_updated: null,
        },
        beerStyles: {
          cached: false,
          version: null,
          record_count: 0,
          last_updated: null,
        },
      });

      // Second hydration should work
      await StartupHydrationService.hydrateOnStartup(mockUserId);

      // Verify methods were called again
      expect(mockUserCacheService.getRecipes).toHaveBeenCalled();
      expect(mockStaticDataService.getCacheStats).toHaveBeenCalled();
    });
  });

  describe("edge cases", () => {
    it("should handle partial static data cache states", async () => {
      mockUserCacheService.getRecipes.mockResolvedValue([]);

      // Mock ingredients cached but beer styles not cached
      mockStaticDataService.getCacheStats.mockResolvedValue({
        ingredients: {
          cached: true,
          version: "v1.0",
          record_count: 100,
          last_updated: 1640995200000,
        },
        beerStyles: {
          cached: false,
          version: null,
          record_count: 0,
          last_updated: null,
        },
      });

      mockStaticDataService.getBeerStyles.mockResolvedValue([]);
      mockStaticDataService.updateIngredientsCache.mockResolvedValue();

      await StartupHydrationService.hydrateOnStartup(mockUserId);

      // Should not fetch ingredients since they're cached
      expect(mockStaticDataService.getIngredients).not.toHaveBeenCalled();
      // Should fetch beer styles since they're not cached
      expect(mockStaticDataService.getBeerStyles).toHaveBeenCalled();
      // Should update ingredients in background
      expect(mockStaticDataService.updateIngredientsCache).toHaveBeenCalled();
    });

    it("should handle default unit system parameter", async () => {
      mockUserCacheService.getRecipes.mockResolvedValue([]);
      mockStaticDataService.getCacheStats.mockResolvedValue({
        ingredients: {
          cached: false,
          version: null,
          record_count: 0,
          last_updated: null,
        },
        beerStyles: {
          cached: false,
          version: null,
          record_count: 0,
          last_updated: null,
        },
      });

      // Call without unit system (should default to imperial)
      await StartupHydrationService.hydrateOnStartup(mockUserId);

      expect(mockUserCacheService.getRecipes).toHaveBeenCalledWith(
        mockUserId,
        "imperial"
      );
    });
  });
});
