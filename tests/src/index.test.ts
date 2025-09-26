/**
 * Tests for index files to ensure exports work correctly
 */

describe("Index files", () => {
  it("imports from services/offlineV2/index", () => {
    const offlineV2Services = require("../../src/services/offlineV2/index");

    expect(offlineV2Services.StaticDataService).toBeDefined();
    expect(offlineV2Services.UserCacheService).toBeDefined();
  });

  it("imports from hooks/offlineV2/index", () => {
    const offlineV2Hooks = require("../../src/hooks/offlineV2/index");

    expect(offlineV2Hooks.useIngredients).toBeDefined();
    expect(offlineV2Hooks.useBeerStyles).toBeDefined();
    expect(offlineV2Hooks.useStaticData).toBeDefined();
    expect(offlineV2Hooks.useStaticDataCache).toBeDefined();
    expect(offlineV2Hooks.useRecipes).toBeDefined();
    expect(offlineV2Hooks.useBrewSessions).toBeDefined();
    expect(offlineV2Hooks.useOfflineSync).toBeDefined();
    expect(offlineV2Hooks.useSyncStatus).toBeDefined();
    expect(offlineV2Hooks.useStartupHydration).toBeDefined();
  });

  it("imports from types/index", () => {
    const types = require("../../src/types/index");

    // Just verify the module loads without errors
    expect(types).toBeDefined();
  });
});
