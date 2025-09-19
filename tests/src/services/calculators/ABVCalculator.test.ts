/**
 * Tests for ABVCalculator service
 *
 * Tests brewing calculations for accuracy and edge cases
 */

import { ABVCalculator } from "@services/calculators/ABVCalculator";

describe("ABVCalculator", () => {
  describe("calculateSimple", () => {
    it("should calculate ABV using simple formula", () => {
      const result = ABVCalculator.calculateSimple(1.05, 1.01);
      expect(result.abv).toBe(5.3); // (1.050 - 1.010) * 131.25 = 5.25, rounded to 5.3
      expect(result.attenuation).toBeCloseTo(80.0, 1);
    });

    it("should calculate ABV for high gravity beer", () => {
      const result = ABVCalculator.calculateSimple(1.08, 1.02);
      expect(result.abv).toBe(7.9);
      expect(result.attenuation).toBeCloseTo(75.0, 1);
    });

    it("should throw error if OG <= FG", () => {
      expect(() => {
        ABVCalculator.calculateSimple(1.02, 1.05);
      }).toThrow("Original gravity must be greater than final gravity");
    });
  });

  describe("calculateAdvanced", () => {
    it("should calculate ABV using advanced formula", () => {
      const result = ABVCalculator.calculateAdvanced(1.05, 1.01);
      expect(result.abv).toBeGreaterThan(5.0);
      expect(result.abv).toBeLessThan(6.0);
      expect(result.attenuation).toBeCloseTo(80.0, 1);
    });

    it("should give different result than simple formula for high gravity", () => {
      const simple = ABVCalculator.calculateSimple(1.1, 1.02);
      const advanced = ABVCalculator.calculateAdvanced(1.1, 1.02);

      expect(advanced.abv).not.toBe(simple.abv);
      expect(advanced.abv).toBeGreaterThan(simple.abv); // Advanced should be higher for high gravity
    });
  });

  describe("unit conversions", () => {
    it("should convert Plato to SG correctly", () => {
      const sg = ABVCalculator.platoToSG(12.5);
      expect(sg).toBeCloseTo(1.05, 3);
    });

    it("should convert SG to Plato correctly", () => {
      const plato = ABVCalculator.sgToPlato(1.05);
      expect(plato).toBeCloseTo(12.39, 1); // More accurate expected value
    });

    it("should convert Brix to SG correctly", () => {
      const sg = ABVCalculator.brixToSG(12.5);
      expect(sg).toBeCloseTo(1.05, 3);
    });

    it("should handle round-trip conversion", () => {
      const originalSG = 1.06;
      const plato = ABVCalculator.sgToPlato(originalSG);
      const convertedSG = ABVCalculator.platoToSG(plato);
      expect(convertedSG).toBeCloseTo(originalSG, 3);
    });
  });

  describe("calculate with unit conversion", () => {
    it("should calculate ABV with Plato inputs", () => {
      const result = ABVCalculator.calculate(
        12.5,
        2.5,
        "plato",
        "plato",
        "simple"
      );
      expect(result.abv).toBeGreaterThan(5.0);
      expect(result.abv).toBeLessThan(6.0);
    });

    it("should calculate ABV with mixed units", () => {
      const result = ABVCalculator.calculate(
        1.05,
        2.5,
        "sg",
        "plato",
        "simple"
      );
      expect(result.abv).toBeGreaterThan(5.0);
    });

    it("should use advanced formula when specified", () => {
      const simple = ABVCalculator.calculate(1.08, 1.02, "sg", "sg", "simple");
      const advanced = ABVCalculator.calculate(
        1.08,
        1.02,
        "sg",
        "sg",
        "advanced"
      );

      expect(advanced.abv).toBeGreaterThan(simple.abv);
    });

    it("should throw error when FG is provided in Brix", () => {
      expect(() => {
        ABVCalculator.calculate(1.05, 2.5, "sg", "brix", "simple");
      }).toThrow(
        "FG in Brix requires refractometer alcohol correction — provide SG or use corrected conversion"
      );
    });

    it("should allow OG in Brix but not FG in Brix", () => {
      // OG in Brix should work fine (unfermented wort)
      expect(() => {
        ABVCalculator.calculate(12.5, 1.01, "brix", "sg", "simple");
      }).not.toThrow();

      // But FG in Brix should fail
      expect(() => {
        ABVCalculator.calculate(12.5, 2.5, "brix", "brix", "simple");
      }).toThrow(
        "FG in Brix requires refractometer alcohol correction — provide SG or use corrected conversion"
      );
    });
  });

  describe("validation", () => {
    it("should validate SG ranges", () => {
      expect(ABVCalculator.isValidSG(1.05)).toBe(true);
      expect(ABVCalculator.isValidSG(0.99)).toBe(false);
      expect(ABVCalculator.isValidSG(1.25)).toBe(false);
    });

    it("should validate Plato ranges", () => {
      expect(ABVCalculator.isValidPlato(12.5)).toBe(true);
      expect(ABVCalculator.isValidPlato(-1)).toBe(false);
      expect(ABVCalculator.isValidPlato(60)).toBe(false);
    });

    it("should throw error for invalid gravity after conversion", () => {
      expect(() => {
        ABVCalculator.calculate(60, 10, "plato", "plato", "simple");
      }).toThrow("Invalid gravity values after conversion");
    });
  });

  describe("edge cases", () => {
    it("should handle very low gravity beer", () => {
      const result = ABVCalculator.calculateSimple(1.03, 1.005);
      expect(result.abv).toBeCloseTo(3.3, 1);
    });

    it("should handle barleywine gravity", () => {
      const result = ABVCalculator.calculateSimple(1.12, 1.03);
      expect(result.abv).toBeCloseTo(11.8, 1);
    });

    it("should calculate calories reasonably", () => {
      const result = ABVCalculator.calculateSimple(1.05, 1.01);
      expect(result.calories).toBeGreaterThan(90); // Adjust for actual calculation
      expect(result.calories).toBeLessThan(150);
    });
  });
});
