/**
 * Hydrometer Temperature Correction Calculator
 * Adjusts specific gravity readings based on wort temperature
 * Most hydrometers are calibrated at 60°F (15.5°C)
 */

import { TemperatureUnit } from "@/src/types/common";
import { UnitConverter } from "./UnitConverter";

export interface CorrectionResult {
  correctedGravity: number;
  correction: number;
  calibrationTemp?: number;
  actualTemp?: number;
}

export class HydrometerCorrectionCalculator {
  // Standard calibration temperature for most hydrometers
  private static readonly DEFAULT_CALIBRATION_TEMP_F = 60;
  private static readonly DEFAULT_CALIBRATION_TEMP_C = 15.5;

  /**
   * Calculate temperature correction for hydrometer readings
   * Uses the formula: CG = MG * ((1.00130346 - 0.000134722124 * T + 0.00000204052596 * T^2 - 0.00000000232820948 * T^3) /
   *                             (1.00130346 - 0.000134722124 * TR + 0.00000204052596 * TR^2 - 0.00000000232820948 * TR^3))
   * Where: CG = Corrected Gravity, MG = Measured Gravity, T = Actual Temperature, TR = Reference Temperature
   */
  public static calculateCorrection(
    measuredGravity: number,
    wortTemp: number,
    calibrationTemp: number,
    tempUnit: TemperatureUnit = "F"
  ): CorrectionResult {
    // Validate inputs
    this.validateInputs(measuredGravity, wortTemp, calibrationTemp, tempUnit);

    // Convert temperatures to Fahrenheit for calculations
    let wortTempF = wortTemp;
    let calibrationTempF = calibrationTemp;

    if (tempUnit === "C") {
      wortTempF = UnitConverter.convertTemperature(wortTemp, "C", "F");
      calibrationTempF = UnitConverter.convertTemperature(
        calibrationTemp,
        "C",
        "F"
      );
    }

    // Temperature correction formula coefficients
    const a = 1.00130346;
    const b = -0.000134722124;
    const c = 0.00000204052596;
    const d = -0.00000000232820948;

    // Calculate correction factors
    const actualTempFactor =
      a +
      b * wortTempF +
      c * Math.pow(wortTempF, 2) +
      d * Math.pow(wortTempF, 3);
    const referenceTempFactor =
      a +
      b * calibrationTempF +
      c * Math.pow(calibrationTempF, 2) +
      d * Math.pow(calibrationTempF, 3);

    // Apply correction
    const correctedGravity =
      measuredGravity * (actualTempFactor / referenceTempFactor);
    const correction = correctedGravity - measuredGravity;

    return {
      correctedGravity: Math.round(correctedGravity * 1000) / 1000,
      correction: Math.round(correction * 1000) / 1000,
      calibrationTemp: calibrationTemp,
      actualTemp: wortTemp,
    };
  }

  /**
   * Calculate correction using default calibration temperature
   */
  public static calculateCorrectionDefault(
    measuredGravity: number,
    wortTemp: number,
    tempUnit: TemperatureUnit = "F"
  ): CorrectionResult {
    const defaultCalibrationTemp =
      tempUnit === "F"
        ? this.DEFAULT_CALIBRATION_TEMP_F
        : this.DEFAULT_CALIBRATION_TEMP_C;

    return this.calculateCorrection(
      measuredGravity,
      wortTemp,
      defaultCalibrationTemp,
      tempUnit
    );
  }

  /**
   * Calculate the temperature at which a given gravity reading would be correct
   * Useful for determining if temperature correction is needed
   * Uses bisection method for robust convergence
   */
  public static findCorrectTemperature(
    measuredGravity: number,
    targetGravity: number,
    calibrationTemp: number,
    tempUnit: TemperatureUnit = "F"
  ): number {
    // Set initial bounds based on physical temperature limits
    let low: number, high: number;
    if (tempUnit === "F") {
      low = 32; // Freezing point of water in Fahrenheit
      high = 212; // Boiling point of water in Fahrenheit
    } else {
      low = 0; // Freezing point of water in Celsius
      high = 100; // Boiling point of water in Celsius
    }

    const tolerance = 0.001;
    const maxIterations = 100;

    for (let i = 0; i < maxIterations; i++) {
      const mid = (low + high) / 2;

      const result = this.calculateCorrection(
        measuredGravity,
        mid,
        calibrationTemp,
        tempUnit
      );
      const error = result.correctedGravity - targetGravity;

      // Check for convergence
      if (Math.abs(error) < tolerance) {
        return Math.round(mid * 10) / 10;
      }

      // Use the sign of error to choose which half to keep
      // If correctedGravity > targetGravity, the temperature is too high
      // If correctedGravity < targetGravity, the temperature is too low
      if (error > 0) {
        high = mid; // Temperature too high, search lower half
      } else {
        low = mid; // Temperature too low, search upper half
      }
    }

    throw new Error("Could not converge on solution - check input values");
  }

  /**
   * Get correction table for common temperatures
   *
   * @param measuredGravity - The specific gravity reading from the hydrometer
   * @param calibrationTemp - The calibration temperature of the hydrometer (default: 60°F)
   *                          Note: Default of 60 is meaningful only when tempUnit="F".
   *                          If using tempUnit="C", explicitly pass 15.5 for standard calibration.
   * @param tempUnit - Temperature unit ("F" or "C", default: "F")
   * @returns Array of temperature-correction pairs for display
   */
  public static getCorrectionTable(
    measuredGravity: number,
    calibrationTemp: number = 60,
    tempUnit: TemperatureUnit = "F"
  ): { temp: number; correctedGravity: number; correction: number }[] {
    const temps =
      tempUnit === "F"
        ? [50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100, 110, 120]
        : [10, 13, 15.5, 18, 21, 24, 27, 29, 32, 35, 38, 43, 49];

    return temps.map(temp => {
      const result = this.calculateCorrection(
        measuredGravity,
        temp,
        calibrationTemp,
        tempUnit
      );
      return {
        temp,
        correctedGravity: result.correctedGravity,
        correction: result.correction,
      };
    });
  }

  /**
   * Check if temperature correction is significant
   * Returns true if correction is greater than 0.001 SG points
   */
  public static isCorrectionSignificant(
    wortTemp: number,
    calibrationTemp: number,
    tempUnit: TemperatureUnit = "F"
  ): boolean {
    // Calculate correction for a reference gravity of 1.050
    const result = this.calculateCorrection(
      1.05,
      wortTemp,
      calibrationTemp,
      tempUnit
    );
    return Math.abs(result.correction) > 0.001;
  }

  /**
   * Validate inputs
   */
  private static validateInputs(
    measuredGravity: number,
    wortTemp: number,
    calibrationTemp: number,
    tempUnit: TemperatureUnit
  ): void {
    // Validate specific gravity
    if (measuredGravity < 0.99 || measuredGravity > 1.2) {
      throw new Error("Measured gravity must be between 0.990 and 1.200");
    }

    // Validate temperatures based on unit
    if (tempUnit === "F") {
      if (wortTemp < 32 || wortTemp > 212) {
        throw new Error("Wort temperature must be between 32°F and 212°F");
      }
      if (calibrationTemp < 32 || calibrationTemp > 212) {
        throw new Error(
          "Calibration temperature must be between 32°F and 212°F"
        );
      }
    } else {
      if (wortTemp < 0 || wortTemp > 100) {
        throw new Error("Wort temperature must be between 0°C and 100°C");
      }
      if (calibrationTemp < 0 || calibrationTemp > 100) {
        throw new Error(
          "Calibration temperature must be between 0°C and 100°C"
        );
      }
    }
  }

  /**
   * Get typical calibration temperatures for different hydrometer types
   */
  public static getCalibrationTemperatures(): Record<
    string,
    { F: number; C: number }
  > {
    return {
      Standard: { F: 60, C: 15.5 },
      European: { F: 68, C: 20 },
      Precision: { F: 68, C: 20 },
      Digital: { F: 68, C: 20 },
    };
  }
}
