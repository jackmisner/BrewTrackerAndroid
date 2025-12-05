/**
 * Priming Sugar Calculator
 * Calculates amount of priming sugar needed for carbonation
 */

import { TemperatureUnit } from "@/src/types/common";
import { UnitConverter } from "./UnitConverter";

export interface PrimingSugarResult {
  sugarAmount: number;
  sugarUnit: string;
  carbonationLevel: number;
  sugarType: string;
}

export class PrimingSugarCalculator {
  // Sugar conversion factors (grams per 12oz bottle for 1 volume of CO2)
  private static readonly SUGAR_FACTORS: Record<string, number> = {
    "corn-sugar": 3.2, // Dextrose (updated to align with cited sources)
    "table-sugar": 2.9, // Sucrose (~10% lower than dextrose)
    dme: 3.0, // Dry malt extract
    honey: 2.9, // Honey (varies by type)
    "brown-sugar": 2.7, // Brown sugar
  };

  // Residual CO2 levels at different temperatures
  private static readonly RESIDUAL_CO2: Record<number, number> = {
    32: 1.7, // 0°C
    35: 1.6, // 2°C
    40: 1.5, // 4°C
    45: 1.3, // 7°C
    50: 1.2, // 10°C
    55: 1.1, // 13°C
    60: 1.0, // 16°C
    65: 0.9, // 18°C
    70: 0.8, // 21°C
    75: 0.7, // 24°C
  };

  /**
   * Calculate priming sugar needed
   */
  public static calculatePrimingSugar(
    beerVolume: number,
    volumeUnit: string,
    currentCO2: number,
    targetCO2: number,
    sugarType: string = "corn-sugar"
  ): PrimingSugarResult {
    // Validate inputs
    this.validateInputs(beerVolume, currentCO2, targetCO2);

    if (!(sugarType in this.SUGAR_FACTORS)) {
      throw new Error(`Unknown sugar type: ${sugarType}`);
    }

    // Convert volume to gallons for calculation
    const volumeGallons = UnitConverter.convertVolume(
      beerVolume,
      volumeUnit,
      "gal"
    );

    // Calculate CO2 to add
    const co2ToAdd = targetCO2 - currentCO2;

    if (co2ToAdd <= 0) {
      throw new Error("Target CO2 must be higher than current CO2");
    }

    // Calculate sugar needed
    const sugarFactor = this.SUGAR_FACTORS[sugarType];
    const bottleCount = volumeGallons * 10.67; // Approximate 12oz bottles per gallon
    const sugarGrams = co2ToAdd * sugarFactor * bottleCount;

    // Convert to appropriate unit
    let sugarAmount = sugarGrams;
    let sugarUnit = "g";

    if (sugarGrams > 28) {
      sugarAmount = UnitConverter.convertWeight(sugarGrams, "g", "oz");
      sugarUnit = "oz";
    }

    return {
      sugarAmount: Math.round(sugarAmount * 100) / 100,
      sugarUnit,
      carbonationLevel: targetCO2,
      sugarType,
    };
  }

  /**
   * Estimate residual CO2 based on fermentation temperature
   */
  public static estimateResidualCO2(
    fermentationTemp: number,
    tempUnit: TemperatureUnit = "F"
  ): number {
    let tempF = fermentationTemp;
    if (tempUnit === "C") {
      tempF = UnitConverter.convertTemperature(fermentationTemp, "C", "F");
    }

    // Find closest temperature in lookup table
    const temps = Object.keys(this.RESIDUAL_CO2)
      .map(Number)
      .sort((a, b) => a - b);
    let closestTemp = temps[0];

    for (const temp of temps) {
      if (Math.abs(temp - tempF) < Math.abs(closestTemp - tempF)) {
        closestTemp = temp;
      }
    }

    return this.RESIDUAL_CO2[closestTemp];
  }

  /**
   * Get target CO2 levels for different beer styles
   */
  public static getStyleCO2Levels(): Record<
    string,
    { min: number; max: number; typical: number }
  > {
    return {
      "British Ales": { min: 1.5, max: 2.2, typical: 1.8 },
      "American Ales": { min: 2.2, max: 2.8, typical: 2.5 },
      "German Lagers": { min: 2.4, max: 2.8, typical: 2.6 },
      "Belgian Ales": { min: 2.8, max: 3.5, typical: 3.2 },
      "Wheat Beers": { min: 3.2, max: 4.0, typical: 3.6 },
      "Stouts/Porters": { min: 1.8, max: 2.3, typical: 2.1 },
    };
  }

  /**
   * Validate inputs
   */
  private static validateInputs(
    beerVolume: number,
    currentCO2: number,
    targetCO2: number
  ): void {
    if (beerVolume <= 0) {
      throw new Error("Beer volume must be greater than 0");
    }
    if (currentCO2 < 0 || currentCO2 > 5) {
      throw new Error("Current CO2 must be between 0 and 5 volumes");
    }
    if (targetCO2 < 0 || targetCO2 > 6) {
      throw new Error("Target CO2 must be between 0 and 6 volumes");
    }
  }

  /**
   * Get available sugar types with descriptions
   */
  public static getSugarTypes(): Record<
    string,
    { name: string; description: string; factor: number }
  > {
    return {
      "corn-sugar": {
        name: "Corn Sugar (Dextrose)",
        description: "Most common, neutral flavor, ferments completely",
        factor: this.SUGAR_FACTORS["corn-sugar"],
      },
      "table-sugar": {
        name: "Table Sugar (Sucrose)",
        description: "Readily available, ferments completely",
        factor: this.SUGAR_FACTORS["table-sugar"],
      },
      dme: {
        name: "Dry Malt Extract",
        description: "Adds malt character, more complex sugars",
        factor: this.SUGAR_FACTORS["dme"],
      },
      honey: {
        name: "Honey",
        description: "Adds floral notes, varies by type",
        factor: this.SUGAR_FACTORS["honey"],
      },
      "brown-sugar": {
        name: "Brown Sugar",
        description: "Adds slight molasses flavor",
        factor: this.SUGAR_FACTORS["brown-sugar"],
      },
    };
  }
}
