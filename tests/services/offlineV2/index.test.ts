/**
 * Tests for OfflineV2 Services Index
 *
 * Tests the main export index for offlineV2 services to ensure
 * all services are properly exported and accessible.
 */

describe("OfflineV2 Services Index", () => {
  it("should export StaticDataService", async () => {
    const { StaticDataService } = await import("@services/offlineV2/index");
    expect(StaticDataService).toBeDefined();
    expect(typeof StaticDataService).toBe("function");
  });

  it("should export UserCacheService", async () => {
    const { UserCacheService } = await import("@services/offlineV2/index");
    expect(UserCacheService).toBeDefined();
    expect(typeof UserCacheService).toBe("function");
  });

  it("should export both services in a single import", async () => {
    const { StaticDataService, UserCacheService } = await import(
      "@services/offlineV2/index"
    );
    expect(StaticDataService).toBeDefined();
    expect(UserCacheService).toBeDefined();
    expect(StaticDataService).not.toBe(UserCacheService);
  });
});
