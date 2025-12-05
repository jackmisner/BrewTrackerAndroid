/**
 * Unified utility class for all unit conversions
 * Ported from BrewTracker backend with React Native compatibility
 */
export class UnitConverter {
  // Weight conversions (to grams as base unit)
  private static readonly WEIGHT_TO_GRAMS: Record<string, number> = {
    g: 1.0,
    gram: 1.0,
    grams: 1.0,
    kg: 1000.0,
    kilogram: 1000.0,
    kilograms: 1000.0,
    oz: 28.3495,
    ounce: 28.3495,
    ounces: 28.3495,
    lb: 453.592,
    lbs: 453.592,
    pound: 453.592,
    pounds: 453.592,
  };

  // Volume conversions (to liters as base unit)
  private static readonly VOLUME_TO_LITERS: Record<string, number> = {
    ml: 0.001,
    milliliter: 0.001,
    milliliters: 0.001,
    l: 1.0,
    liter: 1.0,
    liters: 1.0,
    L: 1.0, // Capital L alias
    floz: 0.0295735, // US fluid ounce
    fl_oz: 0.0295735,
    fluid_ounce: 0.0295735,
    cup: 0.236588, // US cup
    cups: 0.236588,
    pint: 0.473176, // US pint
    pints: 0.473176,
    pt: 0.473176,
    quart: 0.946353, // US quart
    quarts: 0.946353,
    qt: 0.946353,
    gallon: 3.78541, // US gallon
    gallons: 3.78541,
    gal: 3.78541,
    tsp: 0.00492892,
    tbsp: 0.0147868,
  };

  /**
   * Normalize temperature unit to canonical form ("C" or "F")
   * Only supports Celsius and Fahrenheit (Kelvin is not used in brewing)
   * @private
   */
  private static normalizeTemperatureUnit(unit: string): "C" | "F" {
    const normalized = unit.toLowerCase();
    switch (normalized) {
      case "f":
      case "fahrenheit":
        return "F";
      case "c":
      case "celsius":
        return "C";
      default:
        throw new Error(
          `Unsupported temperature unit: ${unit}. Only Celsius (C) and Fahrenheit (F) are supported for brewing.`
        );
    }
  }

  // Temperature conversion functions
  public static convertTemperature(
    value: number,
    fromUnit: string,
    toUnit: string
  ): number {
    // Normalize units to canonical form
    const from = this.normalizeTemperatureUnit(fromUnit);
    const to = this.normalizeTemperatureUnit(toUnit);

    if (from === to) {
      return value;
    }

    // Direct conversion between C and F
    if (from === "F") {
      // F to C
      return (value - 32) * (5 / 9);
    } else {
      // C to F
      return value * (9 / 5) + 32;
    }
  }

  public static convertWeight(
    amount: number,
    fromUnit: string,
    toUnit: string
  ): number {
    if (fromUnit === toUnit) {
      return amount;
    }

    const fromUnitLower = fromUnit.toLowerCase();
    const toUnitLower = toUnit.toLowerCase();

    if (fromUnitLower === toUnitLower) {
      return amount;
    }

    // Convert to grams first, then to target unit
    const fromFactor = this.WEIGHT_TO_GRAMS[fromUnitLower];
    const toFactor = this.WEIGHT_TO_GRAMS[toUnitLower];

    if (fromFactor === undefined) {
      throw new Error(`Unknown weight unit: ${fromUnit}`);
    }
    if (toFactor === undefined) {
      throw new Error(`Unknown weight unit: ${toUnit}`);
    }

    const grams = amount * fromFactor;
    const result = grams / toFactor;

    // Round to reasonable precision to avoid floating point errors
    // For weights: 6 decimal places is sufficient for brewing precision
    return Math.round(result * 1000000) / 1000000;
  }

  public static convertToPounds(amount: number, unit: string): number {
    return this.convertWeight(amount, unit, "lb");
  }

  public static convertToOunces(amount: number, unit: string): number {
    return this.convertWeight(amount, unit, "oz");
  }

  public static convertVolume(
    amount: number,
    fromUnit: string,
    toUnit: string
  ): number {
    if (fromUnit === toUnit) {
      return amount;
    }

    const fromUnitLower = fromUnit.toLowerCase();
    const toUnitLower = toUnit.toLowerCase();

    if (fromUnitLower === toUnitLower) {
      return amount;
    }

    // Convert to liters first, then to target unit
    const fromFactor = this.VOLUME_TO_LITERS[fromUnitLower];
    const toFactor = this.VOLUME_TO_LITERS[toUnitLower];
    if (fromFactor === undefined) {
      throw new Error(`Unknown volume unit: ${fromUnit}`);
    }
    if (toFactor === undefined) {
      throw new Error(`Unknown volume unit: ${toUnit}`);
    }

    const liters = amount * fromFactor;
    const result = liters / toFactor;

    // Round to reasonable precision to avoid floating point errors
    // For volumes: 6 decimal places is sufficient for brewing precision
    return Math.round(result * 1000000) / 1000000;
  }

  public static convertToGallons(amount: number, unit: string): number {
    return this.convertVolume(amount, unit, "gal");
  }

  public static convertToLiters(amount: number, unit: string): number {
    return this.convertVolume(amount, unit, "l");
  }

  // Utility methods for getting available units
  public static getWeightUnits(): string[] {
    return Object.keys(this.WEIGHT_TO_GRAMS);
  }

  public static getVolumeUnits(): string[] {
    return Object.keys(this.VOLUME_TO_LITERS);
  }

  public static getTemperatureUnits(): string[] {
    return ["F", "C"]; // Only Celsius and Fahrenheit are used in brewing
  }

  // Validation methods
  public static isValidWeightUnit(unit: string): boolean {
    return unit.toLowerCase() in this.WEIGHT_TO_GRAMS;
  }

  public static isValidVolumeUnit(unit: string): boolean {
    return unit.toLowerCase() in this.VOLUME_TO_LITERS;
  }

  public static isValidTemperatureUnit(unit: string): boolean {
    try {
      this.normalizeTemperatureUnit(unit);
      return true;
    } catch {
      return false;
    }
  }

  // Formatting methods for display
  public static formatWeight(amount: number, unit: string): string {
    const formatted = amount < 1 ? amount.toFixed(3) : amount.toFixed(2);
    return `${formatted} ${unit}`;
  }

  public static formatVolume(amount: number, unit: string): string {
    const formatted = amount < 1 ? amount.toFixed(3) : amount.toFixed(2);
    return `${formatted} ${unit}`;
  }

  public static formatTemperature(temp: number, unit: string): string {
    const normalizedUnit = this.normalizeTemperatureUnit(unit);
    return `${temp.toFixed(1)}°${normalizedUnit}`;
  }
}
