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

    // Convert batch size to gallons for all calculations
    const batchSizeGallons = this.convertToGallons(
      recipeData.batch_size,
      recipeData.batch_size_unit
    );

    // Calculate metrics
    const og = this.calculateOG(
      grains,
      batchSizeGallons,
      recipeData.efficiency
    );
    const fg = this.calculateFG(og, recipeData.ingredients);
    const abv = this.calculateABV(og, fg);
    const ibu = this.calculateIBU(
      hops,
      batchSizeGallons,
      og,
      recipeData.boil_time
    );
    const srm = this.calculateSRM(grains, batchSizeGallons);

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
      // Convert amount to pounds based on unit
      const amountLbs = this.convertToPounds(grain.amount || 0, grain.unit);

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
  private static calculateFG(
    og: number,
    ingredients: RecipeIngredient[]
  ): number {
    // Calculate average attenuation from yeast
    const yeasts = ingredients.filter(ing => ing.type === "yeast");
    let totalAttenuation = 0;
    let attenuationCount = 0;

    for (const yeast of yeasts) {
      if (yeast.attenuation && yeast.attenuation > 0) {
        totalAttenuation += yeast.attenuation;
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
      // Skip dry hops - they don't contribute to IBU
      if (hop.use === "dry-hop" || (hop.time !== undefined && hop.time <= 0)) {
        continue;
      }
      const alphaAcid = hop.alpha_acid || 5; // Default 5% AA
      // Convert hop amount to ounces for IBU calculation
      const amountOz = this.convertToOunces(hop.amount || 0, hop.unit);
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
      // Convert grain amount to pounds for SRM calculation
      const amountLbs = this.convertToPounds(grain.amount || 0, grain.unit);

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

  /**
   * Convert batch size to gallons
   */
  private static convertToGallons(size: number, unit?: string): number {
    if (!unit) {
      return size;
    }

    switch (unit.toLowerCase()) {
      case "l":
      case "liter":
      case "liters":
        return size * 0.264172; // 1 liter = 0.264172 gallons
      case "gal":
      case "gallon":
      case "gallons":
      default:
        return size; // Default to gallons
    }
  }

  /**
   * Convert ingredient amount to pounds
   */
  private static convertToPounds(amount: number, unit?: string): number {
    if (!unit) {
      return amount;
    } // Default to pounds if no unit specified

    switch (unit.toLowerCase()) {
      case "kg":
      case "kilogram":
      case "kilograms":
        return amount * 2.20462; // 1 kg = 2.20462 lbs
      case "g":
      case "gram":
      case "grams":
        return amount / 453.592; // 1 lb = 453.592 grams
      case "oz":
      case "ounce":
      case "ounces":
        return amount / 16; // 1 lb = 16 oz
      case "lb":
      case "lbs":
      case "pound":
      case "pounds":
      default:
        return amount; // Default to pounds
    }
  }

  /**
   * Convert hop amount to ounces
   */
  private static convertToOunces(amount: number, unit?: string): number {
    if (!unit) {
      return amount;
    } // Default to ounces if no unit specified

    switch (unit.toLowerCase()) {
      case "g":
      case "gram":
      case "grams":
        return amount / 28.3495; // 1 oz = 28.3495 grams
      case "lb":
      case "lbs":
      case "pound":
      case "pounds":
        return amount * 16; // 1 lb = 16 oz
      case "kg":
      case "kilogram":
      case "kilograms":
        return amount * 35.274; // 1 kg = 35.274 oz
      case "oz":
      case "ounce":
      case "ounces":
      default:
        return amount; // Default to ounces
    }
  }
}
