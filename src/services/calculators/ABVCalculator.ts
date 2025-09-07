/**
 * ABV (Alcohol By Volume) Calculator
 * Supports simple and advanced formulas with SG/Plato/Brix conversions
 */

export interface ABVResult {
  abv: number;
  attenuation: number;
  calories: number; // per 12oz serving
}

export class ABVCalculator {
  /**
   * Simple ABV calculation using the standard formula
   * ABV = (OG - FG) * 131.25
   */
  public static calculateSimple(og: number, fg: number): ABVResult {
    if (og <= fg) {
      throw new Error("Original gravity must be greater than final gravity");
    }

    const abv = (og - fg) * 131.25;

    // Guard against division by zero when og <= 1.0
    const attenuation = og <= 1.0 ? 0 : ((og - fg) / (og - 1.0)) * 100;
    const calories = this.calculateCalories(og, fg);

    return {
      abv: Math.round(abv * 10) / 10,
      attenuation: Math.round(attenuation * 10) / 10,
      calories: Math.round(calories),
    };
  }

  /**
   * Advanced ABV calculation using the more accurate formula
   * Takes into account the non-linear relationship between gravity and alcohol
   */
  public static calculateAdvanced(og: number, fg: number): ABVResult {
    if (og <= fg) {
      throw new Error("Original gravity must be greater than final gravity");
    }
    if (Math.abs(og - 1.775) < 0.0001) {
      throw new Error(
        "Original gravity too close to 1.775, would cause division by zero"
      );
    }
    // More accurate formula: ABV = 76.08 * (og-fg) / (1.775-og) * (fg/0.794)
    const abv = ((76.08 * (og - fg)) / (1.775 - og)) * (fg / 0.794);

    // Guard against division by zero when og <= 1.0
    const attenuation = og <= 1.0 ? 0 : ((og - fg) / (og - 1.0)) * 100;
    const calories = this.calculateCalories(og, fg);

    return {
      abv: Math.round(abv * 10) / 10,
      attenuation: Math.round(attenuation * 10) / 10,
      calories: Math.round(calories),
    };
  }

  /**
   * Calculate calories per 12oz serving
   * Formula based on alcohol content and residual sugars
   */
  private static calculateCalories(og: number, fg: number): number {
    // Calories from alcohol: 7 cal/g alcohol, alcohol density ~0.789 g/ml
    // Calories from residual sugars: 4 cal/g carbs
    const alcoholCalories = (og - fg) * 1000 * 0.789 * 7 * 0.355; // 12oz = ~355ml
    const sugarCalories = (fg - 1.0) * 1000 * 4 * 0.355;
    return alcoholCalories + sugarCalories;
  }

  /**
   * Convert Plato to Specific Gravity
   * Formula: SG = 1 + (Plato / (258.6 - ((Plato / 258.2) * 227.1)))
   */
  public static platoToSG(plato: number): number {
    if (plato < 0) {
      throw new Error("Plato degrees cannot be negative");
    }
    return 1 + plato / (258.6 - (plato / 258.2) * 227.1);
  }

  /**
   * Convert Specific Gravity to Plato
   * Formula: Plato = -616.868 + (1111.14 * SG) - (630.272 * SG^2) + (135.997 * SG^3)
   */
  public static sgToPlato(sg: number): number {
    if (sg < 1.0) {
      throw new Error("Specific gravity cannot be less than 1.0");
    }
    return (
      -616.868 +
      1111.14 * sg -
      630.272 * Math.pow(sg, 2) +
      135.997 * Math.pow(sg, 3)
    );
  }

  /**
   * Convert Brix to Specific Gravity for UNFERMENTED WORT ONLY
   * Formula: SG = 1 + (Brix / (258.6 - ((Brix / 258.2) * 227.1)))
   * Note: Brix is approximately equal to Plato for brewing purposes
   *
   * WARNING: This conversion is ONLY accurate for unfermented wort.
   * DO NOT use this for final gravity measurements from a refractometer.
   * For fermented samples, refractometer readings require alcohol correction.
   * Use brixToSGFermented() or provide corrected SG values instead.
   */
  public static brixToSG(brix: number): number {
    return this.platoToSG(brix);
  }

  /**
   * Convert Specific Gravity to Brix (approximate)
   * Note: Brix is approximately equal to Plato for brewing purposes
   */
  public static sgToBrix(sg: number): number {
    return this.sgToPlato(sg);
  }

  /**
   * TODO: Future implementation for fermented Brix conversion
   * Convert fermented Brix reading to SG with alcohol correction
   * Formula would need OG and FG Brix values to calculate alcohol correction factor
   *
   * @param ogSG - Original gravity in SG units
   * @param fgBrix - Final gravity in Brix from refractometer
   * @param ogUnit - Unit of original gravity measurement
   * @returns Corrected specific gravity
   */
  // public static brixToSGFermented(ogSG: number, fgBrix: number, ogUnit: "sg" | "plato" | "brix"): number {
  //   // Implementation would use refractometer correction formula
  //   // e.g., corrected SG = 1.001843 - 0.002318474*OG - 0.000007775*OG^2 - 0.000000034*OG^3 + 0.00574*FG + 0.00003344*FG^2 + 0.000000086*FG^3
  //   throw new Error("Not yet implemented - use external refractometer correction calculator");
  // }

  /**
   * Validate specific gravity value
   */
  public static isValidSG(sg: number): boolean {
    return sg >= 1.0 && sg <= 1.2;
  }

  /**
   * Validate Plato/Brix value
   */
  public static isValidPlato(plato: number): boolean {
    return plato >= 0 && plato <= 50;
  }

  /**
   * Calculate ABV with automatic unit conversion
   */
  public static calculate(
    og: number,
    fg: number,
    ogUnit: "sg" | "plato" | "brix",
    fgUnit: "sg" | "plato" | "brix",
    formula: "simple" | "advanced" = "simple"
  ): ABVResult {
    // Fail-fast guard: Detect FG in Brix and throw error
    if (fgUnit === "brix") {
      throw new Error(
        "FG in Brix requires refractometer alcohol correction — provide SG or use corrected conversion"
      );
    }

    // Convert all inputs to SG
    let ogSG = og;
    let fgSG = fg;

    if (ogUnit === "plato") {
      ogSG = this.platoToSG(og);
    } else if (ogUnit === "brix") {
      ogSG = this.brixToSG(og);
    }

    if (fgUnit === "plato") {
      fgSG = this.platoToSG(fg);
    }
    // Note: fgUnit === "brix" case is handled by fail-fast guard above

    // Validate converted values
    if (!this.isValidSG(ogSG) || !this.isValidSG(fgSG)) {
      throw new Error("Invalid gravity values after conversion");
    }

    // Calculate using the specified formula
    return formula === "advanced"
      ? this.calculateAdvanced(ogSG, fgSG)
      : this.calculateSimple(ogSG, fgSG);
  }
}
