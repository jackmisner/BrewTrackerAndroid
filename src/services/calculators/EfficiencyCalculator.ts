/**
 * Efficiency Calculator
 * Calculates mash and brewhouse efficiency for all-grain brewing
 */

import { UnitConverter } from "./UnitConverter";

export interface GrainBillItem {
  weight: number;
  ppg: number; // Points per pound per gallon
  name?: string;
}

export interface EfficiencyResult {
  mashEfficiency: number;
  brewhouseEfficiency: number;
  expectedPoints: number;
  actualPoints: number;
  pointsLost: number;
}

export class EfficiencyCalculator {
  // Typical PPG values for common grains
  private static readonly GRAIN_PPG: Record<string, number> = {
    "2-row-pale": 37,
    "6-row-pale": 35,
    pilsner: 37,
    wheat: 38,
    munich: 35,
    vienna: 35,
    "crystal-40": 34,
    "crystal-60": 34,
    "crystal-120": 33,
    chocolate: 28,
    "roasted-barley": 25,
    "black-patent": 25,
    carapils: 33,
    caramunich: 33,
  };

  /**
   * Calculate mash and brewhouse efficiency
   */
  public static calculateEfficiency(
    grainBill: GrainBillItem[],
    expectedOG: number,
    actualOG: number,
    batchSize: number,
    volumeUnit: string = "gal"
  ): EfficiencyResult {
    // Validate inputs
    this.validateInputs(grainBill, expectedOG, actualOG, batchSize);

    // Convert batch size to gallons
    const batchSizeGal = UnitConverter.convertVolume(
      batchSize,
      volumeUnit,
      "gal"
    );

    // Calculate expected gravity points
    const expectedPoints = this.calculateExpectedPoints(
      grainBill,
      batchSizeGal
    );

    // Calculate actual gravity points
    const actualPoints = (actualOG - 1.0) * 1000 * batchSizeGal;
    const expectedOGPoints = (expectedOG - 1.0) * 1000 * batchSizeGal;

    // Calculate efficiencies
    const mashEfficiency = (actualPoints / expectedPoints) * 100;
    const brewhouseEfficiency = (actualPoints / expectedOGPoints) * 100;

    // Calculate points lost
    const pointsLost = expectedPoints - actualPoints;

    return {
      mashEfficiency: Math.round(mashEfficiency * 10) / 10,
      brewhouseEfficiency: Math.round(brewhouseEfficiency * 10) / 10,
      expectedPoints: Math.round(expectedPoints),
      actualPoints: Math.round(actualPoints),
      pointsLost: Math.round(pointsLost),
    };
  }

  /**
   * Calculate expected gravity points from grain bill
   * Returns total gravity points for the batch (grain weight × PPG)
   *
   * Note: The batchSizeGal parameter is included for API consistency with other
   * brewing calculations, but is not used in this basic calculation. The function
   * returns total gravity points rather than points per gallon because efficiency
   * calculations require comparison with actualPoints which are also total points.
   *
   * For reference:
   * - expectedPoints = sum(weight × ppg) = total gravity points from grain
   * - actualPoints = (actualOG - 1.0) × 1000 × batchSize = total gravity points achieved
   * - efficiency = (actualPoints / expectedPoints) × 100
   */
  public static calculateExpectedPoints(
    grainBill: GrainBillItem[],
    batchSizeGal: number // Kept for API consistency, not used in calculation
  ): number {
    let totalPoints = 0;

    for (const grain of grainBill) {
      const grainPoints = grain.weight * grain.ppg;
      totalPoints += grainPoints;
    }

    return totalPoints;
  }

  /**
   * Calculate expected OG based on grain bill and efficiency
   */
  public static calculateExpectedOG(
    grainBill: GrainBillItem[],
    batchSize: number,
    volumeUnit: string,
    efficiency: number
  ): number {
    const batchSizeGal = UnitConverter.convertVolume(
      batchSize,
      volumeUnit,
      "gal"
    );
    const expectedPoints = this.calculateExpectedPoints(
      grainBill,
      batchSizeGal
    );

    const adjustedPoints = expectedPoints * (efficiency / 100);
    const gravityPoints = adjustedPoints / batchSizeGal;

    return 1.0 + gravityPoints / 1000;
  }

  /**
   * Calculate grain weight needed for target OG
   */
  public static calculateGrainWeight(
    targetOG: number,
    batchSize: number,
    volumeUnit: string,
    ppg: number,
    efficiency: number
  ): number {
    const batchSizeGal = UnitConverter.convertVolume(
      batchSize,
      volumeUnit,
      "gal"
    );
    const targetPoints = (targetOG - 1.0) * 1000 * batchSizeGal;

    // Adjust for efficiency
    const requiredPoints = targetPoints / (efficiency / 100);

    return requiredPoints / ppg;
  }

  /**
   * Analyze efficiency loss factors
   */
  public static analyzeEfficiencyLoss(
    expectedEfficiency: number,
    actualEfficiency: number
  ): {
    lossPercentage: number;
    possibleCauses: string[];
    recommendations: string[];
  } {
    const lossPercentage = expectedEfficiency - actualEfficiency;
    const possibleCauses: string[] = [];
    const recommendations: string[] = [];

    if (lossPercentage > 10) {
      possibleCauses.push(
        "Poor grain crushing",
        "Low mash temperature",
        "Short mash time"
      );
      recommendations.push(
        "Check grain crush consistency",
        "Verify mash temperature accuracy",
        "Consider longer mash time"
      );
    }

    if (lossPercentage > 15) {
      possibleCauses.push(
        "Poor lautering technique",
        "Stuck sparge",
        "pH issues"
      );
      recommendations.push(
        "Improve lautering process",
        "Check mash pH (5.2-5.6)",
        "Consider water chemistry adjustment"
      );
    }

    if (lossPercentage > 20) {
      possibleCauses.push(
        "Equipment calibration issues",
        "Recipe calculation errors"
      );
      recommendations.push(
        "Calibrate equipment",
        "Double-check recipe calculations"
      );
    }

    return {
      lossPercentage: Math.round(lossPercentage * 10) / 10,
      possibleCauses,
      recommendations,
    };
  }

  /**
   * Get typical efficiency ranges for different systems
   */
  public static getTypicalEfficiencies(): Record<
    string,
    { min: number; max: number; typical: number }
  > {
    return {
      "BIAB (Bag in a Pot)": { min: 65, max: 75, typical: 70 },
      "Cooler Mash Tun": { min: 70, max: 80, typical: 75 },
      "3-Vessel System": { min: 75, max: 85, typical: 80 },
      "RIMS/HERMS": { min: 80, max: 90, typical: 85 },
      Professional: { min: 85, max: 95, typical: 90 },
    };
  }

  /**
   * Get PPG values for common grains
   */
  public static getGrainPPG(): Record<
    string,
    { name: string; ppg: number; category: string }
  > {
    return {
      "2-row-pale": {
        name: "2-Row Pale Malt",
        ppg: this.GRAIN_PPG["2-row-pale"],
        category: "Base",
      },
      pilsner: {
        name: "Pilsner Malt",
        ppg: this.GRAIN_PPG["pilsner"],
        category: "Base",
      },
      wheat: {
        name: "Wheat Malt",
        ppg: this.GRAIN_PPG["wheat"],
        category: "Base",
      },
      munich: {
        name: "Munich Malt",
        ppg: this.GRAIN_PPG["munich"],
        category: "Base",
      },
      vienna: {
        name: "Vienna Malt",
        ppg: this.GRAIN_PPG["vienna"],
        category: "Base",
      },
      "crystal-40": {
        name: "Crystal 40L",
        ppg: this.GRAIN_PPG["crystal-40"],
        category: "Crystal",
      },
      "crystal-60": {
        name: "Crystal 60L",
        ppg: this.GRAIN_PPG["crystal-60"],
        category: "Crystal",
      },
      "crystal-120": {
        name: "Crystal 120L",
        ppg: this.GRAIN_PPG["crystal-120"],
        category: "Crystal",
      },
      chocolate: {
        name: "Chocolate Malt",
        ppg: this.GRAIN_PPG["chocolate"],
        category: "Roasted",
      },
      "roasted-barley": {
        name: "Roasted Barley",
        ppg: this.GRAIN_PPG["roasted-barley"],
        category: "Roasted",
      },
    };
  }

  /**
   * Calculate efficiency improvement needed
   */
  public static calculateImprovementNeeded(
    currentEfficiency: number,
    targetOG: number,
    actualOG: number
  ): { improvementNeeded: number; newEfficiency: number } {
    const currentPoints = (actualOG - 1.0) * 1000;
    const targetPoints = (targetOG - 1.0) * 1000;

    const improvementRatio = targetPoints / currentPoints;
    const newEfficiency = currentEfficiency * improvementRatio;
    const improvementNeeded = newEfficiency - currentEfficiency;

    return {
      improvementNeeded: Math.round(improvementNeeded * 10) / 10,
      newEfficiency: Math.round(newEfficiency * 10) / 10,
    };
  }

  /**
   * Validate inputs
   */
  private static validateInputs(
    grainBill: GrainBillItem[],
    expectedOG: number,
    actualOG: number,
    batchSize: number
  ): void {
    if (grainBill.length === 0) {
      throw new Error("Grain bill cannot be empty");
    }

    for (const grain of grainBill) {
      if (grain.weight <= 0 || grain.ppg <= 0) {
        throw new Error("Grain weight and PPG must be greater than 0");
      }
    }

    if (expectedOG < 1.02 || expectedOG > 1.15) {
      throw new Error("Expected OG must be between 1.020 and 1.150");
    }

    if (actualOG < 1.02 || actualOG > 1.15) {
      throw new Error("Actual OG must be between 1.020 and 1.150");
    }

    if (batchSize <= 0) {
      throw new Error("Batch size must be greater than 0");
    }
  }
}
