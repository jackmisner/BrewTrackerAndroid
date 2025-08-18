import {
  formatHopTime,
  formatHopUsage,
  getHopTimePlaceholder,
  convertHopTime,
  formatIngredientAmount,
  formatBatchSize,
  formatPercentage,
  formatGravity,
  formatColor,
  formatSRM,
  getSrmColor,
  formatIBU,
  formatABV,
  formatAttenuation,
  formatAlphaAcid,
  formatPotential,
  formatIngredientDetails,
} from "@utils/formatUtils";

// Mock the hop constants
jest.mock("@constants/hopConstants", () => ({
  HOP_USAGE_OPTIONS: [
    { value: "boil", display: "Boil", defaultTime: 60 },
    { value: "whirlpool", display: "Whirlpool", defaultTime: 15 },
    { value: "dry-hop", display: "Dry Hop", defaultTime: 10080 }, // 7 days in minutes
    { value: "flame-out", display: "Flame Out", defaultTime: 0 },
  ],
}));

describe("formatUtils", () => {
  describe("formatHopTime", () => {
    it("should handle null and undefined values", () => {
      expect(formatHopTime(null, "boil")).toBe("N/A");
      expect(formatHopTime(undefined, "boil")).toBe("N/A");
    });

    it("should format minutes for boil usage", () => {
      expect(formatHopTime(60, "boil")).toBe("60 mins");
      expect(formatHopTime(15, "boil")).toBe("15 mins");
      expect(formatHopTime(1, "boil")).toBe("1 min");
      expect(formatHopTime(0, "boil")).toBe("0 mins");
    });

    it("should format days for dry-hop usage", () => {
      expect(formatHopTime(1440, "dry-hop")).toBe("1 day"); // 1 day = 1440 minutes
      expect(formatHopTime(2880, "dry-hop")).toBe("2 days"); // 2 days
      expect(formatHopTime(10080, "dry-hop")).toBe("7 days"); // 7 days
      expect(formatHopTime(720, "dry-hop")).toBe("0.5 days"); // 12 hours
    });

    it("should format whirlpool times in minutes", () => {
      expect(formatHopTime(15, "whirlpool")).toBe("15 mins");
      expect(formatHopTime(30, "whirlpool")).toBe("30 mins");
    });
  });

  describe("formatHopUsage", () => {
    it("should format known usage values", () => {
      expect(formatHopUsage("boil")).toBe("Boil");
      expect(formatHopUsage("whirlpool")).toBe("Whirlpool");
      expect(formatHopUsage("dry-hop")).toBe("Dry Hop");
      expect(formatHopUsage("flame-out")).toBe("Flame Out");
    });

    it("should handle unknown usage values", () => {
      expect(formatHopUsage("unknown")).toBe("unknown");
      expect(formatHopUsage(undefined)).toBe("Unknown");
      expect(formatHopUsage("")).toBe("Unknown");
    });
  });

  describe("getHopTimePlaceholder", () => {
    it("should return default time in minutes", () => {
      expect(getHopTimePlaceholder("boil", "minutes")).toBe("60");
      expect(getHopTimePlaceholder("whirlpool", "minutes")).toBe("15");
      expect(getHopTimePlaceholder("flame-out", "minutes")).toBe("0");
    });

    it("should return default time in days for dry-hop", () => {
      expect(getHopTimePlaceholder("dry-hop", "days")).toBe("7"); // 10080 / 1440
    });

    it("should return default for unknown usage", () => {
      expect(getHopTimePlaceholder("unknown", "minutes")).toBe("60");
    });
  });

  describe("convertHopTime", () => {
    it("should return same value when units match", () => {
      expect(convertHopTime(60, "minutes", "minutes")).toBe(60);
      expect(convertHopTime(7, "days", "days")).toBe(7);
    });

    it("should convert days to minutes", () => {
      expect(convertHopTime(1, "days", "minutes")).toBe(1440);
      expect(convertHopTime(7, "days", "minutes")).toBe(10080);
      expect(convertHopTime(0.5, "days", "minutes")).toBe(720);
    });

    it("should convert minutes to days with rounding", () => {
      expect(convertHopTime(1440, "minutes", "days")).toBe(1);
      expect(convertHopTime(10080, "minutes", "days")).toBe(7);
      expect(convertHopTime(720, "minutes", "days")).toBe(0.5);
      expect(convertHopTime(721, "minutes", "days")).toBe(0.5); // Rounds to 0.5
    });

    it("should return original value for unknown unit conversions", () => {
      expect(convertHopTime(60, "hours" as any, "seconds" as any)).toBe(60);
      expect(convertHopTime(120, "unknown" as any, "other" as any)).toBe(120);
    });
  });

  describe("formatIngredientAmount", () => {
    it("should handle null and undefined", () => {
      expect(formatIngredientAmount(null, "lb")).toBe("0");
      expect(formatIngredientAmount(undefined, "oz")).toBe("0");
    });

    it("should format package units as whole numbers or one decimal", () => {
      expect(formatIngredientAmount(1, "pkg")).toBe("1");
      expect(formatIngredientAmount(1.5, "pkg")).toBe("1.5");
      expect(formatIngredientAmount(2, "tsp")).toBe("2");
      expect(formatIngredientAmount(1.25, "tbsp")).toBe("1.3"); // Rounds to 1 decimal
    });

    it("should format small amounts with two decimals", () => {
      expect(formatIngredientAmount(0.25, "oz")).toBe("0.25");
      expect(formatIngredientAmount(0.5, "lb")).toBe("0.50");
      expect(formatIngredientAmount(0.125, "oz")).toBe("0.13"); // Rounds to 2 decimals
    });

    it("should format medium amounts with one decimal", () => {
      expect(formatIngredientAmount(5.5, "lb")).toBe("5.5");
      expect(formatIngredientAmount(2.25, "oz")).toBe("2.3"); // Rounds to 1 decimal
      expect(formatIngredientAmount(9.99, "lb")).toBe("10.0"); // Rounds to 1 decimal
    });

    it("should format large amounts as whole numbers", () => {
      expect(formatIngredientAmount(10, "lb")).toBe("10");
      expect(formatIngredientAmount(15.4, "lb")).toBe("15");
      expect(formatIngredientAmount(25.8, "lb")).toBe("26");
    });
  });

  describe("formatBatchSize", () => {
    it("should format whole numbers without decimals", () => {
      expect(formatBatchSize(5, "gal")).toBe("5 gal");
      expect(formatBatchSize(10, "L")).toBe("10 L");
    });

    it("should format decimal numbers with one decimal place", () => {
      expect(formatBatchSize(5.5, "gal")).toBe("5.5 gal");
      expect(formatBatchSize(19.5, "L")).toBe("19.5 L");
    });
  });

  describe("formatPercentage", () => {
    it("should handle null and undefined", () => {
      expect(formatPercentage(null)).toBe("N/A");
      expect(formatPercentage(undefined)).toBe("N/A");
    });

    it("should format with default 1 decimal place", () => {
      expect(formatPercentage(5.5)).toBe("5.5%");
      expect(formatPercentage(10)).toBe("10.0%");
      expect(formatPercentage(75.25)).toBe("75.3%"); // Rounds
    });

    it("should format with specified decimal places", () => {
      expect(formatPercentage(5.555, 2)).toBe("5.55%");
      expect(formatPercentage(10, 0)).toBe("10%");
    });
  });

  describe("formatGravity", () => {
    it("should handle null and undefined", () => {
      expect(formatGravity(null)).toBe("N/A");
      expect(formatGravity(undefined)).toBe("N/A");
    });

    it("should format with 3 decimal places", () => {
      expect(formatGravity(1.05)).toBe("1.050");
      expect(formatGravity(1.0125)).toBe("1.012"); // Rounds
      expect(formatGravity(1)).toBe("1.000");
    });
  });

  describe("formatColor", () => {
    it("should handle null and undefined", () => {
      expect(formatColor(null)).toBe("N/A");
      expect(formatColor(undefined)).toBe("N/A");
    });

    it("should format with default SRM unit", () => {
      expect(formatColor(5.5)).toBe("6 SRM"); // Rounds
      expect(formatColor(10)).toBe("10 SRM");
      expect(formatColor(2.4)).toBe("2 SRM");
    });

    it("should format with specified unit", () => {
      expect(formatColor(15, "EBC")).toBe("15 EBC");
      expect(formatColor(8.7, "°L")).toBe("9 °L");
    });
  });

  describe("formatSRM", () => {
    it("should handle null and undefined", () => {
      expect(formatSRM(null)).toBe("N/A");
      expect(formatSRM(undefined)).toBe("N/A");
    });

    it("should format with one decimal place", () => {
      expect(formatSRM(5.5)).toBe("5.5");
      expect(formatSRM(10)).toBe("10.0");
      expect(formatSRM(2.456)).toBe("2.5"); // Rounds
    });
  });

  describe("getSrmColor", () => {
    it("should return default color for invalid inputs", () => {
      const defaultColor = "#FFE699";
      expect(getSrmColor(null)).toBe(defaultColor);
      expect(getSrmColor(undefined)).toBe(defaultColor);
      expect(getSrmColor("")).toBe(defaultColor);
      expect(getSrmColor("invalid")).toBe(defaultColor);
      expect(getSrmColor(-1)).toBe(defaultColor);
    });

    it("should return black for SRM values over 40", () => {
      expect(getSrmColor(41)).toBe("#000000");
      expect(getSrmColor(50)).toBe("#000000");
      expect(getSrmColor("45")).toBe("#000000");
    });

    it("should return correct colors for valid SRM ranges", () => {
      expect(getSrmColor(0)).toBe("#FFE699"); // Light
      expect(getSrmColor(1)).toBe("#FFE699");
      expect(getSrmColor(2)).toBe("#FFE699");
      expect(getSrmColor(5)).toBe("#FFC232"); // Gold
      expect(getSrmColor(10)).toBe("#E58500"); // Amber
      expect(getSrmColor(20)).toBe("#A13700"); // Brown
      expect(getSrmColor(30)).toBe("#6A1200"); // Dark brown
      expect(getSrmColor(40)).toBe("#3D0708"); // Very dark
    });

    it("should handle string inputs", () => {
      expect(getSrmColor("5")).toBe("#FFC232");
      expect(getSrmColor("10.5")).toBe("#E07A00"); // Rounds to 11
      expect(getSrmColor("2.4")).toBe("#FFE699"); // Rounds to 2
    });

    it("should round properly for color lookup", () => {
      expect(getSrmColor(4.4)).toBe("#FFBF42"); // Rounds to 4
      expect(getSrmColor(4.6)).toBe("#FFC232"); // Rounds to 5
      expect(getSrmColor(10.5)).toBe("#E07A00"); // Rounds to 11
    });
  });

  describe("formatIBU", () => {
    it("should handle null and undefined", () => {
      expect(formatIBU(null)).toBe("N/A");
      expect(formatIBU(undefined)).toBe("N/A");
    });

    it("should format as rounded whole numbers", () => {
      expect(formatIBU(45)).toBe("45");
      expect(formatIBU(45.4)).toBe("45");
      expect(formatIBU(45.6)).toBe("46");
      expect(formatIBU(0)).toBe("0");
    });
  });

  describe("formatABV", () => {
    it("should handle null and undefined", () => {
      expect(formatABV(null)).toBe("N/A");
      expect(formatABV(undefined)).toBe("N/A");
    });

    it("should format with one decimal place and percent sign", () => {
      expect(formatABV(5.5)).toBe("5.5%");
      expect(formatABV(6.85)).toBe("6.8%"); // Rounds
      expect(formatABV(0)).toBe("0.0%");
      expect(formatABV(10)).toBe("10.0%");
    });
  });

  describe("formatAttenuation", () => {
    it("should use formatPercentage with default settings", () => {
      expect(formatAttenuation(75.5)).toBe("75.5%");
      expect(formatAttenuation(null)).toBe("N/A");
      expect(formatAttenuation(undefined)).toBe("N/A");
    });
  });

  describe("formatAlphaAcid", () => {
    it("should use formatPercentage with default settings", () => {
      expect(formatAlphaAcid(5.5)).toBe("5.5%");
      expect(formatAlphaAcid(null)).toBe("N/A");
      expect(formatAlphaAcid(undefined)).toBe("N/A");
    });
  });

  describe("formatPotential", () => {
    it("should handle null and undefined", () => {
      expect(formatPotential(null)).toBe("N/A");
      expect(formatPotential(undefined)).toBe("N/A");
    });

    it("should format with default PPG unit", () => {
      expect(formatPotential(37)).toBe("37 PPG");
      expect(formatPotential(36.5)).toBe("37 PPG"); // Rounds
      expect(formatPotential(35.4)).toBe("35 PPG");
    });

    it("should format with specified unit", () => {
      expect(formatPotential(300, "CGDB")).toBe("300 CGDB");
      expect(formatPotential(299.6, "CGDB")).toBe("300 CGDB");
    });
  });

  describe("formatIngredientDetails", () => {
    it("should format hop ingredient details", () => {
      const hopIngredient = {
        id: "hop-1",
        type: "hop" as const,
        use: "boil",
        time: 60,
        alpha_acid: 5.5,
        name: "Test Hop",
        amount: 1,
        unit: "oz" as const,
      };

      const result = formatIngredientDetails(hopIngredient);
      expect(result).toBe("Boil • 60 mins • 5.5%");
    });

    it("should format hop ingredient with partial data", () => {
      const hopIngredient = {
        id: "hop-2",
        type: "hop" as const,
        use: "dry-hop",
        time: 10080, // 7 days
        name: "Test Hop",
        amount: 1,
        unit: "oz" as const,
      };

      const result = formatIngredientDetails(hopIngredient);
      expect(result).toBe("Dry Hop • 7 days");
    });

    it("should format grain ingredient details", () => {
      const grainIngredient = {
        id: "grain-1",
        type: "grain" as const,
        color: 5.5,
        potential: 37,
        name: "Test Grain",
        amount: 10,
        unit: "lb" as const,
      };

      const result = formatIngredientDetails(grainIngredient);
      expect(result).toBe("6 °L • 37 PPG");
    });

    it("should format yeast ingredient details", () => {
      const yeastIngredient = {
        id: "yeast-1",
        type: "yeast" as const,
        attenuation: 75,
        manufacturer: "Wyeast",
        name: "Test Yeast",
        amount: 1,
        unit: "pkg" as const,
      };

      const result = formatIngredientDetails(yeastIngredient);
      expect(result).toBe("75.0% Att. • Wyeast");
    });

    it("should handle ingredients with no details", () => {
      const ingredient = {
        id: "other-1",
        type: "other" as const,
        name: "Test Ingredient",
        amount: 1,
        unit: "tsp" as const,
      };

      const result = formatIngredientDetails(ingredient);
      expect(result).toBe("");
    });

    it("should handle ingredients with some missing details", () => {
      const grainIngredient = {
        id: "grain-2",
        type: "grain" as const,
        color: 5.5,
        // potential is missing
        name: "Test Grain",
        amount: 10,
        unit: "lb" as const,
      };

      const result = formatIngredientDetails(grainIngredient);
      expect(result).toBe("6 °L");
    });
  });
});
