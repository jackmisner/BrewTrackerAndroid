/**
 * Dilution Calculator
 * Calculates dilution amounts for adjusting gravity and handling boil-off
 */

import { UnitConverter } from "./UnitConverter";

export interface DilutionResult {
  finalVolume: number;
  waterToAdd: number;
  finalGravity?: number;
  concentrationFactor?: number;
}

export interface BoilOffResult {
  preBoilVolume: number;
  boilOffVolume: number;
  concentrationFactor: number;
  finalGravity?: number;
}

export class DilutionCalculator {
  /**
   * Calculate water needed to dilute to target gravity
   * Uses the principle: GV = G'V' (gravity × volume is constant)
   */
  public static calculateDilution(
    currentGravity: number,
    currentVolume: number,
    targetGravity: number
  ): DilutionResult {
    // Validate inputs
    this.validateGravityInputs(currentGravity, targetGravity);
    this.validateVolumeInputs(currentVolume);

    if (targetGravity >= currentGravity) {
      throw new Error(
        "Target gravity must be lower than current gravity for dilution"
      );
    }

    // Convert gravity to gravity points for calculation
    const currentPoints = (currentGravity - 1.0) * 1000;
    const targetPoints = (targetGravity - 1.0) * 1000;

    // Calculate final volume using: Current Points × Current Volume = Target Points × Final Volume
    const finalVolume = (currentPoints * currentVolume) / targetPoints;
    const waterToAdd = finalVolume - currentVolume;
    const concentrationFactor = currentGravity / targetGravity;

    return {
      finalVolume: Math.round(finalVolume * 100) / 100,
      waterToAdd: Math.round(waterToAdd * 100) / 100,
      finalGravity: targetGravity,
      concentrationFactor: Math.round(concentrationFactor * 100) / 100,
    };
  }

  /**
   * Calculate pre-boil volume needed to account for boil-off
   */
  public static calculateBoilOff(
    targetVolume: number,
    boilOffRate: number, // volume per hour
    boilTime: number, // minutes
    originalGravity?: number // Optional: provide to calculate final gravity
  ): BoilOffResult {
    // Validate inputs
    this.validateVolumeInputs(targetVolume);

    if (boilOffRate <= 0) {
      throw new Error("Boil-off rate must be greater than 0");
    }

    if (boilTime <= 0) {
      throw new Error("Boil time must be greater than 0");
    }

    // Calculate boil-off volume
    const boilTimeHours = boilTime / 60;
    const boilOffVolume = boilOffRate * boilTimeHours;
    const preBoilVolume = targetVolume + boilOffVolume;
    const concentrationFactor = preBoilVolume / targetVolume;

    // Calculate final gravity if original gravity is provided
    let finalGravity: number | undefined;
    if (originalGravity !== undefined) {
      this.validateGravityInputs(originalGravity);
      const originalPoints = (originalGravity - 1.0) * 1000;
      const concentratedPoints = originalPoints * concentrationFactor;
      finalGravity =
        Math.round((1.0 + concentratedPoints / 1000) * 1000) / 1000;
    }

    return {
      preBoilVolume: Math.round(preBoilVolume * 100) / 100,
      boilOffVolume: Math.round(boilOffVolume * 100) / 100,
      concentrationFactor: Math.round(concentrationFactor * 100) / 100,
      finalGravity: finalGravity,
    };
  }

  /**
   * Calculate gravity concentration due to boil-off
   */
  public static calculateGravityConcentration(
    originalGravity: number,
    preBoilVolume: number,
    postBoilVolume: number
  ): number {
    // Validate inputs
    this.validateGravityInputs(originalGravity);
    this.validateVolumeInputs(preBoilVolume);
    this.validateVolumeInputs(postBoilVolume);

    if (postBoilVolume >= preBoilVolume) {
      throw new Error("Post-boil volume must be less than pre-boil volume");
    }

    // Convert to gravity points
    const originalPoints = (originalGravity - 1.0) * 1000;

    // Calculate concentrated gravity points
    const concentratedPoints =
      (originalPoints * preBoilVolume) / postBoilVolume;

    // Convert back to gravity
    const concentratedGravity = 1.0 + concentratedPoints / 1000;

    return Math.round(concentratedGravity * 1000) / 1000;
  }

  /**
   * Calculate blending of two different gravity worts
   */
  public static calculateBlending(
    gravity1: number,
    volume1: number,
    gravity2: number,
    volume2: number
  ): DilutionResult {
    // Validate inputs
    this.validateGravityInputs(gravity1);
    this.validateGravityInputs(gravity2);
    this.validateVolumeInputs(volume1);
    this.validateVolumeInputs(volume2);

    // Convert to gravity points
    const points1 = (gravity1 - 1.0) * 1000;
    const points2 = (gravity2 - 1.0) * 1000;

    // Calculate weighted average
    const totalVolume = volume1 + volume2;
    const averagePoints = (points1 * volume1 + points2 * volume2) / totalVolume;
    const finalGravity = 1.0 + averagePoints / 1000;

    return {
      finalVolume: Math.round(totalVolume * 100) / 100,
      waterToAdd: 0, // Not applicable for blending
      finalGravity: Math.round(finalGravity * 1000) / 1000,
      concentrationFactor: Math.max(gravity1, gravity2) / finalGravity,
    };
  }

  /**
   * Calculate alcohol dilution for high-gravity beers
   * Useful for adjusting strong beers after fermentation
   */
  public static calculateAlcoholDilution(
    currentGravity: number,
    currentVolume: number,
    currentABV: number,
    targetABV: number
  ): DilutionResult {
    // Validate inputs
    this.validateGravityInputs(currentGravity);
    this.validateVolumeInputs(currentVolume);
    if (currentABV <= 0 || currentABV > 20) {
      throw new Error("Current ABV must be between 0% and 20%");
    }
    if (targetABV <= 0 || targetABV >= currentABV) {
      throw new Error(
        "Target ABV must be greater than 0% and less than current ABV"
      );
    }

    // Calculate dilution ratio based on alcohol content
    const dilutionRatio = currentABV / targetABV;
    const finalVolume = currentVolume * dilutionRatio;
    const waterToAdd = finalVolume - currentVolume;

    // Calculate approximate final gravity after dilution
    const gravityPoints = (currentGravity - 1.0) * 1000;
    const dilutedPoints = gravityPoints / dilutionRatio;
    const finalGravity = 1.0 + dilutedPoints / 1000;

    return {
      finalVolume: Math.round(finalVolume * 100) / 100,
      waterToAdd: Math.round(waterToAdd * 100) / 100,
      finalGravity: Math.round(finalGravity * 1000) / 1000,
      concentrationFactor: 1 / dilutionRatio,
    };
  }

  /**
   * Calculate typical boil-off rates for different kettle types
   */
  public static getTypicalBoilOffRates(
    volumeUnit: string = "gal"
  ): Record<string, number> {
    const ratesPerHour = {
      "Electric Indoor": 0.5,
      "Gas Indoor": 0.8,
      "Gas Outdoor": 1.0,
      "Propane Outdoor": 1.2,
      "High Efficiency": 0.3,
    };

    // Convert to requested unit if not gallons
    if (volumeUnit !== "gal") {
      const convertedRates: Record<string, number> = {};
      Object.entries(ratesPerHour).forEach(([key, value]) => {
        convertedRates[key] = UnitConverter.convertVolume(
          value,
          "gal",
          volumeUnit
        );
      });
      return convertedRates;
    }

    return ratesPerHour;
  }

  /**
   * Validate gravity inputs
   */
  private static validateGravityInputs(
    gravity1: number,
    gravity2?: number
  ): void {
    if (!Number.isFinite(gravity1)) {
      throw new Error("Gravity must be a finite number");
    }
    if (gravity1 < 1.0 || gravity1 > 1.2) {
      throw new Error("Gravity must be between 1.000 and 1.200");
    }
    if (gravity2 !== undefined && (gravity2 < 1.0 || gravity2 > 1.2)) {
      throw new Error("Gravity must be between 1.000 and 1.200");
    }
  }

  /**
   * Validate volume inputs
   */
  private static validateVolumeInputs(volume: number): void {
    if (volume <= 0) {
      throw new Error("Volume must be greater than 0");
    }
    if (volume > 1000) {
      throw new Error("Volume seems unreasonably large");
    }
  }

  /**
   * Convert dilution result to different volume units
   */
  public static convertResultUnits(
    result: DilutionResult | null,
    fromUnit: string,
    toUnit: string
  ): DilutionResult | null {
    if (fromUnit === toUnit) {
      return result;
    }
    if (!result) {
      return null;
    }
    return {
      ...result,
      finalVolume: UnitConverter.convertVolume(
        result.finalVolume,
        fromUnit,
        toUnit
      ),
      waterToAdd: UnitConverter.convertVolume(
        result.waterToAdd,
        fromUnit,
        toUnit
      ),
    };
  }
}
