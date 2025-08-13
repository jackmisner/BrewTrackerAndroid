import {
  convertDaysToMinutes,
  convertMinutesToDays,
  formatHopTime,
  getDefaultHopTime,
  getHopTimeUnit,
  convertHopTimeForStorage,
  convertHopTimeForDisplay,
} from "@utils/timeUtils";

describe("timeUtils", () => {
  describe("convertDaysToMinutes", () => {
    it("should convert days to minutes correctly", () => {
      expect(convertDaysToMinutes(1)).toBe(1440); // 1 day = 1440 minutes
      expect(convertDaysToMinutes(2)).toBe(2880); // 2 days = 2880 minutes
      expect(convertDaysToMinutes(7)).toBe(10080); // 7 days = 10080 minutes
      expect(convertDaysToMinutes(0.5)).toBe(720); // 12 hours = 720 minutes
    });

    it("should round to whole minutes", () => {
      expect(convertDaysToMinutes(1.5)).toBe(2160); // 1.5 days = 2160 minutes
      expect(convertDaysToMinutes(0.1)).toBe(144); // 2.4 hours = 144 minutes
      expect(convertDaysToMinutes(0.0007)).toBe(1); // Small fraction rounds to 1
    });

    it("should handle edge cases", () => {
      expect(convertDaysToMinutes(0)).toBe(0);
      expect(convertDaysToMinutes(-1)).toBe(-1440); // Negative days
    });
  });

  describe("convertMinutesToDays", () => {
    it("should convert minutes to days correctly", () => {
      expect(convertMinutesToDays(1440)).toBe(1); // 1440 minutes = 1 day
      expect(convertMinutesToDays(2880)).toBe(2); // 2880 minutes = 2 days
      expect(convertMinutesToDays(10080)).toBe(7); // 10080 minutes = 7 days
      expect(convertMinutesToDays(720)).toBe(0.5); // 720 minutes = 0.5 days
    });

    it("should round to one decimal place", () => {
      expect(convertMinutesToDays(1441)).toBe(1); // 1441 minutes = 1.0007 days, rounds to 1
      expect(convertMinutesToDays(1512)).toBe(1.1); // 1512 minutes = 1.05 days, rounds to 1.1
      expect(convertMinutesToDays(1439)).toBe(1); // 1439 minutes = 0.9993 days, rounds to 1
      expect(convertMinutesToDays(144)).toBe(0.1); // 144 minutes = 0.1 days
    });

    it("should handle edge cases", () => {
      expect(convertMinutesToDays(0)).toBe(0);
      expect(convertMinutesToDays(-1440)).toBe(-1); // Negative minutes
    });
  });

  describe("formatHopTime", () => {
    it("should handle null and undefined values", () => {
      expect(formatHopTime(null, "boil")).toBe("—");
      expect(formatHopTime(undefined, "boil")).toBe("—");
    });

    it("should handle invalid numeric values", () => {
      expect(formatHopTime(NaN, "boil")).toBe("—");
      expect(formatHopTime(-5, "boil")).toBe("—");
    });

    it("should handle string inputs", () => {
      expect(formatHopTime("60", "boil")).toBe("60 min");
      expect(formatHopTime("1440", "dry-hop")).toBe("1 day");
      expect(formatHopTime("invalid", "boil")).toBe("—");
      expect(formatHopTime("", "boil")).toBe("—");
    });

    it("should format regular hop times in minutes", () => {
      expect(formatHopTime(60, "boil")).toBe("60 min");
      expect(formatHopTime(15, "whirlpool")).toBe("15 min");
      expect(formatHopTime(0, "flame-out")).toBe("0 min");
      expect(formatHopTime(1, "boil")).toBe("1 min");
      expect(formatHopTime(90, "first-wort")).toBe("90 min");
    });

    it("should round minutes to whole numbers", () => {
      expect(formatHopTime(59.4, "boil")).toBe("59 min");
      expect(formatHopTime(59.6, "boil")).toBe("60 min");
      expect(formatHopTime(30.5, "whirlpool")).toBe("31 min");
    });

    it("should format dry hop times in days", () => {
      expect(formatHopTime(1440, "dry-hop")).toBe("1 day"); // 1 day
      expect(formatHopTime(2880, "dry-hop")).toBe("2 days"); // 2 days
      expect(formatHopTime(10080, "dry-hop")).toBe("7 days"); // 7 days
      expect(formatHopTime(720, "dry-hop")).toBe("0.5 days"); // 0.5 days
    });

    it("should handle different dry hop usage formats", () => {
      expect(formatHopTime(1440, "dry-hop")).toBe("1 day");
      expect(formatHopTime(1440, "Dry-Hop")).toBe("1 day");
      expect(formatHopTime(1440, "DRY_HOP")).toBe("1 day");
      expect(formatHopTime(1440, " dry hop ")).toBe("1 day");
      expect(formatHopTime(1440, "dry hop")).toBe("1 day");
    });

    it("should use singular 'day' for exactly one day", () => {
      expect(formatHopTime(1440, "dry-hop")).toBe("1 day");
      expect(formatHopTime(1441, "dry-hop")).toBe("1 day"); // Rounds to 1
    });

    it("should use plural 'days' for other values", () => {
      expect(formatHopTime(2880, "dry-hop")).toBe("2 days");
      expect(formatHopTime(720, "dry-hop")).toBe("0.5 days");
      expect(formatHopTime(0, "dry-hop")).toBe("0 days");
    });
  });

  describe("getDefaultHopTime", () => {
    it("should return correct default times for known hop uses", () => {
      expect(getDefaultHopTime("Boil")).toBe(60);
      expect(getDefaultHopTime("Dry Hop")).toBe(3); // 3 days (display)
      expect(getDefaultHopTime("Whirlpool")).toBe(15);
      expect(getDefaultHopTime("First Wort")).toBe(60);
      expect(getDefaultHopTime("Mash")).toBe(60);
    });

    it("should handle alternative dry hop formats", () => {
      expect(getDefaultHopTime("dry-hop")).toBe(3);
      expect(getDefaultHopTime("DRY-HOP")).toBe(3);
      expect(getDefaultHopTime("dry hop")).toBe(3);
      expect(getDefaultHopTime(" DRY_HOP ")).toBe(3);
    });

    it("should return 0 for unknown hop uses", () => {
      expect(getDefaultHopTime("unknown")).toBe(0);
      expect(getDefaultHopTime("")).toBe(0);
      expect(getDefaultHopTime("invalid-use")).toBe(0);
    });

    it("should convert dry hop time to minutes when inMinutes is true", () => {
      expect(getDefaultHopTime("Dry Hop", true)).toBe(4320); // 3 days * 1440 minutes
      expect(getDefaultHopTime("dry-hop", true)).toBe(4320);
      expect(getDefaultHopTime("Boil", true)).toBe(60); // Should not convert non-dry-hop
      expect(getDefaultHopTime("Whirlpool", true)).toBe(15);
    });

    it("should return display units when inMinutes is false", () => {
      expect(getDefaultHopTime("Dry Hop", false)).toBe(3); // 3 days
      expect(getDefaultHopTime("dry-hop", false)).toBe(3);
      expect(getDefaultHopTime("Boil", false)).toBe(60); // 60 minutes
    });
  });

  describe("getHopTimeUnit", () => {
    it("should return 'days' for dry hop usage", () => {
      expect(getHopTimeUnit("dry-hop")).toBe("days");
      expect(getHopTimeUnit("Dry-Hop")).toBe("days");
      expect(getHopTimeUnit("DRY_HOP")).toBe("days");
      expect(getHopTimeUnit(" dry hop ")).toBe("days");
      expect(getHopTimeUnit("Dry Hop")).toBe("days"); // Space gets normalized to dash
    });

    it("should return 'minutes' for all other hop usages", () => {
      expect(getHopTimeUnit("boil")).toBe("minutes");
      expect(getHopTimeUnit("whirlpool")).toBe("minutes");
      expect(getHopTimeUnit("flame-out")).toBe("minutes");
      expect(getHopTimeUnit("first-wort")).toBe("minutes");
      expect(getHopTimeUnit("mash")).toBe("minutes");
      expect(getHopTimeUnit("unknown")).toBe("minutes");
      expect(getHopTimeUnit("")).toBe("minutes");
    });
  });

  describe("convertHopTimeForStorage", () => {
    it("should convert days to minutes for dry hop usage", () => {
      expect(convertHopTimeForStorage(3, "dry-hop")).toBe(4320); // 3 days = 4320 minutes
      expect(convertHopTimeForStorage(7, "dry-hop")).toBe(10080); // 7 days = 10080 minutes
      expect(convertHopTimeForStorage(0.5, "dry-hop")).toBe(720); // 0.5 days = 720 minutes
    });

    it("should handle different dry hop formats", () => {
      expect(convertHopTimeForStorage(3, "DRY-HOP")).toBe(4320);
      expect(convertHopTimeForStorage(3, "dry_hop")).toBe(4320);
      expect(convertHopTimeForStorage(3, " dry-hop ")).toBe(4320);
    });

    it("should return input unchanged for non-dry-hop usage", () => {
      expect(convertHopTimeForStorage(60, "boil")).toBe(60);
      expect(convertHopTimeForStorage(15, "whirlpool")).toBe(15);
      expect(convertHopTimeForStorage(0, "flame-out")).toBe(0);
      expect(convertHopTimeForStorage(90, "first-wort")).toBe(90);
    });

    it("should handle edge cases", () => {
      expect(convertHopTimeForStorage(0, "dry-hop")).toBe(0);
      expect(convertHopTimeForStorage(1, "dry-hop")).toBe(1440);
    });
  });

  describe("convertHopTimeForDisplay", () => {
    it("should convert minutes to days for dry-hop usage", () => {
      expect(convertHopTimeForDisplay(4320, "dry-hop")).toBe(3); // 4320 minutes = 3 days
      expect(convertHopTimeForDisplay(10080, "dry-hop")).toBe(7); // 10080 minutes = 7 days
      expect(convertHopTimeForDisplay(720, "dry-hop")).toBe(0.5); // 720 minutes = 0.5 days
      expect(convertHopTimeForDisplay(1440, "dry-hop")).toBe(1); // 1440 minutes = 1 day
    });

    it("should return input unchanged for non-dry-hop usage", () => {
      expect(convertHopTimeForDisplay(60, "boil")).toBe(60);
      expect(convertHopTimeForDisplay(15, "whirlpool")).toBe(15);
      expect(convertHopTimeForDisplay(0, "flame-out")).toBe(0);
      expect(convertHopTimeForDisplay(90, "first-wort")).toBe(90);
    });

    it("should handle edge cases", () => {
      expect(convertHopTimeForDisplay(0, "dry-hop")).toBe(0);
      expect(convertHopTimeForDisplay(1441, "dry-hop")).toBe(1); // Rounds to 1
    });

    it("should convert normalized dry-hop variants", () => {
      // Note: This function now uses isDryHop helper which normalizes variants
      expect(convertHopTimeForDisplay(1440, "DRY-HOP")).toBe(1); // Converted
      expect(convertHopTimeForDisplay(1440, "Dry-Hop")).toBe(1); // Converted
      expect(convertHopTimeForDisplay(1440, "dry hop")).toBe(1); // Converted
      expect(convertHopTimeForDisplay(1440, "dry-hop")).toBe(1); // Converted
    });
  });

  describe("integration tests", () => {
    it("should handle round-trip conversion correctly", () => {
      // Storage: days -> minutes -> days
      const originalDays = 5;
      const minutes = convertHopTimeForStorage(originalDays, "dry-hop");
      const backToDays = convertHopTimeForDisplay(minutes, "dry-hop");
      expect(backToDays).toBe(originalDays);
    });

    it("should handle formatting after storage conversion", () => {
      const inputDays = 3;
      const storedMinutes = convertHopTimeForStorage(inputDays, "dry-hop");
      const formatted = formatHopTime(storedMinutes, "dry-hop");
      expect(formatted).toBe("3 days");
    });

    it("should handle default time workflow", () => {
      const defaultTime = getDefaultHopTime("dry-hop", true); // Get in minutes for storage
      const formatted = formatHopTime(defaultTime, "dry-hop");
      expect(formatted).toBe("3 days");
    });
  });
});
