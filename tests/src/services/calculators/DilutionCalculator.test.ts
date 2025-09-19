/**
 * Tests for DilutionCalculator service
 *
 * Tests dilution calculations, boil-off calculations, and blending
 */

import { DilutionCalculator } from "@services/calculators/DilutionCalculator";

// Mock UnitConverter since it's already tested
jest.mock("@services/calculators/UnitConverter", () => ({
  UnitConverter: {
    convertVolume: jest.fn((value, from, to) => {
      // Simple volume conversions for testing
      if (from === to) {
        return value;
      }
      if (from === "gal" && to === "l") {
        return value * 3.78541;
      }
      if (from === "gal" && to === "qt") {
        return value * 4;
      }
      return value;
    }),
  },
}));

describe("DilutionCalculator", () => {
  describe("calculateDilution", () => {
    it("should calculate water needed for dilution", () => {
      const result = DilutionCalculator.calculateDilution(
        1.06, // current gravity
        5, // current volume (gal)
        1.05 // target gravity
      );

      expect(result.finalVolume).toBeGreaterThan(5); // Should be larger volume
      expect(result.waterToAdd).toBeGreaterThan(0); // Need to add water
      expect(result.finalGravity).toBe(1.05);
      expect(result.concentrationFactor).toBeCloseTo(1.06 / 1.05, 2);
    });

    it("should calculate dilution using gravity points formula", () => {
      const result = DilutionCalculator.calculateDilution(
        1.1, // current gravity (100 points)
        2, // current volume
        1.05 // target gravity (50 points)
      );

      // Using formula: current points × current volume = target points × final volume
      // 100 × 2 = 50 × final volume => final volume = 4
      expect(result.finalVolume).toBe(4);
      expect(result.waterToAdd).toBe(2); // 4 - 2 = 2 gallons to add
    });

    it("should throw error if target gravity is higher than current", () => {
      expect(() => {
        DilutionCalculator.calculateDilution(1.05, 5, 1.06); // Target higher than current
      }).toThrow(
        "Target gravity must be lower than current gravity for dilution"
      );
    });

    it("should throw error if target gravity equals current", () => {
      expect(() => {
        DilutionCalculator.calculateDilution(1.05, 5, 1.05); // Target equals current
      }).toThrow(
        "Target gravity must be lower than current gravity for dilution"
      );
    });

    it("should round results appropriately", () => {
      const result = DilutionCalculator.calculateDilution(
        1.0678,
        5.123,
        1.0234
      );

      // Check that values are rounded to 2 decimal places
      expect(
        Math.abs(result.finalVolume - Number(result.finalVolume.toFixed(2)))
      ).toBeLessThanOrEqual(Number.EPSILON);
      expect(
        Math.abs(result.waterToAdd - Number(result.waterToAdd.toFixed(2)))
      ).toBeLessThanOrEqual(Number.EPSILON);
      if (result.concentrationFactor !== undefined) {
        expect(
          Math.abs(
            result.concentrationFactor -
              Number(result.concentrationFactor.toFixed(2))
          )
        ).toBeLessThanOrEqual(Number.EPSILON);
      }
    });
  });

  describe("calculateBoilOff", () => {
    it("should calculate pre-boil volume for target volume", () => {
      const result = DilutionCalculator.calculateBoilOff(
        5, // target volume (gal)
        1.0, // boil-off rate (gal/hr)
        60 // boil time (minutes)
      );

      expect(result.preBoilVolume).toBe(6); // 5 + (1.0 * 1 hour)
      expect(result.boilOffVolume).toBe(1);
      expect(result.concentrationFactor).toBe(1.2); // 6/5
      expect(result.finalGravity).toBeUndefined(); // No OG provided
    });

    it("should calculate final gravity when original gravity is provided", () => {
      const result = DilutionCalculator.calculateBoilOff(
        5, // target volume
        1.5, // boil-off rate (gal/hr)
        90, // boil time (1.5 hours)
        1.04 // original gravity
      );

      expect(result.preBoilVolume).toBe(7.25); // 5 + (1.5 * 1.5)
      expect(result.boilOffVolume).toBe(2.25);
      expect(result.concentrationFactor).toBe(1.45); // 7.25/5
      expect(result.finalGravity).toBeDefined();
      expect(result.finalGravity).toBeGreaterThan(1.04); // Should be concentrated
    });

    it("should handle different boil times", () => {
      const shortBoil = DilutionCalculator.calculateBoilOff(5, 1.0, 30); // 30 min
      const longBoil = DilutionCalculator.calculateBoilOff(5, 1.0, 120); // 120 min

      expect(shortBoil.boilOffVolume).toBe(0.5); // 1.0 * 0.5 hours
      expect(longBoil.boilOffVolume).toBe(2.0); // 1.0 * 2 hours
      expect(longBoil.preBoilVolume).toBeGreaterThan(shortBoil.preBoilVolume);
    });

    it("should throw error for invalid boil-off rate", () => {
      expect(() => {
        DilutionCalculator.calculateBoilOff(5, 0, 60); // Zero rate
      }).toThrow("Boil-off rate must be greater than 0");

      expect(() => {
        DilutionCalculator.calculateBoilOff(5, -0.5, 60); // Negative rate
      }).toThrow("Boil-off rate must be greater than 0");
    });

    it("should throw error for invalid boil time", () => {
      expect(() => {
        DilutionCalculator.calculateBoilOff(5, 1.0, 0); // Zero time
      }).toThrow("Boil time must be greater than 0");

      expect(() => {
        DilutionCalculator.calculateBoilOff(5, 1.0, -30); // Negative time
      }).toThrow("Boil time must be greater than 0");
    });
  });

  describe("calculateGravityConcentration", () => {
    it("should calculate gravity increase due to boil-off", () => {
      const concentratedGravity =
        DilutionCalculator.calculateGravityConcentration(
          1.04, // original gravity (40 points)
          6, // pre-boil volume
          5 // post-boil volume
        );

      // 40 points × 6 / 5 = 48 points = 1.048
      expect(concentratedGravity).toBe(1.048);
    });

    it("should round gravity results to three decimal places", () => {
      const gravity = DilutionCalculator.calculateGravityConcentration(
        1.0456789, // original gravity with many decimals
        6.123, // pre-boil volume
        4.567 // post-boil volume
      );

      expect(gravity).toBe(Math.round(gravity * 1000) / 1000);
    });

    it("should throw error if post-boil volume is higher than pre-boil", () => {
      expect(() => {
        DilutionCalculator.calculateGravityConcentration(1.05, 5, 6); // Post > pre
      }).toThrow("Post-boil volume must be less than pre-boil volume");
    });

    it("should throw error if volumes are equal", () => {
      expect(() => {
        DilutionCalculator.calculateGravityConcentration(1.05, 5, 5); // Equal volumes
      }).toThrow("Post-boil volume must be less than pre-boil volume");
    });
  });

  describe("calculateBlending", () => {
    it("should calculate weighted average of two worts", () => {
      const result = DilutionCalculator.calculateBlending(
        1.06, // gravity 1 (60 points)
        3, // volume 1
        1.04, // gravity 2 (40 points)
        2 // volume 2
      );

      // Weighted average: (60×3 + 40×2) / (3+2) = 260/5 = 52 points = 1.052
      expect(result.finalVolume).toBe(5); // 3 + 2
      expect(result.waterToAdd).toBe(0); // Not applicable for blending
      expect(result.finalGravity).toBe(1.052);
      expect(result.concentrationFactor).toBeCloseTo(1.06 / 1.052, 2); // Higher gravity / final gravity
    });

    it("should handle equal volume blending", () => {
      const result = DilutionCalculator.calculateBlending(
        1.08,
        2.5, // 80 points, 2.5 gal
        1.04,
        2.5 // 40 points, 2.5 gal
      );

      // Equal volumes: (80+40)/2 = 60 points = 1.060
      expect(result.finalGravity).toBe(1.06);
      expect(result.finalVolume).toBe(5);
    });

    it("should handle extreme gravity differences", () => {
      const result = DilutionCalculator.calculateBlending(
        1.12,
        1, // Very high gravity, small volume
        1.02,
        9 // Low gravity, large volume
      );

      // Should be dominated by the larger volume
      expect(result.finalGravity).toBeLessThan(1.04); // Closer to 1.020
      expect(result.finalVolume).toBe(10);
    });
  });

  describe("calculateAlcoholDilution", () => {
    it("should calculate dilution for high-ABV beer", () => {
      const result = DilutionCalculator.calculateAlcoholDilution(
        1.02, // current gravity (FG)
        5, // current volume
        12, // current ABV (12%)
        8 // target ABV (8%)
      );

      // Dilution ratio = 12/8 = 1.5, so final volume = 5 × 1.5 = 7.5
      expect(result.finalVolume).toBe(7.5);
      expect(result.waterToAdd).toBe(2.5); // 7.5 - 5
      expect(result.finalGravity).toBeLessThan(1.02); // Should be lower after dilution
      expect(result.concentrationFactor).toBe(1 / 1.5); // Inverse of dilution ratio
    });

    it("should throw error if current ABV is out of range", () => {
      expect(() => {
        DilutionCalculator.calculateAlcoholDilution(1.02, 5, 0, 5); // 0% ABV
      }).toThrow("Current ABV must be between 0% and 20%");

      expect(() => {
        DilutionCalculator.calculateAlcoholDilution(1.02, 5, 25, 20); // >20% ABV
      }).toThrow("Current ABV must be between 0% and 20%");
    });

    it("should throw error if target ABV is invalid", () => {
      expect(() => {
        DilutionCalculator.calculateAlcoholDilution(1.02, 5, 10, 0); // 0% target
      }).toThrow(
        "Target ABV must be greater than 0% and less than current ABV"
      );

      expect(() => {
        DilutionCalculator.calculateAlcoholDilution(1.02, 5, 8, 10); // Target > current
      }).toThrow(
        "Target ABV must be greater than 0% and less than current ABV"
      );

      expect(() => {
        DilutionCalculator.calculateAlcoholDilution(1.02, 5, 10, 10); // Target = current
      }).toThrow(
        "Target ABV must be greater than 0% and less than current ABV"
      );
    });
  });

  describe("getTypicalBoilOffRates", () => {
    it("should return boil-off rates for different setups", () => {
      const rates = DilutionCalculator.getTypicalBoilOffRates();

      expect(rates).toHaveProperty("Electric Indoor");
      expect(rates).toHaveProperty("Gas Indoor");
      expect(rates).toHaveProperty("Gas Outdoor");
      expect(rates).toHaveProperty("Propane Outdoor");
      expect(rates).toHaveProperty("High Efficiency");

      // Check that rates are reasonable
      Object.values(rates).forEach(rate => {
        expect(rate).toBeGreaterThan(0);
        expect(rate).toBeLessThan(3); // Reasonable max rate
      });

      // Check relative ordering
      expect(rates["High Efficiency"]).toBeLessThan(rates["Electric Indoor"]);
      expect(rates["Electric Indoor"]).toBeLessThan(rates["Gas Indoor"]);
      expect(rates["Propane Outdoor"]).toBeGreaterThan(rates["Gas Indoor"]);
    });

    it("should handle unit conversion", () => {
      const galRates = DilutionCalculator.getTypicalBoilOffRates("gal");
      const literRates = DilutionCalculator.getTypicalBoilOffRates("l");

      expect(Object.keys(galRates)).toEqual(Object.keys(literRates));

      // Liter rates should be higher than gallon rates (more liters in a gallon)
      expect(literRates["Gas Indoor"]).toBeGreaterThan(galRates["Gas Indoor"]);
    });
  });

  describe("validation methods", () => {
    it("should validate gravity ranges", () => {
      expect(() => {
        DilutionCalculator.calculateDilution(0.95, 5, 0.9); // Below min
      }).toThrow("Gravity must be between 1.000 and 1.200");

      expect(() => {
        DilutionCalculator.calculateDilution(1.25, 5, 1.2); // Above max
      }).toThrow("Gravity must be between 1.000 and 1.200");
    });

    it("should validate volume ranges", () => {
      expect(() => {
        DilutionCalculator.calculateDilution(1.06, 0, 1.05); // Zero volume
      }).toThrow("Volume must be greater than 0");

      expect(() => {
        DilutionCalculator.calculateDilution(1.06, -5, 1.05); // Negative volume
      }).toThrow("Volume must be greater than 0");

      expect(() => {
        DilutionCalculator.calculateDilution(1.06, 1500, 1.05); // Unreasonably large
      }).toThrow("Volume seems unreasonably large");
    });
  });

  describe("convertResultUnits", () => {
    it("should convert result units", () => {
      const originalResult = {
        finalVolume: 5,
        waterToAdd: 2,
        finalGravity: 1.05,
        concentrationFactor: 1.2,
      };

      const convertedResult = DilutionCalculator.convertResultUnits(
        originalResult,
        "gal",
        "l"
      );
      expect(convertedResult).toBeDefined();
      expect(convertedResult!.finalVolume).toBeGreaterThan(
        originalResult.finalVolume
      );
      expect(convertedResult!.waterToAdd).toBeGreaterThan(
        originalResult.waterToAdd
      );
      expect(convertedResult!.finalGravity).toBe(originalResult.finalGravity); // Gravity unchanged
      expect(convertedResult!.concentrationFactor).toBe(
        originalResult.concentrationFactor
      ); // Factor unchanged
    });

    it("should return original result when units are the same", () => {
      const originalResult = {
        finalVolume: 5,
        waterToAdd: 2,
        finalGravity: 1.05,
        concentrationFactor: 1.2,
      };

      const result = DilutionCalculator.convertResultUnits(
        originalResult,
        "gal",
        "gal"
      );

      expect(result).toEqual(originalResult);
    });
  });

  describe("edge cases", () => {
    it("should handle minimal dilution", () => {
      const result = DilutionCalculator.calculateDilution(
        1.051,
        5,
        1.05 // Very small dilution
      );

      expect(result.waterToAdd).toBeGreaterThan(0);
      expect(result.waterToAdd).toBeLessThan(1); // Should be small amount
    });

    it("should handle large dilution", () => {
      const result = DilutionCalculator.calculateDilution(
        1.12,
        1,
        1.02 // Large dilution
      );

      expect(result.waterToAdd).toBeGreaterThan(4); // Should need lots of water
      expect(result.finalVolume).toBeGreaterThan(5);
    });
  });
});
