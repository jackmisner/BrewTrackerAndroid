/**
 * Tests for HydrometerCorrectionCalculator service
 *
 * Tests hydrometer temperature correction calculations
 */

import { HydrometerCorrectionCalculator } from "@services/calculators/HydrometerCorrectionCalculator";

// Mock UnitConverter since it's already tested
jest.mock("@services/calculators/UnitConverter", () => ({
  UnitConverter: {
    convertTemperature: jest.fn((value, from, to) => {
      if (from === "c" && to === "f") return (value * 9) / 5 + 32;
      if (from === "f" && to === "c") return ((value - 32) * 5) / 9;
      return value;
    }),
  },
}));

describe("HydrometerCorrectionCalculator", () => {
  describe("calculateCorrection", () => {
    it("should calculate correction at calibration temperature", () => {
      const result = HydrometerCorrectionCalculator.calculateCorrection(
        1.05, // measured gravity
        60, // wort temp (at calibration)
        60, // calibration temp
        "f"
      );

      expect(result.correctedGravity).toBeCloseTo(1.05, 3);
      expect(result.correction).toBeCloseTo(0, 3);
      expect(result.calibrationTemp).toBe(60);
      expect(result.actualTemp).toBe(60);
    });

    it("should calculate correction for higher temperature", () => {
      const result = HydrometerCorrectionCalculator.calculateCorrection(
        1.05, // measured gravity
        80, // wort temp (higher than calibration)
        60, // calibration temp
        "f"
      );

      expect(result.correctedGravity).toBeGreaterThan(1.05); // Should increase at higher temp
      expect(result.correction).toBeGreaterThan(0);
    });

    it("should calculate correction for lower temperature", () => {
      const result = HydrometerCorrectionCalculator.calculateCorrection(
        1.05, // measured gravity
        40, // wort temp (lower than calibration)
        60, // calibration temp
        "f"
      );

      expect(result.correctedGravity).toBeLessThan(1.05); // Should decrease at lower temp
      expect(result.correction).toBeLessThan(0);
    });

    it("should handle Celsius temperatures", () => {
      const result = HydrometerCorrectionCalculator.calculateCorrection(
        1.05,
        20, // 20°C
        15.5, // 15.5°C (standard calibration)
        "c"
      );

      expect(result.correctedGravity).toBeGreaterThan(1.05);
      expect(result.calibrationTemp).toBe(15.5);
      expect(result.actualTemp).toBe(20);
    });

    it("should round results to three decimal places", () => {
      const result = HydrometerCorrectionCalculator.calculateCorrection(
        1.05678,
        75,
        60,
        "f"
      );

      // Check that results are properly rounded
      expect(result.correctedGravity).toBe(
        Math.round(result.correctedGravity * 1000) / 1000
      );
      expect(result.correction).toBe(
        Math.round(result.correction * 1000) / 1000
      );
    });

    it("should throw error for invalid gravity", () => {
      expect(() => {
        HydrometerCorrectionCalculator.calculateCorrection(0.98, 60, 60, "f");
      }).toThrow("Measured gravity must be between 0.990 and 1.200");

      expect(() => {
        HydrometerCorrectionCalculator.calculateCorrection(1.25, 60, 60, "f");
      }).toThrow("Measured gravity must be between 0.990 and 1.200");
    });

    it("should throw error for invalid Fahrenheit temperatures", () => {
      expect(() => {
        HydrometerCorrectionCalculator.calculateCorrection(1.05, 30, 60, "f"); // Below freezing
      }).toThrow("Wort temperature must be between 32°F and 212°F");

      expect(() => {
        HydrometerCorrectionCalculator.calculateCorrection(1.05, 60, 250, "f"); // Above boiling
      }).toThrow("Calibration temperature must be between 32°F and 212°F");
    });

    it("should throw error for invalid Celsius temperatures", () => {
      expect(() => {
        HydrometerCorrectionCalculator.calculateCorrection(1.05, -5, 20, "c"); // Below freezing
      }).toThrow("Wort temperature must be between 0°C and 100°C");

      expect(() => {
        HydrometerCorrectionCalculator.calculateCorrection(1.05, 20, 110, "c"); // Above boiling
      }).toThrow("Calibration temperature must be between 0°C and 100°C");
    });
  });

  describe("calculateCorrectionDefault", () => {
    it("should use default calibration temperature for Fahrenheit", () => {
      const result = HydrometerCorrectionCalculator.calculateCorrectionDefault(
        1.05,
        70,
        "f"
      );

      expect(result.calibrationTemp).toBe(60); // Default F calibration
      expect(result.correctedGravity).toBeGreaterThan(1.05);
    });

    it("should use default calibration temperature for Celsius", () => {
      const result = HydrometerCorrectionCalculator.calculateCorrectionDefault(
        1.05,
        20,
        "c"
      );

      expect(result.calibrationTemp).toBe(15.5); // Default C calibration
      expect(result.correctedGravity).toBeGreaterThan(1.05);
    });
  });

  describe("findCorrectTemperature", () => {
    it("should find temperature that produces target gravity", () => {
      const targetTemp = HydrometerCorrectionCalculator.findCorrectTemperature(
        1.05, // measured
        1.052, // target (higher)
        60, // calibration
        "f"
      );

      expect(targetTemp).toBeGreaterThan(60); // Should be higher temp
      expect(targetTemp).toBeLessThan(100); // Reasonable range

      // Verify by calculating correction at found temperature
      const verification = HydrometerCorrectionCalculator.calculateCorrection(
        1.05,
        targetTemp,
        60,
        "f"
      );
      expect(verification.correctedGravity).toBeCloseTo(1.052, 2);
    });

    it("should handle Celsius temperatures", () => {
      const targetTemp = HydrometerCorrectionCalculator.findCorrectTemperature(
        1.05,
        1.048, // target (lower)
        15.5,
        "c"
      );

      expect(targetTemp).toBeLessThan(15.5); // Should be lower temp
      expect(targetTemp).toBeGreaterThan(0); // Reasonable range
    });

    it("should throw error if cannot converge", () => {
      expect(() => {
        HydrometerCorrectionCalculator.findCorrectTemperature(
          1.05,
          2.0, // Impossible target
          60,
          "f"
        );
      }).toThrow("Could not converge on solution - check input values");
    });
  });

  describe("getCorrectionTable", () => {
    it("should generate correction table for Fahrenheit", () => {
      const table = HydrometerCorrectionCalculator.getCorrectionTable(
        1.05,
        60,
        "f"
      );

      expect(table.length).toBeGreaterThan(10);

      // Check structure
      expect(table[0]).toHaveProperty("temp");
      expect(table[0]).toHaveProperty("correctedGravity");
      expect(table[0]).toHaveProperty("correction");

      // Check temperatures are in ascending order
      for (let i = 1; i < table.length; i++) {
        expect(table[i].temp).toBeGreaterThan(table[i - 1].temp);
      }

      // Find the 60F entry (should have minimal correction)
      const calibrationEntry = table.find(entry => entry.temp === 60);
      expect(calibrationEntry?.correction).toBeCloseTo(0, 3);
    });

    it("should generate correction table for Celsius", () => {
      const table = HydrometerCorrectionCalculator.getCorrectionTable(
        1.05,
        15.5,
        "c"
      );

      expect(table.length).toBeGreaterThan(10);

      // Check temperatures are reasonable for Celsius
      table.forEach(entry => {
        expect(entry.temp).toBeGreaterThan(0);
        expect(entry.temp).toBeLessThan(60);
      });

      // Find the 15.5C entry (should have minimal correction)
      const calibrationEntry = table.find(entry => entry.temp === 15.5);
      expect(calibrationEntry?.correction).toBeCloseTo(0, 3);
    });

    it("should use default calibration temperature when not specified", () => {
      const table = HydrometerCorrectionCalculator.getCorrectionTable(1.05);

      expect(table.length).toBeGreaterThan(10);
      expect(table[0]).toHaveProperty("temp");
      expect(table[0]).toHaveProperty("correctedGravity");
    });
  });

  describe("isCorrectionSignificant", () => {
    it("should return false when temperatures are the same", () => {
      const isSignificant =
        HydrometerCorrectionCalculator.isCorrectionSignificant(
          60, // wort temp
          60, // calibration temp
          "f"
        );

      expect(isSignificant).toBe(false);
    });

    it("should return true for significant temperature differences", () => {
      const isSignificant =
        HydrometerCorrectionCalculator.isCorrectionSignificant(
          80, // wort temp (20F higher)
          60, // calibration temp
          "f"
        );

      expect(isSignificant).toBe(true);
    });

    it("should return false for small temperature differences", () => {
      const isSignificant =
        HydrometerCorrectionCalculator.isCorrectionSignificant(
          62, // wort temp (small difference)
          60, // calibration temp
          "f"
        );

      expect(isSignificant).toBe(false);
    });

    it("should handle Celsius temperatures", () => {
      const isSignificant =
        HydrometerCorrectionCalculator.isCorrectionSignificant(
          25, // 10C higher
          15.5,
          "c"
        );

      expect(isSignificant).toBe(true);
    });
  });

  describe("getCalibrationTemperatures", () => {
    it("should return calibration temperatures for different hydrometer types", () => {
      const calibrationTemps =
        HydrometerCorrectionCalculator.getCalibrationTemperatures();

      expect(calibrationTemps).toHaveProperty("Standard");
      expect(calibrationTemps).toHaveProperty("European");
      expect(calibrationTemps).toHaveProperty("Precision");
      expect(calibrationTemps).toHaveProperty("Digital");

      // Check Standard hydrometer calibration
      const standard = calibrationTemps["Standard"];
      expect(standard.f).toBe(60);
      expect(standard.c).toBe(15.5);

      // Check that all entries have both F and C values
      Object.values(calibrationTemps).forEach(temp => {
        expect(temp).toHaveProperty("f");
        expect(temp).toHaveProperty("c");
        expect(temp.f).toBeGreaterThan(30);
        expect(temp.f).toBeLessThan(80);
        expect(temp.c).toBeGreaterThan(10);
        expect(temp.c).toBeLessThan(30);
      });
    });
  });

  describe("edge cases", () => {
    it("should handle extreme but valid gravities", () => {
      const lowGravity = HydrometerCorrectionCalculator.calculateCorrection(
        0.995,
        70,
        60,
        "f"
      );
      expect(lowGravity.correctedGravity).toBeGreaterThan(0.995);

      const highGravity = HydrometerCorrectionCalculator.calculateCorrection(
        1.15,
        70,
        60,
        "f"
      );
      expect(highGravity.correctedGravity).toBeGreaterThan(1.15);
    });

    it("should handle extreme but valid temperature differences", () => {
      const extremeHot = HydrometerCorrectionCalculator.calculateCorrection(
        1.05,
        200, // Very hot
        60,
        "f"
      );
      expect(extremeHot.correctedGravity).toBeGreaterThan(1.05);

      const extremeCold = HydrometerCorrectionCalculator.calculateCorrection(
        1.05,
        35, // Very cold
        60,
        "f"
      );
      expect(extremeCold.correctedGravity).toBeLessThan(1.05);
    });
  });
});
