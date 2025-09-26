/**
 * Tests for updated keyUtils with stable instance-based keys
 */

import {
  generateIngredientKey,
  generateListItemKey,
  generateUniqueId,
  generateIngredientInstanceId,
} from "@src/utils/keyUtils";
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
      expect(result).toBe("other--ing_edge_case");
    });

    it("should generate instance_id and modify ingredient when missing", () => {
      // Mock console.warn to capture the warning
      const consoleSpy = jest
        .spyOn(console, "warn")
        .mockImplementation(() => {});

      const ingredientWithoutInstanceId = {
        id: "123",
        name: "Test Ingredient",
        type: "hop",
        amount: 1,
        unit: "oz",
        // instance_id is missing
      } as RecipeIngredient;

      const result = generateIngredientKey(ingredientWithoutInstanceId);

      // Should generate and assign instance_id
      expect(ingredientWithoutInstanceId.instance_id).toBeDefined();
      expect(ingredientWithoutInstanceId.instance_id).toMatch(/^ing_/);
      expect(result).toBe(`hop-123-${ingredientWithoutInstanceId.instance_id}`);

      // Should warn in non-production environment
      expect(consoleSpy).toHaveBeenCalledWith(
        `Ingredient missing instance_id; generated one: ${ingredientWithoutInstanceId.name}`
      );

      consoleSpy.mockRestore();
    });
  });

  describe("generateListItemKey", () => {
    it("should generate key using dedupeKey when provided", () => {
      const item = { id: "test-id", name: "Test Item" };
      const result = generateListItemKey(item, 0, undefined, "dedupe-123");
      expect(result).toBe("dedupe-123");
    });

    it("should generate key using item.id when dedupeKey not provided", () => {
      const item = { id: "test-id", name: "Test Item" };
      const result = generateListItemKey(item, 0);
      expect(result).toBe("test-id");
    });

    it("should generate key using item.name when id not available", () => {
      const item = { name: "Test Item Name" };
      const result = generateListItemKey(item, 0);
      expect(result).toBe("name-test-item-name");
    });

    it("should fall back to index when no stable identifier available", () => {
      const item = {};
      const result = generateListItemKey(item, 5);
      expect(result).toBe("index-5");
    });

    it("should include context prefix when provided", () => {
      const item = { id: "test-id" };
      const result = generateListItemKey(item, 0, "recipe ingredients");
      expect(result).toBe("recipe-ingredients-test-id");
    });

    it("should handle special characters in context", () => {
      const item = { id: "test-id" };
      const result = generateListItemKey(item, 0, "Recipe & Ingredients!");
      expect(result).toBe("recipe-ingredients-test-id");
    });

    it("should prefer dedupeKey over id", () => {
      const item = { id: "test-id", name: "Test Item" };
      const result = generateListItemKey(item, 0, "context", "dedupe-key");
      expect(result).toBe("context-dedupe-key");
    });

    it("should handle empty string name", () => {
      const item = { name: "" };
      const result = generateListItemKey(item, 2);
      expect(result).toBe("index-2");
    });

    it("should handle null dedupeKey", () => {
      const item = { id: "test-id" };
      const result = generateListItemKey(item, 0, undefined, null as any);
      expect(result).toBe("test-id");
    });

    it("should handle numeric dedupeKey", () => {
      const item = { id: "test-id" };
      const result = generateListItemKey(item, 0, "context", 42);
      expect(result).toBe("context-42");
    });
  });

  describe("generateUniqueId", () => {
    beforeEach(() => {
      // Reset global crypto mock if needed
      jest.clearAllMocks();
    });

    it("should use crypto.randomUUID when available", () => {
      const mockUUID = "550e8400-e29b-41d4-a716-446655440000";
      const mockCrypto = {
        randomUUID: jest.fn().mockReturnValue(mockUUID),
      };

      // Mock globalThis.crypto
      Object.defineProperty(globalThis, "crypto", {
        value: mockCrypto,
        writable: true,
        configurable: true,
      });

      const result = generateUniqueId();
      expect(result).toBe(mockUUID);
      expect(mockCrypto.randomUUID).toHaveBeenCalledTimes(1);
    });

    it("should include prefix when using crypto.randomUUID", () => {
      const mockUUID = "550e8400-e29b-41d4-a716-446655440000";
      const mockCrypto = {
        randomUUID: jest.fn().mockReturnValue(mockUUID),
      };

      Object.defineProperty(globalThis, "crypto", {
        value: mockCrypto,
        writable: true,
        configurable: true,
      });

      const result = generateUniqueId("test");
      expect(result).toBe(`test_${mockUUID}`);
    });

    it("should fall back to timestamp method when crypto.randomUUID unavailable", () => {
      // Mock environment without crypto.randomUUID
      Object.defineProperty(globalThis, "crypto", {
        value: undefined,
        writable: true,
        configurable: true,
      });

      const mockTime = 1640995200000; // Fixed timestamp
      jest.spyOn(Date, "now").mockReturnValue(mockTime);
      jest.spyOn(Math, "random").mockReturnValue(0.123456789);

      const result = generateUniqueId();

      // Should contain timestamp, counter, and random component
      expect(result).toMatch(/^\d+_\d+_[a-z0-9]+$/);
      expect(result).toContain(mockTime.toString());

      // Cleanup
      jest.restoreAllMocks();
    });

    it("should include prefix with fallback method", () => {
      Object.defineProperty(globalThis, "crypto", {
        value: undefined,
        writable: true,
        configurable: true,
      });

      const result = generateUniqueId("prefix");
      expect(result).toMatch(/^prefix_\d+_\d+_[a-z0-9]+$/);
    });

    it("should generate different IDs on subsequent calls", () => {
      Object.defineProperty(globalThis, "crypto", {
        value: undefined,
        writable: true,
        configurable: true,
      });

      const id1 = generateUniqueId();
      const id2 = generateUniqueId();
      expect(id1).not.toBe(id2);
    });
  });

  describe("generateIngredientInstanceId", () => {
    it("should generate ID with 'ing' prefix", () => {
      const result = generateIngredientInstanceId();
      expect(result).toMatch(/^ing_/);
    });

    it("should generate unique IDs on subsequent calls", () => {
      const id1 = generateIngredientInstanceId();
      const id2 = generateIngredientInstanceId();
      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^ing_/);
      expect(id2).toMatch(/^ing_/);
    });
  });
});
