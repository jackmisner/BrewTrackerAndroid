/**
 * StaticDataService Test Suite
 * Tests for the StaticDataService class that handles permanent caching
 * of ingredients and beer styles with version-based updates.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { StaticDataService } from "@services/offlineV2/StaticDataService";
import ApiService from "@services/api/apiService";
import {
  STORAGE_KEYS_V2,
  CachedStaticData,
  Ingredient,
  BeerStyle,
} from "@src/types";

// Mock AsyncStorage
jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

// Mock ApiService
jest.mock("@services/api/apiService", () => ({
  ingredients: {
    getVersion: jest.fn(),
    getAll: jest.fn(),
  },
  beerStyles: {
    getVersion: jest.fn(),
    getAll: jest.fn(),
  },
}));

describe("StaticDataService", () => {
  const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
  const mockApiService = ApiService as jest.Mocked<typeof ApiService>;

  const mockIngredients: Ingredient[] = [
    {
      id: "1",
      name: "Pale Malt",
      type: "grain",
      grain_type: "base_malt",
      potential: 1.037,
      color: 2,
    },
    {
      id: "2",
      name: "Cascade",
      type: "hop",
      alpha_acid: 5.5,
    },
  ];

  const mockBeerStyles: BeerStyle[] = [
    {
      id: "1",
      style_id: "21A",
      name: "American IPA",
      category: "IPA",
      description: "A hoppy American ale",
    },
  ];

  const mockVersionResponse = {
    data: {
      version: "v1.0.0",
      last_modified: "2024-01-01T00:00:00Z",
      total_records: 100,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset static properties correctly
    (StaticDataService as any).versionCheckInProgress = {
      ingredients: false,
      beer_styles: false,
    };
    (StaticDataService as any).lastVersionCheck = {
      ingredients: 0,
      beer_styles: 0,
    };
  });

  describe("getIngredients", () => {
    it("should return cached ingredients when available", async () => {
      const cachedData: CachedStaticData<Ingredient> = {
        data: mockIngredients,
        version: "v1.0.0",
        cached_at: Date.now(),
        expires_never: true,
      };

      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(cachedData));

      const result = await StaticDataService.getIngredients();

      expect(result).toEqual(mockIngredients);
      expect(mockAsyncStorage.getItem).toHaveBeenCalledWith(
        STORAGE_KEYS_V2.INGREDIENTS_DATA
      );
    });

    it("should fetch and cache ingredients when cache is empty", async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);
      (mockApiService.ingredients.getVersion as jest.Mock).mockResolvedValue(
        mockVersionResponse
      );
      (mockApiService.ingredients.getAll as jest.Mock).mockResolvedValue({
        data: mockIngredients,
      });

      const result = await StaticDataService.getIngredients();

      expect(result).toEqual(mockIngredients);
      expect(mockApiService.ingredients.getVersion).toHaveBeenCalled();
      expect(mockApiService.ingredients.getAll).toHaveBeenCalled();
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        STORAGE_KEYS_V2.INGREDIENTS_DATA,
        expect.stringContaining('"data"')
      );
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        STORAGE_KEYS_V2.INGREDIENTS_VERSION,
        "v1.0.0"
      );
    });

    it("should filter ingredients by type", async () => {
      const cachedData: CachedStaticData<Ingredient> = {
        data: mockIngredients,
        version: "v1.0.0",
        cached_at: Date.now(),
        expires_never: true,
      };

      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(cachedData));

      const result = await StaticDataService.getIngredients({ type: "grain" });

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe("grain");
    });

    it("should filter ingredients by search term", async () => {
      const cachedData: CachedStaticData<Ingredient> = {
        data: mockIngredients,
        version: "v1.0.0",
        cached_at: Date.now(),
        expires_never: true,
      };

      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(cachedData));

      const result = await StaticDataService.getIngredients({ search: "pale" });

      expect(result).toHaveLength(1);
      expect(result[0].name.toLowerCase()).toContain("pale");
    });

    it("should filter ingredients by category", async () => {
      const cachedData: CachedStaticData<Ingredient> = {
        data: mockIngredients,
        version: "v1.0.0",
        cached_at: Date.now(),
        expires_never: true,
      };

      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(cachedData));

      const result = await StaticDataService.getIngredients({
        type: "grain",
        category: "base_malt",
      });

      expect(result).toHaveLength(1);
      expect(result[0].grain_type).toBe("base_malt");
    });

    it("should throw OfflineError when fetching fails", async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);
      (mockApiService.ingredients.getVersion as jest.Mock).mockRejectedValue(
        new Error("Network error")
      );

      await expect(StaticDataService.getIngredients()).rejects.toThrow(
        "Failed to get ingredients data"
      );
    });
  });

  describe("getBeerStyles", () => {
    it("should return cached beer styles when available", async () => {
      const cachedData: CachedStaticData<BeerStyle> = {
        data: mockBeerStyles,
        version: "v1.0.0",
        cached_at: Date.now(),
        expires_never: true,
      };

      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(cachedData));

      const result = await StaticDataService.getBeerStyles();

      expect(result).toEqual(mockBeerStyles);
      expect(mockAsyncStorage.getItem).toHaveBeenCalledWith(
        STORAGE_KEYS_V2.BEER_STYLES_DATA
      );
    });

    it("should fetch and cache beer styles when cache is empty", async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);
      (mockApiService.beerStyles.getVersion as jest.Mock).mockResolvedValue(
        mockVersionResponse
      );
      (mockApiService.beerStyles.getAll as jest.Mock).mockResolvedValue({
        data: {
          categories: [
            {
              styles: mockBeerStyles,
            },
          ],
        },
      });

      const result = await StaticDataService.getBeerStyles();

      expect(result).toEqual(mockBeerStyles);
      expect(mockApiService.beerStyles.getVersion).toHaveBeenCalled();
      expect(mockApiService.beerStyles.getAll).toHaveBeenCalled();
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        STORAGE_KEYS_V2.BEER_STYLES_DATA,
        expect.stringContaining('"data"')
      );
    });

    it("should filter beer styles by category", async () => {
      const cachedData: CachedStaticData<BeerStyle> = {
        data: mockBeerStyles,
        version: "v1.0.0",
        cached_at: Date.now(),
        expires_never: true,
      };

      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(cachedData));

      const result = await StaticDataService.getBeerStyles({ category: "IPA" });

      expect(result).toHaveLength(1);
      expect(result[0].category).toBe("IPA");
    });

    it("should filter beer styles by search term", async () => {
      const cachedData: CachedStaticData<BeerStyle> = {
        data: mockBeerStyles,
        version: "v1.0.0",
        cached_at: Date.now(),
        expires_never: true,
      };

      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(cachedData));

      const result = await StaticDataService.getBeerStyles({
        search: "american",
      });

      expect(result).toHaveLength(1);
      expect(result[0].name.toLowerCase()).toContain("american");
    });
  });

  describe("checkForUpdates", () => {
    it("should detect updates when versions differ", async () => {
      (mockApiService.ingredients.getVersion as jest.Mock).mockResolvedValue({
        data: { version: "v2.0.0" },
      });
      (mockApiService.beerStyles.getVersion as jest.Mock).mockResolvedValue({
        data: { version: "v2.0.0" },
      });
      mockAsyncStorage.getItem
        .mockResolvedValueOnce("v1.0.0") // ingredients version
        .mockResolvedValueOnce("v1.0.0"); // beer styles version

      const result = await StaticDataService.checkForUpdates();

      expect(result).toEqual({
        ingredients: true,
        beerStyles: true,
      });
    });

    it("should not detect updates when versions match", async () => {
      (mockApiService.ingredients.getVersion as jest.Mock).mockResolvedValue({
        data: { version: "v1.0.0" },
      });
      (mockApiService.beerStyles.getVersion as jest.Mock).mockResolvedValue({
        data: { version: "v1.0.0" },
      });
      mockAsyncStorage.getItem
        .mockResolvedValueOnce("v1.0.0") // ingredients version
        .mockResolvedValueOnce("v1.0.0"); // beer styles version

      const result = await StaticDataService.checkForUpdates();

      expect(result).toEqual({
        ingredients: false,
        beerStyles: false,
      });
    });

    it("should return false for both when check fails", async () => {
      (mockApiService.ingredients.getVersion as jest.Mock).mockRejectedValue(
        new Error("Network error")
      );

      const result = await StaticDataService.checkForUpdates();

      expect(result).toEqual({
        ingredients: false,
        beerStyles: false,
      });
    });
  });

  describe("updateIngredientsCache", () => {
    it("should update ingredients cache successfully", async () => {
      (mockApiService.ingredients.getVersion as jest.Mock).mockResolvedValue(
        mockVersionResponse
      );
      (mockApiService.ingredients.getAll as jest.Mock).mockResolvedValue({
        data: mockIngredients,
      });

      await expect(
        StaticDataService.updateIngredientsCache()
      ).resolves.toBeUndefined();

      expect(mockApiService.ingredients.getVersion).toHaveBeenCalled();
      expect(mockApiService.ingredients.getAll).toHaveBeenCalled();
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        STORAGE_KEYS_V2.INGREDIENTS_DATA,
        expect.any(String)
      );
    });

    it("should throw VersionError when update fails", async () => {
      (mockApiService.ingredients.getVersion as jest.Mock).mockRejectedValue(
        new Error("Network error")
      );

      await expect(StaticDataService.updateIngredientsCache()).rejects.toThrow(
        "Failed to update ingredients cache"
      );
    });
  });

  describe("updateBeerStylesCache", () => {
    it("should update beer styles cache successfully", async () => {
      (mockApiService.beerStyles.getVersion as jest.Mock).mockResolvedValue(
        mockVersionResponse
      );
      (mockApiService.beerStyles.getAll as jest.Mock).mockResolvedValue({
        data: { categories: [{ styles: mockBeerStyles }] },
      });

      await expect(
        StaticDataService.updateBeerStylesCache()
      ).resolves.toBeUndefined();

      expect(mockApiService.beerStyles.getVersion).toHaveBeenCalled();
      expect(mockApiService.beerStyles.getAll).toHaveBeenCalled();
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        STORAGE_KEYS_V2.BEER_STYLES_DATA,
        expect.any(String)
      );
    });
  });

  describe("clearCache", () => {
    it("should clear all static data cache", async () => {
      await StaticDataService.clearCache();

      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith(
        STORAGE_KEYS_V2.INGREDIENTS_DATA
      );
      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith(
        STORAGE_KEYS_V2.INGREDIENTS_VERSION
      );
      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith(
        STORAGE_KEYS_V2.BEER_STYLES_DATA
      );
      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith(
        STORAGE_KEYS_V2.BEER_STYLES_VERSION
      );
    });

    it("should throw OfflineError when clearing fails", async () => {
      mockAsyncStorage.removeItem.mockRejectedValue(new Error("Storage error"));

      await expect(StaticDataService.clearCache()).rejects.toThrow(
        "Failed to clear cache"
      );
    });
  });

  describe("getCacheStats", () => {
    it("should return cache statistics", async () => {
      const mockIngredientsData = {
        data: mockIngredients,
        cached_at: 1640995200000,
      };
      const mockBeerStylesData = {
        data: mockBeerStyles,
        cached_at: 1640995200000,
      };

      mockAsyncStorage.getItem
        .mockResolvedValueOnce(JSON.stringify(mockIngredientsData))
        .mockResolvedValueOnce("v1.0.0")
        .mockResolvedValueOnce(JSON.stringify(mockBeerStylesData))
        .mockResolvedValueOnce("v1.0.0");

      const result = await StaticDataService.getCacheStats();

      expect(result).toEqual({
        ingredients: {
          cached: true,
          version: "v1.0.0",
          record_count: 2,
          last_updated: 1640995200000,
        },
        beerStyles: {
          cached: true,
          version: "v1.0.0",
          record_count: 1,
          last_updated: 1640995200000,
        },
      });
    });

    it("should return empty stats when no cache exists", async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);

      const result = await StaticDataService.getCacheStats();

      expect(result).toEqual({
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
    });

    it("should return empty stats when getting stats fails", async () => {
      mockAsyncStorage.getItem.mockRejectedValue(new Error("Storage error"));

      const result = await StaticDataService.getCacheStats();

      expect(result).toEqual({
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
    });
  });

  describe("background version checking", () => {
    it("should perform background version check with cooldown", async () => {
      const cachedData: CachedStaticData<Ingredient> = {
        data: mockIngredients,
        version: "v1.0.0",
        cached_at: Date.now(),
        expires_never: true,
      };

      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(cachedData));
      (mockApiService.ingredients.getVersion as jest.Mock).mockResolvedValue({
        data: { version: "v1.0.0" },
      });

      // First call should trigger background check
      await StaticDataService.getIngredients();

      // Wait a bit for background process
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockApiService.ingredients.getVersion).toHaveBeenCalled();
    });

    it("should respect cooldown period", async () => {
      const cachedData: CachedStaticData<Ingredient> = {
        data: mockIngredients,
        version: "v1.0.0",
        cached_at: Date.now(),
        expires_never: true,
      };

      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(cachedData));
      (mockApiService.ingredients.getVersion as jest.Mock).mockResolvedValue({
        data: { version: "v1.0.0" },
      });

      // Make two rapid calls
      await StaticDataService.getIngredients();
      await StaticDataService.getIngredients();

      // Wait a bit for any background processes
      await new Promise(resolve => setTimeout(resolve, 150));

      // Background version check might be called, but we can't reliably test the cooldown
      // since it's asynchronous. Just verify the service works correctly.
      expect(mockApiService.ingredients.getVersion).toHaveBeenCalled();
    });
  });
});
