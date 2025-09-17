/**
 * Tests for keyUtils utility functions
 *
 * Tests generation of stable, unique React keys for list items and ingredients
 */

import {
  generateIngredientKey,
  generateListItemKey,
} from "@src/utils/keyUtils";
import { RecipeIngredient } from "@src/types";

describe("keyUtils", () => {
  describe("generateIngredientKey", () => {
    const mockIngredient: RecipeIngredient = {
      id: "123",
      name: "Cascade Hops",
      type: "hop",
      amount: 1,
      unit: "oz",
    };

    it("should generate stable key for ingredient with ID (no index)", () => {
      const result = generateIngredientKey(mockIngredient, 0);
      expect(result).toBe("hop-123");
    });

    it("should include context in key when provided", () => {
      const result = generateIngredientKey(mockIngredient, 0, "Boil Addition");
      expect(result).toBe("boil-addition-hop-123");
    });

    it("should handle ingredient without type", () => {
      const ingredientNoType = { ...mockIngredient, type: undefined as any };
      const result = generateIngredientKey(ingredientNoType, 0);
      expect(result).toBe("unknown-123");
    });

    it("should handle ingredient without ID (fallback to name)", () => {
      const ingredientNoId = { ...mockIngredient, id: undefined as any };
      const result = generateIngredientKey(ingredientNoId, 2);
      expect(result).toBe("hop-name-cascade-hops");
    });

    it("should handle ingredient without ID or name (fallback to index)", () => {
      const ingredientNoIdOrName = {
        ...mockIngredient,
        id: undefined as any,
        name: undefined as any,
      };
      const result = generateIngredientKey(ingredientNoIdOrName, 5);
      expect(result).toBe("hop-index-5");
    });

    it("should handle context with spaces and special characters", () => {
      const result = generateIngredientKey(
        mockIngredient,
        0,
        "Dry Hop @ Fermentation"
      );
      expect(result).toBe("dry-hop-fermentation-hop-123");
    });

    it("should handle ingredient name with spaces and special characters", () => {
      const specialIngredient = {
        ...mockIngredient,
        id: undefined as any,
        name: "Crystal/Caramel 40L",
      };
      const result = generateIngredientKey(specialIngredient, 1);
      expect(result).toBe("hop-name-crystalcaramel-40l");
    });

    it("should slugify context with unicode characters", () => {
      const result = generateIngredientKey(mockIngredient, 0, "Côté français");
      expect(result).toBe("cote-francais-hop-123");
    });
  });

  describe("generateListItemKey", () => {
    const mockItem = {
      id: "456",
      name: "Test Item",
    };

    it("should generate stable key for item with ID (no index)", () => {
      const result = generateListItemKey(mockItem, 0);
      expect(result).toBe("456");
    });

    it("should include context in key when provided", () => {
      const result = generateListItemKey(mockItem, 0, "Recipe List");
      expect(result).toBe("recipe-list-456");
    });

    it("should handle item without ID (fallback to name)", () => {
      const itemNoId = { ...mockItem, id: undefined as any };
      const result = generateListItemKey(itemNoId, 3);
      expect(result).toBe("name-test-item");
    });

    it("should handle item without ID or name (fallback to index)", () => {
      const itemNoIdOrName = { id: undefined as any, name: undefined as any };
      const result = generateListItemKey(itemNoIdOrName, 7);
      expect(result).toBe("index-7");
    });

    it("should handle context with spaces and special characters", () => {
      const result = generateListItemKey(mockItem, 0, "Brew Session Items!");
      expect(result).toBe("brew-session-items-456");
    });

    it("should handle item name with spaces and special characters", () => {
      const specialItem = {
        id: undefined as any,
        name: "My Special Recipe #2",
      };
      const result = generateListItemKey(specialItem, 2);
      expect(result).toBe("name-my-special-recipe-2");
    });

    it("should handle empty string name (fallback to index)", () => {
      const emptyNameItem = { id: undefined as any, name: "" };
      const result = generateListItemKey(emptyNameItem, 4);
      expect(result).toBe("index-4");
    });

    it("should handle context with unicode characters", () => {
      const result = generateListItemKey(mockItem, 0, "Résumé français");
      expect(result).toBe("resume-francais-456");
    });

    it("should handle multiple consecutive spaces in context", () => {
      const result = generateListItemKey(
        mockItem,
        0,
        "Multiple   Spaces   Here"
      );
      expect(result).toBe("multiple-spaces-here-456");
    });

    it("should handle multiple consecutive dashes in slugification", () => {
      const result = generateListItemKey(mockItem, 0, "Test---With---Dashes");
      expect(result).toBe("test-with-dashes-456");
    });

    it("should prefer dedupeKey over item ID", () => {
      const result = generateListItemKey(
        mockItem,
        0,
        undefined,
        "custom-instance"
      );
      expect(result).toBe("custom-instance");
    });

    it("should use dedupeKey with context", () => {
      const result = generateListItemKey(
        mockItem,
        0,
        "Recipe List",
        "custom-key"
      );
      expect(result).toBe("recipe-list-custom-key");
    });

    it("should handle numeric dedupeKey", () => {
      const result = generateListItemKey(mockItem, 0, undefined, 123);
      expect(result).toBe("123");
    });
  });

  describe("edge cases", () => {
    it("should handle empty context string", () => {
      const mockIngredient: RecipeIngredient = {
        id: "123",
        name: "Test",
        type: "hop",
        amount: 1,
        unit: "oz",
      };
      const result = generateIngredientKey(mockIngredient, 0, "");
      expect(result).toBe("hop-123");
    });

    it("should handle context with only special characters", () => {
      const mockItem = { id: "789", name: "Test" };
      const result = generateListItemKey(mockItem, 0, "!@#$%^&*()");
      expect(result).toBe("789"); // Context becomes empty after slugification, so no prefix
    });

    it("should handle very long ingredient name", () => {
      const longNameIngredient: RecipeIngredient = {
        id: undefined as any,
        name: "This is a very long ingredient name that should be properly slugified and handled",
        type: "grain",
        amount: 5,
        unit: "lb",
      };
      const result = generateIngredientKey(longNameIngredient, 0);
      expect(result).toBe(
        "grain-name-this-is-a-very-long-ingredient-name-that-should-be-properly-slugified-and-handled"
      );
    });

    it("should generate same stable keys for duplicate ingredients with same ID", () => {
      // Same ingredient should have same stable key regardless of index
      const duplicateIngredient: RecipeIngredient = {
        id: "687a59172023723cb876bab3",
        name: "Grain Ingredient",
        type: "grain",
        amount: 1,
        unit: "lb",
      };

      // Same ingredient at different indexes should have same keys (stable)
      const key1 = generateIngredientKey(duplicateIngredient, 0);
      const key2 = generateIngredientKey(duplicateIngredient, 1);

      expect(key1).toBe("grain-687a59172023723cb876bab3");
      expect(key2).toBe("grain-687a59172023723cb876bab3");
      expect(key1).toBe(key2); // Same ingredient = same stable key
    });

    it("should use dedupeKey for unique instances of same ingredient", () => {
      // When we need unique keys for same ingredient, use dedupeKey
      const duplicateIngredient: RecipeIngredient = {
        id: "687a59172023723cb876bab3",
        name: "Grain Ingredient",
        type: "grain",
        amount: 1,
        unit: "lb",
      };

      const key1 = generateIngredientKey(
        duplicateIngredient,
        0,
        undefined,
        "instance-1"
      );
      const key2 = generateIngredientKey(
        duplicateIngredient,
        1,
        undefined,
        "instance-2"
      );

      expect(key1).toBe("grain-instance-1");
      expect(key2).toBe("grain-instance-2");
      expect(key1).not.toBe(key2); // Different dedupeKey = different keys
    });

    it("should prefer dedupeKey over ingredient ID", () => {
      const testIngredient: RecipeIngredient = {
        id: "456",
        name: "Test Ingredient",
        type: "hop",
        amount: 1,
        unit: "oz",
      };
      const result = generateIngredientKey(
        testIngredient,
        0,
        undefined,
        "custom-key"
      );
      expect(result).toBe("hop-custom-key");
    });
  });
});
