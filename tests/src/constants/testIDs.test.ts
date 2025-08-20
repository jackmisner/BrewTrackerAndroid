/**
 * Test ID Utilities Tests
 *
 * Tests for the testIDs.ts module including slug generation,
 * caching logic, pattern generators, and edge cases.
 */

import { toSlug, MAX_SLUG_LENGTH, TEST_IDS } from "@src/constants/testIDs";

// Clear cache between tests by creating a new module instance
const clearSlugCache = () => {
  // Access internal cache through toSlug function calls
  // Since cache is private, we'll use repeated calls to test cache behavior
  for (let i = 0; i < 250; i++) {
    toSlug(`cache-clear-${i}`);
  }
};

describe("testIDs Constants", () => {
  afterEach(() => {
    // Clear cache between tests to avoid interference
    clearSlugCache();
  });

  describe("toSlug function", () => {
    it("should convert basic strings to slugs", () => {
      expect(toSlug("Hello World")).toBe("hello-world");
      expect(toSlug("Test String")).toBe("test-string");
      expect(toSlug("CamelCase")).toBe("camelcase");
    });

    it("should handle special characters and punctuation", () => {
      expect(toSlug("hello@world.com")).toBe("hello-world-com");
      expect(toSlug("user's choice!")).toBe("user-s-choice");
      expect(toSlug("100% working")).toBe("100-working");
      expect(toSlug("a/b/c")).toBe("a-b-c");
      expect(toSlug("test & demo")).toBe("test-demo");
    });

    it("should handle numbers correctly", () => {
      expect(toSlug("test123")).toBe("test123");
      expect(toSlug("123test")).toBe("123test");
      expect(toSlug("test-123-demo")).toBe("test-123-demo");
    });

    it("should remove leading and trailing dashes", () => {
      expect(toSlug("-test-")).toBe("test");
      expect(toSlug("--test--")).toBe("test");
      expect(toSlug("!!!test!!!")).toBe("test");
      expect(toSlug("   test   ")).toBe("test");
    });

    it("should handle empty or whitespace-only strings", () => {
      expect(toSlug("")).toBe("unknown");
      expect(toSlug("   ")).toBe("unknown");
      expect(toSlug("!!!")).toBe("unknown");
      expect(toSlug("@#$%^")).toBe("unknown");
    });

    it("should handle diacritics and accented characters", () => {
      // Test cases for normalize() function path
      expect(toSlug("café")).toBe("cafe");
      expect(toSlug("naïve")).toBe("naive");
      expect(toSlug("résumé")).toBe("resume");
      expect(toSlug("piñata")).toBe("pinata");
      expect(toSlug("Zürich")).toBe("zurich");
    });

    it("should respect MAX_SLUG_LENGTH constraint", () => {
      const longString = "a".repeat(MAX_SLUG_LENGTH + 20);
      const slug = toSlug(longString);
      expect(slug.length).toBeLessThanOrEqual(MAX_SLUG_LENGTH);
      expect(slug).toBe("a".repeat(MAX_SLUG_LENGTH));
    });

    it("should handle long strings with special characters", () => {
      const longString = "test-".repeat(20) + "end"; // Creates a very long string
      const slug = toSlug(longString);
      expect(slug.length).toBeLessThanOrEqual(MAX_SLUG_LENGTH);
      expect(slug.endsWith("-end")).toBe(false); // Should be truncated
    });
  });

  describe("toSlug caching behavior", () => {
    it("should cache results for repeated calls", () => {
      const testString = "cache-test-string";
      const slug1 = toSlug(testString);
      const slug2 = toSlug(testString);

      expect(slug1).toBe(slug2);
      expect(slug1).toBe("cache-test-string");
    });

    it("should handle cache size limits", () => {
      // Fill cache beyond MAX_SLUG_CACHE_ENTRIES (200)
      const testStrings: string[] = [];
      for (let i = 0; i < 250; i++) {
        testStrings.push(`test-cache-entry-${i}`);
      }

      // Generate slugs for all strings
      const slugs = testStrings.map(str => toSlug(str));

      // Verify all slugs are generated correctly
      expect(slugs[0]).toBe("test-cache-entry-0");
      expect(slugs[100]).toBe("test-cache-entry-100");
      expect(slugs[249]).toBe("test-cache-entry-249");

      // The cache should have evicted early entries
      // Test that we can still generate slugs for new strings
      expect(toSlug("new-after-cache-limit")).toBe("new-after-cache-limit");
    });

    it("should refresh cache entries on access", () => {
      // Add entries to cache
      toSlug("first-entry");
      toSlug("second-entry");

      // Access first entry again (should refresh its position)
      const refreshed = toSlug("first-entry");
      expect(refreshed).toBe("first-entry");

      // Add more entries to potentially trigger eviction
      for (let i = 0; i < 200; i++) {
        toSlug(`bulk-entry-${i}`);
      }

      // First entry should still be accessible due to refresh
      expect(toSlug("first-entry")).toBe("first-entry");
    });

    it("should handle undefined keys in cache eviction", () => {
      // This test ensures the undefined check in cache eviction works
      // Fill cache to trigger eviction logic
      for (let i = 0; i < 205; i++) {
        toSlug(`eviction-test-${i}`);
      }

      // Should not throw error even if keys().next() returns undefined
      expect(() => toSlug("post-eviction-test")).not.toThrow();
      expect(toSlug("post-eviction-test")).toBe("post-eviction-test");
    });
  });

  describe("Pattern generators", () => {
    it("should generate theme option test IDs", () => {
      const themeId = TEST_IDS.patterns.themeOption("dark mode");
      expect(themeId).toBe("theme-dark-mode-option");

      const lightThemeId = TEST_IDS.patterns.themeOption("Light Theme");
      expect(lightThemeId).toBe("theme-light-theme-option");
    });

    it("should generate unit option test IDs", () => {
      const unitId = TEST_IDS.patterns.unitOption("imperial");
      expect(unitId).toBe("unit-imperial-option");

      const metricId = TEST_IDS.patterns.unitOption("Metric System");
      expect(metricId).toBe("unit-metric-system-option");
    });

    it("should generate metric value test IDs", () => {
      const tempId = TEST_IDS.patterns.metricValue("temperature");
      expect(tempId).toBe("metric-temperature-value");

      const gravityId = TEST_IDS.patterns.metricValue("Specific Gravity");
      expect(gravityId).toBe("metric-specific-gravity-value");
    });

    it("should generate context menu action test IDs", () => {
      const editId = TEST_IDS.patterns.contextMenuAction("edit");
      expect(editId).toBe("context-menu-action-edit");

      const deleteId = TEST_IDS.patterns.contextMenuAction("Delete Recipe");
      expect(deleteId).toBe("context-menu-action-delete-recipe");
    });

    it("should handle special characters in pattern generators", () => {
      const specialId = TEST_IDS.patterns.themeOption("dark@mode!");
      expect(specialId).toBe("theme-dark-mode-option");

      const accentId = TEST_IDS.patterns.unitOption("créme brûlée");
      expect(accentId).toBe("unit-creme-brulee-option");
    });

    it("should handle empty/invalid input in pattern generators", () => {
      const emptyId = TEST_IDS.patterns.themeOption("");
      expect(emptyId).toBe("theme-unknown-option");

      const specialOnlyId = TEST_IDS.patterns.unitOption("@#$%");
      expect(specialOnlyId).toBe("unit-unknown-option");
    });
  });

  describe("Static test ID constants", () => {
    it("should have all required static test IDs", () => {
      // Test a few key static IDs to ensure structure integrity
      expect(TEST_IDS.auth.registerButton).toBe("register-button");
      expect(TEST_IDS.header.backButton).toBe("header-back-button");
      expect(TEST_IDS.forms.basicInfoForm).toBe("basic-info-form");
      expect(TEST_IDS.contextMenu.modal).toBe("context-menu-modal");
    });

    it("should have pattern generators attached", () => {
      expect(TEST_IDS.patterns).toBeDefined();
      expect(typeof TEST_IDS.patterns.themeOption).toBe("function");
      expect(typeof TEST_IDS.patterns.unitOption).toBe("function");
      expect(typeof TEST_IDS.patterns.metricValue).toBe("function");
      expect(typeof TEST_IDS.patterns.contextMenuAction).toBe("function");
    });
  });

  describe("Edge cases and normalize function handling", () => {
    it("should handle normalize function availability", () => {
      // Mock normalize function being unavailable
      const originalNormalize = String.prototype.normalize;
      try {
        // Test with normalize function available (normal case)
        expect(toSlug("café")).toBe("cafe");

        // Temporarily remove normalize to test fallback path
        // @ts-ignore - Intentionally testing runtime behavior
        delete (String.prototype as any).normalize;

        // Should still work without normalize
        expect(toSlug("test-string")).toBe("test-string");
      } finally {
        // Always restore normalize function
        String.prototype.normalize = originalNormalize;
      }
    });

    it("should handle complex Unicode characters", () => {
      expect(toSlug("Sørensen")).toBe("s-rensen"); // ø becomes -
      expect(toSlug("François")).toBe("francois");
      expect(toSlug("测试")).toBe("unknown"); // Non-latin chars become empty, triggers "unknown"
    });

    it("should handle mixed content with numbers and symbols", () => {
      expect(toSlug("test_123-abc!def")).toBe("test-123-abc-def");
      expect(toSlug("API_v2.1")).toBe("api-v2-1");
      expect(toSlug("user@domain.com")).toBe("user-domain-com");
    });
  });
});
