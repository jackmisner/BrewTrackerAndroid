/**
 * Tests for EfficiencyCalculator service
 *
 * Tests mash and brewhouse efficiency calculations
 */

// Mock UnitConverter since it's already tested - must be at top before imports
jest.mock("@services/calculators/UnitConverter", () => ({
  UnitConverter: {
    convertVolume: jest.fn((value, from, to) => {
      // Simple volume conversions for testing
      if (from === to) {
        return value;
      }
      if (from === "l" && to === "gal") {
        return value * 0.264172;
      }
      return value; // Default fallback
    }),
  },
}));

import {
  EfficiencyCalculator,
  GrainBillItem,
} from "@services/calculators/EfficiencyCalculator";

describe("EfficiencyCalculator", () => {
  // Mock grain bill data
  const mockGrainBill: GrainBillItem[] = [
    { weight: 10, ppg: 37, name: "2-Row Pale" },
    { weight: 2, ppg: 34, name: "Crystal 60" },
    { weight: 0.5, ppg: 28, name: "Chocolate" },
  ];

  describe("calculateEfficiency", () => {
    it("should calculate mash and brewhouse efficiency", () => {
      const result = EfficiencyCalculator.calculateEfficiency(
        mockGrainBill,
        1.06, // expected OG
        1.055, // actual OG
        5, // batch size (gal)
        "gal"
      );

      expect(result.mashEfficiency).toBeGreaterThan(0);
      expect(result.brewhouseEfficiency).toBeGreaterThan(0);
      expect(result.expectedPoints).toBeGreaterThan(0);
      expect(result.actualPoints).toBeGreaterThan(0);
      expect(result.pointsLost).toBeGreaterThan(0); // Should have some loss
    });

    it("should calculate perfect efficiency when actual equals expected points", () => {
      // Set up grain bill that would produce 1.050 with perfect efficiency
      const simpleGrain: GrainBillItem[] = [
        { weight: 6.756, ppg: 37 }, // This should give exactly 250 points in 5 gal for 1.050 OG
      ];

      const result = EfficiencyCalculator.calculateEfficiency(
        simpleGrain,
        1.05, // expected OG
        1.05, // actual OG (perfect match)
        5, // batch size
        "gal"
      );

      expect(result.brewhouseEfficiency).toBeCloseTo(100, 1);
      expect(result.pointsLost).toBeCloseTo(0, 0);
    });

    it("should handle different volume units", () => {
      const galResult = EfficiencyCalculator.calculateEfficiency(
        mockGrainBill,
        1.06,
        1.055,
        5,
        "gal"
      );

      const literResult = EfficiencyCalculator.calculateEfficiency(
        mockGrainBill,
        1.06,
        1.055,
        18.9, // ~5 gallons in liters
        "l"
      );

      // Results should be similar (allowing for rounding differences)
      expect(
        Math.abs(galResult.mashEfficiency - literResult.mashEfficiency)
      ).toBeLessThan(1);
    });

    it("should round results to one decimal place", () => {
      const result = EfficiencyCalculator.calculateEfficiency(
        mockGrainBill,
        1.0678,
        1.0543,
        5.123,
        "gal"
      );

      expect(result.mashEfficiency).toBe(
        Math.round(result.mashEfficiency * 10) / 10
      );
      expect(result.brewhouseEfficiency).toBe(
        Math.round(result.brewhouseEfficiency * 10) / 10
      );
    });

    it("should throw error for empty grain bill", () => {
      expect(() => {
        EfficiencyCalculator.calculateEfficiency([], 1.05, 1.045, 5);
      }).toThrow("Grain bill cannot be empty");
    });

    it("should throw error for invalid gravity values", () => {
      expect(() => {
        EfficiencyCalculator.calculateEfficiency(mockGrainBill, 1.01, 1.045, 5); // Expected too low
      }).toThrow("Expected OG must be between 1.020 and 1.150");

      expect(() => {
        EfficiencyCalculator.calculateEfficiency(mockGrainBill, 1.05, 1.18, 5); // Actual too high
      }).toThrow("Actual OG must be between 1.020 and 1.150");
    });

    it("should throw error for invalid batch size", () => {
      expect(() => {
        EfficiencyCalculator.calculateEfficiency(mockGrainBill, 1.05, 1.045, 0);
      }).toThrow("Batch size must be greater than 0");

      expect(() => {
        EfficiencyCalculator.calculateEfficiency(
          mockGrainBill,
          1.05,
          1.045,
          -5
        );
      }).toThrow("Batch size must be greater than 0");
    });

    it("should throw error for invalid grain properties", () => {
      const badGrain: GrainBillItem[] = [
        { weight: 0, ppg: 37 }, // Zero weight
        { weight: 5, ppg: 35 },
      ];

      expect(() => {
        EfficiencyCalculator.calculateEfficiency(badGrain, 1.05, 1.045, 5);
      }).toThrow("Grain weight and PPG must be greater than 0");

      const badPPG: GrainBillItem[] = [
        { weight: 5, ppg: 0 }, // Zero PPG
      ];

      expect(() => {
        EfficiencyCalculator.calculateEfficiency(badPPG, 1.05, 1.045, 5);
      }).toThrow("Grain weight and PPG must be greater than 0");
    });
  });

  describe("calculateExpectedPoints", () => {
    it("should calculate total expected points from grain bill", () => {
      const points = EfficiencyCalculator.calculateExpectedPoints(
        mockGrainBill,
        5
      );

      // 10*37 + 2*34 + 0.5*28 = 370 + 68 + 14 = 452 points
      expect(points).toBe(452);
    });

    it("should handle single grain", () => {
      const singleGrain: GrainBillItem[] = [{ weight: 8, ppg: 37 }];
      const points = EfficiencyCalculator.calculateExpectedPoints(
        singleGrain,
        5
      );

      expect(points).toBe(296); // 8 * 37
    });

    it("should handle empty grain bill", () => {
      const points = EfficiencyCalculator.calculateExpectedPoints([], 5);
      expect(points).toBe(0);
    });
  });

  describe("calculateExpectedOG", () => {
    it("should calculate expected OG based on efficiency", () => {
      const expectedOG = EfficiencyCalculator.calculateExpectedOG(
        mockGrainBill,
        5, // batch size
        "gal", // volume unit
        75 // 75% efficiency
      );

      expect(expectedOG).toBeGreaterThan(1.0);
      expect(expectedOG).toBeLessThan(1.2);
    });

    it("should produce higher OG with higher efficiency", () => {
      const lowEffOG = EfficiencyCalculator.calculateExpectedOG(
        mockGrainBill,
        5,
        "gal",
        65
      );
      const highEffOG = EfficiencyCalculator.calculateExpectedOG(
        mockGrainBill,
        5,
        "gal",
        85
      );

      expect(highEffOG).toBeGreaterThan(lowEffOG);
    });

    it("should produce higher OG with smaller batch size", () => {
      const largeBatch = EfficiencyCalculator.calculateExpectedOG(
        mockGrainBill,
        10,
        "gal",
        75
      );
      const smallBatch = EfficiencyCalculator.calculateExpectedOG(
        mockGrainBill,
        5,
        "gal",
        75
      );

      expect(smallBatch).toBeGreaterThan(largeBatch);
    });
  });

  describe("calculateGrainWeight", () => {
    it("should calculate grain weight needed for target OG", () => {
      const weight = EfficiencyCalculator.calculateGrainWeight(
        1.05, // target OG
        5, // batch size
        "gal", // volume unit
        37, // PPG (2-row pale)
        75 // efficiency
      );

      expect(weight).toBeGreaterThan(5); // Should need several pounds
      expect(weight).toBeLessThan(15); // Should be reasonable amount
    });

    it("should require more grain for higher target OG", () => {
      const lowOG = EfficiencyCalculator.calculateGrainWeight(
        1.04,
        5,
        "gal",
        37,
        75
      );
      const highOG = EfficiencyCalculator.calculateGrainWeight(
        1.07,
        5,
        "gal",
        37,
        75
      );

      expect(highOG).toBeGreaterThan(lowOG);
    });

    it("should require more grain for lower efficiency", () => {
      const highEff = EfficiencyCalculator.calculateGrainWeight(
        1.05,
        5,
        "gal",
        37,
        85
      );
      const lowEff = EfficiencyCalculator.calculateGrainWeight(
        1.05,
        5,
        "gal",
        37,
        65
      );

      expect(lowEff).toBeGreaterThan(highEff);
    });
  });

  describe("analyzeEfficiencyLoss", () => {
    it("should identify minor efficiency loss", () => {
      const analysis = EfficiencyCalculator.analyzeEfficiencyLoss(78, 73); // 5% loss

      expect(analysis.lossPercentage).toBe(5);
      expect(analysis.possibleCauses).toHaveLength(0); // No specific causes for minor loss
      expect(analysis.recommendations).toHaveLength(0);
    });

    it("should identify moderate efficiency loss", () => {
      const analysis = EfficiencyCalculator.analyzeEfficiencyLoss(80, 65); // 15% loss

      expect(analysis.lossPercentage).toBe(15);
      expect(analysis.possibleCauses.length).toBeGreaterThan(0);
      expect(analysis.recommendations.length).toBeGreaterThan(0);
      expect(analysis.possibleCauses).toContain("Poor grain crushing");
    });

    it("should identify severe efficiency loss", () => {
      const analysis = EfficiencyCalculator.analyzeEfficiencyLoss(85, 60); // 25% loss

      expect(analysis.lossPercentage).toBe(25);
      expect(analysis.possibleCauses.length).toBeGreaterThan(5);
      expect(analysis.recommendations.length).toBeGreaterThan(5);
      expect(analysis.possibleCauses).toContain("Equipment calibration issues");
      expect(analysis.recommendations).toContain("Calibrate equipment");
    });

    it("should round loss percentage", () => {
      const analysis = EfficiencyCalculator.analyzeEfficiencyLoss(
        78.456,
        65.123
      );

      expect(analysis.lossPercentage).toBe(
        Math.round(analysis.lossPercentage * 10) / 10
      );
    });
  });

  describe("getTypicalEfficiencies", () => {
    it("should return efficiency ranges for different systems", () => {
      const efficiencies = EfficiencyCalculator.getTypicalEfficiencies();

      expect(efficiencies).toHaveProperty("BIAB (Bag in a Pot)");
      expect(efficiencies).toHaveProperty("Cooler Mash Tun");
      expect(efficiencies).toHaveProperty("3-Vessel System");
      expect(efficiencies).toHaveProperty("RIMS/HERMS");
      expect(efficiencies).toHaveProperty("Professional");

      // Check that each has proper structure
      Object.values(efficiencies).forEach(eff => {
        expect(eff).toHaveProperty("min");
        expect(eff).toHaveProperty("max");
        expect(eff).toHaveProperty("typical");
        expect(eff.min).toBeLessThan(eff.typical);
        expect(eff.typical).toBeLessThan(eff.max);
        expect(eff.min).toBeGreaterThan(50); // Reasonable minimum
        expect(eff.max).toBeLessThan(100); // Reasonable maximum
      });

      // Check relative ordering
      expect(efficiencies["Professional"].typical).toBeGreaterThan(
        efficiencies["BIAB (Bag in a Pot)"].typical
      );
    });
  });

  describe("getGrainPPG", () => {
    it("should return PPG values for common grains", () => {
      const grains = EfficiencyCalculator.getGrainPPG();

      expect(grains).toHaveProperty("2-row-pale");
      expect(grains).toHaveProperty("pilsner");
      expect(grains).toHaveProperty("wheat");
      expect(grains).toHaveProperty("crystal-40");
      expect(grains).toHaveProperty("chocolate");

      // Check structure
      Object.values(grains).forEach(grain => {
        expect(grain).toHaveProperty("name");
        expect(grain).toHaveProperty("ppg");
        expect(grain).toHaveProperty("category");
        expect(grain.ppg).toBeGreaterThan(20); // Reasonable PPG
        expect(grain.ppg).toBeLessThan(45);
        expect(["Base", "Crystal", "Roasted"]).toContain(grain.category);
      });

      // Check specific values
      expect(grains["2-row-pale"].ppg).toBe(37);
      expect(grains["pilsner"].ppg).toBe(37);
      expect(grains["chocolate"].category).toBe("Roasted");
    });
  });

  describe("calculateImprovementNeeded", () => {
    it("should calculate efficiency improvement needed", () => {
      const improvement = EfficiencyCalculator.calculateImprovementNeeded(
        70, // current efficiency
        1.06, // target OG
        1.05 // actual OG
      );

      expect(improvement.improvementNeeded).toBeGreaterThan(0);
      expect(improvement.newEfficiency).toBeGreaterThan(70);
    });

    it("should show no improvement needed when target equals actual", () => {
      const improvement = EfficiencyCalculator.calculateImprovementNeeded(
        75, // current efficiency
        1.05, // target OG
        1.05 // actual OG (same as target)
      );

      expect(improvement.improvementNeeded).toBeCloseTo(0, 1);
      expect(improvement.newEfficiency).toBeCloseTo(75, 1);
    });

    it("should round results appropriately", () => {
      const improvement = EfficiencyCalculator.calculateImprovementNeeded(
        72.456,
        1.0678,
        1.0543
      );

      expect(improvement.improvementNeeded).toBe(
        Math.round(improvement.improvementNeeded * 10) / 10
      );
      expect(improvement.newEfficiency).toBe(
        Math.round(improvement.newEfficiency * 10) / 10
      );
    });
  });

  describe("edge cases", () => {
    it("should handle very small grain bills", () => {
      const smallGrain: GrainBillItem[] = [{ weight: 0.1, ppg: 37 }];

      const result = EfficiencyCalculator.calculateEfficiency(
        smallGrain,
        1.025,
        1.022,
        1,
        "gal"
      );

      expect(result.mashEfficiency).toBeGreaterThan(0);
      expect(result.brewhouseEfficiency).toBeGreaterThan(0);
    });

    it("should handle very large grain bills", () => {
      const largeGrain: GrainBillItem[] = [
        { weight: 20, ppg: 37 },
        { weight: 5, ppg: 35 },
        { weight: 3, ppg: 34 },
      ];

      const result = EfficiencyCalculator.calculateExpectedPoints(
        largeGrain,
        10
      );

      // 20*37 + 5*35 + 3*34 = 740 + 175 + 102 = 1017
      expect(result).toBe(1017);
    });

    it("should handle maximum valid gravity values", () => {
      const highGravityGrain: GrainBillItem[] = [{ weight: 30, ppg: 37 }];

      const result = EfficiencyCalculator.calculateEfficiency(
        highGravityGrain,
        1.14,
        1.13,
        5,
        "gal" // Near maximum valid values
      );

      expect(result.mashEfficiency).toBeGreaterThan(0);
      expect(result.brewhouseEfficiency).toBeGreaterThan(0);
    });

    it("should handle low PPG specialty grains", () => {
      const specialtyGrain: GrainBillItem[] = [
        { weight: 8, ppg: 37 }, // Base malt
        { weight: 2, ppg: 25 }, // Roasted barley (low PPG)
      ];

      const points = EfficiencyCalculator.calculateExpectedPoints(
        specialtyGrain,
        5
      );

      // 8*37 + 2*25 = 296 + 50 = 346
      expect(points).toBe(346);
    });
  });
});
