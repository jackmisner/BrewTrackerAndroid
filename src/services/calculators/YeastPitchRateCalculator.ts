/**
 * Yeast Pitch Rate Calculator
 * Calculates optimal yeast cell count for healthy fermentation
 */

import { UnitConverter } from "./UnitConverter";

export interface YeastPitchResult {
  targetCells: number; // billion cells
  packetsNeeded: number;
  pitchRate: number; // million cells per ml per degree Plato
  viabilityAdjustment: number;
}

export class YeastPitchRateCalculator {
  // Standard pitch rates (million cells per ml per degree Plato)
  private static readonly PITCH_RATES = {
    ale: {
      low: 0.75, // Light ales
      standard: 1.0, // Most ales
      high: 1.5, // High gravity ales
    },
    lager: {
      low: 1.0, // Light lagers
      standard: 1.5, // Most lagers
      high: 2.0, // High gravity lagers
    },
  };

  // Typical cell counts per package
  private static readonly CELLS_PER_PACKAGE = {
    "liquid-yeast": 100, // billion cells (Wyeast/White Labs)
    "dry-yeast": 200, // billion cells (11g packet)
    "starter-1L": 180, // billion cells (1L starter)
    "starter-2L": 360, // billion cells (2L starter)
  };

  /**
   * Calculate yeast pitch rate
   */
  public static calculatePitchRate(
    originalGravity: number,
    beerVolume: number,
    volumeUnit: string,
    yeastType: "ale" | "lager",
    gravityCategory: "low" | "standard" | "high" = "standard",
    viability: number = 100,
    packageType: string = "liquid-yeast"
  ): YeastPitchResult {
    // Validate inputs
    this.validateInputs(originalGravity, beerVolume, viability);

    // Convert volume to liters
    const volumeLiters = UnitConverter.convertVolume(
      beerVolume,
      volumeUnit,
      "l"
    );
    const volumeMl = volumeLiters * 1000;

    // Convert gravity to Plato
    const plato = this.sgToPlato(originalGravity);

    // Get pitch rate for yeast type and gravity
    const basePitchRate = this.PITCH_RATES[yeastType][gravityCategory];

    // Calculate total cells needed (billion)
    const targetCells = (basePitchRate * volumeMl * plato) / 1000;

    // Adjust for viability
    const viabilityDecimal = viability / 100;
    const adjustedCells = targetCells / viabilityDecimal;

    // Calculate packages needed
    const cellsPerPackage =
      this.CELLS_PER_PACKAGE[
        packageType as keyof typeof this.CELLS_PER_PACKAGE
      ] || this.CELLS_PER_PACKAGE["liquid-yeast"];
    const packetsNeeded = Math.ceil(adjustedCells / cellsPerPackage);

    return {
      targetCells: Math.round(targetCells * 10) / 10,
      packetsNeeded,
      pitchRate: basePitchRate,
      viabilityAdjustment:
        Math.round((adjustedCells / targetCells) * 100) / 100,
    };
  }

  /**
   * Calculate yeast viability based on age and storage
   */
  public static calculateViability(
    productionDate: Date,
    storageTemp: "fridge" | "room",
    yeastType: "liquid" | "dry"
  ): number {
    const now = new Date();
    const rawAgeInMonths =
      (now.getFullYear() - productionDate.getFullYear()) * 12 +
      (now.getMonth() - productionDate.getMonth()) +
      (now.getDate() < productionDate.getDate() ? -1 : 0);

    // Clamp age to minimum of 0 to handle future dates
    const ageInMonths = Math.max(0, rawAgeInMonths);

    let viability = 100;

    if (yeastType === "liquid") {
      // Liquid yeast loses viability faster
      if (storageTemp === "fridge") {
        // Exponential decay: ~21% loss per month (0.79^months)
        viability = Math.max(10, 100 * Math.pow(0.79, ageInMonths));
      } else {
        // Exponential decay: ~35% loss per month (0.65^months)
        viability = Math.max(5, 100 * Math.pow(0.65, ageInMonths));
      }
    } else {
      // Dry yeast is more stable
      if (storageTemp === "fridge") {
        viability = Math.max(50, 100 - ageInMonths * 3); // 3% per month in fridge
      } else {
        viability = Math.max(30, 100 - ageInMonths * 8); // 8% per month at room temp
      }
    }

    // Ensure viability is capped at 100%
    return Math.round(Math.min(viability, 100));
  }

  /**
   * Calculate starter size needed
   */
  public static calculateStarterSize(
    targetCells: number,
    currentCells: number,
    viability: number = 100,
    stirPlateUsed: boolean = false
  ): { starterSize: number; estimatedCells: number; growthFactor: number } {
    const viableCells = (currentCells * viability) / 100;

    if (viableCells >= targetCells) {
      return {
        starterSize: 0,
        estimatedCells: viableCells,
        growthFactor: 1,
      };
    }

    // Growth factors based on stir plate usage
    // Conservative factors for non-stirred starters, higher for stir plate
    const growthFactors = stirPlateUsed
      ? {
          500: 2.5, // 500ml starter with stir plate
          1000: 3.5, // 1L starter with stir plate
          2000: 5.0, // 2L starter with stir plate
          4000: 7.0, // 4L starter with stir plate
        }
      : {
          500: 1.8, // 500ml starter without stir plate
          1000: 2.2, // 1L starter without stir plate
          2000: 2.8, // 2L starter without stir plate
          4000: 3.5, // 4L starter without stir plate
        };

    let bestSize = 0;
    let estimatedCells = viableCells;
    let growthFactor = 1;

    for (const [size, factor] of Object.entries(growthFactors)) {
      const sizeNum = parseInt(size);
      const projectedCells = viableCells * factor;

      if (
        projectedCells >= targetCells &&
        (bestSize === 0 || sizeNum < bestSize)
      ) {
        bestSize = sizeNum;
        estimatedCells = projectedCells;
        growthFactor = factor;
      }
    }

    return {
      starterSize: bestSize,
      estimatedCells: Math.round(estimatedCells * 10) / 10,
      growthFactor,
    };
  }

  /**
   * Get recommended pitch rates for different beer styles
   */
  public static getStylePitchRates(): Record<
    string,
    {
      yeastType: "ale" | "lager";
      pitchRate: "low" | "standard" | "high";
      description: string;
    }
  > {
    return {
      "Light Lager": {
        yeastType: "lager",
        pitchRate: "low",
        description: "Clean, light beers",
      },
      "Standard Lager": {
        yeastType: "lager",
        pitchRate: "standard",
        description: "Most lagers",
      },
      "Bock/Strong Lager": {
        yeastType: "lager",
        pitchRate: "high",
        description: "High gravity lagers",
      },
      "Pale Ale": {
        yeastType: "ale",
        pitchRate: "standard",
        description: "Most ales",
      },
      IPA: {
        yeastType: "ale",
        pitchRate: "standard",
        description: "Hoppy ales",
      },
      "Stout/Porter": {
        yeastType: "ale",
        pitchRate: "standard",
        description: "Dark ales",
      },
      "Barleywine/Imperial": {
        yeastType: "ale",
        pitchRate: "high",
        description: "High gravity ales",
      },
      "Session Ales": {
        yeastType: "ale",
        pitchRate: "low",
        description: "Low gravity ales",
      },
    };
  }

  /**
   * Convert specific gravity to Plato
   */
  private static sgToPlato(sg: number): number {
    return (
      -616.868 +
      1111.14 * sg -
      630.272 * Math.pow(sg, 2) +
      135.997 * Math.pow(sg, 3)
    );
  }

  /**
   * Validate inputs
   */
  private static validateInputs(
    originalGravity: number,
    beerVolume: number,
    viability: number
  ): void {
    if (originalGravity < 1.02 || originalGravity > 1.15) {
      throw new Error("Original gravity must be between 1.020 and 1.150");
    }
    if (beerVolume <= 0) {
      throw new Error("Beer volume must be greater than 0");
    }
    if (viability <= 0 || viability > 100) {
      throw new Error(
        "Yeast viability must be greater than 0% and at most 100%"
      );
    }
  }

  /**
   * Get package types with cell counts
   */
  public static getPackageTypes(): Record<
    string,
    { name: string; cellCount: number; description: string }
  > {
    return {
      "liquid-yeast": {
        name: "Liquid Yeast",
        cellCount: this.CELLS_PER_PACKAGE["liquid-yeast"],
        description: "Wyeast/White Labs vial or smack pack",
      },
      "dry-yeast": {
        name: "Dry Yeast",
        cellCount: this.CELLS_PER_PACKAGE["dry-yeast"],
        description: "11g packet (Safale, Fermentis, etc.)",
      },
      "starter-1L": {
        name: "1L Starter",
        cellCount: this.CELLS_PER_PACKAGE["starter-1L"],
        description: "1 liter yeast starter",
      },
      "starter-2L": {
        name: "2L Starter",
        cellCount: this.CELLS_PER_PACKAGE["starter-2L"],
        description: "2 liter yeast starter",
      },
    };
  }
}
