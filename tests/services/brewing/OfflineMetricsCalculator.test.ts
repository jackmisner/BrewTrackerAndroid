/**
 * Offline Metrics Calculator Tests
 *
 * Tests for brewing calculations without API dependency
 */

import { OfflineMetricsCalculator } from "@services/brewing/OfflineMetricsCalculator";
import { RecipeMetricsInput, RecipeIngredient } from "@src/types";

describe("OfflineMetricsCalculator", () => {
  describe("validateRecipeData", () => {
    const baseRecipe: RecipeMetricsInput = {
      batch_size: 5,
      batch_size_unit: "gal",
      efficiency: 75,
      boil_time: 60,
      mash_temp_unit: "F",
      mash_temperature: 152,
      ingredients: [
        {
          id: "1",
          name: "Pale Malt",
          type: "grain",
          amount: 10,
          unit: "lb",
        },
      ],
    };

    it("should validate valid recipe data", () => {
      const result = OfflineMetricsCalculator.validateRecipeData(baseRecipe);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should reject recipe with zero batch size", () => {
      const invalidRecipe = { ...baseRecipe, batch_size: 0 };
      const result = OfflineMetricsCalculator.validateRecipeData(invalidRecipe);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Batch size must be greater than 0");
    });

    it("should reject recipe with negative batch size", () => {
      const invalidRecipe = { ...baseRecipe, batch_size: -5 };
      const result = OfflineMetricsCalculator.validateRecipeData(invalidRecipe);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Batch size must be greater than 0");
    });

    it("should reject recipe with zero efficiency", () => {
      const invalidRecipe = { ...baseRecipe, efficiency: 0 };
      const result = OfflineMetricsCalculator.validateRecipeData(invalidRecipe);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Efficiency must be between 1 and 100");
    });

    it("should reject recipe with efficiency > 100", () => {
      const invalidRecipe = { ...baseRecipe, efficiency: 101 };
      const result = OfflineMetricsCalculator.validateRecipeData(invalidRecipe);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Efficiency must be between 1 and 100");
    });

    it("should reject recipe with negative boil time", () => {
      const invalidRecipe = { ...baseRecipe, boil_time: -10 };
      const result = OfflineMetricsCalculator.validateRecipeData(invalidRecipe);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Boil time must be zero or greater");
    });

    it("should accept recipe with zero boil time", () => {
      const validRecipe = { ...baseRecipe, boil_time: 0 };
      const result = OfflineMetricsCalculator.validateRecipeData(validRecipe);

      expect(result.isValid).toBe(true);
    });

    it("should reject recipe with no ingredients", () => {
      const invalidRecipe = { ...baseRecipe, ingredients: [] };
      const result = OfflineMetricsCalculator.validateRecipeData(invalidRecipe);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("At least one ingredient is required");
    });

    it("should reject recipe with no fermentables", () => {
      const invalidRecipe: RecipeMetricsInput = {
        ...baseRecipe,
        ingredients: [
          {
            id: "1",
            name: "Cascade Hops",
            type: "hop",
            amount: 1,
            unit: "oz",
          },
        ] as RecipeIngredient[],
      };
      const result = OfflineMetricsCalculator.validateRecipeData(invalidRecipe);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        "At least one fermentable (grain or sugar/extract) is required"
      );
    });

    it("should reject ingredient with negative amount", () => {
      const invalidRecipe: RecipeMetricsInput = {
        ...baseRecipe,
        ingredients: [
          {
            id: "1",
            name: "Pale Malt",
            type: "grain",
            amount: -5,
            unit: "lb",
          },
        ] as RecipeIngredient[],
      };
      const result = OfflineMetricsCalculator.validateRecipeData(invalidRecipe);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Pale Malt amount must be >= 0");
    });

    it("should reject hop with invalid alpha acid", () => {
      const invalidRecipe: RecipeMetricsInput = {
        ...baseRecipe,
        ingredients: [
          ...baseRecipe.ingredients,
          {
            id: "2",
            name: "Cascade",
            type: "hop",
            amount: 1,
            unit: "oz",
            alpha_acid: 35,
          },
        ] as RecipeIngredient[],
      };
      const result = OfflineMetricsCalculator.validateRecipeData(invalidRecipe);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        "Hop alpha acid must be between 0 and 30"
      );
    });

    it("should reject yeast with invalid attenuation", () => {
      const invalidRecipe: RecipeMetricsInput = {
        ...baseRecipe,
        ingredients: [
          ...baseRecipe.ingredients,
          {
            id: "3",
            name: "US-05",
            type: "yeast",
            amount: 1,
            unit: "pkg",
            attenuation: 150,
          },
        ] as RecipeIngredient[],
      };
      const result = OfflineMetricsCalculator.validateRecipeData(invalidRecipe);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        "Yeast attenuation must be between 0 and 100"
      );
    });
  });

  describe("calculateMetrics", () => {
    it("should calculate metrics for simple pale ale recipe", () => {
      const recipe: RecipeMetricsInput = {
        batch_size: 5,
        batch_size_unit: "gal",
        efficiency: 75,
        boil_time: 60,
        mash_temp_unit: "F",
        mash_temperature: 152,
        ingredients: [
          {
            id: "1",
            name: "Pale Malt",
            type: "grain",
            amount: 10,
            unit: "lb",
            potential: 37,
            color: 2,
          },
          {
            id: "2",
            name: "Cascade",
            type: "hop",
            amount: 1,
            unit: "oz",
            alpha_acid: 5.5,
            use: "boil",
            time: 60,
          },
          {
            id: "3",
            name: "US-05",
            type: "yeast",
            amount: 1,
            unit: "pkg",
            attenuation: 75,
          },
        ],
      };

      const metrics = OfflineMetricsCalculator.calculateMetrics(recipe);

      expect(metrics.og).toBeGreaterThan(1.0);
      expect(metrics.og).toBeLessThan(1.1);
      expect(metrics.fg).toBeGreaterThan(1.0);
      expect(metrics.fg).toBeLessThan(metrics.og);
      expect(metrics.abv).toBeGreaterThan(0);
      expect(metrics.ibu).toBeGreaterThan(0);
      expect(metrics.srm).toBeGreaterThan(0);
    });

    it("should return default metrics for invalid recipe", () => {
      const invalidRecipe: RecipeMetricsInput = {
        batch_size: 0,
        batch_size_unit: "gal",
        efficiency: 75,
        boil_time: 60,
        mash_temp_unit: "F",
        mash_temperature: 152,
        ingredients: [],
      };

      const metrics = OfflineMetricsCalculator.calculateMetrics(invalidRecipe);

      expect(metrics).toEqual({
        og: 1.0,
        fg: 1.0,
        abv: 0.0,
        ibu: 0.0,
        srm: 0.0,
      });
    });

    it("should handle metric units (liters)", () => {
      const recipe: RecipeMetricsInput = {
        batch_size: 20,
        batch_size_unit: "l",
        efficiency: 75,
        boil_time: 60,
        mash_temp_unit: "C",
        mash_temperature: 67,
        ingredients: [
          {
            id: "1",
            name: "Pale Malt",
            type: "grain",
            amount: 4.5,
            unit: "kg",
            potential: 37,
            color: 2,
          },
        ],
      };

      const metrics = OfflineMetricsCalculator.calculateMetrics(recipe);

      expect(metrics.og).toBeGreaterThan(1.0);
      expect(metrics.srm).toBeGreaterThan(0);
    });

    it("should calculate correct FG when no yeast is present (0% attenuation)", () => {
      const recipe: RecipeMetricsInput = {
        batch_size: 5,
        batch_size_unit: "gal",
        efficiency: 75,
        boil_time: 60,
        mash_temp_unit: "F",
        mash_temperature: 152,
        ingredients: [
          {
            id: "1",
            name: "Pale Malt",
            type: "grain",
            amount: 10,
            unit: "lb",
            potential: 37,
          },
        ],
      };

      const metrics = OfflineMetricsCalculator.calculateMetrics(recipe);

      // With no yeast, FG should equal OG (0% attenuation)
      expect(metrics.fg).toBe(metrics.og);
      expect(metrics.abv).toBe(0);
    });

    it("should skip dry hop additions in IBU calculation", () => {
      const recipe: RecipeMetricsInput = {
        batch_size: 5,
        batch_size_unit: "gal",
        efficiency: 75,
        boil_time: 60,
        mash_temp_unit: "F",
        mash_temperature: 152,
        ingredients: [
          {
            id: "1",
            name: "Pale Malt",
            type: "grain",
            amount: 10,
            unit: "lb",
            potential: 37,
          },
          {
            id: "2",
            name: "Cascade",
            type: "hop",
            amount: 2,
            unit: "oz",
            alpha_acid: 5.5,
            use: "dry-hop",
            time: 7,
          },
        ],
      };

      const metrics = OfflineMetricsCalculator.calculateMetrics(recipe);

      // Dry hops shouldn't contribute to IBU
      expect(metrics.ibu).toBe(0);
    });

    it("should handle whirlpool/flameout hops with specific time", () => {
      const recipe: RecipeMetricsInput = {
        batch_size: 5,
        batch_size_unit: "gal",
        efficiency: 75,
        boil_time: 60,
        mash_temp_unit: "F",
        mash_temperature: 152,
        ingredients: [
          {
            id: "1",
            name: "Pale Malt",
            type: "grain",
            amount: 10,
            unit: "lb",
            potential: 37,
          },
          {
            id: "2",
            name: "Cascade",
            type: "hop",
            amount: 1,
            unit: "oz",
            alpha_acid: 5.5,
            use: "whirlpool",
            time: 20,
          },
        ],
      };

      const metrics = OfflineMetricsCalculator.calculateMetrics(recipe);

      // Whirlpool hops with time should contribute some IBU
      expect(metrics.ibu).toBeGreaterThan(0);
    });

    it("should use default values for missing ingredient properties", () => {
      const recipe: RecipeMetricsInput = {
        batch_size: 5,
        batch_size_unit: "gal",
        efficiency: 75,
        boil_time: 60,
        mash_temp_unit: "F",
        mash_temperature: 152,
        ingredients: [
          {
            id: "1",
            name: "Pale Malt",
            type: "grain",
            amount: 10,
            unit: "lb",
            // Missing potential, color - should use defaults
          },
          {
            id: "2",
            name: "Cascade",
            type: "hop",
            amount: 1,
            unit: "oz",
            // Missing alpha_acid - should default to 5%
            use: "boil",
          },
        ],
      };

      const metrics = OfflineMetricsCalculator.calculateMetrics(recipe);

      expect(metrics.og).toBeGreaterThan(1.0);
      expect(metrics.ibu).toBeGreaterThan(0);
      expect(metrics.srm).toBeGreaterThan(0);
    });

    it("should round metrics to proper decimal places", () => {
      const recipe: RecipeMetricsInput = {
        batch_size: 5,
        batch_size_unit: "gal",
        efficiency: 75,
        boil_time: 60,
        mash_temp_unit: "F",
        mash_temperature: 152,
        ingredients: [
          {
            id: "1",
            name: "Pale Malt",
            type: "grain",
            amount: 10,
            unit: "lb",
            potential: 37,
            color: 2,
          },
          {
            id: "2",
            name: "Cascade",
            type: "hop",
            amount: 1,
            unit: "oz",
            alpha_acid: 5.5,
            use: "boil",
            time: 60,
          },
          {
            id: "3",
            name: "US-05",
            type: "yeast",
            amount: 1,
            unit: "pkg",
            attenuation: 75,
          },
        ],
      };

      const metrics = OfflineMetricsCalculator.calculateMetrics(recipe);

      // OG/FG should be 3 decimal places (e.g., 1.050)
      expect(metrics.og.toString().split(".")[1]?.length).toBeLessThanOrEqual(
        3
      );
      expect(metrics.fg.toString().split(".")[1]?.length).toBeLessThanOrEqual(
        3
      );

      // ABV, IBU, SRM should be 1 decimal place
      expect(metrics.abv.toString().split(".")[1]?.length).toBeLessThanOrEqual(
        1
      );
      expect(metrics.ibu.toString().split(".")[1]?.length).toBeLessThanOrEqual(
        1
      );
      expect(metrics.srm.toString().split(".")[1]?.length).toBeLessThanOrEqual(
        1
      );
    });

    it("should handle recipes with other fermentables (sugars/extracts)", () => {
      const recipe: RecipeMetricsInput = {
        batch_size: 5,
        batch_size_unit: "gal",
        efficiency: 75,
        boil_time: 60,
        mash_temp_unit: "F",
        mash_temperature: 152,
        ingredients: [
          {
            id: "1",
            name: "DME",
            type: "other",
            amount: 5,
            unit: "lb",
            potential: 42,
          },
        ],
      };

      const metrics = OfflineMetricsCalculator.calculateMetrics(recipe);

      expect(metrics.og).toBeGreaterThan(1.0);
      // SRM should be 2 (default for no grains)
      expect(metrics.srm).toBe(2);
    });

    it("should clamp SRM to valid range [1, 60]", () => {
      const darkRecipe: RecipeMetricsInput = {
        batch_size: 5,
        batch_size_unit: "gal",
        efficiency: 75,
        boil_time: 60,
        mash_temp_unit: "F",
        mash_temperature: 152,
        ingredients: [
          {
            id: "1",
            name: "Chocolate Malt",
            type: "grain",
            amount: 20,
            unit: "lb",
            potential: 35,
            color: 350, // Very dark
          },
        ],
      };

      const metrics = OfflineMetricsCalculator.calculateMetrics(darkRecipe);

      expect(metrics.srm).toBeLessThanOrEqual(60);
      expect(metrics.srm).toBeGreaterThanOrEqual(1);
    });

    it("should average attenuation when multiple yeasts are present", () => {
      const recipe: RecipeMetricsInput = {
        batch_size: 5,
        batch_size_unit: "gal",
        efficiency: 75,
        boil_time: 60,
        mash_temp_unit: "F",
        mash_temperature: 152,
        ingredients: [
          {
            id: "1",
            name: "Pale Malt",
            type: "grain",
            amount: 10,
            unit: "lb",
            potential: 37,
          },
          {
            id: "2",
            name: "US-05",
            type: "yeast",
            amount: 1,
            unit: "pkg",
            attenuation: 75,
          },
          {
            id: "3",
            name: "WLP001",
            type: "yeast",
            amount: 1,
            unit: "pkg",
            attenuation: 77,
          },
        ],
      };

      const metrics = OfflineMetricsCalculator.calculateMetrics(recipe);

      // Should use average attenuation (75 + 77) / 2 = 76
      expect(metrics.fg).toBeLessThan(metrics.og);
      expect(metrics.abv).toBeGreaterThan(0);
    });
  });
});
