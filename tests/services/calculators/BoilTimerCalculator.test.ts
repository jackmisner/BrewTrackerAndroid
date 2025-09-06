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
});
