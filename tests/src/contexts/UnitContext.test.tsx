import React from "react";
import { renderHook, act } from "@testing-library/react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { UnitProvider, useUnits } from "../../../src/contexts/UnitContext";
import { UnitSystem } from "@src/types";

// Mock AsyncStorage
jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

// Mock ApiService
jest.mock("@services/api/apiService", () => ({
  __esModule: true,
  default: {
    user: {
      getSettings: jest.fn(),
      updateSettings: jest.fn(),
    },
  },
}));

const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

describe("UnitContext", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAsyncStorage.getItem.mockResolvedValue(null);
    mockAsyncStorage.setItem.mockResolvedValue();
  });

  const createWrapper =
    (initialUnitSystem?: UnitSystem) =>
    ({ children }: { children: React.ReactNode }) =>
      React.createElement(UnitProvider, { initialUnitSystem }, children);

  describe("useUnits hook", () => {
    it("should throw error when used outside provider", () => {
      const consoleSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      expect(() => {
        renderHook(() => useUnits());
      }).toThrow("useUnits must be used within a UnitProvider");

      consoleSpy.mockRestore();
    });

    it("should provide unit context when used within provider", () => {
      const wrapper = createWrapper("metric");
      const { result } = renderHook(() => useUnits(), { wrapper });

      expect(result.current).toBeDefined();
      expect(result.current.unitSystem).toBe("metric");
      expect(typeof result.current.loading).toBe("boolean");
      expect(typeof result.current.updateUnitSystem).toBe("function");
      expect(typeof result.current.convertUnit).toBe("function");
      expect(typeof result.current.formatValue).toBe("function");
    });
  });

  describe("UnitProvider initialization", () => {
    it("should initialize with imperial system by default", () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useUnits(), { wrapper });

      expect(result.current.unitSystem).toBe("imperial");
    });

    it("should initialize with provided unit system", () => {
      const wrapper = createWrapper("metric");
      const { result } = renderHook(() => useUnits(), { wrapper });

      expect(result.current.unitSystem).toBe("metric");
      expect(result.current.loading).toBe(false);
    });

    it("should start loading when no initial system provided", () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useUnits(), { wrapper });

      expect(result.current.loading).toBe(true);
    });
  });

  describe("unit system utilities", () => {
    it("should provide correct system labels", () => {
      const imperialWrapper = createWrapper("imperial");
      const { result: imperialResult } = renderHook(() => useUnits(), {
        wrapper: imperialWrapper,
      });

      expect(imperialResult.current.getUnitSystemLabel()).toBe("Imperial");

      const metricWrapper = createWrapper("metric");
      const { result: metricResult } = renderHook(() => useUnits(), {
        wrapper: metricWrapper,
      });

      expect(metricResult.current.getUnitSystemLabel()).toBe("Metric");
    });

    it("should provide correct temperature symbols", () => {
      const imperialWrapper = createWrapper("imperial");
      const { result: imperialResult } = renderHook(() => useUnits(), {
        wrapper: imperialWrapper,
      });

      expect(imperialResult.current.getTemperatureSymbol()).toBe("°F");

      const metricWrapper = createWrapper("metric");
      const { result: metricResult } = renderHook(() => useUnits(), {
        wrapper: metricWrapper,
      });

      expect(metricResult.current.getTemperatureSymbol()).toBe("°C");
    });
  });

  describe("temperature conversions", () => {
    it("should convert temperatures correctly", () => {
      const wrapper = createWrapper("metric");
      const { result } = renderHook(() => useUnits(), { wrapper });

      // Test common conversions
      expect(
        result.current.convertTemperature(32, "imperial", "metric")
      ).toBeCloseTo(0, 1);
      expect(
        result.current.convertTemperature(212, "imperial", "metric")
      ).toBeCloseTo(100, 1);
      expect(
        result.current.convertTemperature(0, "metric", "imperial")
      ).toBeCloseTo(32, 1);
      expect(
        result.current.convertTemperature(100, "metric", "imperial")
      ).toBeCloseTo(212, 1);
    });

    it("should return same value when converting to same system", () => {
      const wrapper = createWrapper("metric");
      const { result } = renderHook(() => useUnits(), { wrapper });

      expect(result.current.convertTemperature(25, "metric", "metric")).toBe(
        25
      );
      expect(
        result.current.convertTemperature(75, "imperial", "imperial")
      ).toBe(75);
    });

    it("should format temperatures correctly", () => {
      const wrapper = createWrapper("imperial");
      const { result } = renderHook(() => useUnits(), { wrapper });

      // Should format current temperature according to current system
      expect(result.current.formatCurrentTemperature(75)).toBe("75°F");

      // Should format from any system to current system
      expect(result.current.formatTemperature(0, "metric")).toBe("32°F");
    });
  });

  describe("unit conversions", () => {
    it("should handle basic weight conversions", () => {
      const wrapper = createWrapper("metric");
      const { result } = renderHook(() => useUnits(), { wrapper });

      // Test converting pounds to kg
      const conversion = result.current.convertUnit(2.2, "lb", "kg");
      expect(conversion.value).toBeCloseTo(1, 1);
      expect(conversion.unit).toBe("kg");
    });

    it("should handle volume conversions", () => {
      const wrapper = createWrapper("metric");
      const { result } = renderHook(() => useUnits(), { wrapper });

      // Test converting gallons to liters
      const conversion = result.current.convertUnit(1, "gal", "l");
      expect(conversion.value).toBeCloseTo(3.785, 1);
      expect(conversion.unit).toBe("l");
    });

    it("should return same value for same units", () => {
      const wrapper = createWrapper("metric");
      const { result } = renderHook(() => useUnits(), { wrapper });

      const conversion = result.current.convertUnit(5, "kg", "kg");
      expect(conversion.value).toBe(5);
      expect(conversion.unit).toBe("kg");
    });
  });

  describe("preferred units", () => {
    it("should return correct preferred units for imperial system", () => {
      const wrapper = createWrapper("imperial");
      const { result } = renderHook(() => useUnits(), { wrapper });

      expect(result.current.getPreferredUnit("weight")).toBe("lb");
      expect(result.current.getPreferredUnit("volume")).toBe("gal");
      expect(result.current.getPreferredUnit("temperature")).toBe("f");
    });

    it("should return correct preferred units for metric system", () => {
      const wrapper = createWrapper("metric");
      const { result } = renderHook(() => useUnits(), { wrapper });

      expect(result.current.getPreferredUnit("weight")).toBe("kg");
      expect(result.current.getPreferredUnit("volume")).toBe("l");
      expect(result.current.getPreferredUnit("temperature")).toBe("c");
    });
  });

  describe("value formatting", () => {
    it("should format values with correct precision", () => {
      const wrapper = createWrapper("metric");
      const { result } = renderHook(() => useUnits(), { wrapper });

      expect(result.current.formatValue(1.2345, "kg", "weight", 2)).toBe(
        "1.2 kg"
      );
      expect(result.current.formatValue(10, "l", "volume", 0)).toBe("10 l");
    });

    it("should handle string values", () => {
      const wrapper = createWrapper("metric");
      const { result } = renderHook(() => useUnits(), { wrapper });

      expect(result.current.formatValue("1.5", "kg", "weight", 1)).toBe(
        "1.5 kg"
      );
    });

    it("should handle invalid values gracefully", () => {
      const wrapper = createWrapper("metric");
      const { result } = renderHook(() => useUnits(), { wrapper });

      expect(result.current.formatValue("invalid", "kg", "weight")).toBe(
        "0 kg"
      );
      expect(result.current.formatValue(NaN, "kg", "weight")).toBe("0 kg");
    });
  });

  describe("common units", () => {
    it("should provide common weight units", () => {
      const wrapper = createWrapper("metric");
      const { result } = renderHook(() => useUnits(), { wrapper });

      const weightUnits = result.current.getCommonUnits("weight");
      expect(weightUnits).toBeDefined();
      expect(Array.isArray(weightUnits)).toBe(true);
      expect(weightUnits.length).toBeGreaterThan(0);

      const unitValues = weightUnits.map(unit => unit.value);
      expect(unitValues).toContain("kg");
      expect(unitValues).toContain("g");
    });

    it("should provide common volume units", () => {
      const wrapper = createWrapper("imperial");
      const { result } = renderHook(() => useUnits(), { wrapper });

      const volumeUnits = result.current.getCommonUnits("volume");
      expect(volumeUnits).toBeDefined();
      expect(Array.isArray(volumeUnits)).toBe(true);

      const unitValues = volumeUnits.map(unit => unit.value);
      expect(unitValues).toContain("gal");
      expect(unitValues).toContain("qt");
    });
  });

  describe("error handling", () => {
    it("should allow setting and clearing errors", () => {
      const wrapper = createWrapper("metric");
      const { result } = renderHook(() => useUnits(), { wrapper });

      expect(result.current.error).toBeNull();

      act(() => {
        result.current.setError("Test error");
      });

      expect(result.current.error).toBe("Test error");

      act(() => {
        result.current.setError(null);
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe("advanced unit conversions", () => {
    it("should handle weight conversions within metric system", () => {
      const wrapper = createWrapper("metric");
      const { result } = renderHook(() => useUnits(), { wrapper });

      // Test grams to kilograms
      const gToKg = result.current.convertUnit(1000, "g", "kg");
      expect(gToKg.value).toBe(1);
      expect(gToKg.unit).toBe("kg");

      // Test kilograms to grams
      const kgToG = result.current.convertUnit(2.5, "kg", "g");
      expect(kgToG.value).toBe(2500);
      expect(kgToG.unit).toBe("g");
    });

    it("should handle weight conversions within imperial system", () => {
      const wrapper = createWrapper("imperial");
      const { result } = renderHook(() => useUnits(), { wrapper });

      // Test pounds to ounces
      const lbToOz = result.current.convertUnit(2, "lb", "oz");
      expect(lbToOz.value).toBe(32);
      expect(lbToOz.unit).toBe("oz");

      // Test ounces to pounds
      const ozToLb = result.current.convertUnit(16, "oz", "lb");
      expect(ozToLb.value).toBe(1);
      expect(ozToLb.unit).toBe("lb");
    });

    it("should handle volume conversions within metric system", () => {
      const wrapper = createWrapper("metric");
      const { result } = renderHook(() => useUnits(), { wrapper });

      // Test milliliters to liters
      const mlToL = result.current.convertUnit(1500, "ml", "l");
      expect(mlToL.value).toBe(1.5);
      expect(mlToL.unit).toBe("l");

      // Test liters to milliliters
      const lToMl = result.current.convertUnit(0.5, "l", "ml");
      expect(lToMl.value).toBe(500);
      expect(lToMl.unit).toBe("ml");
    });

    it("should handle hop weight conversions", () => {
      const wrapper = createWrapper("metric");
      const { result } = renderHook(() => useUnits(), { wrapper });

      // Test ounces to grams (common for hops)
      const ozToG = result.current.convertUnit(1, "oz", "g");
      expect(ozToG.value).toBeCloseTo(28.3495, 2);
      expect(ozToG.unit).toBe("g");

      // Test grams to ounces
      const gToOz = result.current.convertUnit(28.3495, "g", "oz");
      expect(gToOz.value).toBeCloseTo(1, 2);
      expect(gToOz.unit).toBe("oz");
    });

    it("should handle unknown unit conversions gracefully", () => {
      const wrapper = createWrapper("metric");
      const { result } = renderHook(() => useUnits(), { wrapper });

      const consoleSpy = jest
        .spyOn(console, "warn")
        .mockImplementation(() => {});

      const result_conv = result.current.convertUnit(100, "unknown", "kg");
      expect(result_conv.value).toBe(100);
      expect(result_conv.unit).toBe("unknown");
      expect(consoleSpy).toHaveBeenCalledWith(
        "No conversion available from unknown to kg"
      );

      consoleSpy.mockRestore();
    });
  });

  describe("convertForDisplay method", () => {
    it("should convert from storage unit to preferred unit", () => {
      const wrapper = createWrapper("metric");
      const { result } = renderHook(() => useUnits(), { wrapper });

      // Storage in pounds, but metric system prefers kg
      const conversion = result.current.convertForDisplay(2.2, "lb", "weight");
      expect(conversion.value).toBeCloseTo(1, 1);
      expect(conversion.unit).toBe("kg");
    });

    it("should handle hop weight conversions for display", () => {
      const wrapper = createWrapper("imperial");
      const { result } = renderHook(() => useUnits(), { wrapper });

      // Storage in grams, but imperial system prefers oz for hops
      const conversion = result.current.convertForDisplay(
        28.35,
        "g",
        "hop_weight"
      );
      expect(conversion.value).toBeCloseTo(1, 1);
      expect(conversion.unit).toBe("oz");
    });

    it("should handle volume conversions for display", () => {
      const wrapper = createWrapper("metric");
      const { result } = renderHook(() => useUnits(), { wrapper });

      // Storage in gallons, but metric system prefers liters
      const conversion = result.current.convertForDisplay(1, "gal", "volume");
      expect(conversion.value).toBeCloseTo(3.785, 1);
      expect(conversion.unit).toBe("l");
    });
  });

  describe("getTemperatureAxisConfig method", () => {
    it("should return default ranges for empty temperature array in imperial", () => {
      const wrapper = createWrapper("imperial");
      const { result } = renderHook(() => useUnits(), { wrapper });

      const config = result.current.getTemperatureAxisConfig([]);
      expect(config.minValue).toBe(60);
      expect(config.maxValue).toBe(80);
    });

    it("should return default ranges for empty temperature array in metric", () => {
      const wrapper = createWrapper("metric");
      const { result } = renderHook(() => useUnits(), { wrapper });

      const config = result.current.getTemperatureAxisConfig([]);
      expect(config.minValue).toBe(15);
      expect(config.maxValue).toBe(27);
    });

    it("should calculate axis config with buffer for temperature data", () => {
      const wrapper = createWrapper("imperial");
      const { result } = renderHook(() => useUnits(), { wrapper });

      const temperatures = [65, 70, 75];
      const config = result.current.getTemperatureAxisConfig(temperatures, 10);

      // Min should be 65 minus 10% buffer but not below 32 (freezing)
      expect(config.minValue).toBeGreaterThanOrEqual(32);
      expect(config.minValue).toBeLessThan(65);

      // Max should be 75 plus 10% buffer but not above 100
      expect(config.maxValue).toBeGreaterThan(75);
      expect(config.maxValue).toBeLessThanOrEqual(100);
    });

    it("should respect absolute bounds in metric system", () => {
      const wrapper = createWrapper("metric");
      const { result } = renderHook(() => useUnits(), { wrapper });

      const extremeTemperatures = [-10, 50]; // Below and above reasonable brewing temps
      const config =
        result.current.getTemperatureAxisConfig(extremeTemperatures);

      expect(config.minValue).toBeGreaterThanOrEqual(0);
      expect(config.maxValue).toBeLessThanOrEqual(38);
    });

    it("should handle single temperature value", () => {
      const wrapper = createWrapper("imperial");
      const { result } = renderHook(() => useUnits(), { wrapper });

      const config = result.current.getTemperatureAxisConfig([68]);
      expect(config.minValue).toBeLessThan(68);
      expect(config.maxValue).toBeGreaterThan(68);
    });
  });

  describe("additional preferred units", () => {
    it("should return correct preferred units for hop_weight", () => {
      const imperialWrapper = createWrapper("imperial");
      const { result: imperialResult } = renderHook(() => useUnits(), {
        wrapper: imperialWrapper,
      });
      expect(imperialResult.current.getPreferredUnit("hop_weight")).toBe("oz");

      const metricWrapper = createWrapper("metric");
      const { result: metricResult } = renderHook(() => useUnits(), {
        wrapper: metricWrapper,
      });
      expect(metricResult.current.getPreferredUnit("hop_weight")).toBe("g");
    });

    it("should return pkg for yeast regardless of unit system", () => {
      const imperialWrapper = createWrapper("imperial");
      const { result: imperialResult } = renderHook(() => useUnits(), {
        wrapper: imperialWrapper,
      });
      expect(imperialResult.current.getPreferredUnit("yeast")).toBe("pkg");

      const metricWrapper = createWrapper("metric");
      const { result: metricResult } = renderHook(() => useUnits(), {
        wrapper: metricWrapper,
      });
      expect(metricResult.current.getPreferredUnit("yeast")).toBe("pkg");
    });

    it("should return correct preferred units for other type", () => {
      const imperialWrapper = createWrapper("imperial");
      const { result: imperialResult } = renderHook(() => useUnits(), {
        wrapper: imperialWrapper,
      });
      expect(imperialResult.current.getPreferredUnit("other")).toBe("oz");

      const metricWrapper = createWrapper("metric");
      const { result: metricResult } = renderHook(() => useUnits(), {
        wrapper: metricWrapper,
      });
      expect(metricResult.current.getPreferredUnit("other")).toBe("g");
    });

    it("should handle unknown measurement type", () => {
      const wrapper = createWrapper("metric");
      const { result } = renderHook(() => useUnits(), { wrapper });
      expect(result.current.getPreferredUnit("unknown" as any)).toBe("kg");
    });
  });

  describe("additional common units", () => {
    it("should provide hop weight units", () => {
      const imperialWrapper = createWrapper("imperial");
      const { result: imperialResult } = renderHook(() => useUnits(), {
        wrapper: imperialWrapper,
      });

      const hopUnits = imperialResult.current.getCommonUnits("hop_weight");
      expect(hopUnits).toBeDefined();
      expect(Array.isArray(hopUnits)).toBe(true);

      const unitValues = hopUnits.map(unit => unit.value);
      expect(unitValues).toContain("oz");
      expect(unitValues).toContain("g");
    });

    it("should provide temperature units", () => {
      const imperialWrapper = createWrapper("imperial");
      const { result: imperialResult } = renderHook(() => useUnits(), {
        wrapper: imperialWrapper,
      });

      const tempUnits = imperialResult.current.getCommonUnits("temperature");
      expect(tempUnits.length).toBe(1);
      expect(tempUnits[0].value).toBe("f");
      expect(tempUnits[0].label).toBe("°F");

      const metricWrapper = createWrapper("metric");
      const { result: metricResult } = renderHook(() => useUnits(), {
        wrapper: metricWrapper,
      });

      const metricTempUnits =
        metricResult.current.getCommonUnits("temperature");
      expect(metricTempUnits.length).toBe(1);
      expect(metricTempUnits[0].value).toBe("c");
      expect(metricTempUnits[0].label).toBe("°C");
    });

    it("should return empty array for unknown measurement type", () => {
      const wrapper = createWrapper("metric");
      const { result } = renderHook(() => useUnits(), { wrapper });

      const unknownUnits = result.current.getCommonUnits("unknown" as any);
      expect(unknownUnits).toEqual([]);
    });
  });

  describe("advanced value formatting", () => {
    it("should apply appropriate precision based on measurement type and value", () => {
      const wrapper = createWrapper("metric");
      const { result } = renderHook(() => useUnits(), { wrapper });

      // Small volume values should have 2 decimal places
      expect(result.current.formatValue(0.5, "l", "volume")).toBe("0.5 l");

      // Large volume values should have 1 decimal place
      expect(result.current.formatValue(5.333, "l", "volume")).toBe("5.3 l");

      // Small gram values should have 1 decimal place
      expect(result.current.formatValue(5.55, "g", "hop_weight")).toBe("5.5 g");

      // Small ounce values should have 2 decimal places
      expect(result.current.formatValue(0.55, "oz", "hop_weight")).toBe(
        "0.55 oz"
      );
    });

    it("should remove trailing zeros", () => {
      const wrapper = createWrapper("metric");
      const { result } = renderHook(() => useUnits(), { wrapper });

      expect(result.current.formatValue(5.0, "kg", "weight", 2)).toBe("5 kg");
      expect(result.current.formatValue(5.1, "kg", "weight", 2)).toBe("5.1 kg");
    });

    it("should handle temperature formatting with 1 decimal precision", () => {
      const wrapper = createWrapper("metric");
      const { result } = renderHook(() => useUnits(), { wrapper });

      expect(result.current.formatValue(20.555, "c", "temperature")).toBe(
        "20.6 c"
      );
    });
  });
});
