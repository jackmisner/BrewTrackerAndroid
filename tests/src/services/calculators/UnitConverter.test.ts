/**
 * Tests for UnitConverter service
 *
 * Tests unit conversions for brewing calculations
 */

import { UnitConverter } from "@services/calculators/UnitConverter";

describe("UnitConverter", () => {
  describe("weight conversions", () => {
    it("should convert pounds to kilograms", () => {
      const result = UnitConverter.convertWeight(10, "lb", "kg");
      expect(result).toBeCloseTo(4.536, 3);
    });

    it("should convert grams to ounces", () => {
      const result = UnitConverter.convertWeight(28.35, "g", "oz");
      expect(result).toBeCloseTo(1.0, 2);
    });

    it("should convert kilograms to pounds", () => {
      const result = UnitConverter.convertWeight(2.27, "kg", "lb");
      expect(result).toBeCloseTo(5.0, 1);
    });

    it("should handle same unit conversion", () => {
      const result = UnitConverter.convertWeight(5, "lb", "lb");
      expect(result).toBe(5);
    });

    it("should handle case insensitive units", () => {
      const result1 = UnitConverter.convertWeight(1, "LB", "oz");
      const result2 = UnitConverter.convertWeight(1, "lb", "OZ");
      expect(result1).toBeCloseTo(16, 0);
      expect(result2).toBeCloseTo(16, 0);
    });
  });

  describe("volume conversions", () => {
    it("should convert gallons to liters", () => {
      const result = UnitConverter.convertVolume(5, "gal", "l");
      expect(result).toBeCloseTo(18.927, 2);
    });

    it("should convert milliliters to fluid ounces", () => {
      const result = UnitConverter.convertVolume(355, "ml", "floz");
      expect(result).toBeCloseTo(12, 0);
    });

    it("should convert quarts to pints", () => {
      const result = UnitConverter.convertVolume(1, "qt", "pt");
      expect(result).toBeCloseTo(2, 5); // Use toBeCloseTo for floating point
    });

    it("should handle cups to milliliters", () => {
      const result = UnitConverter.convertVolume(1, "cup", "ml");
      expect(result).toBeCloseTo(236.588, 2);
    });
  });

  describe("temperature conversions", () => {
    it("should convert Fahrenheit to Celsius", () => {
      const result = UnitConverter.convertTemperature(212, "f", "c");
      expect(result).toBe(100);
    });

    it("should convert Celsius to Fahrenheit", () => {
      const result = UnitConverter.convertTemperature(0, "c", "f");
      expect(result).toBe(32);
    });

    it("should convert Celsius to Kelvin", () => {
      const result = UnitConverter.convertTemperature(25, "c", "k");
      expect(result).toBeCloseTo(298.15, 2);
    });

    it("should handle case insensitive temperature units", () => {
      const result1 = UnitConverter.convertTemperature(
        100,
        "celsius",
        "fahrenheit"
      );
      const result2 = UnitConverter.convertTemperature(100, "C", "F");
      expect(result1).toBe(212);
      expect(result2).toBe(212);
    });

    it("should throw error for unknown temperature units", () => {
      expect(() => {
        UnitConverter.convertTemperature(100, "x", "c");
      }).toThrow("Unknown temperature unit");
    });
  });

  describe("convenience methods", () => {
    it("should convert to pounds", () => {
      const result = UnitConverter.convertToPounds(1, "kg");
      expect(result).toBeCloseTo(2.205, 2);
    });

    it("should convert to ounces", () => {
      const result = UnitConverter.convertToOunces(1, "lb");
      expect(result).toBe(16);
    });

    it("should convert to gallons", () => {
      const result = UnitConverter.convertToGallons(4, "qt");
      expect(result).toBeCloseTo(1, 5); // Use toBeCloseTo for floating point
    });

    it("should convert to liters", () => {
      const result = UnitConverter.convertToLiters(1, "gal");
      expect(result).toBeCloseTo(3.785, 2);
    });
  });

  describe("validation methods", () => {
    it("should validate weight units", () => {
      expect(UnitConverter.isValidWeightUnit("lb")).toBe(true);
      expect(UnitConverter.isValidWeightUnit("kg")).toBe(true);
      expect(UnitConverter.isValidWeightUnit("invalid")).toBe(false);
    });

    it("should validate volume units", () => {
      expect(UnitConverter.isValidVolumeUnit("gal")).toBe(true);
      expect(UnitConverter.isValidVolumeUnit("L")).toBe(true);
      expect(UnitConverter.isValidVolumeUnit("invalid")).toBe(false);
    });

    it("should validate temperature units", () => {
      expect(UnitConverter.isValidTemperatureUnit("f")).toBe(true);
      expect(UnitConverter.isValidTemperatureUnit("celsius")).toBe(true);
      expect(UnitConverter.isValidTemperatureUnit("invalid")).toBe(false);
    });
  });

  describe("formatting methods", () => {
    it("should format weight with appropriate precision", () => {
      expect(UnitConverter.formatWeight(0.123, "oz")).toBe("0.123 oz");
      expect(UnitConverter.formatWeight(1.456, "lb")).toBe("1.46 lb");
    });

    it("should format volume with appropriate precision", () => {
      expect(UnitConverter.formatVolume(0.567, "gal")).toBe("0.567 gal");
      expect(UnitConverter.formatVolume(12.789, "L")).toBe("12.79 L");
    });

    it("should format temperature correctly", () => {
      expect(UnitConverter.formatTemperature(152.4, "f")).toBe("152.4°F");
      expect(UnitConverter.formatTemperature(67.2, "c")).toBe("67.2°C");
    });
  });

  describe("edge cases and precision", () => {
    it("should handle very small values", () => {
      const result = UnitConverter.convertWeight(0.001, "g", "oz");
      expect(result).toBeCloseTo(0.000035, 6);
    });

    it("should handle very large values", () => {
      const result = UnitConverter.convertVolume(1000, "gal", "ml");
      expect(result).toBeCloseTo(3785410, 0);
    });

    it("should round to appropriate precision", () => {
      const result = UnitConverter.convertWeight(1, "lb", "g");
      expect(result).toBe(453.592); // Should be exactly this due to rounding
    });
  });

  describe("error handling", () => {
    describe("temperature errors", () => {
      it("should throw error for unknown from temperature unit", () => {
        expect(() => {
          UnitConverter.convertTemperature(100, "invalid", "c");
        }).toThrow("Unknown temperature unit: invalid");
      });

      it("should throw error for unknown to temperature unit", () => {
        expect(() => {
          UnitConverter.convertTemperature(100, "c", "invalid");
        }).toThrow("Unknown temperature unit: invalid");
      });

      it("should handle Kelvin conversion", () => {
        const result = UnitConverter.convertTemperature(273.15, "k", "c");
        expect(result).toBeCloseTo(0, 2);
      });

      it("should handle Fahrenheit to Kelvin conversion", () => {
        const result = UnitConverter.convertTemperature(32, "f", "k");
        expect(result).toBeCloseTo(273.15, 2);
      });

      it("should handle same unit temperature conversion", () => {
        const result = UnitConverter.convertTemperature(100, "c", "c");
        expect(result).toBe(100);
      });
    });

    describe("weight errors", () => {
      it("should throw error for unknown from weight unit", () => {
        expect(() => {
          UnitConverter.convertWeight(1, "invalid", "g");
        }).toThrow("Unknown weight unit: invalid");
      });

      it("should throw error for unknown to weight unit", () => {
        expect(() => {
          UnitConverter.convertWeight(1, "g", "invalid");
        }).toThrow("Unknown weight unit: invalid");
      });

      it("should handle case-insensitive weight unit matching after initial check", () => {
        const result = UnitConverter.convertWeight(1, "LB", "lb");
        expect(result).toBe(1);
      });
    });

    describe("volume errors", () => {
      it("should throw error for unknown from volume unit", () => {
        expect(() => {
          UnitConverter.convertVolume(1, "invalid", "l");
        }).toThrow("Unknown volume unit: invalid");
      });

      it("should throw error for unknown to volume unit", () => {
        expect(() => {
          UnitConverter.convertVolume(1, "l", "invalid");
        }).toThrow("Unknown volume unit: invalid");
      });

      it("should handle case-insensitive volume unit matching after initial check", () => {
        const result = UnitConverter.convertVolume(1, "GAL", "gal");
        expect(result).toBe(1);
      });
    });
  });

  describe("utility methods", () => {
    it("should return all weight units", () => {
      const units = UnitConverter.getWeightUnits();
      expect(units).toContain("g");
      expect(units).toContain("kg");
      expect(units).toContain("lb");
      expect(units).toContain("oz");
      expect(units.length).toBeGreaterThan(0);
    });

    it("should return all volume units", () => {
      const units = UnitConverter.getVolumeUnits();
      expect(units).toContain("l");
      expect(units).toContain("ml");
      expect(units).toContain("gal");
      expect(units).toContain("floz");
      expect(units.length).toBeGreaterThan(0);
    });

    it("should return all temperature units", () => {
      const units = UnitConverter.getTemperatureUnits();
      expect(units).toContain("f");
      expect(units).toContain("c");
      expect(units).toContain("k");
      expect(units).toContain("fahrenheit");
      expect(units).toContain("celsius");
      expect(units).toContain("kelvin");
      expect(units.length).toBe(6);
    });
  });
});
