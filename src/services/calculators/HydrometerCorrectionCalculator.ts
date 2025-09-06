/**
 * Hydrometer Temperature Correction Calculator
 * Adjusts specific gravity readings based on wort temperature
 * Most hydrometers are calibrated at 60°F (15.5°C)
 */

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
    tempUnit: "f" | "c" = "f"
  ): CorrectionResult {
    // Validate inputs
    this.validateInputs(measuredGravity, wortTemp, calibrationTemp, tempUnit);

    // Convert temperatures to Fahrenheit for calculations
    let wortTempF = wortTemp;
    let calibrationTempF = calibrationTemp;

    if (tempUnit === "c") {
      wortTempF = UnitConverter.convertTemperature(wortTemp, "c", "f");
      calibrationTempF = UnitConverter.convertTemperature(
        calibrationTemp,
        "c",
        "f"
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
    tempUnit: "f" | "c" = "f"
  ): CorrectionResult {
    const defaultCalibrationTemp =
      tempUnit === "f"
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
   */
  public static findCorrectTemperature(
    measuredGravity: number,
    targetGravity: number,
    calibrationTemp: number,
    tempUnit: "f" | "c" = "f"
  ): number {
    // This is an iterative calculation - we'll use Newton's method
    let estimatedTemp = tempUnit === "f" ? 68 : 20; // Start with room temperature
    const tolerance = 0.001;
    const maxIterations = 100;

    for (let i = 0; i < maxIterations; i++) {
      const result = this.calculateCorrection(
        measuredGravity,
        estimatedTemp,
        calibrationTemp,
        tempUnit
      );
      const error = result.correctedGravity - targetGravity;

      if (Math.abs(error) < tolerance) {
        return Math.round(estimatedTemp * 10) / 10;
      }

      // Adjust estimate (simple gradient descent)
      estimatedTemp -= error * 100;

      // Keep within reasonable bounds
      if (tempUnit === "f") {
        estimatedTemp = Math.max(32, Math.min(212, estimatedTemp));
      } else {
        estimatedTemp = Math.max(0, Math.min(100, estimatedTemp));
      }
    }

    throw new Error("Could not converge on solution - check input values");
  }

  /**
   * Get correction table for common temperatures
   */
  public static getCorrectionTable(
    measuredGravity: number,
    calibrationTemp: number = 60,
    tempUnit: "f" | "c" = "f"
  ): { temp: number; correctedGravity: number; correction: number }[] {
    const temps =
      tempUnit === "f"
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
    tempUnit: "f" | "c" = "f"
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
    tempUnit: "f" | "c"
  ): void {
    // Validate specific gravity
    if (measuredGravity < 0.99 || measuredGravity > 1.2) {
      throw new Error("Measured gravity must be between 0.990 and 1.200");
    }

    // Validate temperatures based on unit
    if (tempUnit === "f") {
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
    { f: number; c: number }
  > {
    return {
      Standard: { f: 60, c: 15.5 },
      European: { f: 68, c: 20 },
      Precision: { f: 68, c: 20 },
      Digital: { f: 68, c: 20 },
    };
  }
}
