/**
 * Tests for testIDs constants and patterns
 */

import { TEST_IDS } from "@src/constants/testIDs";

describe("TEST_IDS patterns", () => {
  describe("existing patterns", () => {
    it("should generate correct TouchableOpacity testIDs", () => {
      const testId = TEST_IDS.patterns.touchableOpacityAction("save");
      expect(testId).toBe("save-button");
    });

    it("should generate correct ScrollView testIDs", () => {
      const testId = TEST_IDS.patterns.scrollAction("recipe-list");
      expect(testId).toBe("recipe-list-scroll-view");
    });

    it("should generate correct theme option testIDs", () => {
      const testId = TEST_IDS.patterns.themeOption("dark");
      expect(testId).toBe("theme-dark-option");
    });
  });

  describe("new patterns", () => {
    it("should generate correct input field testIDs", () => {
      const testId = TEST_IDS.patterns.inputField("recipe-name");
      expect(testId).toBe("recipe-name-input");
    });

    it("should generate correct modal component testIDs", () => {
      const testId = TEST_IDS.patterns.modalComponent("context-menu");
      expect(testId).toBe("context-menu-modal");
    });

    it("should generate correct section container testIDs", () => {
      const testId = TEST_IDS.patterns.sectionContainer("ingredient-list");
      expect(testId).toBe("ingredient-list-section");
    });

    it("should generate correct icon element testIDs", () => {
      const testId = TEST_IDS.patterns.iconElement("warning");
      expect(testId).toBe("icon-warning");
    });
  });

  describe("pattern consistency", () => {
    it("should handle complex names with spaces and special chars", () => {
      const inputId = TEST_IDS.patterns.inputField("Recipe Name & Details");
      expect(inputId).toBe("recipe-name-details-input");
    });

    it("should handle empty strings gracefully", () => {
      const inputId = TEST_IDS.patterns.inputField("");
      expect(inputId).toBe("unknown-input");
    });

    it("should handle very long names by truncating", () => {
      const longName = "a".repeat(100);
      const inputId = TEST_IDS.patterns.inputField(longName);
      const expected = "a".repeat(80) + "-input"; // 80 + "-input" (86 total)
      expect(inputId).toBe(expected);
    });
  });

  describe("pattern consistency with common examples", () => {
    it("should generate consistent testIDs for common patterns", () => {
      // Verify patterns generate expected IDs for common use cases
      expect(TEST_IDS.patterns.inputField("gravity")).toBe("gravity-input");
      expect(TEST_IDS.patterns.iconElement("error-outline")).toBe(
        "icon-error-outline"
      );
      expect(TEST_IDS.patterns.sectionContainer("import-summary")).toBe(
        "import-summary-section"
      );
    });

    it("should maintain compatibility with BeerXML static testIDs", () => {
      expect(TEST_IDS.beerxml.selectFileButton).toBe(
        "beerxml-select-file-button"
      );
    });
  });
});
