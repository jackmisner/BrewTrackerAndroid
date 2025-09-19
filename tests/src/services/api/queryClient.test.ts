// Unmock React Query for this specific test
jest.unmock("@tanstack/react-query");
jest.unmock("@tanstack/query-async-storage-persister");

import { QueryClient } from "@tanstack/react-query";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import {
  queryClient,
  QUERY_KEYS,
  cacheUtils,
} from "@src/services/api/queryClient";

// Mock AsyncStorage
jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}));

// Mock the persister
jest.mock("@tanstack/query-async-storage-persister", () => ({
  createAsyncStoragePersister: jest.fn(),
}));

describe("queryClient", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("queryClient instance", () => {
    it("should be an instance of QueryClient", () => {
      expect(queryClient).toBeInstanceOf(QueryClient);
    });

    it("should have correct default query options", () => {
      const options = queryClient.getDefaultOptions();

      expect(options.queries?.staleTime).toBe(5 * 60 * 1000); // 5 minutes
      expect(options.queries?.gcTime).toBe(10 * 60 * 1000); // 10 minutes
      expect(options.queries?.retry).toBe(2);
      expect(options.queries?.refetchOnWindowFocus).toBe(false);
      expect(options.queries?.refetchOnReconnect).toBe(true);
      expect(options.queries?.refetchOnMount).toBe("always");
    });

    it("should have correct default mutation options", () => {
      const options = queryClient.getDefaultOptions();

      expect(options.mutations?.retry).toBe(1);
    });

    it("should have a query cache", () => {
      expect(queryClient.getQueryCache()).toBeDefined();
      expect(typeof queryClient.getQueryCache().find).toBe("function");
    });
  });

  describe("AsyncStorage persister setup", () => {
    it("should have the persister creation mocked", () => {
      // The persister is created during module initialization
      // We can verify that the mock function exists and is properly configured
      expect(createAsyncStoragePersister).toBeDefined();
      expect(jest.isMockFunction(createAsyncStoragePersister)).toBe(true);
    });
  });

  describe("QUERY_KEYS", () => {
    describe("auth keys", () => {
      it("should provide correct user profile key", () => {
        expect(QUERY_KEYS.USER_PROFILE).toEqual(["user", "profile"]);
      });

      it("should provide correct user settings key", () => {
        expect(QUERY_KEYS.USER_SETTINGS).toEqual(["user", "settings"]);
      });

      it("should provide correct verification status key", () => {
        expect(QUERY_KEYS.VERIFICATION_STATUS).toEqual([
          "user",
          "verification",
        ]);
      });
    });

    describe("recipe keys", () => {
      it("should provide correct recipes list key", () => {
        expect(QUERY_KEYS.RECIPES).toEqual(["recipes"]);
      });

      it("should provide correct individual recipe key", () => {
        expect(QUERY_KEYS.RECIPE("123")).toEqual(["recipes", "123"]);
      });

      it("should provide correct recipe metrics key", () => {
        expect(QUERY_KEYS.RECIPE_METRICS("123")).toEqual([
          "recipes",
          "123",
          "metrics",
        ]);
      });

      it("should provide correct recipe versions key", () => {
        expect(QUERY_KEYS.RECIPE_VERSIONS("123")).toEqual([
          "recipes",
          "123",
          "versions",
        ]);
      });

      it("should provide correct public recipes key", () => {
        expect(QUERY_KEYS.PUBLIC_RECIPES).toEqual(["recipes", "public"]);
      });

      it("should provide correct recipe search key", () => {
        expect(QUERY_KEYS.RECIPE_SEARCH("hop")).toEqual([
          "recipes",
          "search",
          "hop",
        ]);
      });
    });

    describe("ingredient keys", () => {
      it("should provide correct ingredients list key", () => {
        expect(QUERY_KEYS.INGREDIENTS).toEqual(["ingredients"]);
      });

      it("should provide correct individual ingredient key", () => {
        expect(QUERY_KEYS.INGREDIENT("456")).toEqual(["ingredients", "456"]);
      });

      it("should provide correct ingredient recipes key", () => {
        expect(QUERY_KEYS.INGREDIENT_RECIPES("456")).toEqual([
          "ingredients",
          "456",
          "recipes",
        ]);
      });
    });

    describe("beer style keys", () => {
      it("should provide correct beer styles list key", () => {
        expect(QUERY_KEYS.BEER_STYLES).toEqual(["beer-styles"]);
      });

      it("should provide correct individual beer style key", () => {
        expect(QUERY_KEYS.BEER_STYLE("1A")).toEqual(["beer-styles", "1A"]);
      });

      it("should provide correct style suggestions key", () => {
        expect(QUERY_KEYS.STYLE_SUGGESTIONS("recipe123")).toEqual([
          "beer-styles",
          "suggestions",
          "recipe123",
        ]);
      });

      it("should provide correct style analysis key", () => {
        expect(QUERY_KEYS.STYLE_ANALYSIS("recipe123")).toEqual([
          "beer-styles",
          "analysis",
          "recipe123",
        ]);
      });
    });

    describe("brew session keys", () => {
      it("should provide correct brew sessions list key", () => {
        expect(QUERY_KEYS.BREW_SESSIONS).toEqual(["brew-sessions"]);
      });

      it("should provide correct individual brew session key", () => {
        expect(QUERY_KEYS.BREW_SESSION("session123")).toEqual([
          "brew-sessions",
          "session123",
        ]);
      });

      it("should provide correct fermentation data key", () => {
        expect(QUERY_KEYS.FERMENTATION_DATA("session123")).toEqual([
          "brew-sessions",
          "session123",
          "fermentation",
        ]);
      });

      it("should provide correct fermentation stats key", () => {
        expect(QUERY_KEYS.FERMENTATION_STATS("session123")).toEqual([
          "brew-sessions",
          "session123",
          "stats",
        ]);
      });
    });

    describe("dashboard and AI keys", () => {
      it("should provide correct dashboard key", () => {
        expect(QUERY_KEYS.DASHBOARD).toEqual(["dashboard"]);
      });

      it("should provide correct AI health key", () => {
        expect(QUERY_KEYS.AI_HEALTH).toEqual(["ai", "health"]);
      });
    });

    describe("key consistency", () => {
      it("should return consistent static keys", () => {
        const key1 = QUERY_KEYS.RECIPES;
        const key2 = QUERY_KEYS.RECIPES;

        expect(key1).toEqual(key2);
        expect(key1).toBe(key2); // Same reference for static keys
      });

      it("should return new arrays for parametrized keys", () => {
        const key1 = QUERY_KEYS.RECIPE("123");
        const key2 = QUERY_KEYS.RECIPE("123");

        expect(key1).toEqual(key2);
        expect(key1).not.toBe(key2); // Different references
      });

      it("should handle different parameters correctly", () => {
        const key1 = QUERY_KEYS.RECIPE("123");
        const key2 = QUERY_KEYS.RECIPE("456");

        expect(key1).not.toEqual(key2);
        expect(key1[1]).toBe("123");
        expect(key2[1]).toBe("456");
      });
    });
  });

  describe("cacheUtils", () => {
    let mockInvalidateQueries: jest.SpyInstance;
    let mockClear: jest.SpyInstance;
    let mockRemoveQueries: jest.SpyInstance;
    let mockGetQueryCache: jest.SpyInstance;

    beforeEach(() => {
      mockInvalidateQueries = jest
        .spyOn(queryClient, "invalidateQueries")
        .mockImplementation();
      mockClear = jest.spyOn(queryClient, "clear").mockImplementation();
      mockRemoveQueries = jest
        .spyOn(queryClient, "removeQueries")
        .mockImplementation();
      mockGetQueryCache = jest.spyOn(queryClient, "getQueryCache");
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    describe("invalidateRecipes", () => {
      it("should invalidate all recipe queries", () => {
        cacheUtils.invalidateRecipes();

        expect(mockInvalidateQueries).toHaveBeenCalledWith({
          queryKey: QUERY_KEYS.RECIPES,
        });
      });
    });

    describe("invalidateRecipe", () => {
      it("should invalidate specific recipe queries", () => {
        cacheUtils.invalidateRecipe("123");

        expect(mockInvalidateQueries).toHaveBeenCalledWith({
          queryKey: QUERY_KEYS.RECIPE("123"),
        });
      });
    });

    describe("clearAll", () => {
      it("should clear all cached data", () => {
        cacheUtils.clearAll();

        expect(mockClear).toHaveBeenCalledWith();
      });
    });

    describe("removeStale", () => {
      it("should remove stale queries with default max age", () => {
        const mockQuery1 = {
          state: { dataUpdatedAt: Date.now() - 25 * 60 * 60 * 1000 }, // 25 hours ago
          queryKey: ["old", "query"],
        };
        const mockQuery2 = {
          state: { dataUpdatedAt: Date.now() - 1 * 60 * 60 * 1000 }, // 1 hour ago
          queryKey: ["fresh", "query"],
        };

        const mockQueryCache = {
          getAll: jest.fn().mockReturnValue([mockQuery1, mockQuery2]),
        };
        mockGetQueryCache.mockReturnValue(mockQueryCache);

        cacheUtils.removeStale();

        expect(mockRemoveQueries).toHaveBeenCalledWith({
          queryKey: ["old", "query"],
        });
        expect(mockRemoveQueries).not.toHaveBeenCalledWith({
          queryKey: ["fresh", "query"],
        });
      });

      it("should remove stale queries with custom max age", () => {
        const customMaxAge = 2 * 60 * 60 * 1000; // 2 hours
        const mockQuery = {
          state: { dataUpdatedAt: Date.now() - 3 * 60 * 60 * 1000 }, // 3 hours ago
          queryKey: ["stale", "query"],
        };

        const mockQueryCache = {
          getAll: jest.fn().mockReturnValue([mockQuery]),
        };
        mockGetQueryCache.mockReturnValue(mockQueryCache);

        cacheUtils.removeStale(customMaxAge);

        expect(mockRemoveQueries).toHaveBeenCalledWith({
          queryKey: ["stale", "query"],
        });
      });

      it("should not remove fresh queries", () => {
        const mockQuery = {
          state: { dataUpdatedAt: Date.now() - 1000 }, // 1 second ago
          queryKey: ["fresh", "query"],
        };

        const mockQueryCache = {
          getAll: jest.fn().mockReturnValue([mockQuery]),
        };
        mockGetQueryCache.mockReturnValue(mockQueryCache);

        cacheUtils.removeStale();

        expect(mockRemoveQueries).not.toHaveBeenCalled();
      });
    });

    describe("getCacheInfo", () => {
      it("should return correct cache information", () => {
        const mockQuery1 = {
          getObserversCount: jest.fn().mockReturnValue(2),
          isStale: jest.fn().mockReturnValue(false),
        };
        const mockQuery2 = {
          getObserversCount: jest.fn().mockReturnValue(0),
          isStale: jest.fn().mockReturnValue(true),
        };
        const mockQuery3 = {
          getObserversCount: jest.fn().mockReturnValue(1),
          isStale: jest.fn().mockReturnValue(false),
        };

        const mockQueryCache = {
          getAll: jest
            .fn()
            .mockReturnValue([mockQuery1, mockQuery2, mockQuery3]),
        };
        mockGetQueryCache.mockReturnValue(mockQueryCache);

        const info = cacheUtils.getCacheInfo();

        expect(info).toEqual({
          totalQueries: 3,
          activeQueries: 2,
          staleQueries: 1,
          freshQueries: 2,
        });
      });

      it("should handle empty cache", () => {
        const mockQueryCache = {
          getAll: jest.fn().mockReturnValue([]),
        };
        mockGetQueryCache.mockReturnValue(mockQueryCache);

        const info = cacheUtils.getCacheInfo();

        expect(info).toEqual({
          totalQueries: 0,
          activeQueries: 0,
          staleQueries: 0,
          freshQueries: 0,
        });
      });
    });
  });

  describe("module exports", () => {
    it("should export queryClient as default", () => {
      const defaultExport = require("@src/services/api/queryClient").default;
      expect(defaultExport).toBe(queryClient);
    });

    it("should export all required utilities", () => {
      expect(queryClient).toBeDefined();
      expect(QUERY_KEYS).toBeDefined();
      expect(cacheUtils).toBeDefined();
    });

    it("should have correct cacheUtils structure", () => {
      expect(typeof cacheUtils.invalidateRecipes).toBe("function");
      expect(typeof cacheUtils.invalidateRecipe).toBe("function");
      expect(typeof cacheUtils.clearAll).toBe("function");
      expect(typeof cacheUtils.removeStale).toBe("function");
      expect(typeof cacheUtils.getCacheInfo).toBe("function");
    });
  });

  describe("integration behavior", () => {
    it("should allow setting and getting data", () => {
      const testKey = ["test", "key"];
      const testData = { test: "data" };

      queryClient.setQueryData(testKey, testData);
      const retrievedData = queryClient.getQueryData(testKey);

      expect(retrievedData).toEqual(testData);
    });

    it("should handle query invalidation", () => {
      const testKey = ["test", "invalidation"];
      const testData = { test: "data" };

      queryClient.setQueryData(testKey, testData);
      queryClient.invalidateQueries({ queryKey: testKey });

      // Query should be marked as stale after invalidation
      const query = queryClient.getQueryCache().find({ queryKey: testKey });
      if (query) {
        expect(query.isStale()).toBe(true);
      }
    });

    it("should maintain query state across operations", () => {
      const testKey = QUERY_KEYS.RECIPE("test-recipe");
      const testData = { id: "test-recipe", name: "Test Recipe" };

      queryClient.setQueryData(testKey, testData);

      // Verify data is stored
      expect(queryClient.getQueryData(testKey)).toEqual(testData);

      // Verify cache info includes this query
      const initialInfo = cacheUtils.getCacheInfo();
      expect(initialInfo.totalQueries).toBeGreaterThan(0);

      // Clear and verify
      cacheUtils.clearAll();
      expect(queryClient.getQueryData(testKey)).toBeUndefined();
    });
  });
});
