/**
 * Strike Water Temperature Calculator
 * Calculates the temperature of water needed to achieve target mash temperature
 */

import { TemperatureUnit } from "@/src/types/common";
import { UnitConverter } from "./UnitConverter";

export interface StrikeWaterResult {
  strikeTemp: number;
  waterVolume: number;
  thermalMass: number;
}

export interface InfusionResult extends StrikeWaterResult {
  infusionTemp: number;
  infusionVolume: number;
  totalWaterVolume: number;
}

export class StrikeWaterCalculator {
  // Thermal mass constants
  private static readonly GRAIN_THERMAL_MASS = 0.4; // Btu per pound per degree F
  private static readonly WATER_THERMAL_MASS = 1.0; // Btu per pound per degree F
  private static readonly TUN_THERMAL_MASS = 0.3; // Btu per pound per degree F (typical for steel/aluminum)

  /**
   * Calculate initial strike water temperature for mashing
   */
  public static calculateStrikeWater(
    grainWeight: number,
    grainWeightUnit: string,
    grainTemp: number,
    targetMashTemp: number,
    waterToGrainRatio: number = 1.25,
    tempUnit: TemperatureUnit = "F",
    tunWeight: number = 10 // pounds of tun material
  ): StrikeWaterResult {
    // Convert grain weight to pounds for calculations
    const grainWeightLbs = UnitConverter.convertWeight(
      grainWeight,
      grainWeightUnit,
      "lb"
    );

    // Convert temperatures to Fahrenheit for calculations
    let grainTempF = grainTemp;
    let targetMashTempF = targetMashTemp;

    if (tempUnit === "C") {
      grainTempF = UnitConverter.convertTemperature(grainTemp, "C", "F");
      targetMashTempF = UnitConverter.convertTemperature(
        targetMashTemp,
        "C",
        "F"
      );
    }

    // Calculate water volume using water-to-grain ratio (qt/lb)
    const waterVolumeQuarts = waterToGrainRatio * grainWeightLbs;
    const waterVolumeLbs = waterVolumeQuarts * 2.08; // Convert quarts to pounds (1 quart water = 2.08 pounds)

    // Calculate thermal masses
    const grainThermalMass = grainWeightLbs * this.GRAIN_THERMAL_MASS;
    const waterThermalMass = waterVolumeLbs * this.WATER_THERMAL_MASS;
    const tunThermalMass = tunWeight * this.TUN_THERMAL_MASS;
    const totalThermalMass =
      grainThermalMass + waterThermalMass + tunThermalMass;

    // Strike water temperature calculation
    // Based on thermal equilibrium: heat lost = heat gained
    const tempRise = targetMashTempF - grainTempF;
    const strikeWaterTempF =
      targetMashTempF + (tempRise * totalThermalMass) / waterThermalMass;

    // Convert results back to requested unit
    let strikeTemp = strikeWaterTempF;
    if (tempUnit === "C") {
      strikeTemp = UnitConverter.convertTemperature(strikeWaterTempF, "F", "C");
    }

    return {
      strikeTemp: Math.round(strikeTemp * 10) / 10,
      waterVolume: Math.round(waterVolumeQuarts * 10) / 10,
      thermalMass: Math.round(totalThermalMass * 100) / 100,
    };
  }

  /**
   * Calculate infusion water for step mashing
   */
  public static calculateInfusion(
    currentMashTemp: number,
    targetMashTemp: number,
    currentMashVolume: number, // quarts
    infusionWaterTemp: number,
    tempUnit: TemperatureUnit = "F"
  ): InfusionResult {
    // Convert temperatures to Fahrenheit for calculations
    let currentTempF = currentMashTemp;
    let targetTempF = targetMashTemp;
    let infusionTempF = infusionWaterTemp;

    if (tempUnit === "C") {
      currentTempF = UnitConverter.convertTemperature(
        currentMashTemp,
        "C",
        "F"
      );
      targetTempF = UnitConverter.convertTemperature(targetMashTemp, "C", "F");
      infusionTempF = UnitConverter.convertTemperature(
        infusionWaterTemp,
        "C",
        "F"
      );
    }

    // Calculate infusion volume needed
    // Formula: Infusion Volume = (Target Temp - Current Temp) × Mash Volume / (Infusion Temp - Target Temp)
    const tempRise = targetTempF - currentTempF;
    const tempDelta = infusionTempF - targetTempF;

    if (tempDelta <= 0) {
      throw new Error(
        "Infusion water temperature must be higher than target mash temperature"
      );
    }

    const infusionVolume = (tempRise * currentMashVolume) / tempDelta;
    const totalVolume = currentMashVolume + infusionVolume;

    // Convert temperatures back to requested unit
    let targetTemp = targetTempF;
    let infusionTemp = infusionTempF;
    if (tempUnit === "C") {
      targetTemp = UnitConverter.convertTemperature(targetTempF, "F", "C");
      infusionTemp = UnitConverter.convertTemperature(infusionTempF, "F", "C");
    }

    return {
      strikeTemp: targetTemp,
      waterVolume: Math.round(infusionVolume * 10) / 10,
      thermalMass: 0, // Not applicable for infusions
      infusionTemp: infusionTemp,
      infusionVolume: Math.round(infusionVolume * 10) / 10,
      totalWaterVolume: Math.round(totalVolume * 10) / 10,
    };
  }

  /**
   * Calculate water volume needed for a given water-to-grain ratio
   */
  public static calculateWaterVolume(
    grainWeight: number,
    grainWeightUnit: string,
    waterToGrainRatio: number,
    outputVolumeUnit: string = "qt"
  ): number {
    const grainWeightLbs = UnitConverter.convertWeight(
      grainWeight,
      grainWeightUnit,
      "lb"
    );
    // Water-to-grain ratio is in quarts per pound
    const waterVolumeQuarts = grainWeightLbs * waterToGrainRatio;

    return UnitConverter.convertVolume(
      waterVolumeQuarts,
      "qt",
      outputVolumeUnit
    );
  }

  /**
   * Validate inputs
   */
  public static validateInputs(
    grainWeight: number,
    grainTemp: number,
    targetMashTemp: number,
    waterToGrainRatio: number,
    tempUnit: TemperatureUnit
  ): void {
    if (grainWeight <= 0) {
      throw new Error("Grain weight must be greater than 0");
    }

    if (waterToGrainRatio <= 0 || waterToGrainRatio > 10) {
      throw new Error("Water to grain ratio must be between 0 and 10");
    }

    // Temperature validation based on unit
    if (tempUnit === "F") {
      if (grainTemp < 32 || grainTemp > 120) {
        throw new Error("Grain temperature must be between 32°F and 120°F");
      }
      if (targetMashTemp < 140 || targetMashTemp > 170) {
        throw new Error(
          "Target mash temperature must be between 140°F and 170°F"
        );
      }
    } else {
      if (grainTemp < 0 || grainTemp > 50) {
        throw new Error("Grain temperature must be between 0°C and 50°C");
      }
      if (targetMashTemp < 60 || targetMashTemp > 77) {
        throw new Error(
          "Target mash temperature must be between 60°C and 77°C"
        );
      }
    }

    if (targetMashTemp <= grainTemp) {
      throw new Error(
        "Target mash temperature must be higher than grain temperature"
      );
    }
  }

  /**
   * Get recommended water-to-grain ratios for different mash types
   */
  public static getRecommendedRatios(): Record<string, number> {
    return {
      "Thick Mash": 1.0,
      "Medium Mash": 1.25,
      "Thin Mash": 1.5,
      Decoction: 1.0,
      "Step Mash": 1.25,
      "Single Infusion": 1.25,
    };
  }
}
