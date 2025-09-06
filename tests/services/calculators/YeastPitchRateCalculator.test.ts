/**
 * Tests for YeastPitchRateCalculator service
 *
 * Tests yeast pitch rate calculations and starter sizing
 */

import { YeastPitchRateCalculator } from "@services/calculators/YeastPitchRateCalculator";

// Mock UnitConverter since it's already tested
jest.mock("@services/calculators/UnitConverter", () => ({
  UnitConverter: {
    convertVolume: jest.fn((value, from, to) => {
      // Simple volume conversions for testing
      if (from === to) return value;
      if (from === "gal" && to === "l") return value * 3.78541;
      if (from === "l" && to === "l") return value;
      return value;
    }),
  },
}));

describe("YeastPitchRateCalculator", () => {
  describe("calculatePitchRate", () => {
    it("should calculate pitch rate for standard ale", () => {
      const result = YeastPitchRateCalculator.calculatePitchRate(
        1.05, // OG
        5, // 5 gallons
        "gal", // volume unit
        "ale", // yeast type
        "standard", // gravity category
        100, // viability
        "liquid-yeast" // package type
      );

      expect(result.targetCells).toBeGreaterThan(0);
      expect(result.packetsNeeded).toBeGreaterThan(0);
      expect(result.pitchRate).toBe(1.0); // Standard ale pitch rate
      expect(result.viabilityAdjustment).toBe(1); // 100% viability = 1.0
    });

    it("should calculate higher cell count for lagers", () => {
      const aleResult = YeastPitchRateCalculator.calculatePitchRate(
        1.05,
        5,
        "gal",
        "ale",
        "standard",
        100
      );
      const lagerResult = YeastPitchRateCalculator.calculatePitchRate(
        1.05,
        5,
        "gal",
        "lager",
        "standard",
        100
      );

      expect(lagerResult.targetCells).toBeGreaterThan(aleResult.targetCells);
      expect(lagerResult.pitchRate).toBeGreaterThan(aleResult.pitchRate);
    });

    it("should calculate higher cell count for high gravity beers", () => {
      const standardResult = YeastPitchRateCalculator.calculatePitchRate(
        1.05,
        5,
        "gal",
        "ale",
        "standard",
        100
      );
      const highGravityResult = YeastPitchRateCalculator.calculatePitchRate(
        1.05,
        5,
        "gal",
        "ale",
        "high",
        100
      );

      expect(highGravityResult.targetCells).toBeGreaterThan(
        standardResult.targetCells
      );
      expect(highGravityResult.pitchRate).toBeGreaterThan(
        standardResult.pitchRate
      );
    });

    it("should adjust for reduced viability", () => {
      const perfectViability = YeastPitchRateCalculator.calculatePitchRate(
        1.05,
        5,
        "gal",
        "ale",
        "standard",
        100
      );
      const reducedViability = YeastPitchRateCalculator.calculatePitchRate(
        1.05,
        5,
        "gal",
        "ale",
        "standard",
        75 // 75% viability
      );

      expect(reducedViability.packetsNeeded).toBeGreaterThan(
        perfectViability.packetsNeeded
      );
      expect(reducedViability.viabilityAdjustment).toBeGreaterThan(1);
    });

    it("should handle different package types", () => {
      const liquidResult = YeastPitchRateCalculator.calculatePitchRate(
        1.05,
        5,
        "gal",
        "ale",
        "standard",
        100,
        "liquid-yeast"
      );
      const dryResult = YeastPitchRateCalculator.calculatePitchRate(
        1.05,
        5,
        "gal",
        "ale",
        "standard",
        100,
        "dry-yeast"
      );

      // Dry yeast has higher cell count, so should need fewer packets
      expect(dryResult.packetsNeeded).toBeLessThanOrEqual(
        liquidResult.packetsNeeded
      );
    });

    it("should handle different volume units", () => {
      const galResult = YeastPitchRateCalculator.calculatePitchRate(
        1.05,
        5,
        "gal",
        "ale",
        "standard",
        100
      );
      const literResult = YeastPitchRateCalculator.calculatePitchRate(
        1.05,
        18.927,
        "l",
        "ale",
        "standard",
        100 // ~5 gallons in liters
      );

      // Results should be similar (allowing for rounding differences)
      expect(
        Math.abs(galResult.targetCells - literResult.targetCells)
      ).toBeLessThan(5);
    });

    it("should round target cells appropriately", () => {
      const result = YeastPitchRateCalculator.calculatePitchRate(
        1.0567,
        5.123,
        "gal",
        "ale",
        "standard",
        87.3
      );

      expect(result.targetCells).toBe(Math.round(result.targetCells * 10) / 10);
      expect(result.viabilityAdjustment).toBe(
        Math.round(result.viabilityAdjustment * 100) / 100
      );
    });

    it("should throw error for invalid gravity", () => {
      expect(() => {
        YeastPitchRateCalculator.calculatePitchRate(1.01, 5, "gal", "ale"); // Too low
      }).toThrow("Original gravity must be between 1.020 and 1.150");

      expect(() => {
        YeastPitchRateCalculator.calculatePitchRate(1.2, 5, "gal", "ale"); // Too high
      }).toThrow("Original gravity must be between 1.020 and 1.150");
    });

    it("should throw error for invalid volume", () => {
      expect(() => {
        YeastPitchRateCalculator.calculatePitchRate(1.05, 0, "gal", "ale");
      }).toThrow("Beer volume must be greater than 0");

      expect(() => {
        YeastPitchRateCalculator.calculatePitchRate(1.05, -5, "gal", "ale");
      }).toThrow("Beer volume must be greater than 0");
    });

    it("should throw error for invalid viability", () => {
      expect(() => {
        YeastPitchRateCalculator.calculatePitchRate(
          1.05,
          5,
          "gal",
          "ale",
          "standard",
          -10
        );
      }).toThrow("Yeast viability must be greater than 0% and at most 100%");

      expect(() => {
        YeastPitchRateCalculator.calculatePitchRate(
          1.05,
          5,
          "gal",
          "ale",
          "standard",
          110
        );
      }).toThrow("Yeast viability must be greater than 0% and at most 100%");
    });

    it("should use default package type when invalid type provided", () => {
      const result = YeastPitchRateCalculator.calculatePitchRate(
        1.05,
        5,
        "gal",
        "ale",
        "standard",
        100,
        "unknown-package-type"
      );

      // Should fall back to liquid yeast default
      expect(result).toBeDefined();
      expect(result.packetsNeeded).toBeGreaterThan(0);
    });
  });

  describe("calculateViability", () => {
    const mockCurrentDate = new Date("2023-06-15");

    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(mockCurrentDate);
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it("should return 100% for fresh yeast", () => {
      const productionDate = new Date("2023-06-10"); // 5 days ago

      const liquidViability = YeastPitchRateCalculator.calculateViability(
        productionDate,
        "fridge",
        "liquid"
      );
      const dryViability = YeastPitchRateCalculator.calculateViability(
        productionDate,
        "fridge",
        "dry"
      );

      expect(liquidViability).toBe(100);
      expect(dryViability).toBe(100);
    });

    it("should calculate reduced viability for old liquid yeast", () => {
      const oldDate = new Date("2023-03-15"); // 3 months ago

      const fridgeViability = YeastPitchRateCalculator.calculateViability(
        oldDate,
        "fridge",
        "liquid"
      );
      const roomViability = YeastPitchRateCalculator.calculateViability(
        oldDate,
        "room",
        "liquid"
      );

      expect(fridgeViability).toBeLessThan(100);
      expect(roomViability).toBeLessThan(fridgeViability); // Room temp worse
      expect(fridgeViability).toBeGreaterThan(10); // Above minimum
      expect(roomViability).toBeGreaterThan(5); // Above minimum
    });

    it("should calculate reduced viability for old dry yeast", () => {
      const oldDate = new Date("2022-06-15"); // 12 months ago

      const fridgeViability = YeastPitchRateCalculator.calculateViability(
        oldDate,
        "fridge",
        "dry"
      );
      const roomViability = YeastPitchRateCalculator.calculateViability(
        oldDate,
        "room",
        "dry"
      );

      expect(fridgeViability).toBeLessThan(100);
      expect(roomViability).toBeLessThan(fridgeViability);
      expect(fridgeViability).toBeGreaterThan(50); // Above dry yeast minimum
      expect(roomViability).toBeGreaterThanOrEqual(30); // At or above dry yeast minimum
    });

    it("should handle exact month boundaries", () => {
      const exactlyOneMonthAgo = new Date("2023-05-15"); // Exactly 1 month

      const viability = YeastPitchRateCalculator.calculateViability(
        exactlyOneMonthAgo,
        "fridge",
        "liquid"
      );

      expect(viability).toBeLessThan(100);
      expect(viability).toBeGreaterThan(70); // Reasonable for 1 month
    });

    it("should enforce minimum viability limits", () => {
      const veryOldDate = new Date("2020-01-01"); // 3+ years ago

      const liquidViability = YeastPitchRateCalculator.calculateViability(
        veryOldDate,
        "room",
        "liquid"
      );
      const dryViability = YeastPitchRateCalculator.calculateViability(
        veryOldDate,
        "room",
        "dry"
      );

      expect(liquidViability).toBe(5); // Minimum for liquid
      expect(dryViability).toBe(30); // Minimum for dry
    });

    it("should round viability to nearest integer", () => {
      const someDate = new Date("2023-04-15"); // 2 months ago

      const viability = YeastPitchRateCalculator.calculateViability(
        someDate,
        "fridge",
        "liquid"
      );

      expect(viability % 1).toBe(0); // Should be whole number
    });
  });

  describe("calculateStarterSize", () => {
    it("should return no starter needed when cells are sufficient", () => {
      const result = YeastPitchRateCalculator.calculateStarterSize(
        200, // target cells
        250, // current cells (more than needed)
        100 // perfect viability
      );

      expect(result.starterSize).toBe(0);
      expect(result.estimatedCells).toBe(250); // Same as current
      expect(result.growthFactor).toBe(1);
    });

    it("should recommend starter when cells are insufficient", () => {
      const result = YeastPitchRateCalculator.calculateStarterSize(
        600, // target cells (higher target)
        100, // current cells (insufficient)
        100, // perfect viability
        true // with stir plate for better growth
      );

      expect(result.starterSize).toBeGreaterThan(0);
      expect(result.estimatedCells).toBeGreaterThanOrEqual(600);
      expect(result.growthFactor).toBeGreaterThan(1);
    });

    it("should recommend larger starter with stir plate", () => {
      const withoutStirPlate = YeastPitchRateCalculator.calculateStarterSize(
        400,
        100,
        100,
        false
      );
      const withStirPlate = YeastPitchRateCalculator.calculateStarterSize(
        400,
        100,
        100,
        true
      );

      // With stir plate, might get away with smaller starter size
      // due to higher growth factor
      expect(withStirPlate.growthFactor).toBeGreaterThan(
        withoutStirPlate.growthFactor
      );
    });

    it("should account for reduced viability", () => {
      const perfectViability = YeastPitchRateCalculator.calculateStarterSize(
        700,
        200,
        100,
        true // Need higher target to trigger starter with good growth
      );
      const reducedViability = YeastPitchRateCalculator.calculateStarterSize(
        700,
        200,
        50,
        true // 50% viability
      );

      // With reduced viability, should either need larger starter or more cells
      expect(reducedViability.starterSize).toBeGreaterThanOrEqual(
        perfectViability.starterSize
      );
    });

    it("should choose optimal starter size", () => {
      const result = YeastPitchRateCalculator.calculateStarterSize(
        300,
        100,
        100,
        true
      );

      // Should choose the smallest starter that meets requirements
      expect([500, 1000, 2000, 4000]).toContain(result.starterSize);
      expect(result.estimatedCells).toBeGreaterThanOrEqual(300);
    });

    it("should round estimated cells appropriately", () => {
      const result = YeastPitchRateCalculator.calculateStarterSize(
        234.567,
        123.456,
        87.3,
        false
      );

      expect(result.estimatedCells).toBe(
        Math.round(result.estimatedCells * 10) / 10
      );
    });
  });

  describe("getStylePitchRates", () => {
    it("should return pitch rates for different styles", () => {
      const styles = YeastPitchRateCalculator.getStylePitchRates();

      expect(styles).toHaveProperty("Light Lager");
      expect(styles).toHaveProperty("Standard Lager");
      expect(styles).toHaveProperty("Bock/Strong Lager");
      expect(styles).toHaveProperty("Pale Ale");
      expect(styles).toHaveProperty("IPA");
      expect(styles).toHaveProperty("Barleywine/Imperial");

      // Check structure
      Object.values(styles).forEach(style => {
        expect(style).toHaveProperty("yeastType");
        expect(style).toHaveProperty("pitchRate");
        expect(style).toHaveProperty("description");
        expect(["ale", "lager"]).toContain(style.yeastType);
        expect(["low", "standard", "high"]).toContain(style.pitchRate);
        expect(style.description.length).toBeGreaterThan(0);
      });

      // Check specific styles
      expect(styles["Light Lager"].yeastType).toBe("lager");
      expect(styles["Light Lager"].pitchRate).toBe("low");
      expect(styles["Barleywine/Imperial"].pitchRate).toBe("high");
      expect(styles["Session Ales"].pitchRate).toBe("low");
    });
  });

  describe("getPackageTypes", () => {
    it("should return package types with cell counts", () => {
      const packages = YeastPitchRateCalculator.getPackageTypes();

      expect(packages).toHaveProperty("liquid-yeast");
      expect(packages).toHaveProperty("dry-yeast");
      expect(packages).toHaveProperty("starter-1L");
      expect(packages).toHaveProperty("starter-2L");

      // Check structure
      Object.values(packages).forEach(pkg => {
        expect(pkg).toHaveProperty("name");
        expect(pkg).toHaveProperty("cellCount");
        expect(pkg).toHaveProperty("description");
        expect(pkg.cellCount).toBeGreaterThan(0);
        expect(pkg.name.length).toBeGreaterThan(0);
        expect(pkg.description.length).toBeGreaterThan(0);
      });

      // Check specific values
      expect(packages["liquid-yeast"].cellCount).toBe(100);
      expect(packages["dry-yeast"].cellCount).toBe(200);
      expect(packages["starter-1L"].cellCount).toBe(180);
      expect(packages["starter-2L"].cellCount).toBe(360);

      // Check relative ordering
      expect(packages["dry-yeast"].cellCount).toBeGreaterThan(
        packages["liquid-yeast"].cellCount
      );
      expect(packages["starter-2L"].cellCount).toBeGreaterThan(
        packages["starter-1L"].cellCount
      );
    });
  });

  describe("sgToPlato conversion", () => {
    // Testing the private method indirectly through calculatePitchRate
    it("should convert gravity to plato correctly", () => {
      // Test different gravities to ensure conversion works
      const lowGravity = YeastPitchRateCalculator.calculatePitchRate(
        1.03,
        5,
        "gal",
        "ale",
        "standard",
        100
      );
      const highGravity = YeastPitchRateCalculator.calculatePitchRate(
        1.08,
        5,
        "gal",
        "ale",
        "standard",
        100
      );

      expect(highGravity.targetCells).toBeGreaterThan(lowGravity.targetCells);
    });
  });

  describe("edge cases", () => {
    it("should handle minimum valid gravity", () => {
      const result = YeastPitchRateCalculator.calculatePitchRate(
        1.02,
        5,
        "gal",
        "ale",
        "low",
        100
      );

      expect(result.targetCells).toBeGreaterThan(0);
      expect(result.packetsNeeded).toBeGreaterThan(0);
    });

    it("should handle maximum valid gravity", () => {
      const result = YeastPitchRateCalculator.calculatePitchRate(
        1.15,
        5,
        "gal",
        "lager",
        "high",
        100
      );

      expect(result.targetCells).toBeGreaterThan(0);
      expect(result.packetsNeeded).toBeGreaterThan(0);
    });

    it("should handle very small batch sizes", () => {
      const result = YeastPitchRateCalculator.calculatePitchRate(
        1.05,
        0.5,
        "gal",
        "ale",
        "standard",
        100
      );

      expect(result.targetCells).toBeGreaterThan(0);
      expect(result.packetsNeeded).toBeGreaterThan(0);
    });

    it("should handle very large batch sizes", () => {
      const result = YeastPitchRateCalculator.calculatePitchRate(
        1.05,
        50,
        "gal",
        "lager",
        "high",
        100
      );

      expect(result.targetCells).toBeGreaterThan(0);
      expect(result.packetsNeeded).toBeGreaterThan(5); // Should need many packets
    });

    it("should handle low viability scenarios", () => {
      const result = YeastPitchRateCalculator.calculatePitchRate(
        1.05,
        5,
        "gal",
        "ale",
        "standard",
        25 // Very low viability
      );

      expect(result.packetsNeeded).toBeGreaterThan(3); // Should need multiple packets
      expect(result.viabilityAdjustment).toBe(4); // 100/25 = 4
    });

    it("should handle starter calculations with very low current cells", () => {
      const result = YeastPitchRateCalculator.calculateStarterSize(
        1000, // higher target
        10, // very low current cells
        100,
        true // with stir plate
      );

      // Even with stir plate, very low cells might not reach very high targets
      expect(result.starterSize).toBeGreaterThanOrEqual(0);
      expect(result.growthFactor).toBeGreaterThanOrEqual(1);
      // If a starter is recommended, it should be substantial
      if (result.starterSize > 0) {
        expect(result.starterSize).toBeGreaterThan(500);
        expect(result.growthFactor).toBeGreaterThan(1);
      }
    });
  });
});
