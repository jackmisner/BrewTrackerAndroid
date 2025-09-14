/**
 * Tests for OfflineCacheService
 *
 * Tests caching functionality for essential brewing data including:
 * - Cache initialization with progress tracking
 * - Network connectivity handling
 * - Data fetching and storage
 * - Cache validation and expiry
 * - Background refresh capabilities
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  OfflineCacheService,
  CacheProgress,
} from "@services/offline/OfflineCacheService";
import ApiService from "@services/api/apiService";
import { IngredientType } from "@src/types";

// Mock dependencies
jest.mock("@react-native-async-storage/async-storage");
jest.mock("@services/api/apiService");
jest.mock("@services/config", () => ({
  STORAGE_KEYS: {
    OFFLINE_CACHE: "offline_cache_test",
  },
}));

const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
const mockApiService = ApiService as jest.Mocked<typeof ApiService>;

describe("OfflineCacheService", () => {
  let progressCallback: jest.MockedFunction<(progress: CacheProgress) => void>;

  beforeEach(() => {
    jest.clearAllMocks();
    progressCallback = jest.fn();

    // Reset AsyncStorage mock
    mockAsyncStorage.getItem.mockResolvedValue(null);
    mockAsyncStorage.setItem.mockResolvedValue();
    mockAsyncStorage.removeItem.mockResolvedValue();

    // Mock API service methods
    mockApiService.checkConnection = jest.fn().mockResolvedValue(true);
    mockApiService.beerStyles = {
      getAll: jest.fn().mockResolvedValue({
        data: {
          categories: {
            "18": {
              styles: [
                { name: "American Pale Ale", style_id: "18B" },
                { name: "American IPA", style_id: "21A" },
              ],
            },
          },
        },
      }),
    } as any;

    mockApiService.ingredients = {
      getAll: jest.fn().mockResolvedValue({
        data: [
          { name: "Pale Malt", type: "grain", potential: 1.037 },
          { name: "Cascade", type: "hop", alpha_acid: 5.5 },
        ],
      }),
    } as any;
  });

  describe("initializeCache", () => {
    it("should use valid cached data when available", async () => {
      const cachedData = {
        ingredients: { grain: [], hop: [], yeast: [], other: [] },
        beerStyles: { styles: [] },
        metadata: {
          version: 1,
          lastUpdated: Date.now() - 1000, // 1 second ago
          dataSize: 100,
        },
      };

      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(cachedData));

      const result =
        await OfflineCacheService.initializeCache(progressCallback);

      expect(result).toBe(true);
      expect(progressCallback).toHaveBeenCalledWith({
        step: "complete",
        message: "Ready to brew!",
        percent: 100,
        isComplete: true,
      });
    });

    it("should use expired cache when offline", async () => {
      const expiredCachedData = {
        ingredients: { grain: [], hop: [], yeast: [], other: [] },
        beerStyles: { styles: [] },
        metadata: {
          version: 1,
          lastUpdated: Date.now() - 25 * 60 * 60 * 1000, // 25 hours ago (expired)
          dataSize: 100,
        },
      };

      mockAsyncStorage.getItem.mockResolvedValue(
        JSON.stringify(expiredCachedData)
      );
      mockApiService.checkConnection.mockResolvedValue(false);

      const result =
        await OfflineCacheService.initializeCache(progressCallback);

      expect(result).toBe(true);
      expect(progressCallback).toHaveBeenCalledWith({
        step: "complete",
        message: "Ready to brew offline!",
        percent: 100,
        isComplete: true,
      });
    });

    it("should fetch fresh data when cache is invalid and online", async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null); // No cached data
      mockApiService.checkConnection.mockResolvedValue(true);

      const result =
        await OfflineCacheService.initializeCache(progressCallback);

      expect(result).toBe(true);
      expect(mockApiService.beerStyles.getAll).toHaveBeenCalled();
      expect(mockApiService.ingredients.getAll).toHaveBeenCalledWith("grain");
      expect(mockApiService.ingredients.getAll).toHaveBeenCalledWith("hop");
      expect(mockApiService.ingredients.getAll).toHaveBeenCalledWith("yeast");
      expect(mockApiService.ingredients.getAll).toHaveBeenCalledWith("other");
      expect(progressCallback).toHaveBeenCalledWith({
        step: "complete",
        message: "Ready to brew!",
        percent: 100,
        isComplete: true,
      });
    });

    it("should return false when offline with no cached data", async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);
      mockApiService.checkConnection.mockResolvedValue(false);

      const result =
        await OfflineCacheService.initializeCache(progressCallback);

      expect(result).toBe(false);
      expect(progressCallback).toHaveBeenCalledWith({
        step: "error",
        message: "No network connection and no cached data",
        percent: 100,
        isComplete: true,
      });
    });

    it("should handle initialization errors gracefully", async () => {
      mockAsyncStorage.getItem.mockRejectedValue(new Error("Storage error"));
      mockApiService.checkConnection.mockResolvedValue(false); // Offline

      const result =
        await OfflineCacheService.initializeCache(progressCallback);

      expect(result).toBe(false);
      expect(progressCallback).toHaveBeenCalledWith({
        step: "error",
        message: "No cached data available",
        percent: 100,
        isComplete: false,
      });
    });

    it("should report progress during data fetching", async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);
      mockApiService.checkConnection.mockResolvedValue(true);

      await OfflineCacheService.initializeCache(progressCallback);

      expect(progressCallback).toHaveBeenCalledWith({
        step: "init",
        message: "Checking cached data...",
        percent: 5,
        isComplete: false,
      });
      expect(progressCallback).toHaveBeenCalledWith({
        step: "network",
        message: "Checking network...",
        percent: 10,
        isComplete: false,
      });
      expect(progressCallback).toHaveBeenCalledWith({
        step: "fetch",
        message: "Downloading brewing data...",
        percent: 20,
        isComplete: false,
      });
    });
  });

  describe("getCachedIngredients", () => {
    it("should return cached ingredients for valid type", async () => {
      const cachedData = {
        ingredients: {
          grain: [{ name: "Pale Malt", type: "grain" as IngredientType }],
          hop: [],
          yeast: [],
          other: [],
        },
        beerStyles: { styles: [] },
        metadata: { version: 1, lastUpdated: Date.now(), dataSize: 100 },
      };

      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(cachedData));

      const result = await OfflineCacheService.getCachedIngredients("grain");

      expect(result).toEqual([{ name: "Pale Malt", type: "grain" }]);
    });

    it("should return empty array when no cached data", async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);

      const result = await OfflineCacheService.getCachedIngredients("grain");

      expect(result).toEqual([]);
    });

    it("should return empty array when ingredient type not found", async () => {
      const cachedData = {
        ingredients: { grain: [], hop: [], yeast: [], other: [] },
        beerStyles: { styles: [] },
        metadata: { version: 1, lastUpdated: Date.now(), dataSize: 100 },
      };

      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(cachedData));

      const result = await OfflineCacheService.getCachedIngredients("grain");

      expect(result).toEqual([]);
    });
  });

  describe("getCachedBeerStyles", () => {
    it("should return cached beer styles", async () => {
      const cachedData = {
        ingredients: { grain: [], hop: [], yeast: [], other: [] },
        beerStyles: {
          styles: [
            { name: "American Pale Ale", styleId: "18B" },
            { name: "American IPA", styleId: "21A" },
          ],
        },
        metadata: { version: 1, lastUpdated: Date.now(), dataSize: 100 },
      };

      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(cachedData));

      const result = await OfflineCacheService.getCachedBeerStyles();

      expect(result).toEqual([
        { name: "American Pale Ale", styleId: "18B" },
        { name: "American IPA", styleId: "21A" },
      ]);
    });

    it("should return fallback styles when no cached data", async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);

      const result = await OfflineCacheService.getCachedBeerStyles();

      expect(result).toEqual([
        { name: "American Pale Ale", styleId: "18B" },
        { name: "American IPA", styleId: "21A" },
        { name: "American Porter", styleId: "20A" },
        { name: "American Stout", styleId: "20B" },
        { name: "Wheat Beer", styleId: "1A" },
        { name: "German Pilsner", styleId: "5D" },
        { name: "Munich Helles", styleId: "4A" },
        { name: "Oktoberfest", styleId: "6A" },
        { name: "English Bitter", styleId: "11A" },
        { name: "English Brown Ale", styleId: "13B" },
      ]);
    });
  });

  describe("refreshCacheInBackground", () => {
    it("should refresh cache when online", async () => {
      mockApiService.checkConnection.mockResolvedValue(true);

      await OfflineCacheService.refreshCacheInBackground();

      expect(mockApiService.beerStyles.getAll).toHaveBeenCalled();
      expect(mockApiService.ingredients.getAll).toHaveBeenCalledTimes(4);
    });

    it("should skip refresh when offline", async () => {
      mockApiService.checkConnection.mockResolvedValue(false);

      await OfflineCacheService.refreshCacheInBackground();

      expect(mockApiService.beerStyles.getAll).not.toHaveBeenCalled();
      expect(mockApiService.ingredients.getAll).not.toHaveBeenCalled();
    });

    it("should handle refresh errors gracefully", async () => {
      mockApiService.checkConnection.mockResolvedValue(true);
      // Make fetchAndCacheData throw by failing AsyncStorage.setItem
      mockAsyncStorage.setItem.mockRejectedValue(new Error("Storage full"));

      const consoleSpy = jest.spyOn(console, "error").mockImplementation();

      await OfflineCacheService.refreshCacheInBackground();

      expect(consoleSpy).toHaveBeenCalledWith(
        "Background cache refresh failed:",
        expect.any(Error)
      );
      consoleSpy.mockRestore();
    });
  });

  describe("getCacheStatus", () => {
    it("should return valid cache status", async () => {
      const lastUpdated = Date.now() - 1000;
      const cachedData = {
        ingredients: { grain: [], hop: [], yeast: [], other: [] },
        beerStyles: { styles: [] },
        metadata: { version: 1, lastUpdated, dataSize: 100 },
      };

      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(cachedData));

      const result = await OfflineCacheService.getCacheStatus();

      expect(result).toEqual({
        isValid: true,
        lastUpdated: new Date(lastUpdated),
        dataSize: 100,
        version: 1,
      });
    });

    it("should return invalid status for no cache", async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);

      const result = await OfflineCacheService.getCacheStatus();

      expect(result).toEqual({
        isValid: false,
        lastUpdated: null,
        dataSize: 0,
        version: 0,
      });
    });

    it("should return invalid status for expired cache", async () => {
      const expiredTime = Date.now() - 25 * 60 * 60 * 1000; // 25 hours ago
      const cachedData = {
        ingredients: { grain: [], hop: [], yeast: [], other: [] },
        beerStyles: { styles: [] },
        metadata: { version: 1, lastUpdated: expiredTime, dataSize: 100 },
      };

      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(cachedData));

      const result = await OfflineCacheService.getCacheStatus();

      expect(result.isValid).toBe(false);
      expect(result.lastUpdated).toEqual(new Date(expiredTime));
    });
  });

  describe("clearCache", () => {
    it("should clear cached data from storage", async () => {
      await OfflineCacheService.clearCache();

      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith(
        "offline_cache_test"
      );
    });
  });

  describe("data processing", () => {
    it("should process beer styles correctly", async () => {
      const complexBeerStylesData = {
        categories: {
          "18": {
            styles: [
              { name: "American Pale Ale", style_id: "18B" },
              { name: "American IPA", style_id: "21A" },
            ],
          },
          "20": {
            styles: [
              { name: "American Porter", style_id: "20A" },
              { name: "American Stout", style_id: "20B" },
            ],
          },
        },
      };

      (mockApiService.beerStyles.getAll as jest.Mock).mockResolvedValue({
        data: complexBeerStylesData,
      });
      mockAsyncStorage.getItem.mockResolvedValue(null);
      mockApiService.checkConnection.mockResolvedValue(true);

      await OfflineCacheService.initializeCache();

      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        "offline_cache_test",
        expect.stringContaining("American Pale Ale")
      );
    });

    it("should use fallback beer styles on API failure", async () => {
      (mockApiService.beerStyles.getAll as jest.Mock).mockRejectedValue(
        new Error("API error")
      );
      mockAsyncStorage.getItem.mockResolvedValue(null);
      mockApiService.checkConnection.mockResolvedValue(true);

      const consoleSpy = jest.spyOn(console, "warn").mockImplementation();

      await OfflineCacheService.initializeCache();

      expect(consoleSpy).toHaveBeenCalledWith(
        "Failed to fetch beer styles:",
        expect.any(Error)
      );
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        "offline_cache_test",
        expect.stringContaining("American Pale Ale")
      );

      consoleSpy.mockRestore();
    });

    it("should handle cache size limits", async () => {
      // Mock a very large data response that will exceed 10MB
      const largeString = "x".repeat(100000); // 100KB string
      const largeIngredientsData = Array(200).fill({
        name: `Large Ingredient Name That Takes Up Space ${largeString}`,
        type: "grain",
        potential: 1.037,
        description: `A very long description that takes up significant storage space when serialized to JSON ${largeString}`,
      });

      (mockApiService.ingredients.getAll as jest.Mock).mockResolvedValue({
        data: largeIngredientsData,
      });
      mockAsyncStorage.getItem.mockResolvedValue(null);
      mockApiService.checkConnection.mockResolvedValue(true);

      const consoleSpy = jest.spyOn(console, "warn").mockImplementation();

      await OfflineCacheService.initializeCache();

      // Should warn about cache size
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringMatching(/Cache size .* bytes\) exceeds limit/)
      );

      consoleSpy.mockRestore();
    });

    it("should handle AsyncStorage save failures", async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);
      mockApiService.checkConnection.mockResolvedValue(true);
      mockAsyncStorage.setItem.mockRejectedValue(new Error("Storage full"));

      const consoleSpy = jest.spyOn(console, "error").mockImplementation();

      await expect(OfflineCacheService.initializeCache()).resolves.toBe(false);

      expect(consoleSpy).toHaveBeenCalledWith(
        "Failed to save cache to AsyncStorage:",
        expect.objectContaining({
          error: expect.any(Error),
          dataSize: expect.any(Number),
          cacheKey: "offline_cache_test",
        })
      );

      consoleSpy.mockRestore();
    });
  });

  describe("cache validation", () => {
    it("should reject cache with wrong version", async () => {
      const wrongVersionData = {
        ingredients: { grain: [], hop: [], yeast: [], other: [] },
        beerStyles: { styles: [] },
        metadata: { version: 0, lastUpdated: Date.now(), dataSize: 100 }, // Wrong version
      };

      mockAsyncStorage.getItem.mockResolvedValue(
        JSON.stringify(wrongVersionData)
      );
      mockApiService.checkConnection.mockResolvedValue(true);

      await OfflineCacheService.initializeCache();

      // Should fetch fresh data instead of using invalid cache
      expect(mockApiService.beerStyles.getAll).toHaveBeenCalled();
    });

    it("should handle malformed cached data", async () => {
      mockAsyncStorage.getItem.mockResolvedValue("invalid json");
      mockApiService.checkConnection.mockResolvedValue(true);

      const consoleSpy = jest.spyOn(console, "error").mockImplementation();

      await OfflineCacheService.initializeCache();

      // Should fetch fresh data when cache is malformed
      expect(mockApiService.beerStyles.getAll).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(
        "Failed to load cached data:",
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });
});
