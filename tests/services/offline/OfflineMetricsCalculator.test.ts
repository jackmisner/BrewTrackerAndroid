/**
 * Tests for OfflineMetricsCalculator
 *
 * Tests offline brewing calculations including:
 * - Original Gravity (OG) calculation
 * - Final Gravity (FG) calculation with yeast attenuation
 * - Alcohol By Volume (ABV) calculation
 * - International Bitterness Units (IBU) with hop utilization
 * - Standard Reference Method (SRM) color calculation
 * - Unit conversion and validation
 */

import { OfflineMetricsCalculator } from "@services/offline/OfflineMetricsCalculator";
import { RecipeIngredient, RecipeMetrics } from "@src/types";

describe("OfflineMetricsCalculator", () => {
  describe("calculateMetrics", () => {
    it("should calculate basic recipe metrics correctly", () => {
      const params = {
        batch_size: 5,
        batch_size_unit: "gallon",
        efficiency: 75,
        boil_time: 60,
        ingredients: [
          {
            name: "Pale Malt",
            type: "grain" as const,
            amount: 10,
            unit: "lb",
            potential: 1.037,
          },
          {
            name: "Cascade",
            type: "hop" as const,
            amount: 1,
            unit: "oz",
            alpha_acid: 5.5,
            time: 60,
            use: "boil",
          },
          {
            name: "US-05",
            type: "yeast" as const,
            amount: 1,
            unit: "package",
            attenuation: 77,
          },
        ] as RecipeIngredient[],
      };

      const result = OfflineMetricsCalculator.calculateMetrics(params);

      expect(result.og).toBeGreaterThan(1.0);
      expect(result.og).toBeLessThan(1.1);
      expect(result.fg).toBeGreaterThan(1.0);
      expect(result.fg).toBeLessThan(result.og);
      expect(result.abv).toBeGreaterThan(0);
      expect(result.ibu).toBeGreaterThan(0);
      expect(result.srm).toBeGreaterThan(0);

      // Check precision
      expect(result.og.toString()).toMatch(/^\d+\.\d{3}$/);
      expect(result.fg.toString()).toMatch(/^\d+\.\d{3}$/);
      expect(result.abv.toString()).toMatch(/^\d+\.\d{1}$/);
      expect(result.ibu.toString()).toMatch(/^\d+$/);
      expect(result.srm.toString()).toMatch(/^\d+\.?\d{0,1}$/);
    });

    it("should handle metric units", () => {
      const params = {
        batch_size: 20,
        batch_size_unit: "liter",
        efficiency: 80,
        ingredients: [
          {
            name: "Pilsner Malt",
            type: "grain" as const,
            amount: 4,
            unit: "kg",
            potential: 1.037,
          },
          {
            name: "Hallertau",
            type: "hop" as const,
            amount: 30,
            unit: "g",
            alpha_acid: 4.5,
            time: 60,
          },
        ] as RecipeIngredient[],
      };

      const result = OfflineMetricsCalculator.calculateMetrics(params);

      expect(result.og).toBeGreaterThan(1.0);
      expect(result.ibu).toBeGreaterThan(0);
    });

    it("should handle recipes without hops", () => {
      const params = {
        batch_size: 5,
        batch_size_unit: "gallon",
        efficiency: 75,
        ingredients: [
          {
            name: "Pale Malt",
            type: "grain" as const,
            amount: 8,
            unit: "lb",
            potential: 1.037,
          },
        ] as RecipeIngredient[],
      };

      const result = OfflineMetricsCalculator.calculateMetrics(params);

      expect(result.og).toBeGreaterThan(1.0);
      expect(result.ibu).toBe(0);
    });

    it("should handle recipes without yeast (use default attenuation)", () => {
      const params = {
        batch_size: 5,
        batch_size_unit: "gallon",
        efficiency: 75,
        ingredients: [
          {
            name: "Pale Malt",
            type: "grain" as const,
            amount: 8,
            unit: "lb",
            potential: 1.037,
          },
        ] as RecipeIngredient[],
      };

      const result = OfflineMetricsCalculator.calculateMetrics(params);

      expect(result.fg).toBeLessThan(result.og);
      expect(result.abv).toBeGreaterThan(0);
    });
  });

  describe("unit conversions", () => {
    it("should convert pounds to kg correctly", () => {
      const params = {
        batch_size: 5,
        batch_size_unit: "gallon",
        efficiency: 75,
        ingredients: [
          {
            name: "Pale Malt",
            type: "grain" as const,
            amount: 2.2, // Should be ~1kg
            unit: "lb",
            potential: 1.037,
          },
        ] as RecipeIngredient[],
      };

      const result = OfflineMetricsCalculator.calculateMetrics(params);
      expect(result.og).toBeGreaterThan(1.0);
    });

    it("should handle various unit aliases", () => {
      const params = {
        batch_size: 5,
        batch_size_unit: "gallon",
        efficiency: 75,
        ingredients: [
          {
            id: "1",
            name: "Pale Malt",
            type: "grain" as const,
            amount: 8,
            unit: "lbs", // Plural form
            potential: 1.037,
          },
          {
            id: "2",
            name: "Munich Malt",
            type: "grain" as const,
            amount: 16,
            unit: "ounces",
            potential: 1.037,
          },
          {
            id: "3",
            name: "Crystal 60",
            type: "grain" as const,
            amount: 500,
            unit: "grams",
            potential: 1.034,
          },
        ] as unknown as RecipeIngredient[],
      };

      const result = OfflineMetricsCalculator.calculateMetrics(params);
      expect(result.og).toBeGreaterThan(1.0);
    });

    it("should normalize unit strings properly", () => {
      const params = {
        batch_size: 5,
        batch_size_unit: "gallon",
        efficiency: 75,
        ingredients: [
          {
            id: "1",
            name: "Pale Malt",
            type: "grain" as const,
            amount: 8,
            unit: " lbs. ", // With spaces and dots
            potential: 1.037,
          },
        ] as unknown as RecipeIngredient[],
      };

      const result = OfflineMetricsCalculator.calculateMetrics(params);
      expect(result.og).toBeGreaterThan(1.0);
    });
  });

  describe("hop calculations", () => {
    it("should calculate IBU with different hop additions", () => {
      const params = {
        batch_size: 5,
        batch_size_unit: "gallon",
        efficiency: 75,
        ingredients: [
          {
            name: "Pale Malt",
            type: "grain" as const,
            amount: 10,
            unit: "lb",
            potential: 1.037,
          },
          {
            name: "Bittering Hops",
            type: "hop" as const,
            amount: 1,
            unit: "oz",
            alpha_acid: 10,
            time: 60,
          },
          {
            name: "Flavor Hops",
            type: "hop" as const,
            amount: 1,
            unit: "oz",
            alpha_acid: 5,
            time: 20,
          },
          {
            name: "Aroma Hops",
            type: "hop" as const,
            amount: 1,
            unit: "oz",
            alpha_acid: 5,
            time: 5,
          },
        ] as RecipeIngredient[],
      };

      const result = OfflineMetricsCalculator.calculateMetrics(params);

      // 60min addition should contribute most IBU
      expect(result.ibu).toBeGreaterThan(20);
      expect(result.ibu).toBeLessThan(100);
    });

    it("should skip dry hop additions", () => {
      const params = {
        batch_size: 5,
        batch_size_unit: "gallon",
        efficiency: 75,
        ingredients: [
          {
            name: "Pale Malt",
            type: "grain" as const,
            amount: 10,
            unit: "lb",
            potential: 1.037,
          },
          {
            name: "Dry Hops",
            type: "hop" as const,
            amount: 2,
            unit: "oz",
            alpha_acid: 10,
            use: "dry-hop",
            time: 0,
          },
        ] as RecipeIngredient[],
      };

      const result = OfflineMetricsCalculator.calculateMetrics(params);
      expect(result.ibu).toBe(0);
    });

    it("should use default alpha acid when not provided", () => {
      const params = {
        batch_size: 5,
        batch_size_unit: "gallon",
        efficiency: 75,
        ingredients: [
          {
            name: "Pale Malt",
            type: "grain" as const,
            amount: 10,
            unit: "lb",
            potential: 1.037,
          },
          {
            name: "Unknown Hops",
            type: "hop" as const,
            amount: 1,
            unit: "oz",
            // No alpha_acid provided
            time: 60,
          },
        ] as RecipeIngredient[],
      };

      const result = OfflineMetricsCalculator.calculateMetrics(params);
      expect(result.ibu).toBeGreaterThan(0);
    });

    it("should use full boil time when hop time not specified", () => {
      const params = {
        batch_size: 5,
        batch_size_unit: "gallon",
        efficiency: 75,
        boil_time: 90,
        ingredients: [
          {
            name: "Pale Malt",
            type: "grain" as const,
            amount: 10,
            unit: "lb",
            potential: 1.037,
          },
          {
            name: "Hops",
            type: "hop" as const,
            amount: 1,
            unit: "oz",
            alpha_acid: 10,
            // No time specified, should use boil_time (90)
          },
        ] as RecipeIngredient[],
      };

      const result = OfflineMetricsCalculator.calculateMetrics(params);
      expect(result.ibu).toBeGreaterThan(0);
    });
  });

  describe("color calculations", () => {
    it("should calculate SRM color correctly", () => {
      const params = {
        batch_size: 5,
        batch_size_unit: "gallon",
        efficiency: 75,
        ingredients: [
          {
            name: "Pale Malt",
            type: "grain" as const,
            amount: 8,
            unit: "lb",
            color: 2, // Light base malt
          },
          {
            name: "Crystal 60",
            type: "grain" as const,
            amount: 1,
            unit: "lb",
            color: 60, // Medium crystal malt
          },
        ] as RecipeIngredient[],
      };

      const result = OfflineMetricsCalculator.calculateMetrics(params);

      expect(result.srm).toBeGreaterThan(2); // Darker than base malt
      expect(result.srm).toBeLessThan(20); // But not too dark
    });

    it("should use default color when not provided", () => {
      const params = {
        batch_size: 5,
        batch_size_unit: "gallon",
        efficiency: 75,
        ingredients: [
          {
            name: "Unknown Malt",
            type: "grain" as const,
            amount: 8,
            unit: "lb",
            // No color provided, should default to 2
          },
        ] as RecipeIngredient[],
      };

      const result = OfflineMetricsCalculator.calculateMetrics(params);
      expect(result.srm).toBeGreaterThan(0);
    });

    it("should clamp SRM to reasonable brewing range", () => {
      const params = {
        batch_size: 1, // Small batch to amplify color
        batch_size_unit: "gallon",
        efficiency: 75,
        ingredients: [
          {
            name: "Roasted Barley",
            type: "grain" as const,
            amount: 10,
            unit: "lb",
            color: 500, // Very dark grain
          },
        ] as RecipeIngredient[],
      };

      const result = OfflineMetricsCalculator.calculateMetrics(params);

      expect(result.srm).toBeGreaterThan(1);
      expect(result.srm).toBeLessThanOrEqual(60); // Should be clamped
    });
  });

  describe("yeast attenuation", () => {
    it("should calculate FG with multiple yeasts", () => {
      const params = {
        batch_size: 5,
        batch_size_unit: "gallon",
        efficiency: 75,
        ingredients: [
          {
            name: "Pale Malt",
            type: "grain" as const,
            amount: 10,
            unit: "lb",
            potential: 1.037,
          },
          {
            name: "High Attenuation Yeast",
            type: "yeast" as const,
            amount: 1,
            unit: "package",
            attenuation: 85,
          },
          {
            name: "Low Attenuation Yeast",
            type: "yeast" as const,
            amount: 1,
            unit: "package",
            attenuation: 70,
          },
        ] as RecipeIngredient[],
      };

      const result = OfflineMetricsCalculator.calculateMetrics(params);

      // Should average the attenuations (77.5%)
      expect(result.fg).toBeLessThan(result.og);
      expect(result.abv).toBeGreaterThan(0);
    });

    it("should use default attenuation for yeast without attenuation", () => {
      const params = {
        batch_size: 5,
        batch_size_unit: "gallon",
        efficiency: 75,
        ingredients: [
          {
            name: "Pale Malt",
            type: "grain" as const,
            amount: 10,
            unit: "lb",
            potential: 1.037,
          },
          {
            name: "Unknown Yeast",
            type: "yeast" as const,
            amount: 1,
            unit: "package",
            // No attenuation specified
          },
        ] as RecipeIngredient[],
      };

      const result = OfflineMetricsCalculator.calculateMetrics(params);

      expect(result.fg).toBeLessThan(result.og);
      expect(result.abv).toBeGreaterThan(0);
    });
  });

  describe("validateRecipeData", () => {
    it("should validate valid recipe data", () => {
      const params = {
        batch_size: 5,
        batch_size_unit: "gallon",
        efficiency: 75,
        ingredients: [
          {
            name: "Pale Malt",
            type: "grain" as const,
            amount: 8,
            unit: "lb",
          },
        ] as RecipeIngredient[],
      };

      const result = OfflineMetricsCalculator.validateRecipeData(params);

      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it("should reject invalid batch size", () => {
      const params = {
        batch_size: 0,
        batch_size_unit: "gallon",
        efficiency: 75,
        ingredients: [
          {
            name: "Pale Malt",
            type: "grain" as const,
            amount: 8,
            unit: "lb",
          },
        ] as RecipeIngredient[],
      };

      const result = OfflineMetricsCalculator.validateRecipeData(params);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Batch size must be greater than 0");
    });

    it("should reject invalid efficiency", () => {
      const params = {
        batch_size: 5,
        batch_size_unit: "gallon",
        efficiency: 150, // Invalid efficiency
        ingredients: [
          {
            name: "Pale Malt",
            type: "grain" as const,
            amount: 8,
            unit: "lb",
          },
        ] as RecipeIngredient[],
      };

      const result = OfflineMetricsCalculator.validateRecipeData(params);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Efficiency must be between 1 and 100");
    });

    it("should reject recipe without grains", () => {
      const params = {
        batch_size: 5,
        batch_size_unit: "gallon",
        efficiency: 75,
        ingredients: [
          {
            name: "Cascade",
            type: "hop" as const,
            amount: 1,
            unit: "oz",
          },
        ] as RecipeIngredient[],
      };

      const result = OfflineMetricsCalculator.validateRecipeData(params);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        "Recipe must have at least one grain ingredient"
      );
    });

    it("should reject ingredients with invalid amounts", () => {
      const params = {
        batch_size: 5,
        batch_size_unit: "gallon",
        efficiency: 75,
        ingredients: [
          {
            name: "Pale Malt",
            type: "grain" as const,
            amount: -1, // Invalid amount
            unit: "lb",
          },
        ] as RecipeIngredient[],
      };

      const result = OfflineMetricsCalculator.validateRecipeData(params);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Ingredient 1: Amount must be positive");
    });

    it("should reject hops with invalid alpha acid", () => {
      const params = {
        batch_size: 5,
        batch_size_unit: "gallon",
        efficiency: 75,
        ingredients: [
          {
            name: "Pale Malt",
            type: "grain" as const,
            amount: 8,
            unit: "lb",
          },
          {
            name: "Cascade",
            type: "hop" as const,
            amount: 1,
            unit: "oz",
            alpha_acid: 50, // Invalid alpha acid
          },
        ] as RecipeIngredient[],
      };

      const result = OfflineMetricsCalculator.validateRecipeData(params);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        "Ingredient 2: Alpha acid must be between 0-30%"
      );
    });

    it("should reject yeast with invalid attenuation", () => {
      const params = {
        batch_size: 5,
        batch_size_unit: "gallon",
        efficiency: 75,
        ingredients: [
          {
            name: "Pale Malt",
            type: "grain" as const,
            amount: 8,
            unit: "lb",
          },
          {
            name: "US-05",
            type: "yeast" as const,
            amount: 1,
            unit: "package",
            attenuation: 150, // Invalid attenuation
          },
        ] as RecipeIngredient[],
      };

      const result = OfflineMetricsCalculator.validateRecipeData(params);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        "Ingredient 2: Attenuation must be between 0-100%"
      );
    });
  });

  describe("getFallbackMetrics", () => {
    it("should return safe fallback metrics", () => {
      const result = OfflineMetricsCalculator.getFallbackMetrics();

      expect(result).toEqual({
        og: 1.0,
        fg: 1.0,
        abv: 0.0,
        ibu: 0.0,
        srm: 0.0,
      });
    });
  });

  describe("edge cases", () => {
    it("should handle recipes with other ingredients", () => {
      const params = {
        batch_size: 5,
        batch_size_unit: "gallon",
        efficiency: 75,
        ingredients: [
          {
            name: "Pale Malt",
            type: "grain" as const,
            amount: 8,
            unit: "lb",
            potential: 1.037,
          },
          {
            name: "Honey",
            type: "other" as const,
            amount: 2,
            unit: "lb",
            potential: 1.035, // Fermentable sugar
          },
        ] as RecipeIngredient[],
      };

      const result = OfflineMetricsCalculator.calculateMetrics(params);

      expect(result.og).toBeGreaterThan(1.0);
    });

    it("should handle zero hop alpha acid for aged hops", () => {
      const params = {
        batch_size: 5,
        batch_size_unit: "gallon",
        efficiency: 75,
        ingredients: [
          {
            name: "Pale Malt",
            type: "grain" as const,
            amount: 10,
            unit: "lb",
            potential: 1.037,
          },
          {
            name: "Aged Hops for Lambic",
            type: "hop" as const,
            amount: 1,
            unit: "oz",
            alpha_acid: 0, // No alpha acids left (aged hops)
            time: 60,
          },
        ] as RecipeIngredient[],
      };

      const result = OfflineMetricsCalculator.calculateMetrics(params);

      // Should properly handle 0% alpha acid - no IBU contribution
      expect(result.ibu).toBe(0);
    });

    it("should handle very small batch sizes", () => {
      const params = {
        batch_size: 0.5,
        batch_size_unit: "gallon",
        efficiency: 75,
        ingredients: [
          {
            name: "Pale Malt",
            type: "grain" as const,
            amount: 1,
            unit: "lb",
            potential: 1.037,
          },
        ] as RecipeIngredient[],
      };

      const result = OfflineMetricsCalculator.calculateMetrics(params);

      expect(result.og).toBeGreaterThan(1.0);
      expect(result.srm).toBeGreaterThan(0);
    });
  });
});
