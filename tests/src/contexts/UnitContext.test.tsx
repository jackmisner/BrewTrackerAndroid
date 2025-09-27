import React from "react";
import { renderHook, act } from "@testing-library/react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { UnitProvider, useUnits } from "@contexts/UnitContext";
import { AuthProvider } from "@contexts/AuthContext";
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
    (initialUnitSystem?: UnitSystem, isAuthenticated = false) =>
    ({ children }: { children: React.ReactNode }) =>
      React.createElement(AuthProvider, {
        initialAuthState: {
          user: isAuthenticated
            ? {
                id: "test",
                username: "test",
                email: "test@example.com",
                email_verified: true,
                created_at: "2023-01-01T00:00:00Z",
                updated_at: "2023-01-01T00:00:00Z",
                is_active: true,
              }
            : null,
        },
        children: React.createElement(UnitProvider, {
          initialUnitSystem,
          children,
        }),
      });

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
    it("should initialize with metric system by default", () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useUnits(), { wrapper });

      expect(result.current.unitSystem).toBe("metric");
    });

    it("should initialize with provided unit system", () => {
      const wrapper = createWrapper("imperial");
      const { result } = renderHook(() => useUnits(), { wrapper });

      expect(result.current.unitSystem).toBe("imperial");
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

    it("should handle invalid values gracefully in formatValue", () => {
      const wrapper = createWrapper("metric");
      const { result } = renderHook(() => useUnits(), { wrapper });

      // Test empty string
      expect(result.current.formatValue("", "kg", "weight")).toBe("0 kg");
    });

    it("should apply specific precision rules for different measurement types", () => {
      const wrapper = createWrapper("metric");
      const { result } = renderHook(() => useUnits(), { wrapper });

      // Small weight in grams (< 10g) should use 1 decimal place
      expect(result.current.formatValue(5.55, "g", "hop_weight")).toBe("5.5 g");

      // Small weight in ounces (< 1oz) should use 2 decimal places
      expect(result.current.formatValue(0.75, "oz", "hop_weight")).toBe(
        "0.75 oz"
      );

      // Large weight in kg should use 1 decimal place when >= 1
      expect(result.current.formatValue(2.333, "kg", "weight")).toBe("2.3 kg");

      // Small weight in kg should use 2 decimal places when < 1
      expect(result.current.formatValue(0.75, "kg", "weight")).toBe("0.75 kg");

      // Large weight in lb should use 1 decimal place when >= 1
      expect(result.current.formatValue(3.777, "lb", "weight")).toBe("3.8 lb");

      // Small weight in lb should use 2 decimal places when < 1
      expect(result.current.formatValue(0.5, "lb", "weight")).toBe("0.5 lb");

      // Temperature should always use 1 decimal place
      expect(result.current.formatValue(20.555, "c", "temperature")).toBe(
        "20.6 c"
      );

      // Small volume should use 2 decimal places when < 1
      expect(result.current.formatValue(0.5, "l", "volume")).toBe("0.5 l");

      // Large volume should use 1 decimal place when >= 1
      expect(result.current.formatValue(5.333, "l", "volume")).toBe("5.3 l");
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

    it("should handle invalid string inputs in convertUnit", () => {
      const wrapper = createWrapper("metric");
      const { result } = renderHook(() => useUnits(), { wrapper });

      // Test invalid string input
      const invalidConversion = result.current.convertUnit(
        "invalid",
        "kg",
        "lb"
      );
      expect(invalidConversion.value).toBe(0);
      expect(invalidConversion.unit).toBe("lb");

      // Test empty string input
      const emptyConversion = result.current.convertUnit("", "kg", "lb");
      expect(emptyConversion.value).toBe(0);
      expect(emptyConversion.unit).toBe("lb");

      // Test NaN input
      const nanConversion = result.current.convertUnit(NaN, "kg", "lb");
      expect(nanConversion.value).toBe(0);
      expect(nanConversion.unit).toBe("lb");
    });

    it("should handle additional weight conversions", () => {
      const wrapper = createWrapper("metric");
      const { result } = renderHook(() => useUnits(), { wrapper });

      // Test kg to g conversion
      const kgToG = result.current.convertUnit(2, "kg", "g");
      expect(kgToG.value).toBe(2000);
      expect(kgToG.unit).toBe("g");

      // Test g to kg conversion
      const gToKg = result.current.convertUnit(3000, "g", "kg");
      expect(gToKg.value).toBe(3);
      expect(gToKg.unit).toBe("kg");

      // Test lb to oz conversion
      const lbToOz = result.current.convertUnit(2, "lb", "oz");
      expect(lbToOz.value).toBe(32);
      expect(lbToOz.unit).toBe("oz");

      // Test oz to lb conversion
      const ozToLb = result.current.convertUnit(32, "oz", "lb");
      expect(ozToLb.value).toBe(2);
      expect(ozToLb.unit).toBe("lb");
    });

    it("should handle additional volume conversions", () => {
      const wrapper = createWrapper("metric");
      const { result } = renderHook(() => useUnits(), { wrapper });

      // Test ml to l conversion
      const mlToL = result.current.convertUnit(2500, "ml", "l");
      expect(mlToL.value).toBe(2.5);
      expect(mlToL.unit).toBe("l");

      // Test l to ml conversion
      const lToMl = result.current.convertUnit(1.5, "l", "ml");
      expect(lToMl.value).toBe(1500);
      expect(lToMl.unit).toBe("ml");
    });

    it("should handle unsupported unit conversions with warning", () => {
      const consoleSpy = jest
        .spyOn(console, "warn")
        .mockImplementation(() => {});
      const wrapper = createWrapper("metric");
      const { result } = renderHook(() => useUnits(), { wrapper });

      // Attempt conversion between incompatible units
      const invalidResult = result.current.convertUnit(
        100,
        "unknown_unit",
        "another_unit"
      );

      expect(invalidResult.value).toBe(100);
      expect(invalidResult.unit).toBe("unknown_unit");
      expect(consoleSpy).toHaveBeenCalledWith(
        "No conversion available from unknown_unit to another_unit"
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

    it("should provide hop weight units with priority order", () => {
      const imperialWrapper = createWrapper("imperial");
      const { result: imperialResult } = renderHook(() => useUnits(), {
        wrapper: imperialWrapper,
      });

      const hopUnits = imperialResult.current.getCommonUnits("hop_weight");
      expect(hopUnits).toBeDefined();
      expect(Array.isArray(hopUnits)).toBe(true);
      expect(hopUnits.length).toBeGreaterThan(0);

      // Imperial should prioritize oz first, then g
      expect(hopUnits[0].value).toBe("oz");
      expect(hopUnits[1].value).toBe("g");

      const metricWrapper = createWrapper("metric");
      const { result: metricResult } = renderHook(() => useUnits(), {
        wrapper: metricWrapper,
      });

      const metricHopUnits = metricResult.current.getCommonUnits("hop_weight");
      // Metric should prioritize g first, then oz
      expect(metricHopUnits[0].value).toBe("g");
      expect(metricHopUnits[1].value).toBe("oz");
    });

    it("should provide volume units with system preferences", () => {
      const imperialWrapper = createWrapper("imperial");
      const { result: imperialResult } = renderHook(() => useUnits(), {
        wrapper: imperialWrapper,
      });

      const volumeUnits = imperialResult.current.getCommonUnits("volume");
      expect(volumeUnits[0].value).toBe("gal");
      expect(volumeUnits[1].value).toBe("qt");

      const metricWrapper = createWrapper("metric");
      const { result: metricResult } = renderHook(() => useUnits(), {
        wrapper: metricWrapper,
      });

      const metricVolumeUnits = metricResult.current.getCommonUnits("volume");
      expect(metricVolumeUnits[0].value).toBe("l");
      expect(metricVolumeUnits[1].value).toBe("ml");
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

    it("should handle invalid temperature system conversion", () => {
      const wrapper = createWrapper("imperial");
      const { result } = renderHook(() => useUnits(), { wrapper });

      // Test conversion with invalid systems (should return original value)
      const invalidConversion = result.current.convertTemperature(
        75,
        "invalid" as any,
        "metric"
      );
      expect(invalidConversion).toBe(75);

      const anotherInvalidConversion = result.current.convertTemperature(
        75,
        "imperial",
        "invalid" as any
      );
      expect(anotherInvalidConversion).toBe(75);

      // Test both systems invalid
      const bothInvalidConversion = result.current.convertTemperature(
        75,
        "invalid" as any,
        "also_invalid" as any
      );
      expect(bothInvalidConversion).toBe(75);
    });

    it("should handle temperature formatting with extreme precision values", () => {
      const wrapper = createWrapper("imperial");
      const { result } = renderHook(() => useUnits(), { wrapper });

      // Test with precision above 100 (should be clamped to 100)
      const highPrecision = result.current.formatTemperature(
        75.123456789,
        "imperial",
        150
      );
      expect(highPrecision).toContain("75.123456789"); // Should preserve high precision

      // Test with negative precision (should be clamped to 0)
      const negativePrecision = result.current.formatTemperature(
        75.12345,
        "imperial",
        -5
      );
      expect(negativePrecision).toBe("75°F");

      // Test formatCurrentTemperature with extreme precision
      const currentHighPrecision = result.current.formatCurrentTemperature(
        75.123456789,
        150
      );
      expect(currentHighPrecision).toContain("75.123456789");

      const currentNegativePrecision = result.current.formatCurrentTemperature(
        75.12345,
        -5
      );
      expect(currentNegativePrecision).toBe("75°F");
    });
  });

  describe("AsyncStorage and API integration", () => {
    it("should handle cached settings and background refresh", async () => {
      // Mock cached settings in AsyncStorage
      const cachedSettings = {
        preferred_units: "metric",
        other_setting: "value",
      };
      mockAsyncStorage.getItem.mockResolvedValue(
        JSON.stringify(cachedSettings)
      );

      const wrapper = createWrapper(); // No initial system to trigger loading
      const { result } = renderHook(() => useUnits(), { wrapper });

      // Should start loading
      expect(result.current.loading).toBe(true);

      // Wait for async operations to complete
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      // Should use cached setting
      expect(result.current.unitSystem).toBe("metric");
      expect(result.current.loading).toBe(false);
    });

    it("should handle cache miss and fetch from API", async () => {
      const ApiService = require("@services/api/apiService").default;

      // No cached settings
      mockAsyncStorage.getItem.mockResolvedValue(null);

      // Mock API response
      ApiService.user.getSettings.mockResolvedValue({
        data: {
          settings: {
            preferred_units: "metric",
          },
        },
      });

      const wrapper = createWrapper(undefined, true); // No initial system, but authenticated
      const { result } = renderHook(() => useUnits(), { wrapper });

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      expect(result.current.unitSystem).toBe("metric");
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        "user_settings",
        JSON.stringify({ preferred_units: "metric" })
      );
    });

    it("should handle background settings refresh with different units", async () => {
      const ApiService = require("@services/api/apiService").default;

      // Mock cached settings
      const cachedSettings = { preferred_units: "imperial" };
      mockAsyncStorage.getItem.mockResolvedValue(
        JSON.stringify(cachedSettings)
      );

      // Mock fresh API response with different units
      ApiService.user.getSettings.mockResolvedValue({
        data: {
          settings: {
            preferred_units: "metric",
          },
        },
      });

      const wrapper = createWrapper(undefined, true); // Authenticated user
      const { result } = renderHook(() => useUnits(), { wrapper });

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
      });

      // Should eventually use fresh settings
      expect(result.current.unitSystem).toBe("metric");
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        "user_settings",
        JSON.stringify({ preferred_units: "metric" })
      );
    });

    it("should handle background fetch errors gracefully", async () => {
      const ApiService = require("@services/api/apiService").default;
      const consoleSpy = jest
        .spyOn(console, "warn")
        .mockImplementation(() => {});

      // Mock cached settings
      const cachedSettings = { preferred_units: "imperial" };
      mockAsyncStorage.getItem.mockResolvedValue(
        JSON.stringify(cachedSettings)
      );

      // Mock API error for background fetch (non-401 error to trigger logging)
      const networkError = new Error("Network error");
      (networkError as any).response = { status: 500 }; // Non-401 error
      ApiService.user.getSettings.mockRejectedValue(networkError);

      const wrapper = createWrapper(undefined, true); // Authenticated user
      const { result } = renderHook(() => useUnits(), { wrapper });

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      // Should still use cached settings despite background error
      expect(result.current.unitSystem).toBe("imperial");
      expect(consoleSpy).toHaveBeenCalledWith(
        "Background settings fetch failed:",
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe("updateUnitSystem advanced scenarios", () => {
    it("should handle early return when system is the same", async () => {
      const ApiService = require("@services/api/apiService").default;

      const wrapper = createWrapper("metric");
      const { result } = renderHook(() => useUnits(), { wrapper });

      // Try to update to the same system
      await act(async () => {
        await result.current.updateUnitSystem("metric");
      });

      // Should not call API since no change needed
      expect(ApiService.user.updateSettings).not.toHaveBeenCalled();
    });

    it("should handle cache update after successful API call", async () => {
      const ApiService = require("@services/api/apiService").default;

      // Mock existing cache
      const existingCache = {
        preferred_units: "imperial",
        other_setting: "value",
      };
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(existingCache));

      ApiService.user.updateSettings.mockResolvedValue({});

      const wrapper = createWrapper("imperial");
      const { result } = renderHook(() => useUnits(), { wrapper });

      await act(async () => {
        await result.current.updateUnitSystem("metric");
      });

      expect(result.current.unitSystem).toBe("metric");
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        "user_settings",
        JSON.stringify({ preferred_units: "metric", other_setting: "value" })
      );
    });

    it("should handle updateUnitSystem error and revert", async () => {
      const ApiService = require("@services/api/apiService").default;
      const consoleSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      // Mock AsyncStorage.setItem to fail, which will trigger error for unauthenticated users
      mockAsyncStorage.setItem.mockRejectedValue(new Error("Storage Error"));

      const wrapper = createWrapper("imperial");
      const { result } = renderHook(() => useUnits(), { wrapper });

      await act(async () => {
        await result.current.updateUnitSystem("metric");
      });

      // Should revert to original system on error
      expect(result.current.unitSystem).toBe("imperial");
      expect(result.current.error).toBe("Failed to save unit preference");
      expect(consoleSpy).toHaveBeenCalledWith(
        "Failed to update unit system:",
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe("additional unit conversions", () => {
    it("should handle kg to lb conversion", () => {
      const wrapper = createWrapper("imperial");
      const { result } = renderHook(() => useUnits(), { wrapper });

      const conversion = result.current.convertUnit(1, "kg", "lb");
      expect(conversion.value).toBeCloseTo(2.20462, 4);
      expect(conversion.unit).toBe("lb");
    });

    it("should handle gal to l conversion", () => {
      const wrapper = createWrapper("metric");
      const { result } = renderHook(() => useUnits(), { wrapper });

      const conversion = result.current.convertUnit(1, "gal", "l");
      expect(conversion.value).toBeCloseTo(3.78541, 4);
      expect(conversion.unit).toBe("l");
    });

    it("should handle l to gal conversion", () => {
      const wrapper = createWrapper("imperial");
      const { result } = renderHook(() => useUnits(), { wrapper });

      const conversion = result.current.convertUnit(3.78541, "l", "gal");
      expect(conversion.value).toBeCloseTo(1, 4);
      expect(conversion.unit).toBe("gal");
    });

    it("should handle f to c temperature conversion", () => {
      const wrapper = createWrapper("metric");
      const { result } = renderHook(() => useUnits(), { wrapper });

      const conversion = result.current.convertUnit(32, "f", "c");
      expect(conversion.value).toBeCloseTo(0, 1);
      expect(conversion.unit).toBe("c");
    });

    it("should handle c to f temperature conversion", () => {
      const wrapper = createWrapper("imperial");
      const { result } = renderHook(() => useUnits(), { wrapper });

      const conversion = result.current.convertUnit(0, "c", "f");
      expect(conversion.value).toBeCloseTo(32, 1);
      expect(conversion.unit).toBe("f");
    });
  });
});
