/**
 * Offline Brewing Metrics Calculator
 *
 * Performs brewing calculations without requiring an API connection.
 * Implements standard brewing formulas for OG, FG, ABV, IBU, and SRM.
 */

import { isDryHopIngredient } from "@/src/utils/recipeUtils";
import {
  RecipeMetrics,
  RecipeFormData,
  RecipeMetricsInput,
  RecipeIngredient,
} from "@src/types";

export class OfflineMetricsCalculator {
  /**
   * Calculate recipe metrics offline using standard brewing formulas
   */
  static calculateMetrics(
    recipeData: RecipeFormData | RecipeMetricsInput
  ): RecipeMetrics {
    // Validate first
    const { isValid } = this.validateRecipeData(recipeData);
    if (!isValid) {
      return { og: 1.0, fg: 1.0, abv: 0.0, ibu: 0.0, srm: 0.0 };
    }
    // Extract ingredients by type
    const grains = recipeData.ingredients.filter(ing => ing.type === "grain");
    const fermentables = recipeData.ingredients.filter(
      ing => ing.type === "grain" || ing.type === "other"
    );
    const hops = recipeData.ingredients.filter(ing => ing.type === "hop");
    // Convert batch size to gallons for all calculations
    const batchSizeGallons = this.convertToGallons(
      recipeData.batch_size,
      recipeData.batch_size_unit
    );
    // Calculate metrics
    const og = this.calculateOG(
      fermentables,
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
    fermentables: RecipeIngredient[],
    batchSizeGallons: number,
    efficiency: number
  ): number {
    if (fermentables.length === 0) {
      return 1.0;
    } // Neutral baseline when no fermentables

    let totalGravityPoints = 0;

    for (const fermentable of fermentables) {
      // Get potential (extract potential) - default to 35 if not specified
      const potential =
        "potential" in fermentable ? (fermentable.potential ?? 35) : 35;
      // Convert amount to pounds based on unit
      const amountLbs = this.convertToPounds(
        fermentable.amount ?? 0,
        fermentable.unit
      );

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
      const attenuation =
        "attenuation" in yeast ? yeast.attenuation : undefined;
      if (attenuation !== undefined && attenuation >= 0) {
        totalAttenuation += attenuation;
        attenuationCount++;
      }
    }

    // Use 0% attenuation if no yeast is present (matches backend behavior)
    // This results in FG = OG when there's no yeast
    const averageAttenuation =
      attenuationCount > 0 ? totalAttenuation / attenuationCount : 0;

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
      const use = hop.use?.toLowerCase();
      const hopTime =
        use === "whirlpool" || use === "flameout"
          ? (hop.time ?? 0) // only force 0 when time is missing
          : (hop.time ?? boilTime); // default to boil time for boil additions

      // Skip non-bittering additions (dry hops or hops with no boil time)
      if (isDryHopIngredient(hop) || hopTime <= 0) {
        continue;
      }
      const alphaAcid = "alpha_acid" in hop ? (hop.alpha_acid ?? 5) : 5; // Default 5% AA (allow 0)
      // Convert hop amount to ounces for IBU calculation
      const amountOz = this.convertToOunces(hop.amount ?? 0, hop.unit);

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
      const colorLovibond = "color" in grain ? (grain.color ?? 2) : 2; // Default to 2L if not specified
      // Convert grain amount to pounds for SRM calculation
      const amountLbs = this.convertToPounds(grain.amount ?? 0, grain.unit);

      // MCU = (Color in Lovibond * Amount in lbs) / Batch Size in gallons
      const mcu = (colorLovibond * amountLbs) / batchSizeGallons;
      totalMCU += mcu;
    }

    // Morey equation: SRM = 1.4922 * (MCU^0.6859), clamped to [1, 60]
    const srm = 1.4922 * Math.pow(totalMCU, 0.6859);
    return Math.max(1, Math.min(60, srm));
  }

  /**
   * Validate recipe data for calculations
   */
  static validateRecipeData(recipeData: RecipeFormData | RecipeMetricsInput): {
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

    if (recipeData.boil_time === undefined || recipeData.boil_time < 0) {
      errors.push("Boil time must be zero or greater");
    }

    if (!recipeData.ingredients || recipeData.ingredients.length === 0) {
      errors.push("At least one ingredient is required");
    }

    // Require at least one fermentable (grain or other)
    if (
      !recipeData.ingredients?.some(
        ing => ing.type === "grain" || ing.type === "other"
      )
    ) {
      errors.push(
        "At least one fermentable (grain or sugar/extract) is required"
      );
    }

    for (const ing of recipeData.ingredients ?? []) {
      if (ing.amount !== undefined && ing.amount < 0) {
        errors.push(`${ing.name || "Ingredient"} amount must be >= 0`);
      }
      const alphaAcid = "alpha_acid" in ing ? ing.alpha_acid : undefined;
      if (
        ing.type === "hop" &&
        alphaAcid !== undefined &&
        (alphaAcid < 0 || alphaAcid > 30)
      ) {
        errors.push("Hop alpha acid must be between 0 and 30");
      }
      const attenuation = "attenuation" in ing ? ing.attenuation : undefined;
      if (
        ing.type === "yeast" &&
        attenuation !== undefined &&
        (attenuation < 0 || attenuation > 100)
      ) {
        errors.push("Yeast attenuation must be between 0 and 100");
      }
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
      case "ml":
      case "milliliter":
      case "milliliters":
        return size * 0.000264172; // 1 mL = 0.000264172 gallons
      case "l":
      case "liter":
      case "litre":
      case "liters":
      case "litres":
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
