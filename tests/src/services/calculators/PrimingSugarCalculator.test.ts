/**
 * Tests for PrimingSugarCalculator service
 *
 * Tests priming sugar calculations for bottle carbonation
 */

import { PrimingSugarCalculator } from "@services/calculators/PrimingSugarCalculator";

// Mock UnitConverter since it's already tested
jest.mock("@services/calculators/UnitConverter", () => ({
  UnitConverter: {
    convertVolume: jest.fn((value, from, to) => {
      // Simple gallon conversion for testing
      if (from === "gal" && to === "gal") {
        return value;
      }
      if (from === "l" && to === "gal") {
        return value * 0.264172;
      }
      return value;
    }),
    convertWeight: jest.fn((value, from, to) => {
      // Simple oz conversion for testing
      if (from === "g" && to === "oz") {
        return value * 0.035274;
      }
      return value;
    }),
    convertTemperature: jest.fn((value, from, to) => {
      if (from === "C" && to === "F") {
        return (value * 9) / 5 + 32;
      }
      return value;
    }),
  },
}));

describe("PrimingSugarCalculator", () => {
  describe("calculatePrimingSugar", () => {
    it("should calculate priming sugar for basic scenario", () => {
      const result = PrimingSugarCalculator.calculatePrimingSugar(
        5, // 5 gallons
        "gal",
        0.8, // current CO2
        2.5, // target CO2
        "corn-sugar"
      );

      expect(result.sugarAmount).toBeGreaterThan(0);
      expect(result.sugarUnit).toBe("oz"); // Should convert to oz for larger amounts
      expect(result.carbonationLevel).toBe(2.5);
      expect(result.sugarType).toBe("corn-sugar");
    });

    it("should return grams for small sugar amounts", () => {
      const result = PrimingSugarCalculator.calculatePrimingSugar(
        1, // 1 gallon
        "gal",
        1.0, // current CO2
        1.5, // target CO2 (small difference)
        "corn-sugar"
      );

      expect(result.sugarUnit).toBe("g"); // Small amount should stay in grams
    });

    it("should throw error for zero beer volume", () => {
      expect(() => {
        PrimingSugarCalculator.calculatePrimingSugar(
          0,
          "gal",
          1.0,
          2.5,
          "corn-sugar"
        );
      }).toThrow("Beer volume must be greater than 0");
    });

    it("should throw error if target CO2 is not higher than current", () => {
      expect(() => {
        PrimingSugarCalculator.calculatePrimingSugar(
          5,
          "gal",
          2.5,
          2.0,
          "corn-sugar"
        );
      }).toThrow("Target CO2 must be higher than current CO2");
    });

    it("should throw error for unknown sugar type", () => {
      expect(() => {
        PrimingSugarCalculator.calculatePrimingSugar(
          5,
          "gal",
          1.0,
          2.5,
          "unknown-sugar"
        );
      }).toThrow("Unknown sugar type: unknown-sugar");
    });

    it("should validate CO2 levels", () => {
      expect(() => {
        PrimingSugarCalculator.calculatePrimingSugar(
          5,
          "gal",
          -0.5,
          2.5,
          "corn-sugar"
        );
      }).toThrow("Current CO2 must be between 0 and 5 volumes");

      expect(() => {
        PrimingSugarCalculator.calculatePrimingSugar(
          5,
          "gal",
          1.0,
          7.0,
          "corn-sugar"
        );
      }).toThrow("Target CO2 must be between 0 and 6 volumes");
    });

    it("should work with different sugar types", () => {
      const cornSugar = PrimingSugarCalculator.calculatePrimingSugar(
        5,
        "gal",
        1.0,
        2.5,
        "corn-sugar"
      );
      const tableSugar = PrimingSugarCalculator.calculatePrimingSugar(
        5,
        "gal",
        1.0,
        2.5,
        "table-sugar"
      );

      expect(cornSugar.sugarType).toBe("corn-sugar");
      expect(tableSugar.sugarType).toBe("table-sugar");
      expect(cornSugar.sugarAmount).not.toBe(tableSugar.sugarAmount); // Different sugar factors
    });
  });

  describe("estimateResidualCO2", () => {
    it("should estimate residual CO2 for common temperatures", () => {
      const co2At65F = PrimingSugarCalculator.estimateResidualCO2(65, "F");
      const co2At70F = PrimingSugarCalculator.estimateResidualCO2(70, "F");

      expect(co2At65F).toBe(0.9);
      expect(co2At70F).toBe(0.8);
      expect(co2At65F).toBeGreaterThan(co2At70F); // Higher temp = less CO2
    });

    it("should handle Celsius temperatures", () => {
      const co2 = PrimingSugarCalculator.estimateResidualCO2(18, "C"); // ~65F
      expect(co2).toBeGreaterThan(0);
      expect(co2).toBeLessThan(2);
    });

    it("should find closest temperature in lookup table", () => {
      const co2At67F = PrimingSugarCalculator.estimateResidualCO2(67, "F"); // Between 65 and 70

      // Should pick the closest value (65F = 0.9, 70F = 0.8, so 67 should be 0.9)
      expect(co2At67F).toBe(0.9);
    });

    it("should handle extreme temperatures", () => {
      const co2Cold = PrimingSugarCalculator.estimateResidualCO2(20, "F"); // Very cold
      const co2Hot = PrimingSugarCalculator.estimateResidualCO2(90, "F"); // Very hot

      expect(co2Cold).toBeGreaterThan(0);
      expect(co2Hot).toBeGreaterThan(0);
    });
  });

  describe("getStyleCO2Levels", () => {
    it("should return CO2 levels for different styles", () => {
      const styleLevels = PrimingSugarCalculator.getStyleCO2Levels();

      expect(styleLevels).toHaveProperty("British Ales");
      expect(styleLevels).toHaveProperty("American Ales");
      expect(styleLevels).toHaveProperty("German Lagers");

      const britishAles = styleLevels["British Ales"];
      expect(britishAles).toHaveProperty("min");
      expect(britishAles).toHaveProperty("max");
      expect(britishAles).toHaveProperty("typical");
      expect(britishAles.min).toBeLessThan(britishAles.typical);
      expect(britishAles.typical).toBeLessThan(britishAles.max);
    });

    it("should have reasonable CO2 ranges", () => {
      const styleLevels = PrimingSugarCalculator.getStyleCO2Levels();

      Object.values(styleLevels).forEach(style => {
        expect(style.min).toBeGreaterThan(0);
        expect(style.max).toBeLessThan(5);
        expect(style.typical).toBeGreaterThan(style.min);
        expect(style.typical).toBeLessThan(style.max);
      });
    });
  });

  describe("getSugarTypes", () => {
    it("should return available sugar types with descriptions", () => {
      const sugarTypes = PrimingSugarCalculator.getSugarTypes();

      expect(sugarTypes).toHaveProperty("corn-sugar");
      expect(sugarTypes).toHaveProperty("table-sugar");
      expect(sugarTypes).toHaveProperty("dme");
      expect(sugarTypes).toHaveProperty("honey");
      expect(sugarTypes).toHaveProperty("brown-sugar");

      const cornSugar = sugarTypes["corn-sugar"];
      expect(cornSugar).toHaveProperty("name");
      expect(cornSugar).toHaveProperty("description");
      expect(cornSugar).toHaveProperty("factor");
      expect(cornSugar.factor).toBeGreaterThan(0);
    });

    it("should have different factors for different sugars", () => {
      const sugarTypes = PrimingSugarCalculator.getSugarTypes();

      const cornFactor = sugarTypes["corn-sugar"].factor;
      const tableFactor = sugarTypes["table-sugar"].factor;
      const dmeFactor = sugarTypes["dme"].factor;

      expect(cornFactor).not.toBe(tableFactor);
      expect(tableFactor).not.toBe(dmeFactor);
      expect(cornFactor).toBeGreaterThan(0);
    });
  });

  describe("edge cases", () => {
    it("should handle minimal CO2 increase", () => {
      const result = PrimingSugarCalculator.calculatePrimingSugar(
        5,
        "gal",
        2.4,
        2.5,
        "corn-sugar" // Very small increase
      );

      expect(result.sugarAmount).toBeGreaterThan(0);
      expect(result.sugarAmount).toBeLessThan(50); // Should be small amount
    });

    it("should handle large CO2 increase", () => {
      const result = PrimingSugarCalculator.calculatePrimingSugar(
        5,
        "gal",
        0.5,
        4.0,
        "corn-sugar" // Large increase
      );

      expect(result.sugarAmount).toBeGreaterThan(0);
      expect(result.carbonationLevel).toBe(4.0);
    });

    it("should round sugar amounts appropriately", () => {
      const result = PrimingSugarCalculator.calculatePrimingSugar(
        3.7,
        "gal",
        1.1,
        2.3,
        "corn-sugar"
      );

      // Check that result is rounded to 2 decimal places
      expect(result.sugarAmount).toBe(
        Math.round(result.sugarAmount * 100) / 100
      );
    });
  });
});
