/**
 * Offline Brewing Metrics Calculator
 *
 * Performs brewing calculations without requiring an API connection.
 * Implements standard brewing formulas for OG, FG, ABV, IBU, and SRM.
 */

import { RecipeMetrics, RecipeFormData, RecipeIngredient } from "@src/types";

export class OfflineMetricsCalculator {
  /**
   * Calculate recipe metrics offline using standard brewing formulas
   */
  static calculateMetrics(recipeData: RecipeFormData): RecipeMetrics {
    // Extract ingredients by type
    const grains = recipeData.ingredients.filter(ing => ing.type === "grain");
    const hops = recipeData.ingredients.filter(ing => ing.type === "hop");

    // Calculate metrics
    const og = this.calculateOG(
      grains,
      recipeData.batch_size,
      recipeData.efficiency
    );
    const fg = this.calculateFG(og, grains);
    const abv = this.calculateABV(og, fg);
    const ibu = this.calculateIBU(
      hops,
      recipeData.batch_size,
      og,
      recipeData.boil_time
    );
    const srm = this.calculateSRM(grains, recipeData.batch_size);

    return {
      og: Math.round(og * 1000) / 1000, // Round to 3 decimal places
      fg: Math.round(fg * 1000) / 1000,
      abv: Math.round(abv * 10) / 10, // Round to 1 decimal place
      ibu: Math.round(ibu * 10) / 10,
      srm: Math.round(srm * 10) / 10,
    };
  }

  /**
   * Calculate Original Gravity (OG)
   */
  private static calculateOG(
    grains: RecipeIngredient[],
    batchSizeGallons: number,
    efficiency: number
  ): number {
    if (grains.length === 0) {
      return 1.04;
    } // Default for no grains

    let totalGravityPoints = 0;

    for (const grain of grains) {
      // Get potential (extract potential) - default to 35 if not specified
      const potential = grain.potential || 35;
      // Convert amount to pounds if needed (assuming lbs for now)
      const amountLbs = grain.amount || 0;

      // Calculate gravity points: (potential * amount * efficiency) / batch_size
      const gravityPoints =
        (potential * amountLbs * (efficiency / 100)) / batchSizeGallons;
      totalGravityPoints += gravityPoints;
    }

    // Convert gravity points to specific gravity (1.XXX format)
    return 1 + totalGravityPoints / 1000;
  }

  /**
   * Calculate Final Gravity (FG)
   */
  private static calculateFG(og: number, grains: RecipeIngredient[]): number {
    // Calculate average attenuation from yeast/grains
    let totalAttenuation = 0;
    let attenuationCount = 0;

    for (const grain of grains) {
      if (grain.attenuation && grain.attenuation > 0) {
        totalAttenuation += grain.attenuation;
        attenuationCount++;
      }
    }

    // Default attenuation if none specified
    const averageAttenuation =
      attenuationCount > 0 ? totalAttenuation / attenuationCount : 75; // Default 75% attenuation

    // Calculate FG: FG = OG - ((OG - 1) * attenuation/100)
    const gravityPoints = (og - 1) * 1000;
    const attenuatedPoints = gravityPoints * (averageAttenuation / 100);
    return 1 + (gravityPoints - attenuatedPoints) / 1000;
  }

  /**
   * Calculate Alcohol By Volume (ABV)
   */
  private static calculateABV(og: number, fg: number): number {
    // Standard ABV formula: (OG - FG) * 131.25
    return (og - fg) * 131.25;
  }

  /**
   * Calculate International Bitterness Units (IBU)
   */
  private static calculateIBU(
    hops: RecipeIngredient[],
    batchSizeGallons: number,
    og: number,
    boilTime: number
  ): number {
    if (hops.length === 0) {
      return 0;
    }

    let totalIBU = 0;

    for (const hop of hops) {
      const alphaAcid = hop.alpha_acid || 5; // Default 5% AA
      const amountOz = hop.amount || 0;
      const hopTime = hop.time || boilTime; // Use boil time if hop time not specified

      // Calculate utilization based on boil time and gravity
      const utilization = this.calculateHopUtilization(hopTime, og);

      // IBU formula: (Amount in oz * Alpha Acid % * Utilization * 75) / Batch Size
      const ibu = (amountOz * alphaAcid * utilization * 75) / batchSizeGallons;
      totalIBU += ibu;
    }

    return totalIBU;
  }

  /**
   * Calculate hop utilization based on boil time and gravity
   */
  private static calculateHopUtilization(
    boilTimeMinutes: number,
    og: number
  ): number {
    // Tinseth's utilization formula
    const gravityFactor = 1.65 * Math.pow(0.000125, og - 1);
    const timeFactor = (1 - Math.exp(-0.04 * boilTimeMinutes)) / 4.15;
    return gravityFactor * timeFactor;
  }

  /**
   * Calculate Standard Reference Method (SRM) color
   */
  private static calculateSRM(
    grains: RecipeIngredient[],
    batchSizeGallons: number
  ): number {
    if (grains.length === 0) {
      return 2;
    } // Very light if no grains

    let totalMCU = 0; // Malt Color Units

    for (const grain of grains) {
      const colorLovibond = grain.color || 2; // Default to 2L if not specified
      const amountLbs = grain.amount || 0;

      // MCU = (Color in Lovibond * Amount in lbs) / Batch Size in gallons
      const mcu = (colorLovibond * amountLbs) / batchSizeGallons;
      totalMCU += mcu;
    }

    // Morey equation: SRM = 1.4922 * (MCU^0.6859)
    return 1.4922 * Math.pow(totalMCU, 0.6859);
  }

  /**
   * Validate recipe data for calculations
   */
  static validateRecipeData(recipeData: RecipeFormData): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!recipeData.batch_size || recipeData.batch_size <= 0) {
      errors.push("Batch size must be greater than 0");
    }

    if (
      !recipeData.efficiency ||
      recipeData.efficiency <= 0 ||
      recipeData.efficiency > 100
    ) {
      errors.push("Efficiency must be between 1 and 100");
    }

    if (!recipeData.ingredients || recipeData.ingredients.length === 0) {
      errors.push("At least one ingredient is required");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}
