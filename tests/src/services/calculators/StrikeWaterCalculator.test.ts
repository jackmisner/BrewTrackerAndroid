/**
 * Tests for StrikeWaterCalculator service
 *
 * Tests strike water temperature and mash infusion calculations
 */

import { StrikeWaterCalculator } from "@services/calculators/StrikeWaterCalculator";

// Mock UnitConverter since it's already tested
jest.mock("@services/calculators/UnitConverter", () => ({
  UnitConverter: {
    convertWeight: jest.fn((value, from, to) => {
      // Simple pound conversion for testing
      if (from === "lb" && to === "lb") {
        return value;
      }
      if (from === "kg" && to === "lb") {
        return value * 2.20462;
      }
      return value;
    }),
    convertVolume: jest.fn((value, from, to) => {
      // Simple volume conversions
      if (from === to) {
        return value;
      }
      if (from === "qt" && to === "gal") {
        return value * 0.25;
      }
      if (from === "qt" && to === "l") {
        return value * 0.946353;
      }
      return value;
    }),
    convertTemperature: jest.fn((value, from, to) => {
      if (from === "c" && to === "f") {
        return (value * 9) / 5 + 32;
      }
      if (from === "f" && to === "c") {
        return ((value - 32) * 5) / 9;
      }
      return value;
    }),
  },
}));

describe("StrikeWaterCalculator", () => {
  describe("calculateStrikeWater", () => {
    it("should calculate strike water temperature for basic scenario", () => {
      const result = StrikeWaterCalculator.calculateStrikeWater(
        10, // grain weight (lbs)
        "lb", // grain weight unit
        70, // grain temp (F)
        152, // target mash temp (F)
        1.25, // water-to-grain ratio
        "f", // temp unit
        10 // tun weight
      );

      expect(result.strikeTemp).toBeGreaterThan(152); // Should be higher than target
      expect(result.strikeTemp).toBeLessThan(300); // Should be reasonable (strike temps can be quite high)
      expect(result.waterVolume).toBe(12.5); // 10 lbs * 1.25 ratio
      expect(result.thermalMass).toBeGreaterThan(0);
    });

    it("should calculate higher strike temp for cooler grains", () => {
      const coolGrain = StrikeWaterCalculator.calculateStrikeWater(
        10,
        "lb",
        50,
        152,
        1.25,
        "f"
      );
      const warmGrain = StrikeWaterCalculator.calculateStrikeWater(
        10,
        "lb",
        70,
        152,
        1.25,
        "f"
      );

      expect(coolGrain.strikeTemp).toBeGreaterThan(warmGrain.strikeTemp);
    });

    it("should handle Celsius temperatures", () => {
      const result = StrikeWaterCalculator.calculateStrikeWater(
        5, // grain weight (kg)
        "kg", // grain weight unit
        20, // grain temp (C)
        67, // target mash temp (C)
        1.25, // water-to-grain ratio
        "c" // temp unit
      );

      expect(result.strikeTemp).toBeGreaterThan(67); // Should be higher than target
      expect(result.strikeTemp).toBeLessThan(150); // Should be reasonable in C
      expect(result.waterVolume).toBeGreaterThan(10); // Converted kg to lb
    });

    it("should handle different water-to-grain ratios", () => {
      const thickMash = StrikeWaterCalculator.calculateStrikeWater(
        10,
        "lb",
        70,
        152,
        1.0,
        "f"
      );
      const thinMash = StrikeWaterCalculator.calculateStrikeWater(
        10,
        "lb",
        70,
        152,
        1.5,
        "f"
      );

      expect(thickMash.waterVolume).toBe(10); // 10 * 1.0
      expect(thinMash.waterVolume).toBe(15); // 10 * 1.5
      expect(thickMash.strikeTemp).toBeGreaterThan(thinMash.strikeTemp); // Less water = higher temp needed
    });

    it("should account for tun weight in thermal mass", () => {
      const lightTun = StrikeWaterCalculator.calculateStrikeWater(
        10,
        "lb",
        70,
        152,
        1.25,
        "f",
        5 // light tun
      );
      const heavyTun = StrikeWaterCalculator.calculateStrikeWater(
        10,
        "lb",
        70,
        152,
        1.25,
        "f",
        20 // heavy tun
      );

      expect(heavyTun.strikeTemp).toBeGreaterThan(lightTun.strikeTemp);
      expect(heavyTun.thermalMass).toBeGreaterThan(lightTun.thermalMass);
    });

    it("should use default values when not specified", () => {
      const result = StrikeWaterCalculator.calculateStrikeWater(
        10,
        "lb",
        70,
        152 // Using defaults for ratio, tempUnit, tunWeight
      );

      expect(result.waterVolume).toBe(12.5); // Default 1.25 ratio
      expect(result.strikeTemp).toBeGreaterThan(0);
      expect(result.thermalMass).toBeGreaterThan(0);
    });

    it("should round results appropriately", () => {
      const result = StrikeWaterCalculator.calculateStrikeWater(
        10.123,
        "lb",
        70.456,
        152.789,
        1.25,
        "f"
      );

      expect(result.strikeTemp).toBe(Math.round(result.strikeTemp * 10) / 10);
      expect(result.waterVolume).toBe(Math.round(result.waterVolume * 10) / 10);
      expect(result.thermalMass).toBe(
        Math.round(result.thermalMass * 100) / 100
      );
    });
  });

  describe("calculateInfusion", () => {
    it("should calculate infusion volume for step mashing", () => {
      const result = StrikeWaterCalculator.calculateInfusion(
        148, // current mash temp
        158, // target mash temp
        12.5, // current mash volume (qt)
        180, // infusion water temp
        "f"
      );

      expect(result.infusionVolume).toBeGreaterThan(0);
      expect(result.totalWaterVolume).toBe(12.5 + result.infusionVolume);
      expect(result.infusionTemp).toBe(180);
    });

    it("should handle Celsius temperatures for infusion", () => {
      const result = StrikeWaterCalculator.calculateInfusion(
        64, // current mash temp (C)
        70, // target mash temp (C)
        12, // current mash volume
        85, // infusion water temp (C)
        "c"
      );

      expect(result.infusionVolume).toBeGreaterThan(0);
      expect(result.infusionTemp).toBe(85);
      expect(result.totalWaterVolume).toBeGreaterThan(12);
    });

    it("should throw error if infusion temp is too low", () => {
      expect(() => {
        StrikeWaterCalculator.calculateInfusion(
          148, // current temp
          158, // target temp
          12, // volume
          150, // infusion temp (too low - less than target)
          "f"
        );
      }).toThrow(
        "Infusion water temperature must be higher than target mash temperature"
      );
    });

    it("should calculate larger infusion for bigger temperature jumps", () => {
      const smallJump = StrikeWaterCalculator.calculateInfusion(
        150,
        155,
        12,
        180,
        "f"
      );
      const bigJump = StrikeWaterCalculator.calculateInfusion(
        150,
        165,
        12,
        180,
        "f"
      );

      expect(bigJump.infusionVolume).toBeGreaterThan(smallJump.infusionVolume);
    });

    it("should round infusion results appropriately", () => {
      const result = StrikeWaterCalculator.calculateInfusion(
        148.123,
        158.456,
        12.789,
        180.321,
        "f"
      );

      expect(result.infusionVolume).toBe(
        Math.round(result.infusionVolume * 10) / 10
      );
      expect(result.totalWaterVolume).toBe(
        Math.round(result.totalWaterVolume * 10) / 10
      );
    });
  });

  describe("calculateWaterVolume", () => {
    it("should calculate water volume for given ratio", () => {
      const volume = StrikeWaterCalculator.calculateWaterVolume(
        10, // grain weight
        "lb", // grain unit
        1.25, // ratio
        "qt" // output unit
      );

      expect(volume).toBe(12.5); // 10 * 1.25
    });

    it("should handle unit conversions", () => {
      const volumeQt = StrikeWaterCalculator.calculateWaterVolume(
        5,
        "kg",
        1.5,
        "qt"
      );
      const volumeGal = StrikeWaterCalculator.calculateWaterVolume(
        5,
        "kg",
        1.5,
        "gal"
      );

      expect(volumeGal).toBeLessThan(volumeQt); // Gallons < quarts for same volume
    });

    it("should use default output unit when not specified", () => {
      const volume = StrikeWaterCalculator.calculateWaterVolume(
        8,
        "lb",
        1.0 // Default to quarts
      );

      expect(volume).toBe(8); // 8 lbs * 1.0 ratio = 8 qt
    });
  });

  describe("validateInputs", () => {
    it("should validate grain weight", () => {
      expect(() => {
        StrikeWaterCalculator.validateInputs(0, 70, 152, 1.25, "f");
      }).toThrow("Grain weight must be greater than 0");

      expect(() => {
        StrikeWaterCalculator.validateInputs(-5, 70, 152, 1.25, "f");
      }).toThrow("Grain weight must be greater than 0");
    });

    it("should validate water-to-grain ratio", () => {
      expect(() => {
        StrikeWaterCalculator.validateInputs(10, 70, 152, 0, "f");
      }).toThrow("Water to grain ratio must be between 0 and 10");

      expect(() => {
        StrikeWaterCalculator.validateInputs(10, 70, 152, 15, "f");
      }).toThrow("Water to grain ratio must be between 0 and 10");
    });

    it("should validate Fahrenheit temperature ranges", () => {
      expect(() => {
        StrikeWaterCalculator.validateInputs(10, 25, 152, 1.25, "f"); // Grain too cold
      }).toThrow("Grain temperature must be between 32°F and 120°F");

      expect(() => {
        StrikeWaterCalculator.validateInputs(10, 70, 130, 1.25, "f"); // Mash too cold
      }).toThrow("Target mash temperature must be between 140°F and 170°F");

      expect(() => {
        StrikeWaterCalculator.validateInputs(10, 70, 180, 1.25, "f"); // Mash too hot
      }).toThrow("Target mash temperature must be between 140°F and 170°F");
    });

    it("should validate Celsius temperature ranges", () => {
      expect(() => {
        StrikeWaterCalculator.validateInputs(10, -5, 67, 1.25, "c"); // Grain too cold
      }).toThrow("Grain temperature must be between 0°C and 50°C");

      expect(() => {
        StrikeWaterCalculator.validateInputs(10, 20, 55, 1.25, "c"); // Mash too cold
      }).toThrow("Target mash temperature must be between 60°C and 77°C");
    });

    // Note: Temperature relationship validation (target > grain) is inherently satisfied
    // by the range validations since grain max (120F/50C) < mash min (140F/60C)

    it("should pass validation for valid inputs", () => {
      expect(() => {
        StrikeWaterCalculator.validateInputs(10, 70, 152, 1.25, "f");
      }).not.toThrow();

      expect(() => {
        StrikeWaterCalculator.validateInputs(5, 20, 67, 1.5, "c");
      }).not.toThrow();
    });
  });

  describe("getRecommendedRatios", () => {
    it("should return recommended ratios for different mash types", () => {
      const ratios = StrikeWaterCalculator.getRecommendedRatios();

      expect(ratios).toHaveProperty("Thick Mash");
      expect(ratios).toHaveProperty("Medium Mash");
      expect(ratios).toHaveProperty("Thin Mash");
      expect(ratios).toHaveProperty("Decoction");
      expect(ratios).toHaveProperty("Step Mash");
      expect(ratios).toHaveProperty("Single Infusion");

      // Check that all ratios are reasonable numbers
      Object.values(ratios).forEach(ratio => {
        expect(ratio).toBeGreaterThan(0);
        expect(ratio).toBeLessThan(3);
      });

      // Check specific expected values
      expect(ratios["Thick Mash"]).toBe(1.0);
      expect(ratios["Medium Mash"]).toBe(1.25);
      expect(ratios["Thin Mash"]).toBe(1.5);
    });

    it("should have thin mash ratio higher than thick mash", () => {
      const ratios = StrikeWaterCalculator.getRecommendedRatios();

      expect(ratios["Thin Mash"]).toBeGreaterThan(ratios["Thick Mash"]);
      expect(ratios["Medium Mash"]).toBeGreaterThan(ratios["Thick Mash"]);
      expect(ratios["Medium Mash"]).toBeLessThan(ratios["Thin Mash"]);
    });
  });

  describe("edge cases", () => {
    it("should handle very small grain bills", () => {
      const result = StrikeWaterCalculator.calculateStrikeWater(
        0.5,
        "lb",
        70,
        152,
        1.25,
        "f"
      );

      expect(result.strikeTemp).toBeGreaterThan(0);
      expect(result.waterVolume).toBe(0.6); // 0.5 * 1.25
    });

    it("should handle large grain bills", () => {
      const result = StrikeWaterCalculator.calculateStrikeWater(
        50,
        "lb",
        70,
        152,
        1.25,
        "f"
      );

      expect(result.strikeTemp).toBeGreaterThan(0);
      expect(result.waterVolume).toBe(62.5); // 50 * 1.25
    });

    it("should handle minimal temperature differences", () => {
      const result = StrikeWaterCalculator.calculateStrikeWater(
        10,
        "lb",
        150,
        152,
        1.25,
        "f" // Only 2F difference
      );

      expect(result.strikeTemp).toBeGreaterThan(152);
      expect(result.strikeTemp).toBeLessThan(160); // Should be reasonable
    });
  });
});
