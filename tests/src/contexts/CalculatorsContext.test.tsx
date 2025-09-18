/**
 * CalculatorsContext Test Suite
 *
 * Tests the calculator state management, reducer actions, and persistence functionality.
 * Focuses on preventing regressions in core calculator logic and state management.
 */

import React from "react";
import { renderHook, act } from "@testing-library/react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  CalculatorsProvider,
  useCalculators,
  CalculatorState,
  CalculatorAction,
} from "../../../src/contexts/CalculatorsContext";

// Mock AsyncStorage
jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

describe("CalculatorsContext", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAsyncStorage.getItem.mockResolvedValue(null);
    mockAsyncStorage.setItem.mockResolvedValue(undefined);
  });

  const renderCalculatorsHook = () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <CalculatorsProvider>{children}</CalculatorsProvider>
    );
    return renderHook(() => useCalculators(), { wrapper });
  };

  describe("Context Provider", () => {
    it("should provide calculator state and dispatch function", () => {
      const { result } = renderCalculatorsHook();

      expect(result.current.state).toBeDefined();
      expect(result.current.dispatch).toBeDefined();
      expect(typeof result.current.dispatch).toBe("function");
    });

    it("should initialize with default state values", () => {
      const { result } = renderCalculatorsHook();
      const { state } = result.current;

      // Test ABV calculator defaults
      expect(state.abv.formula).toBe("simple");
      expect(state.abv.unitType).toBe("sg");
      expect(state.abv.result).toBeNull();

      // Test Strike Water calculator defaults
      expect(state.strikeWater.tempUnit).toBe("f");
      expect(state.strikeWater.waterToGrainRatio).toBe("1.25");
      expect(state.strikeWater.result).toBeNull();

      // Test Hydrometer Correction defaults
      expect(state.hydrometerCorrection.calibrationTemp).toBe("60");
      expect(state.hydrometerCorrection.tempUnit).toBe("f");
      expect(state.hydrometerCorrection.result).toBeNull();

      // Test Boil Timer defaults
      expect(state.boilTimer.duration).toBe(60);
      expect(state.boilTimer.isRunning).toBe(false);
      expect(state.boilTimer.timeRemaining).toBe(3600); // 60 minutes in seconds
      expect(state.boilTimer.additions).toEqual([]);
    });
  });

  describe("Reducer Actions", () => {
    describe("SET_ABV", () => {
      it("should update ABV calculator state", () => {
        const { result } = renderCalculatorsHook();

        act(() => {
          result.current.dispatch({
            type: "SET_ABV",
            payload: {
              originalGravity: "1.050",
              finalGravity: "1.010",
              formula: "advanced",
              result: 5.25,
            },
          });
        });

        const { abv } = result.current.state;
        expect(abv.originalGravity).toBe("1.050");
        expect(abv.finalGravity).toBe("1.010");
        expect(abv.formula).toBe("advanced");
        expect(abv.result).toBe(5.25);
      });

      it("should partially update ABV state while preserving other fields", () => {
        const { result } = renderCalculatorsHook();

        // Set initial values
        act(() => {
          result.current.dispatch({
            type: "SET_ABV",
            payload: {
              originalGravity: "1.050",
              finalGravity: "1.010",
              formula: "advanced",
            },
          });
        });

        // Update only result
        act(() => {
          result.current.dispatch({
            type: "SET_ABV",
            payload: { result: 5.25 },
          });
        });

        const { abv } = result.current.state;
        expect(abv.originalGravity).toBe("1.050"); // Preserved
        expect(abv.finalGravity).toBe("1.010"); // Preserved
        expect(abv.formula).toBe("advanced"); // Preserved
        expect(abv.result).toBe(5.25); // Updated
      });
    });

    describe("SET_STRIKE_WATER", () => {
      it("should update strike water calculator state", () => {
        const { result } = renderCalculatorsHook();

        act(() => {
          result.current.dispatch({
            type: "SET_STRIKE_WATER",
            payload: {
              grainWeight: "10",
              grainWeightUnit: "kg",
              grainTemp: "20",
              targetMashTemp: "67",
              tempUnit: "c",
              result: { strikeTemp: 72.5, waterVolume: 12.5 },
            },
          });
        });

        const { strikeWater } = result.current.state;
        expect(strikeWater.grainWeight).toBe("10");
        expect(strikeWater.grainWeightUnit).toBe("kg");
        expect(strikeWater.tempUnit).toBe("c");
        expect(strikeWater.result).toEqual({
          strikeTemp: 72.5,
          waterVolume: 12.5,
        });
      });
    });

    describe("SET_HYDROMETER_CORRECTION", () => {
      it("should update hydrometer correction calculator state", () => {
        const { result } = renderCalculatorsHook();

        act(() => {
          result.current.dispatch({
            type: "SET_HYDROMETER_CORRECTION",
            payload: {
              measuredGravity: "1.050",
              wortTemp: "80",
              calibrationTemp: "68",
              tempUnit: "f",
              result: 1.052,
            },
          });
        });

        const { hydrometerCorrection } = result.current.state;
        expect(hydrometerCorrection.measuredGravity).toBe("1.050");
        expect(hydrometerCorrection.wortTemp).toBe("80");
        expect(hydrometerCorrection.calibrationTemp).toBe("68");
        expect(hydrometerCorrection.result).toBe(1.052);
      });
    });

    describe("SET_DILUTION", () => {
      it("should update dilution calculator state", () => {
        const { result } = renderCalculatorsHook();

        act(() => {
          result.current.dispatch({
            type: "SET_DILUTION",
            payload: {
              currentGravity: "1.080",
              currentVolume: "5",
              targetGravity: "1.050",
              volumeUnit: "gal",
              result: { finalVolume: 8, waterToAdd: 3 },
            },
          });
        });

        const { dilution } = result.current.state;
        expect(dilution.currentGravity).toBe("1.080");
        expect(dilution.currentVolume).toBe("5");
        expect(dilution.targetGravity).toBe("1.050");
        expect(dilution.result).toEqual({ finalVolume: 8, waterToAdd: 3 });
      });
    });

    describe("Boil Timer Actions", () => {
      it("should update boil timer state with SET_BOIL_TIMER", () => {
        const { result } = renderCalculatorsHook();

        act(() => {
          result.current.dispatch({
            type: "SET_BOIL_TIMER",
            payload: {
              duration: 90,
              isRunning: true,
              timeRemaining: 5400, // 90 minutes in seconds
            },
          });
        });

        const { boilTimer } = result.current.state;
        expect(boilTimer.duration).toBe(90);
        expect(boilTimer.isRunning).toBe(true);
        expect(boilTimer.timeRemaining).toBe(5400);
      });

      it("should update timer countdown with UPDATE_BOIL_TIMER_TICK", () => {
        const { result } = renderCalculatorsHook();

        // Set initial timer state
        act(() => {
          result.current.dispatch({
            type: "SET_BOIL_TIMER",
            payload: { timeRemaining: 3600 },
          });
        });

        // Simulate timer tick
        act(() => {
          result.current.dispatch({
            type: "UPDATE_BOIL_TIMER_TICK",
            payload: 3599,
          });
        });

        expect(result.current.state.boilTimer.timeRemaining).toBe(3599);
      });

      it("should prevent negative time remaining", () => {
        const { result } = renderCalculatorsHook();

        act(() => {
          result.current.dispatch({
            type: "UPDATE_BOIL_TIMER_TICK",
            payload: -5,
          });
        });

        expect(result.current.state.boilTimer.timeRemaining).toBe(0);
      });

      it("should mark addition as completed", () => {
        const { result } = renderCalculatorsHook();

        // Set initial additions
        act(() => {
          result.current.dispatch({
            type: "SET_BOIL_TIMER",
            payload: {
              additions: [
                {
                  time: 60,
                  description: "Start of boil",
                  completed: false,
                },
                {
                  time: 15,
                  description: "Add hops",
                  completed: false,
                },
              ],
            },
          });
        });

        // Mark first addition as completed
        act(() => {
          result.current.dispatch({
            type: "MARK_ADDITION_COMPLETED",
            payload: 0,
          });
        });

        const { additions } = result.current.state.boilTimer;
        expect(additions[0].completed).toBe(true);
        expect(additions[1].completed).toBe(false);
      });

      it("should load recipe for timer", () => {
        const { result } = renderCalculatorsHook();
        const mockRecipe = {
          id: "recipe-123",
          name: "Test IPA",
          boil_time: 60,
        };

        act(() => {
          result.current.dispatch({
            type: "LOAD_RECIPE_FOR_TIMER",
            payload: {
              recipeId: "recipe-123",
              recipeData: mockRecipe,
            },
          });
        });

        const { boilTimer } = result.current.state;
        expect(boilTimer.recipeId).toBe("recipe-123");
        expect(boilTimer.selectedRecipe).toEqual(mockRecipe);
        expect(boilTimer.isRecipeMode).toBe(true);
      });

      it("should start recipe timer with hop alerts", () => {
        const { result } = renderCalculatorsHook();
        const hopAlerts = [
          { time: 60, ingredient: "Magnum", amount: "1 oz" },
          { time: 15, ingredient: "Cascade", amount: "2 oz" },
        ];

        act(() => {
          result.current.dispatch({
            type: "START_RECIPE_TIMER",
            payload: {
              duration: 90,
              hopAlerts,
            },
          });
        });

        const { boilTimer } = result.current.state;
        expect(boilTimer.duration).toBe(90);
        expect(boilTimer.timeRemaining).toBe(5400); // 90 minutes in seconds
        expect(boilTimer.hopAlerts).toEqual(hopAlerts);
        expect(boilTimer.isRunning).toBe(false); // Timer set up but not started
        expect(boilTimer.isPaused).toBe(false);
      });
    });

    describe("Other Calculator Actions", () => {
      it("should update priming sugar calculator", () => {
        const { result } = renderCalculatorsHook();

        act(() => {
          result.current.dispatch({
            type: "SET_PRIMING_SUGAR",
            payload: {
              beerVolume: "5",
              targetCO2: "2.8",
              sugarType: "table-sugar",
              result: 125.5,
            },
          });
        });

        const { primingSugar } = result.current.state;
        expect(primingSugar.beerVolume).toBe("5");
        expect(primingSugar.targetCO2).toBe("2.8");
        expect(primingSugar.sugarType).toBe("table-sugar");
        expect(primingSugar.result).toBe(125.5);
      });

      it("should update yeast pitch rate calculator", () => {
        const { result } = renderCalculatorsHook();

        act(() => {
          result.current.dispatch({
            type: "SET_YEAST_PITCH_RATE",
            payload: {
              originalGravity: "1.065",
              beerVolume: "5",
              yeastType: "lager",
              viability: "85",
              result: { targetCells: 350, packetsNeeded: 2 },
            },
          });
        });

        const { yeastPitchRate } = result.current.state;
        expect(yeastPitchRate.originalGravity).toBe("1.065");
        expect(yeastPitchRate.yeastType).toBe("lager");
        expect(yeastPitchRate.viability).toBe("85");
        expect(yeastPitchRate.result).toEqual({
          targetCells: 350,
          packetsNeeded: 2,
        });
      });

      it("should update efficiency calculator", () => {
        const { result } = renderCalculatorsHook();
        const grainBill = [
          { weight: "10", ppg: "37" },
          { weight: "2", ppg: "35" },
        ];

        act(() => {
          result.current.dispatch({
            type: "SET_EFFICIENCY",
            payload: {
              grainBill,
              expectedOG: "1.055",
              actualOG: "1.050",
              batchSize: "5",
              result: { mashEfficiency: 82, brewhouseEfficiency: 75 },
            },
          });
        });

        const { efficiency } = result.current.state;
        expect(efficiency.grainBill).toEqual(grainBill);
        expect(efficiency.expectedOG).toBe("1.055");
        expect(efficiency.actualOG).toBe("1.050");
        expect(efficiency.result).toEqual({
          mashEfficiency: 82,
          brewhouseEfficiency: 75,
        });
      });
    });

    describe("LOAD_PERSISTED_STATE", () => {
      it("should deep merge persisted state with current state", () => {
        const { result } = renderCalculatorsHook();

        // Set some initial state
        act(() => {
          result.current.dispatch({
            type: "SET_ABV",
            payload: { originalGravity: "1.040" },
          });
        });

        // Load persisted state that only contains partial data
        act(() => {
          result.current.dispatch({
            type: "LOAD_PERSISTED_STATE",
            payload: {
              abv: {
                originalGravity: "1.040",
                finalGravity: "1.008",
                unitType: "sg",
                formula: "advanced",
                result: 4.2,
              },
              preferences: {
                defaultUnits: "metric",
                temperatureUnit: "c",
                saveHistory: true,
              },
            },
          });
        });

        const { state } = result.current;

        // Should use value from persisted state
        expect(state.abv.originalGravity).toBe("1.040"); // From persisted state
        expect(state.abv.finalGravity).toBe("1.008"); // From persisted state
        expect(state.abv.formula).toBe("advanced"); // From persisted state
        expect(state.abv.result).toBe(4.2); // From persisted state

        // Should update preferences
        expect(state.preferences.defaultUnits).toBe("metric");

        // Should preserve other calculator states
        expect(state.strikeWater.tempUnit).toBe("f"); // Default preserved
      });

      it("should handle partial nested state updates", () => {
        const { result } = renderCalculatorsHook();

        act(() => {
          result.current.dispatch({
            type: "LOAD_PERSISTED_STATE",
            payload: {
              boilTimer: {
                duration: 90,
                isRunning: false,
                isRecipeMode: true,
                isPaused: false,
                timeRemaining: 3600,
                hopAlerts: [
                  {
                    time: 60,
                    name: "Magnum",
                    amount: 1,
                    unit: "oz",
                    added: false,
                    alertScheduled: false,
                  },
                ],

                additions: [
                  {
                    time: 60,
                    description: "Add Cascade hops",
                    completed: false,
                  },
                ],
              },
            },
          });
        });

        const { boilTimer } = result.current.state;
        expect(boilTimer.duration).toBe(90);
        expect(boilTimer.additions).toHaveLength(1);
        expect(boilTimer.isRunning).toBe(false); // Default preserved
        expect(boilTimer.timeRemaining).toBe(3600); // Default preserved
      });
    });

    describe("SET_UNIT_CONVERTER", () => {
      it("should update unit converter state", () => {
        const { result } = renderCalculatorsHook();

        act(() => {
          result.current.dispatch({
            type: "SET_UNIT_CONVERTER",
            payload: {
              fromUnit: "oz",
              toUnit: "g",
              value: "16",
              result: 453.6,
              category: "weight",
            },
          });
        });

        const { unitConverter } = result.current.state;
        expect(unitConverter.fromUnit).toBe("oz");
        expect(unitConverter.toUnit).toBe("g");
        expect(unitConverter.value).toBe("16");
        expect(unitConverter.result).toBe(453.6);
        expect(unitConverter.category).toBe("weight");
      });
    });
  });

  describe("State Persistence", () => {
    it("should load persisted state on initialization", async () => {
      const persistedState = {
        abv: {
          originalGravity: "1.060",
          finalGravity: "1.012",
          formula: "advanced" as const,
          result: 6.3,
        },
        preferences: {
          defaultUnits: "metric" as const,
          temperatureUnit: "c" as const,
          saveHistory: false,
        },
      };

      mockAsyncStorage.getItem.mockResolvedValueOnce(
        JSON.stringify(persistedState)
      );

      const { result } = renderCalculatorsHook();

      // Wait for async state loading
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(result.current.state.abv.originalGravity).toBe("1.060");
      expect(result.current.state.abv.formula).toBe("advanced");
      expect(result.current.state.preferences.defaultUnits).toBe("metric");
      expect(result.current.state.preferences.temperatureUnit).toBe("c");
    });

    it("should handle corrupted persisted state gracefully", async () => {
      mockAsyncStorage.getItem.mockResolvedValueOnce("invalid-json");

      const { result } = renderCalculatorsHook();

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      // Should fall back to default state
      expect(result.current.state.abv.formula).toBe("simple");
      expect(result.current.state.preferences.defaultUnits).toBe("imperial");
    });

    it("should persist state changes to AsyncStorage after hydration", async () => {
      const { result } = renderCalculatorsHook();

      // Wait for initial hydration to complete
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      // Clear any calls from initial hydration
      mockAsyncStorage.setItem.mockClear();

      act(() => {
        result.current.dispatch({
          type: "SET_ABV",
          payload: { originalGravity: "1.055", result: 5.8 },
        });
      });

      // Wait for debounced persistence (1000ms + buffer)
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 1100));
      });

      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        "calculators_state",
        expect.stringContaining("1.055")
      );
    });
  });

  describe("Error Handling", () => {
    it("should handle AsyncStorage errors gracefully", async () => {
      mockAsyncStorage.getItem.mockRejectedValueOnce(
        new Error("Storage error")
      );

      const { result } = renderCalculatorsHook();

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      // Should still provide default state
      expect(result.current.state).toBeDefined();
      expect(result.current.dispatch).toBeDefined();
    });

    it("should continue working if persistence fails", async () => {
      mockAsyncStorage.setItem.mockRejectedValueOnce(new Error("Storage full"));

      const { result } = renderCalculatorsHook();

      act(() => {
        result.current.dispatch({
          type: "SET_ABV",
          payload: { originalGravity: "1.050" },
        });
      });

      // State should still be updated despite persistence failure
      expect(result.current.state.abv.originalGravity).toBe("1.050");
    });
  });

  describe("Hook Usage Validation", () => {
    it("should throw error when used outside provider", () => {
      // Suppress console.error for this test
      const consoleSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      expect(() => {
        renderHook(() => useCalculators());
      }).toThrow("useCalculators must be used within a CalculatorsProvider");

      consoleSpy.mockRestore();
    });
  });
});
