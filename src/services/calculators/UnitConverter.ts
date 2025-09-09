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
  };

  // Temperature conversion functions
  public static convertTemperature(
    value: number,
    fromUnit: string,
    toUnit: string
  ): number {
    const from = fromUnit.toLowerCase();
    const to = toUnit.toLowerCase();

    if (from === to) {
      return value;
    }

    // Convert to Celsius first
    let celsius: number;
    switch (from) {
      case "f":
      case "fahrenheit":
        celsius = (value - 32) * (5 / 9);
        break;
      case "c":
      case "celsius":
        celsius = value;
        break;
      case "k":
      case "kelvin":
        celsius = value - 273.15;
        break;
      default:
        throw new Error(`Unknown temperature unit: ${fromUnit}`);
    }

    // Convert from Celsius to target unit
    switch (to) {
      case "f":
      case "fahrenheit":
        return celsius * (9 / 5) + 32;
      case "c":
      case "celsius":
        return celsius;
      case "k":
      case "kelvin":
        return celsius + 273.15;
      default:
        throw new Error(`Unknown temperature unit: ${toUnit}`);
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
    return ["f", "c", "k", "fahrenheit", "celsius", "kelvin"];
  }

  // Validation methods
  public static isValidWeightUnit(unit: string): boolean {
    return unit.toLowerCase() in this.WEIGHT_TO_GRAMS;
  }

  public static isValidVolumeUnit(unit: string): boolean {
    return unit.toLowerCase() in this.VOLUME_TO_LITERS;
  }

  public static isValidTemperatureUnit(unit: string): boolean {
    const validUnits = ["f", "c", "k", "fahrenheit", "celsius", "kelvin"];
    return validUnits.includes(unit.toLowerCase());
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
    return `${temp.toFixed(1)}°${unit.toUpperCase()}`;
  }
}
