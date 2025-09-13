/**
 * Offline Recipe Metrics Calculator
 *
 * Provides client-side brewing calculations for offline functionality.
 * Implements standard brewing formulas to calculate recipe metrics without API calls.
 *
 * Features:
 * - Original Gravity (OG) calculation from fermentable ingredients
 * - Final Gravity (FG) calculation with yeast attenuation
 * - Alcohol By Volume (ABV) calculation
 * - International Bitterness Units (IBU) calculation with hop utilization
 * - Standard Reference Method (SRM) color calculation
 * - Unit conversion support (imperial/metric)
 *
 * Based on standard brewing formulas and best practices from:
 * - Palmer's "How to Brew"
 * - Daniels' "Designing Great Beers"
 * - BJCP guidelines
 *
 * @example
 * ```typescript
 * const metrics = OfflineMetricsCalculator.calculateMetrics({
 *   batch_size: 5,
 *   batch_size_unit: 'gallon',
 *   efficiency: 75,
 *   ingredients: recipeIngredients
 * });
 * ```
 */

import { RecipeMetrics, RecipeIngredient } from "@src/types";

interface CalculationParams {
  batch_size: number;
  batch_size_unit: string;
  efficiency: number;
  boil_time?: number;
  ingredients: RecipeIngredient[];
  mash_temperature?: number;
  mash_temp_unit?: string;
}

/**
 * Offline metrics calculator for brewing recipes
 */
export class OfflineMetricsCalculator {
  // Standard conversion factors
  private static readonly GALLON_TO_LITER = 3.78541;
  private static readonly POUND_TO_KG = 0.453592;
  private static readonly OZ_TO_GRAM = 28.3495;

  // Brewing constants
  private static readonly SPECIFIC_GRAVITY_POINTS = 1000; // SG points (e.g., 1.050 = 50 points)
  private static readonly ABV_COEFFICIENT = 131.25; // Standard ABV calculation coefficient

  /**
   * Calculate complete recipe metrics
   */
  static calculateMetrics(params: CalculationParams): RecipeMetrics {
    const {
      batch_size,
      batch_size_unit,
      efficiency,
      boil_time = 60,
      ingredients,
    } = params;

    // Convert batch size to liters for calculations
    const batchSizeLiters = this.convertToLiters(batch_size, batch_size_unit);
    const efficiencyDecimal = efficiency / 100;

    // Calculate individual metrics
    const og = this.calculateOriginalGravity(
      ingredients,
      batchSizeLiters,
      efficiencyDecimal
    );
    const fg = this.calculateFinalGravity(og, ingredients);
    const abv = this.calculateABV(og, fg);
    const ibu = this.calculateIBU(ingredients, batchSizeLiters, og, boil_time);
    const srm = this.calculateSRM(ingredients, batchSizeLiters);

    return {
      og: parseFloat(og.toFixed(3)),
      fg: parseFloat(fg.toFixed(3)),
      abv: parseFloat(abv.toFixed(1)),
      ibu: parseFloat(ibu.toFixed(0)),
      srm: parseFloat(srm.toFixed(1)),
    };
  }

  /**
   * Calculate Original Gravity from fermentable ingredients
   */
  private static calculateOriginalGravity(
    ingredients: RecipeIngredient[],
    batchSizeLiters: number,
    efficiency: number
  ): number {
    let totalPoints = 0;

    // Sum gravity points from all fermentable ingredients
    ingredients
      .filter(ing => ing.type === "grain" || ing.type === "other")
      .forEach(ingredient => {
        // Convert ingredient amount to kg
        const amountKg = this.convertIngredientToKg(ingredient);

        // Get potential gravity (typically 1.030-1.045 for malts)
        const potential = ingredient.potential || 1.037; // Default malt potential
        const gravityPoints = (potential - 1) * 1000; // Convert to points (e.g., 1.037 = 37 points)

        // Calculate contribution with efficiency (convert kg to lbs for PPG calculation)
        const amountLbs = amountKg / this.POUND_TO_KG;
        const batchGallons = batchSizeLiters / this.GALLON_TO_LITER;
        const contribution =
          (amountLbs * gravityPoints * efficiency) / batchGallons;
        totalPoints += contribution;
      });

    // Convert points back to specific gravity
    return 1 + totalPoints / 1000;
  }

  /**
   * Calculate Final Gravity based on yeast attenuation
   */
  private static calculateFinalGravity(
    og: number,
    ingredients: RecipeIngredient[]
  ): number {
    // Find yeast ingredients and get average attenuation
    const yeasts = ingredients.filter(ing => ing.type === "yeast");

    let averageAttenuation = 0.75; // Default 75% attenuation
    if (yeasts.length > 0) {
      const totalAttenuation = yeasts.reduce((sum, yeast) => {
        return sum + (yeast.attenuation || 75);
      }, 0);
      averageAttenuation = totalAttenuation / yeasts.length / 100;
    }

    // Calculate FG using attenuation
    const gravityPoints = (og - 1) * 1000;
    const attenuatedPoints = gravityPoints * averageAttenuation;
    const finalPoints = gravityPoints - attenuatedPoints;

    return 1 + finalPoints / 1000;
  }

  /**
   * Calculate Alcohol By Volume (ABV)
   */
  private static calculateABV(og: number, fg: number): number {
    // Standard ABV formula: (OG - FG) * 131.25
    return (og - fg) * this.ABV_COEFFICIENT;
  }

  /**
   * Calculate International Bitterness Units (IBU)
   */
  private static calculateIBU(
    ingredients: RecipeIngredient[],
    batchSizeLiters: number,
    og: number,
    boilTime: number
  ): number {
    let totalIBU = 0;

    // Calculate IBU from hop ingredients
    ingredients
      .filter(ing => ing.type === "hop")
      .forEach(hop => {
        const amountGrams = this.convertHopToGrams(hop);
        const alphaAcid = hop.alpha_acid || 5; // Default 5% AA
        const hopTime = hop.time || boilTime; // Use hop time or default to full boil

        // Skip dry hops
        if (hopTime <= 0 || hop.use === "dry-hop") {
          return;
        }

        // Calculate utilization based on boil time and gravity
        const utilization = this.calculateHopUtilization(hopTime, og);

        // IBU calculation: (Amount(oz) * AA% * Utilization * 7489) / Batch Size(gallons)
        // Convert to metric: (Amount(g) * AA% * Utilization * 1000) / Batch Size(L)
        // IBU = (grams * AA% * utilization * 10) / liters
        const hopIBU =
          (amountGrams * alphaAcid * utilization * 10) / batchSizeLiters;
        totalIBU += hopIBU;
      });

    return totalIBU;
  }

  /**
   * Calculate hop utilization based on boil time and gravity
   */
  private static calculateHopUtilization(
    boilTimeMinutes: number,
    gravity: number
  ): number {
    // Tinseth hop utilization formula
    const gravityFactor = 1.65 * Math.pow(0.000125, gravity - 1);
    const timeFactor = (1 - Math.exp(-0.04 * boilTimeMinutes)) / 4.15;

    return gravityFactor * timeFactor;
  }

  /**
   * Calculate Standard Reference Method (SRM) color
   */
  private static calculateSRM(
    ingredients: RecipeIngredient[],
    batchSizeLiters: number
  ): number {
    let totalMCU = 0;

    // Calculate Malt Color Units (MCU) from grain ingredients
    ingredients
      .filter(ing => ing.type === "grain")
      .forEach(grain => {
        const amountKg = this.convertIngredientToKg(grain);
        const lovibond = grain.color || 2; // Default base malt color

        // Convert kg to pounds for MCU calculation
        const amountLbs = amountKg / this.POUND_TO_KG;
        const batchGallons = batchSizeLiters / this.GALLON_TO_LITER;

        // MCU = (Grain Weight (lbs) * Lovibond) / Batch Size (gallons)
        const mcu = (amountLbs * lovibond) / batchGallons;
        totalMCU += mcu;
      });
    // Convert MCU to SRM using Morey equation
    // SRM = 1.4922 * (MCU ^ 0.6859)
    const srm = 1.4922 * Math.pow(totalMCU, 0.6859);
    // Clamp SRM to reasonable brewing range
    return Math.max(1, Math.min(60, srm));
  }

  /**
   * Convert batch size to liters
   */
  private static convertToLiters(size: number, unit: string): number {
    switch (unit.toLowerCase()) {
      case "liter":
      case "litre":
      case "l":
        return size;
      case "gallon":
      case "gal":
        return size * this.GALLON_TO_LITER;
      default:
        return size; // Assume liters if unknown
    }
  }

  /**
   * Convert ingredient amount to kg
   */
  private static convertIngredientToKg(ingredient: RecipeIngredient): number {
    const { amount = 0, unit = "lb" } = ingredient;

    switch (unit.toLowerCase()) {
      case "kg":
      case "kilogram":
        return amount;
      case "lb":
      case "pound":
        return amount * this.POUND_TO_KG;
      case "g":
      case "gram":
        return amount / 1000;
      case "oz":
      case "ounce":
        return (amount * this.OZ_TO_GRAM) / 1000;
      default:
        return amount * this.POUND_TO_KG; // Default to pounds
    }
  }

  /**
   * Convert hop amount to grams
   */
  private static convertHopToGrams(hop: RecipeIngredient): number {
    const { amount = 0, unit = "oz" } = hop;

    switch (unit.toLowerCase()) {
      case "g":
      case "gram":
        return amount;
      case "oz":
      case "ounce":
        return amount * this.OZ_TO_GRAM;
      case "kg":
      case "kilogram":
        return amount * 1000;
      case "lb":
      case "pound":
        return amount * this.POUND_TO_KG * 1000;
      default:
        return amount * this.OZ_TO_GRAM; // Default to ounces for hops
    }
  }

  /**
   * Validate recipe data for calculations
   */
  static validateRecipeData(params: CalculationParams): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!params.batch_size || params.batch_size <= 0) {
      errors.push("Batch size must be greater than 0");
    }

    if (
      !params.efficiency ||
      params.efficiency <= 0 ||
      params.efficiency > 100
    ) {
      errors.push("Efficiency must be between 1 and 100");
    }

    if (!params.ingredients || params.ingredients.length === 0) {
      errors.push("Recipe must have at least one ingredient");
    }

    const hasGrains = params.ingredients?.some(ing => ing.type === "grain");
    if (!hasGrains) {
      errors.push("Recipe must have at least one grain ingredient");
    }

    // Validate individual ingredients
    params.ingredients?.forEach((ing, index) => {
      if (!ing.amount || ing.amount < 0) {
        errors.push(`Ingredient ${index + 1}: Amount must be positive`);
      }
      if (ing.type === "hop" && ing.alpha_acid !== undefined) {
        if (ing.alpha_acid < 0 || ing.alpha_acid > 30) {
          errors.push(
            `Ingredient ${index + 1}: Alpha acid must be between 0-30%`
          );
        }
      }
      if (ing.type === "yeast" && ing.attenuation !== undefined) {
        if (ing.attenuation < 0 || ing.attenuation > 100) {
          errors.push(
            `Ingredient ${index + 1}: Attenuation must be between 0-100%`
          );
        }
      }
    });
    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get fallback metrics for invalid recipes
   */
  static getFallbackMetrics(): RecipeMetrics {
    return {
      og: 1.0,
      fg: 1.0,
      abv: 0.0,
      ibu: 0.0,
      srm: 0.0,
    };
  }
}

export default OfflineMetricsCalculator;
