/**
 * Tests for updated keyUtils with stable instance-based keys
 */

import { generateIngredientKey } from "@src/utils/keyUtils";
import { RecipeIngredient } from "@src/types";

describe("keyUtils (updated implementation)", () => {
  describe("generateIngredientKey", () => {
    const mockIngredient: RecipeIngredient = {
      id: "123",
      name: "Cascade Hops",
      type: "hop",
      amount: 1,
      unit: "oz",
      instance_id: "ing_12345",
    };

    it("should generate stable key using type-id-instanceId format", () => {
      const result = generateIngredientKey(mockIngredient);
      expect(result).toBe("hop-123-ing_12345");
    });

    it("should handle ingredient without type", () => {
      const ingredientNoType = {
        ...mockIngredient,
        type: undefined as any,
      };
      const result = generateIngredientKey(ingredientNoType);
      expect(result).toBe("unknown-123-ing_12345");
    });

    it("should handle ingredient without ID", () => {
      const ingredientNoId = {
        ...mockIngredient,
        id: undefined as any,
      };
      const result = generateIngredientKey(ingredientNoId);
      expect(result).toBe("hop-unknown-ing_12345");
    });

    it("should generate stable key regardless of ingredient property changes", () => {
      const originalIngredient = mockIngredient;
      const modifiedIngredient = {
        ...mockIngredient,
        amount: 2, // Changed amount
        time: 30, // Changed time
        use: "dry-hop", // Changed use
      };

      const key1 = generateIngredientKey(originalIngredient);
      const key2 = generateIngredientKey(modifiedIngredient);

      // Keys should be identical because instance_id is the same
      expect(key1).toBe(key2);
      expect(key1).toBe("hop-123-ing_12345");
    });

    it("should generate unique keys for duplicate ingredients with different instance IDs", () => {
      // Same ingredient but with different instance IDs should have different keys
      const ingredient1: RecipeIngredient = {
        id: "687a59172023723cb876bab3",
        name: "Grain Ingredient",
        type: "grain",
        amount: 1,
        unit: "lb",
        instance_id: "ing_instance1",
      };

      const ingredient2: RecipeIngredient = {
        id: "687a59172023723cb876bab3", // Same ID
        name: "Grain Ingredient", // Same name
        type: "grain",
        amount: 2, // Different amount (but shouldn't affect key)
        unit: "lb",
        instance_id: "ing_instance2", // Different instance ID
      };

      const key1 = generateIngredientKey(ingredient1);
      const key2 = generateIngredientKey(ingredient2);

      expect(key1).toBe("grain-687a59172023723cb876bab3-ing_instance1");
      expect(key2).toBe("grain-687a59172023723cb876bab3-ing_instance2");
      expect(key1).not.toBe(key2); // Different instance IDs = different keys
    });

    it("should maintain key stability across multiple calls", () => {
      // Multiple calls with same ingredient should return identical key
      const key1 = generateIngredientKey(mockIngredient);
      const key2 = generateIngredientKey(mockIngredient);
      const key3 = generateIngredientKey(mockIngredient);

      expect(key1).toBe(key2);
      expect(key2).toBe(key3);
      expect(key1).toBe("hop-123-ing_12345");
    });

    it("should handle edge cases gracefully", () => {
      const edgeCaseIngredient: RecipeIngredient = {
        id: "",
        name: "",
        type: "other",
        amount: 0,
        unit: "g",
        instance_id: "ing_edge_case",
      };

      const result = generateIngredientKey(edgeCaseIngredient);
      expect(result).toBe("other-unknown-ing_edge_case");
    });
  });
});
