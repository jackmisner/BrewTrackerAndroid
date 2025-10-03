/**
 * recipeUtils Test Suite
 *
 * Comprehensive tests for recipe utility functions including:
 * - Temporary ID detection
 * - Dry-hop ingredient identification with format normalization
 * - Dry-hop extraction and transformation
 */

import {
  isTempId,
  isDryHopIngredient,
  getDryHopsFromRecipe,
} from "@src/utils/recipeUtils";
import { RecipeIngredient } from "@src/types/recipe";

describe("recipeUtils", () => {
  describe("isTempId", () => {
    it("should return true for temporary IDs starting with temp_", () => {
      expect(isTempId("temp_123")).toBe(true);
      expect(isTempId("temp_abc")).toBe(true);
      expect(isTempId("temp_recipe_456")).toBe(true);
    });

    it("should return false for permanent IDs", () => {
      expect(isTempId("123")).toBe(false);
      expect(isTempId("abc-def-ghi")).toBe(false);
      expect(isTempId("uuid-v4-id")).toBe(false);
    });

    it("should return false for null or undefined", () => {
      expect(isTempId(null)).toBe(false);
      expect(isTempId(undefined)).toBe(false);
    });

    it("should return false for empty string", () => {
      expect(isTempId("")).toBe(false);
    });

    it("should return false for IDs containing but not starting with temp_", () => {
      expect(isTempId("not_temp_123")).toBe(false);
      expect(isTempId("123_temp_")).toBe(false);
    });
  });

  describe("isDryHopIngredient", () => {
    const createHopIngredient = (use: string): RecipeIngredient => ({
      id: "hop-1",
      name: "Cascade",
      type: "hop",
      use,
      amount: 1,
      unit: "oz",
      time: 7, // days for dry-hop
      instance_id: "mock-uuid-hop-1",
    });

    const createGrainIngredient = (): RecipeIngredient => ({
      id: "grain-1",
      name: "Pale Malt",
      type: "grain",
      use: "mash",
      amount: 10,
      unit: "lb",
      instance_id: "mock-uuid-grain-1",
    });

    describe("should identify dry-hop ingredients with various formats", () => {
      it("should recognize standard dry_hop format", () => {
        expect(isDryHopIngredient(createHopIngredient("dry_hop"))).toBe(true);
      });

      it("should recognize dry-hop format with hyphen", () => {
        expect(isDryHopIngredient(createHopIngredient("dry-hop"))).toBe(true);
      });

      it("should recognize dry hop format with space", () => {
        expect(isDryHopIngredient(createHopIngredient("dry hop"))).toBe(true);
      });

      it("should recognize uppercase DRY_HOP format", () => {
        expect(isDryHopIngredient(createHopIngredient("DRY_HOP"))).toBe(true);
      });

      it("should recognize mixed case Dry-Hop format", () => {
        expect(isDryHopIngredient(createHopIngredient("Dry-Hop"))).toBe(true);
      });
    });

    describe("should reject non-dry-hop ingredients", () => {
      it("should return false for boil hops", () => {
        expect(isDryHopIngredient(createHopIngredient("boil"))).toBe(false);
      });

      it("should return false for aroma hops", () => {
        expect(isDryHopIngredient(createHopIngredient("aroma"))).toBe(false);
      });

      it("should return false for first wort hops", () => {
        expect(isDryHopIngredient(createHopIngredient("first_wort"))).toBe(
          false
        );
      });

      it("should return false for mash hops", () => {
        expect(isDryHopIngredient(createHopIngredient("mash"))).toBe(false);
      });

      it("should return false for non-hop ingredients", () => {
        expect(isDryHopIngredient(createGrainIngredient())).toBe(false);
      });

      it("should return false for hops with undefined use", () => {
        const hop: RecipeIngredient = {
          id: "hop-1",
          name: "Cascade",
          type: "hop",
          use: undefined,
          amount: 1,
          unit: "oz",
          instance_id: "mock-uuid-hop-1",
        };
        expect(isDryHopIngredient(hop)).toBe(false);
      });

      it("should return false for hops with empty string use", () => {
        expect(isDryHopIngredient(createHopIngredient(""))).toBe(false);
      });
    });
  });

  describe("getDryHopsFromRecipe", () => {
    it("should extract dry-hop ingredients and transform them", () => {
      const ingredients: RecipeIngredient[] = [
        {
          id: "hop-1",
          name: "Cascade",
          type: "hop",
          use: "dry_hop",
          hop_type: "Pellet",
          amount: 2,
          unit: "oz",
          time: 10080, // 7 days in minutes (7 * 1440)
          instance_id: "mock-uuid-hop-1",
        },
        {
          id: "hop-2",
          name: "Citra",
          type: "hop",
          use: "dry-hop",
          hop_type: "Whole",
          amount: 1.5,
          unit: "oz",
          time: 7200, // 5 days in minutes (5 * 1440)
          instance_id: "mock-uuid-hop-2",
        },
        {
          id: "hop-3",
          name: "Centennial",
          type: "hop",
          use: "boil",
          amount: 1,
          unit: "oz",
          time: 60,
          instance_id: "mock-uuid-hop-3",
        },
      ];

      const result = getDryHopsFromRecipe(ingredients);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        hop_name: "Cascade",
        hop_type: "Pellet",
        amount: 2,
        amount_unit: "oz",
        duration_days: 7,
        phase: "primary",
        recipe_instance_id: "mock-uuid-hop-1",
      });
      expect(result[1]).toEqual({
        hop_name: "Citra",
        hop_type: "Whole",
        amount: 1.5,
        amount_unit: "oz",
        duration_days: 5,
        phase: "primary",
        recipe_instance_id: "mock-uuid-hop-2",
      });
    });

    it("should return empty array when no dry-hops present", () => {
      const ingredients: RecipeIngredient[] = [
        {
          id: "hop-1",
          name: "Magnum",
          type: "hop",
          use: "boil",
          amount: 1,
          unit: "oz",
          time: 60,
          instance_id: "mock-uuid-hop-1",
        },
        {
          id: "grain-1",
          name: "Pale Malt",
          type: "grain",
          use: "mash",
          amount: 10,
          unit: "lb",
          instance_id: "mock-uuid-grain-1",
        },
      ];

      const result = getDryHopsFromRecipe(ingredients);
      expect(result).toEqual([]);
    });

    it("should return empty array for empty ingredient list", () => {
      const result = getDryHopsFromRecipe([]);
      expect(result).toEqual([]);
    });

    it("should handle dry-hops with various format variations", () => {
      const ingredients: RecipeIngredient[] = [
        {
          id: "hop-1",
          name: "Cascade",
          type: "hop",
          use: "dry_hop",
          amount: 1,
          unit: "oz",
          time: 7,
          instance_id: "mock-uuid-hop-1",
        },
        {
          id: "hop-2",
          name: "Citra",
          type: "hop",
          use: "dry-hop",
          amount: 1,
          unit: "oz",
          time: 5,
          instance_id: "mock-uuid-hop-2",
        },
        {
          id: "hop-3",
          name: "Mosaic",
          type: "hop",
          use: "dry hop",
          amount: 1,
          unit: "oz",
          time: 3,
          instance_id: "mock-uuid-hop-3",
        },
        {
          id: "hop-4",
          name: "Simcoe",
          type: "hop",
          use: "DRY_HOP",
          amount: 1,
          unit: "oz",
          time: 7,
          instance_id: "mock-uuid-hop-4",
        },
      ];

      const result = getDryHopsFromRecipe(ingredients);
      expect(result).toHaveLength(4);
      expect(result.map(h => h.hop_name)).toEqual([
        "Cascade",
        "Citra",
        "Mosaic",
        "Simcoe",
      ]);
    });

    it("should handle dry-hops without hop_type field", () => {
      const ingredients: RecipeIngredient[] = [
        {
          id: "hop-1",
          name: "Cascade",
          type: "hop",
          use: "dry_hop",
          amount: 2,
          unit: "oz",
          time: 7,
          instance_id: "mock-uuid-hop-1",
        },
      ];

      const result = getDryHopsFromRecipe(ingredients);
      expect(result).toHaveLength(1);
      expect(result[0].hop_type).toBeUndefined();
    });

    it("should handle dry-hops without time field", () => {
      const ingredients: RecipeIngredient[] = [
        {
          id: "hop-1",
          name: "Cascade",
          type: "hop",
          use: "dry_hop",
          amount: 2,
          unit: "oz",
          instance_id: "mock-uuid-hop-1",
        },
      ];

      const result = getDryHopsFromRecipe(ingredients);
      expect(result).toHaveLength(1);
      expect(result[0].duration_days).toBeUndefined();
    });

    it("should always set phase to primary for all dry-hops", () => {
      const ingredients: RecipeIngredient[] = [
        {
          id: "hop-1",
          name: "Cascade",
          type: "hop",
          use: "dry_hop",
          amount: 1,
          unit: "oz",
          time: 7,
          instance_id: "mock-uuid-hop-1",
        },
        {
          id: "hop-2",
          name: "Citra",
          type: "hop",
          use: "dry-hop",
          amount: 1,
          unit: "oz",
          time: 5,
          instance_id: "mock-uuid-hop-2",
        },
      ];

      const result = getDryHopsFromRecipe(ingredients);
      expect(result.every(h => h.phase === "primary")).toBe(true);
    });

    it("should handle mixed ingredient types correctly", () => {
      const ingredients: RecipeIngredient[] = [
        {
          id: "grain-1",
          name: "Pale Malt",
          type: "grain",
          use: "mash",
          amount: 10,
          unit: "lb",
          instance_id: "mock-uuid-grain-1",
        },
        {
          id: "hop-1",
          name: "Cascade",
          type: "hop",
          use: "dry_hop",
          amount: 2,
          unit: "oz",
          time: 7,
          instance_id: "mock-uuid-hop-1",
        },
        {
          id: "yeast-1",
          name: "US-05",
          type: "yeast",
          use: "primary",
          amount: 1,
          unit: "pkg",
          instance_id: "mock-uuid-yeast-1",
        },
        {
          id: "hop-2",
          name: "Citra",
          type: "hop",
          use: "boil",
          amount: 1,
          unit: "oz",
          time: 60,
          instance_id: "mock-uuid-hop-2",
        },
      ];

      const result = getDryHopsFromRecipe(ingredients);
      expect(result).toHaveLength(1);
      expect(result[0].hop_name).toBe("Cascade");
    });
  });
});
