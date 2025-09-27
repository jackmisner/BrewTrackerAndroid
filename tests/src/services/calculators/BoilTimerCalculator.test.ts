/**
 * Tests for BoilTimerCalculator service
 *
 * Tests boil timer calculations and recipe parsing
 */

import {
  BoilTimerCalculator,
  HopAddition,
} from "@services/calculators/BoilTimerCalculator";
import { Recipe, RecipeIngredient } from "@src/types";

describe("BoilTimerCalculator", () => {
  // Mock recipe data
  const mockRecipe: Recipe = {
    id: "test-recipe-1",
    name: "Test IPA",
    style: "American IPA",
    boil_time: 60,
    ingredients: [
      {
        id: "hop-1",
        name: "Cascade",
        type: "hop",
        amount: 1.0,
        unit: "oz",
        time: 60,
        use: "boil",
        alpha_acid: 5.5,
      },
      {
        id: "hop-2",
        name: "Centennial",
        type: "hop",
        amount: 0.5,
        unit: "oz",
        time: 15,
        use: "boil",
        alpha_acid: 10.0,
      },
      {
        id: "grain-1",
        name: "Pale Malt",
        type: "grain",
        amount: 8.0,
        unit: "lb",
      },
    ],
  } as Recipe;

  describe("calculate", () => {
    it("should calculate basic timer result", () => {
      const hopAdditions: HopAddition[] = [
        { time: 60, name: "Cascade", amount: 1.0, unit: "oz" },
        { time: 15, name: "Centennial", amount: 0.5, unit: "oz" },
      ];

      const result = BoilTimerCalculator.calculate(60, hopAdditions);

      expect(result.duration).toBe(60);
      expect(result.hopSchedule).toHaveLength(2);
      expect(result.hopSchedule[0].added).toBe(false);
      expect(result.hopSchedule[1].added).toBe(false);
    });

    it("should handle empty hop additions", () => {
      const result = BoilTimerCalculator.calculate(30);

      expect(result.duration).toBe(30);
      expect(result.hopSchedule).toHaveLength(0);
      expect(result.otherSchedule).toHaveLength(0);
    });

    it("should throw error for invalid duration", () => {
      expect(() => {
        BoilTimerCalculator.calculate(0);
      }).toThrow("Duration must be greater than 0");

      expect(() => {
        BoilTimerCalculator.calculate(-10);
      }).toThrow("Duration must be greater than 0");
    });

    it("should handle other additions", () => {
      const otherAdditions = [
        { time: 15, description: "Add whirlfloc" },
        { time: 5, description: "Add yeast nutrient" },
      ];

      const result = BoilTimerCalculator.calculate(60, [], otherAdditions);

      expect(result.otherSchedule).toHaveLength(2);
      expect(result.otherSchedule[0].added).toBe(false);
      expect(result.otherSchedule[1].added).toBe(false);
    });
  });

  describe("createFromRecipe", () => {
    it("should create timer data from recipe", () => {
      const timerData = BoilTimerCalculator.createFromRecipe(mockRecipe);

      expect(timerData.recipeId).toBe("test-recipe-1");
      expect(timerData.recipeName).toBe("Test IPA");
      expect(timerData.recipeStyle).toBe("American IPA");
      expect(timerData.boilTime).toBe(60);
      expect(timerData.hopAlerts).toHaveLength(2);
    });

    it("should throw error for missing recipe", () => {
      expect(() => {
        BoilTimerCalculator.createFromRecipe(null as any);
      }).toThrow("Recipe is required");

      expect(() => {
        BoilTimerCalculator.createFromRecipe(undefined as any);
      }).toThrow("Recipe is required");
    });

    it("should throw error for invalid boil time", () => {
      const invalidRecipe = { ...mockRecipe, boil_time: 0 };

      expect(() => {
        BoilTimerCalculator.createFromRecipe(invalidRecipe);
      }).toThrow("Recipe must have a valid boil time");
    });
  });

  describe("getHopSchedule", () => {
    it("should extract hop schedule from recipe", () => {
      const hopSchedule = BoilTimerCalculator.getHopSchedule(mockRecipe);

      expect(hopSchedule).toHaveLength(2);
      expect(hopSchedule[0].time).toBe(60); // Sorted descending
      expect(hopSchedule[1].time).toBe(15);
      expect(hopSchedule[0].name).toBe("Cascade");
      expect(hopSchedule[1].name).toBe("Centennial");
    });

    it("should filter out non-hop ingredients", () => {
      const hopSchedule = BoilTimerCalculator.getHopSchedule(mockRecipe);

      // Should only include hops, not the grain
      expect(hopSchedule).toHaveLength(2);
      expect(
        hopSchedule.every(
          hop => hop.name.includes("Cascade") || hop.name.includes("Centennial")
        )
      ).toBe(true);
    });

    it("should handle hops with no time specified", () => {
      const recipeWithUndefinedTime = {
        ...mockRecipe,
        ingredients: [
          {
            id: "hop-1",
            name: "Dry Hop",
            type: "hop",
            amount: 1.0,
            unit: "oz",
            time: undefined,
            use: "dry hop",
          },
        ],
      } as Recipe;

      const hopSchedule = BoilTimerCalculator.getHopSchedule(
        recipeWithUndefinedTime
      );
      expect(hopSchedule).toHaveLength(0); // Should be filtered out
    });

    it("should validate hop times against boil duration", () => {
      const recipeWithLongHop = {
        ...mockRecipe,
        boil_time: 30,
        ingredients: [
          {
            id: "hop-1",
            name: "Long Hop",
            type: "hop",
            amount: 1.0,
            unit: "oz",
            time: 60, // Exceeds 30min boil time
            use: "boil",
          },
        ],
      } as Recipe;

      const consoleSpy = jest.spyOn(console, "warn").mockImplementation();
      const hopSchedule = BoilTimerCalculator.getHopSchedule(recipeWithLongHop);

      expect(hopSchedule).toHaveLength(0); // Should be filtered out
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          "Long Hop has addition time 60min which exceeds boil time 30min"
        )
      );

      consoleSpy.mockRestore();
    });
  });

  describe("getDefaultBoilAdditions", () => {
    it("should return default additions for 60 minute boil", () => {
      const additions = BoilTimerCalculator.getDefaultBoilAdditions(60);

      expect(additions).toHaveLength(3);
      expect(
        additions.some(
          a => a.time === 15 && a.description.includes("Whirlfloc")
        )
      ).toBe(true);
      expect(
        additions.some(
          a => a.time === 10 && a.description.includes("Yeast Nutrient")
        )
      ).toBe(true);
      expect(
        additions.some(a => a.time === 0 && a.description.includes("Flameout"))
      ).toBe(true);
    });

    it("should handle short boil times", () => {
      const additions = BoilTimerCalculator.getDefaultBoilAdditions(5);

      // Should only include flameout for very short boils
      expect(additions).toHaveLength(1);
      expect(additions[0].time).toBe(0);
      expect(additions[0].description).toContain("Flameout");
    });

    it("should include yeast nutrient for 10+ minute boils", () => {
      const additions = BoilTimerCalculator.getDefaultBoilAdditions(12);

      expect(additions).toHaveLength(2);
      expect(additions.some(a => a.time === 10)).toBe(true);
      expect(additions.some(a => a.time === 0)).toBe(true);
    });
  });

  describe("formatTime", () => {
    it("should format time correctly", () => {
      expect(BoilTimerCalculator.formatTime(0)).toBe("00:00");
      expect(BoilTimerCalculator.formatTime(65)).toBe("01:05");
      expect(BoilTimerCalculator.formatTime(3600)).toBe("60:00");
      expect(BoilTimerCalculator.formatTime(125)).toBe("02:05");
    });

    it("should handle negative time", () => {
      expect(BoilTimerCalculator.formatTime(-30)).toBe("00:00");
    });

    it("should handle decimal seconds", () => {
      expect(BoilTimerCalculator.formatTime(90.7)).toBe("01:30");
    });
  });

  describe("getHopAlertTimes", () => {
    it("should calculate alert times for hop additions", () => {
      const hopSchedule: HopAddition[] = [
        { time: 60, name: "Cascade", amount: 1.0, unit: "oz" },
        { time: 15, name: "Centennial", amount: 0.5, unit: "oz" },
        { time: 0, name: "Whirlpool", amount: 1.0, unit: "oz" },
      ];

      const alertMap = BoilTimerCalculator.getHopAlertTimes(hopSchedule);

      // 60min hop: alert at 60*60-30 = 3570 seconds (30 seconds before)
      // 15min hop: alert at 15*60-30 = 870 seconds (30 seconds before)
      // 0min hop: alert at Math.max(0, 0*60-30) = 0 seconds (can't be negative)
      expect(alertMap.size).toBe(3);
      expect(alertMap.has(3570)).toBe(true);
      expect(alertMap.has(870)).toBe(true);
      expect(alertMap.has(0)).toBe(true);
    });

    it("should group multiple hops at same time", () => {
      const hopSchedule: HopAddition[] = [
        { time: 15, name: "Cascade", amount: 1.0, unit: "oz" },
        { time: 15, name: "Centennial", amount: 0.5, unit: "oz" },
      ];

      const alertMap = BoilTimerCalculator.getHopAlertTimes(hopSchedule);

      expect(alertMap.size).toBe(1);
      expect(alertMap.has(870)).toBe(true); // 15*60-30 (30 seconds before)
      expect(alertMap.get(870)?.length).toBe(2);
    });

    it("should handle empty hop schedule", () => {
      const alertMap = BoilTimerCalculator.getHopAlertTimes([]);
      expect(alertMap.size).toBe(0);
    });
  });

  describe("validateRecipeForTimer", () => {
    it("should validate a good recipe", () => {
      const result = BoilTimerCalculator.validateRecipeForTimer(mockRecipe);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it("should detect missing boil time", () => {
      const badRecipe = { ...mockRecipe, boil_time: 0 };
      const result = BoilTimerCalculator.validateRecipeForTimer(badRecipe);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Recipe must have a valid boil time");
    });

    it("should warn about very long boil times", () => {
      const longBoilRecipe = { ...mockRecipe, boil_time: 200 }; // > 3 hours
      const result = BoilTimerCalculator.validateRecipeForTimer(longBoilRecipe);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain(
        "Boil time is unusually long (>3 hours)"
      );
    });

    it("should warn about recipes with no hops", () => {
      const noHopRecipe = {
        ...mockRecipe,
        ingredients: [
          {
            id: "grain-1",
            name: "Pale Malt",
            type: "grain",
            amount: 8.0,
            unit: "lb",
          },
        ],
      } as Recipe;

      const result = BoilTimerCalculator.validateRecipeForTimer(noHopRecipe);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain("Recipe has no hop additions");
    });

    it("should warn about hops with no time specified", () => {
      const noTimeRecipe = {
        ...mockRecipe,
        ingredients: [
          {
            id: "hop-1",
            name: "Mystery Hop",
            type: "hop",
            amount: 1.0,
            unit: "oz",
            time: undefined,
          },
        ],
      } as Recipe;

      const result = BoilTimerCalculator.validateRecipeForTimer(noTimeRecipe);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain(
        "Hop Mystery Hop has no addition time specified"
      );
    });

    it("should error on negative hop times", () => {
      const negativeTimeRecipe = {
        ...mockRecipe,
        ingredients: [
          {
            id: "hop-1",
            name: "Bad Hop",
            type: "hop",
            amount: 1.0,
            unit: "oz",
            time: -5,
          },
        ],
      } as Recipe;

      const result =
        BoilTimerCalculator.validateRecipeForTimer(negativeTimeRecipe);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        "Hop Bad Hop has a negative addition time (-5min)"
      );
    });

    it("should error when hop time exceeds boil time", () => {
      const exceedsBoilRecipe = {
        ...mockRecipe,
        boil_time: 30,
        ingredients: [
          {
            id: "hop-1",
            name: "Long Hop",
            type: "hop",
            amount: 1.0,
            unit: "oz",
            time: 60, // Exceeds 30min boil
          },
        ],
      } as Recipe;

      const result =
        BoilTimerCalculator.validateRecipeForTimer(exceedsBoilRecipe);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        "Hop Long Hop addition time (60min) exceeds boil time (30min)"
      );
    });

    it("should handle null hop times", () => {
      const nullTimeRecipe = {
        ...mockRecipe,
        ingredients: [
          {
            id: "hop-1",
            name: "Null Hop",
            type: "hop",
            amount: 1.0,
            unit: "oz",
            time: undefined,
          } as RecipeIngredient,
        ],
      } as Recipe;

      const result = BoilTimerCalculator.validateRecipeForTimer(nullTimeRecipe);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain(
        "Hop Null Hop has no addition time specified"
      );
    });
  });

  describe("getTimeToNextAddition", () => {
    it("should find next hop addition", () => {
      const hopAlerts = [
        { time: 60, added: false },
        { time: 30, added: false },
        { time: 15, added: false },
        { time: 0, added: false },
      ];

      // Current time remaining: 35 minutes (2100 seconds)
      const result = BoilTimerCalculator.getTimeToNextAddition(2100, hopAlerts);

      expect(result.nextAddition).toEqual({ time: 30, added: false });
      expect(result.timeUntilNext).toBe(300); // 2100 - 30*60 = 300 seconds
    });

    it("should skip already added hops", () => {
      const hopAlerts = [
        { time: 60, added: true }, // Already added
        { time: 30, added: false },
        { time: 15, added: false },
      ];

      // Current time remaining: 35 minutes (2100 seconds)
      const result = BoilTimerCalculator.getTimeToNextAddition(2100, hopAlerts);

      expect(result.nextAddition).toEqual({ time: 30, added: false });
      expect(result.timeUntilNext).toBe(300); // 2100 - 30*60
    });

    it("should handle case when no additions remain", () => {
      const hopAlerts = [
        { time: 60, added: true },
        { time: 30, added: true },
        { time: 15, added: true },
      ];

      const result = BoilTimerCalculator.getTimeToNextAddition(900, hopAlerts);

      expect(result.nextAddition).toBeNull();
      expect(result.timeUntilNext).toBe(0);
    });

    it("should handle case when no additions are due yet", () => {
      const hopAlerts = [
        { time: 60, added: false },
        { time: 30, added: false },
      ];

      // Current time remaining: 25 minutes (1500 seconds) - less than any hop time
      const result = BoilTimerCalculator.getTimeToNextAddition(1500, hopAlerts);

      expect(result.nextAddition).toBeNull();
      expect(result.timeUntilNext).toBe(0);
    });

    it("should handle empty hop alerts", () => {
      const result = BoilTimerCalculator.getTimeToNextAddition(1800, []);

      expect(result.nextAddition).toBeNull();
      expect(result.timeUntilNext).toBe(0);
    });

    it("should find the most recent due addition", () => {
      const hopAlerts = [
        { time: 30, added: false },
        { time: 15, added: false },
        { time: 10, added: false },
      ];

      // Current time remaining: 12 minutes (720 seconds)
      const result = BoilTimerCalculator.getTimeToNextAddition(720, hopAlerts);

      // Should return the 10min hop (most recent that's due)
      expect(result.nextAddition).toEqual({ time: 10, added: false });
      expect(result.timeUntilNext).toBe(120); // 720 - 10*60
    });
  });
});
