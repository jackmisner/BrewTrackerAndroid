import {
  HOP_USAGE_OPTIONS,
  HOP_TIME_PRESETS,
  HopUsageValue,
  HopTimePresetKey,
} from "@src/constants/hopConstants";

describe("hopConstants", () => {
  describe("HOP_USAGE_OPTIONS", () => {
    it("should contain all expected hop usage options", () => {
      expect(HOP_USAGE_OPTIONS).toHaveLength(3);
      
      const usageValues = HOP_USAGE_OPTIONS.map(option => option.value);
      expect(usageValues).toContain("boil");
      expect(usageValues).toContain("whirlpool");
      expect(usageValues).toContain("dry-hop");
    });

    it("should have correct display names for each usage", () => {
      const boilOption = HOP_USAGE_OPTIONS.find(opt => opt.value === "boil");
      expect(boilOption?.display).toBe("Boil");

      const whirlpoolOption = HOP_USAGE_OPTIONS.find(opt => opt.value === "whirlpool");
      expect(whirlpoolOption?.display).toBe("Whirlpool");

      const dryHopOption = HOP_USAGE_OPTIONS.find(opt => opt.value === "dry-hop");
      expect(dryHopOption?.display).toBe("Dry Hop");
    });

    it("should have reasonable default times (in minutes)", () => {
      const boilOption = HOP_USAGE_OPTIONS.find(opt => opt.value === "boil");
      expect(boilOption?.defaultTime).toBe(60); // 60 minutes

      const whirlpoolOption = HOP_USAGE_OPTIONS.find(opt => opt.value === "whirlpool");
      expect(whirlpoolOption?.defaultTime).toBe(15); // 15 minutes

      const dryHopOption = HOP_USAGE_OPTIONS.find(opt => opt.value === "dry-hop");
      expect(dryHopOption?.defaultTime).toBe(4320); // 3 days in minutes (3 * 24 * 60)
    });

    it("should be defined as const", () => {
      // Test that the array has expected structure
      expect(Array.isArray(HOP_USAGE_OPTIONS)).toBe(true);
      expect(HOP_USAGE_OPTIONS.length).toBeGreaterThan(0);
    });
  });

  describe("HOP_TIME_PRESETS", () => {
    describe("boil presets", () => {
      it("should contain common boil time presets", () => {
        const boilPresets = HOP_TIME_PRESETS.boil;
        expect(boilPresets).toHaveLength(8);

        // Check for common boil times
        const values = boilPresets.map(preset => preset.value);
        expect(values).toContain(90);
        expect(values).toContain(60);
        expect(values).toContain(30);
        expect(values).toContain(15);
        expect(values).toContain(5);
        expect(values).toContain(0);
      });

      it("should have proper labels for boil times", () => {
        const boilPresets = HOP_TIME_PRESETS.boil;
        
        const sixtyMinPreset = boilPresets.find(preset => preset.value === 60);
        expect(sixtyMinPreset?.label).toBe("60 min");

        const flamoutPreset = boilPresets.find(preset => preset.value === 0);
        expect(flamoutPreset?.label).toBe("0 min");
      });

      it("should be sorted in descending order", () => {
        const boilPresets = HOP_TIME_PRESETS.boil;
        const values = boilPresets.map(preset => preset.value);
        
        for (let i = 1; i < values.length; i++) {
          expect(values[i]).toBeLessThanOrEqual(values[i - 1]);
        }
      });
    });

    describe("whirlpool presets", () => {
      it("should contain appropriate whirlpool time presets", () => {
        const whirlpoolPresets = HOP_TIME_PRESETS.whirlpool;
        expect(whirlpoolPresets).toHaveLength(6);

        const values = whirlpoolPresets.map(preset => preset.value);
        expect(values).toContain(30);
        expect(values).toContain(20);
        expect(values).toContain(15);
        expect(values).toContain(10);
        expect(values).toContain(5);
        expect(values).toContain(0);
      });

      it("should have proper labels for whirlpool times", () => {
        const whirlpoolPresets = HOP_TIME_PRESETS.whirlpool;
        
        const thirtyMinPreset = whirlpoolPresets.find(preset => preset.value === 30);
        expect(thirtyMinPreset?.label).toBe("30 min");

        const fiveMinPreset = whirlpoolPresets.find(preset => preset.value === 5);
        expect(fiveMinPreset?.label).toBe("5 min");
      });
    });

    describe("dry-hop presets", () => {
      it("should contain dry hop time presets in minutes", () => {
        const dryHopPresets = HOP_TIME_PRESETS["dry-hop"];
        expect(dryHopPresets).toHaveLength(6);

        // Check that values are in minutes (days * 1440)
        const sevenDayPreset = dryHopPresets.find(preset => preset.label === "7 days");
        expect(sevenDayPreset?.value).toBe(7 * 1440); // 7 days in minutes

        const threeDayPreset = dryHopPresets.find(preset => preset.label === "3 days");
        expect(threeDayPreset?.value).toBe(3 * 1440); // 3 days in minutes

        const oneDayPreset = dryHopPresets.find(preset => preset.label === "1 day");
        expect(oneDayPreset?.value).toBe(1 * 1440); // 1 day in minutes
      });

      it("should have proper labels for dry hop times", () => {
        const dryHopPresets = HOP_TIME_PRESETS["dry-hop"];
        
        const labels = dryHopPresets.map(preset => preset.label);
        expect(labels).toContain("7 days");
        expect(labels).toContain("5 days");
        expect(labels).toContain("4 days");
        expect(labels).toContain("3 days");
        expect(labels).toContain("2 days");
        expect(labels).toContain("1 day");
      });

      it("should have correct minute calculations", () => {
        const dryHopPresets = HOP_TIME_PRESETS["dry-hop"];
        
        // Verify the math: days * 24 hours * 60 minutes
        dryHopPresets.forEach(preset => {
          const dayMatch = preset.label.match(/(\d+) days?/);
          if (dayMatch) {
            const days = parseInt(dayMatch[1], 10);
            const expectedMinutes = days * 24 * 60;
            expect(preset.value).toBe(expectedMinutes);
          }
        });
      });
    });

    it("should have proper structure", () => {
      // Test that all preset arrays exist and have proper structure
      expect(typeof HOP_TIME_PRESETS).toBe("object");
      expect(HOP_TIME_PRESETS.boil).toBeDefined();
      expect(HOP_TIME_PRESETS.whirlpool).toBeDefined();
      expect(HOP_TIME_PRESETS["dry-hop"]).toBeDefined();
    });
  });

  describe("type definitions", () => {
    it("should export correct HopUsageValue type", () => {
      // Test that the type includes expected values
      const boilUsage: HopUsageValue = "boil";
      const whirlpoolUsage: HopUsageValue = "whirlpool";
      const dryHopUsage: HopUsageValue = "dry-hop";

      expect(boilUsage).toBe("boil");
      expect(whirlpoolUsage).toBe("whirlpool");
      expect(dryHopUsage).toBe("dry-hop");
    });

    it("should export correct HopTimePresetKey type", () => {
      // Test that the type includes expected keys
      const boilKey: HopTimePresetKey = "boil";
      const whirlpoolKey: HopTimePresetKey = "whirlpool";
      const dryHopKey: HopTimePresetKey = "dry-hop";

      expect(boilKey).toBe("boil");
      expect(whirlpoolKey).toBe("whirlpool");
      expect(dryHopKey).toBe("dry-hop");
    });
  });

  describe("integration with time utilities", () => {
    it("should provide consistent minute values for storage", () => {
      // All preset values should be in minutes for database storage
      Object.values(HOP_TIME_PRESETS).forEach(presetArray => {
        presetArray.forEach(preset => {
          expect(typeof preset.value).toBe("number");
          expect(preset.value).toBeGreaterThanOrEqual(0);
          expect(Number.isInteger(preset.value)).toBe(true);
        });
      });
    });

    it("should match default times from HOP_USAGE_OPTIONS", () => {
      // Verify that default times exist in the corresponding presets
      HOP_USAGE_OPTIONS.forEach(option => {
        const presets = HOP_TIME_PRESETS[option.value as HopTimePresetKey];
        if (presets) {
          const hasDefaultTime = presets.some(preset => preset.value === option.defaultTime);
          expect(hasDefaultTime).toBe(true);
        }
      });
    });
  });
});