/**
 * Tests for OfflineV2 Hooks Index
 *
 * Tests the main export index for offlineV2 hooks to ensure
 * all hooks are properly exported and accessible.
 */

describe("OfflineV2 Hooks Index", () => {
  it("should export static data hooks", async () => {
    const { useIngredients, useBeerStyles, useStaticData, useStaticDataCache } =
      await import("@hooks/offlineV2/index");

    expect(useIngredients).toBeDefined();
    expect(typeof useIngredients).toBe("function");

    expect(useBeerStyles).toBeDefined();
    expect(typeof useBeerStyles).toBe("function");

    expect(useStaticData).toBeDefined();
    expect(typeof useStaticData).toBe("function");

    expect(useStaticDataCache).toBeDefined();
    expect(typeof useStaticDataCache).toBe("function");
  });

  it("should export user data hooks", async () => {
    const { useRecipes, useBrewSessions } = await import(
      "@hooks/offlineV2/index"
    );

    expect(useRecipes).toBeDefined();
    expect(typeof useRecipes).toBe("function");

    expect(useBrewSessions).toBeDefined();
    expect(typeof useBrewSessions).toBe("function");
  });

  it("should export sync management hooks", async () => {
    const { useOfflineSync, useSyncStatus } = await import(
      "@hooks/offlineV2/index"
    );

    expect(useOfflineSync).toBeDefined();
    expect(typeof useOfflineSync).toBe("function");

    expect(useSyncStatus).toBeDefined();
    expect(typeof useSyncStatus).toBe("function");
  });

  it("should export startup hydration hook", async () => {
    const { useStartupHydration } = await import("@hooks/offlineV2/index");

    expect(useStartupHydration).toBeDefined();
    expect(typeof useStartupHydration).toBe("function");
  });
});
