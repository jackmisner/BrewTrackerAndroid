/**
 * Tests for BeerStyleAnalysisService
 *
 * Tests beer style adherence analysis, range formatting, and match calculations
 * for recipe metrics against BJCP beer style guidelines.
 */

import {
  beerStyleAnalysisService,
  StyleMatchResult,
} from "@services/beerStyles/BeerStyleAnalysisService";
import { BeerStyle } from "@src/types/offlineV2";
import { RecipeMetrics } from "@src/types";

// Mock UnifiedLogger
jest.mock("@services/logger/UnifiedLogger", () => ({
  UnifiedLogger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe("BeerStyleAnalysisService", () => {
  // Sample beer style data matching backend BeerJSON format
  const mockAmericanIPA: BeerStyle = {
    id: "1",
    style_id: "21A",
    name: "American IPA",
    category: "IPA",
    description:
      "A decidedly hoppy and bitter, moderately strong American pale ale.",
    overall_impression:
      "A decidedly hoppy and bitter, moderately strong American pale ale.",
    original_gravity: {
      minimum: { unit: "sg", value: 1.056 },
      maximum: { unit: "sg", value: 1.07 },
    },
    final_gravity: {
      minimum: { unit: "sg", value: 1.01 },
      maximum: { unit: "sg", value: 1.015 },
    },
    alcohol_by_volume: {
      minimum: { unit: "%", value: 5.5 },
      maximum: { unit: "%", value: 7.5 },
    },
    international_bitterness_units: {
      minimum: { unit: "IBUs", value: 40 },
      maximum: { unit: "IBUs", value: 70 },
    },
    color: {
      minimum: { unit: "SRM", value: 6 },
      maximum: { unit: "SRM", value: 14 },
    },
  };

  describe("getRange", () => {
    it("should extract OG range from BeerJSON format", () => {
      const range = beerStyleAnalysisService.getRange(mockAmericanIPA, "og");

      expect(range).toEqual({ min: 1.056, max: 1.07 });
    });

    it("should extract FG range from BeerJSON format", () => {
      const range = beerStyleAnalysisService.getRange(mockAmericanIPA, "fg");

      expect(range).toEqual({ min: 1.01, max: 1.015 });
    });

    it("should extract ABV range from BeerJSON format", () => {
      const range = beerStyleAnalysisService.getRange(mockAmericanIPA, "abv");

      expect(range).toEqual({ min: 5.5, max: 7.5 });
    });

    it("should extract IBU range from BeerJSON format", () => {
      const range = beerStyleAnalysisService.getRange(mockAmericanIPA, "ibu");

      expect(range).toEqual({ min: 40, max: 70 });
    });

    it("should extract SRM range from BeerJSON format", () => {
      const range = beerStyleAnalysisService.getRange(mockAmericanIPA, "srm");

      expect(range).toEqual({ min: 6, max: 14 });
    });

    it("should return undefined when metric range is missing", () => {
      const styleWithoutOG: BeerStyle = {
        ...mockAmericanIPA,
        original_gravity: undefined,
      };

      const range = beerStyleAnalysisService.getRange(styleWithoutOG, "og");

      expect(range).toBeUndefined();
    });

    it("should return undefined when minimum value is missing", () => {
      const styleWithPartialRange: BeerStyle = {
        ...mockAmericanIPA,
        original_gravity: {
          maximum: { unit: "sg", value: 1.07 },
        },
      };

      const range = beerStyleAnalysisService.getRange(
        styleWithPartialRange,
        "og"
      );

      expect(range).toBeUndefined();
    });

    it("should return undefined when maximum value is missing", () => {
      const styleWithPartialRange: BeerStyle = {
        ...mockAmericanIPA,
        original_gravity: {
          minimum: { unit: "sg", value: 1.056 },
        },
      };

      const range = beerStyleAnalysisService.getRange(
        styleWithPartialRange,
        "og"
      );

      expect(range).toBeUndefined();
    });
  });

  describe("formatStyleRange", () => {
    it("should format range with 3 decimal precision for gravity", () => {
      const range = { min: 1.056, max: 1.07 };
      const formatted = beerStyleAnalysisService.formatStyleRange(range, 3);

      expect(formatted).toBe("1.056 - 1.070");
    });

    it("should format range with 1 decimal precision for ABV", () => {
      const range = { min: 5.5, max: 7.5 };
      const formatted = beerStyleAnalysisService.formatStyleRange(range, 1);

      expect(formatted).toBe("5.5 - 7.5");
    });

    it("should format range with 0 decimal precision for IBU", () => {
      const range = { min: 40, max: 70 };
      const formatted = beerStyleAnalysisService.formatStyleRange(range, 0);

      expect(formatted).toBe("40 - 70");
    });

    it("should return dash when range is undefined", () => {
      const formatted = beerStyleAnalysisService.formatStyleRange(undefined, 3);

      expect(formatted).toBe("-");
    });
  });

  describe("calculateStyleMatch", () => {
    it("should calculate 100% match when all metrics are within ranges", () => {
      const metrics: Partial<RecipeMetrics> = {
        og: 1.06,
        fg: 1.012,
        abv: 6.5,
        ibu: 55,
        srm: 10,
      };

      const result = beerStyleAnalysisService.calculateStyleMatch(
        mockAmericanIPA,
        metrics
      );

      expect(result.percentage).toBe(100);
      expect(result.matchingSpecs).toBe(5);
      expect(result.totalSpecs).toBe(5);
      expect(result.matches).toEqual({
        og: true,
        fg: true,
        abv: true,
        ibu: true,
        srm: true,
      });
    });

    it("should calculate 80% match when 4 out of 5 metrics match", () => {
      const metrics: Partial<RecipeMetrics> = {
        og: 1.06, // ✅ within 1.056-1.070
        fg: 1.012, // ✅ within 1.010-1.015
        abv: 6.5, // ✅ within 5.5-7.5
        ibu: 55, // ✅ within 40-70
        srm: 20, // ❌ outside 6-14
      };

      const result = beerStyleAnalysisService.calculateStyleMatch(
        mockAmericanIPA,
        metrics
      );

      expect(result.percentage).toBe(80);
      expect(result.matchingSpecs).toBe(4);
      expect(result.matches.srm).toBe(false);
      expect(result.matches.og).toBe(true);
      expect(result.matches.fg).toBe(true);
      expect(result.matches.abv).toBe(true);
      expect(result.matches.ibu).toBe(true);
    });

    it("should handle metrics at exact range boundaries", () => {
      const metrics: Partial<RecipeMetrics> = {
        og: 1.056, // Exactly at minimum
        fg: 1.015, // Exactly at maximum
        abv: 5.5, // Exactly at minimum
        ibu: 70, // Exactly at maximum
        srm: 6, // Exactly at minimum
      };

      const result = beerStyleAnalysisService.calculateStyleMatch(
        mockAmericanIPA,
        metrics
      );

      expect(result.percentage).toBe(100);
      expect(result.matches).toEqual({
        og: true,
        fg: true,
        abv: true,
        ibu: true,
        srm: true,
      });
    });

    it("should mark metrics as false when values are below minimum", () => {
      const metrics: Partial<RecipeMetrics> = {
        og: 1.05, // Below 1.056
        fg: 1.005, // Below 1.010
        abv: 4.0, // Below 5.5
        ibu: 30, // Below 40
        srm: 3, // Below 6
      };

      const result = beerStyleAnalysisService.calculateStyleMatch(
        mockAmericanIPA,
        metrics
      );

      expect(result.percentage).toBe(0);
      expect(result.matchingSpecs).toBe(0);
      expect(result.matches).toEqual({
        og: false,
        fg: false,
        abv: false,
        ibu: false,
        srm: false,
      });
    });

    it("should mark metrics as false when values are above maximum", () => {
      const metrics: Partial<RecipeMetrics> = {
        og: 1.08, // Above 1.070
        fg: 1.02, // Above 1.015
        abv: 9.0, // Above 7.5
        ibu: 100, // Above 70
        srm: 20, // Above 14
      };

      const result = beerStyleAnalysisService.calculateStyleMatch(
        mockAmericanIPA,
        metrics
      );

      expect(result.percentage).toBe(0);
      expect(result.matchingSpecs).toBe(0);
      expect(result.matches).toEqual({
        og: false,
        fg: false,
        abv: false,
        ibu: false,
        srm: false,
      });
    });

    it("should treat undefined metrics as non-matching", () => {
      const metrics: Partial<RecipeMetrics> = {
        og: 1.06,
        // All other metrics undefined
      };

      const result = beerStyleAnalysisService.calculateStyleMatch(
        mockAmericanIPA,
        metrics
      );

      expect(result.percentage).toBe(20); // 1 out of 5
      expect(result.matchingSpecs).toBe(1);
      expect(result.matches.og).toBe(true);
      expect(result.matches.fg).toBe(false);
      expect(result.matches.abv).toBe(false);
      expect(result.matches.ibu).toBe(false);
      expect(result.matches.srm).toBe(false);
    });

    it("should treat zero values as non-matching", () => {
      const metrics: Partial<RecipeMetrics> = {
        og: 0,
        fg: 0,
        abv: 0,
        ibu: 0,
        srm: 0,
      };

      const result = beerStyleAnalysisService.calculateStyleMatch(
        mockAmericanIPA,
        metrics
      );

      expect(result.percentage).toBe(0);
      expect(result.matchingSpecs).toBe(0);
      expect(result.matches).toEqual({
        og: false,
        fg: false,
        abv: false,
        ibu: false,
        srm: false,
      });
    });
  });

  describe("getMatchStatus", () => {
    it("should return excellent for percentage >= 80", () => {
      expect(beerStyleAnalysisService.getMatchStatus(100)).toBe("excellent");
      expect(beerStyleAnalysisService.getMatchStatus(90)).toBe("excellent");
      expect(beerStyleAnalysisService.getMatchStatus(80)).toBe("excellent");
    });

    it("should return good for percentage >= 60 and < 80", () => {
      expect(beerStyleAnalysisService.getMatchStatus(79)).toBe("good");
      expect(beerStyleAnalysisService.getMatchStatus(70)).toBe("good");
      expect(beerStyleAnalysisService.getMatchStatus(60)).toBe("good");
    });

    it("should return needs-adjustment for percentage < 60", () => {
      expect(beerStyleAnalysisService.getMatchStatus(59)).toBe(
        "needs-adjustment"
      );
      expect(beerStyleAnalysisService.getMatchStatus(50)).toBe(
        "needs-adjustment"
      );
      expect(beerStyleAnalysisService.getMatchStatus(0)).toBe(
        "needs-adjustment"
      );
    });
  });

  describe("getMatchStatusLabel", () => {
    it("should return Excellent Match for percentage >= 80", () => {
      expect(beerStyleAnalysisService.getMatchStatusLabel(100)).toBe(
        "Excellent Match"
      );
      expect(beerStyleAnalysisService.getMatchStatusLabel(90)).toBe(
        "Excellent Match"
      );
      expect(beerStyleAnalysisService.getMatchStatusLabel(80)).toBe(
        "Excellent Match"
      );
    });

    it("should return Good Match for percentage >= 60 and < 80", () => {
      expect(beerStyleAnalysisService.getMatchStatusLabel(79)).toBe(
        "Good Match"
      );
      expect(beerStyleAnalysisService.getMatchStatusLabel(70)).toBe(
        "Good Match"
      );
      expect(beerStyleAnalysisService.getMatchStatusLabel(60)).toBe(
        "Good Match"
      );
    });

    it("should return Needs Adjustment for percentage < 60", () => {
      expect(beerStyleAnalysisService.getMatchStatusLabel(59)).toBe(
        "Needs Adjustment"
      );
      expect(beerStyleAnalysisService.getMatchStatusLabel(50)).toBe(
        "Needs Adjustment"
      );
      expect(beerStyleAnalysisService.getMatchStatusLabel(0)).toBe(
        "Needs Adjustment"
      );
    });
  });
});
