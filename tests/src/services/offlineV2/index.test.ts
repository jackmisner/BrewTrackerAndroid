/**
 * Tests for offlineV2 services index exports
 */

import { StaticDataService, UserCacheService } from "@services/offlineV2";

describe("OfflineV2 Services Index", () => {
  it("should export StaticDataService", () => {
    expect(StaticDataService).toBeDefined();
    expect(typeof StaticDataService).toBe("function");
  });

  it("should export UserCacheService", () => {
    expect(UserCacheService).toBeDefined();
    expect(typeof UserCacheService).toBe("function");
  });

  it("should export services with expected public methods", () => {
    // StaticDataService expected public methods
    expect(typeof StaticDataService.getIngredients).toBe("function");
    expect(typeof StaticDataService.getBeerStyles).toBe("function");
    expect(typeof StaticDataService.getCacheStats).toBe("function");
    expect(typeof StaticDataService.clearCache).toBe("function");

    // UserCacheService expected methods
    expect(typeof UserCacheService.getRecipes).toBe("function");
    expect(typeof UserCacheService.createRecipe).toBe("function");
    expect(typeof UserCacheService.updateRecipe).toBe("function");
    expect(typeof UserCacheService.deleteRecipe).toBe("function");
  });
});
