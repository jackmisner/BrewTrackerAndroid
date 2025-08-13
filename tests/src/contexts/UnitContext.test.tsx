import React from "react";
import { renderHook, act } from "@testing-library/react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  UnitProvider,
  useUnits,
} from "../../../src/contexts/UnitContext";
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

  const createWrapper = (initialUnitSystem?: UnitSystem) => 
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
      const { result: imperialResult } = renderHook(() => useUnits(), { wrapper: imperialWrapper });

      expect(imperialResult.current.getUnitSystemLabel()).toBe("Imperial");

      const metricWrapper = createWrapper("metric");
      const { result: metricResult } = renderHook(() => useUnits(), { wrapper: metricWrapper });

      expect(metricResult.current.getUnitSystemLabel()).toBe("Metric");
    });

    it("should provide correct temperature symbols", () => {
      const imperialWrapper = createWrapper("imperial");
      const { result: imperialResult } = renderHook(() => useUnits(), { wrapper: imperialWrapper });

      expect(imperialResult.current.getTemperatureSymbol()).toBe("°F");

      const metricWrapper = createWrapper("metric");
      const { result: metricResult } = renderHook(() => useUnits(), { wrapper: metricWrapper });

      expect(metricResult.current.getTemperatureSymbol()).toBe("°C");
    });
  });

  describe("temperature conversions", () => {
    it("should convert temperatures correctly", () => {
      const wrapper = createWrapper("metric");
      const { result } = renderHook(() => useUnits(), { wrapper });

      // Test common conversions
      expect(result.current.convertTemperature(32, "imperial", "metric")).toBeCloseTo(0, 1);
      expect(result.current.convertTemperature(212, "imperial", "metric")).toBeCloseTo(100, 1);
      expect(result.current.convertTemperature(0, "metric", "imperial")).toBeCloseTo(32, 1);
      expect(result.current.convertTemperature(100, "metric", "imperial")).toBeCloseTo(212, 1);
    });

    it("should return same value when converting to same system", () => {
      const wrapper = createWrapper("metric");
      const { result } = renderHook(() => useUnits(), { wrapper });

      expect(result.current.convertTemperature(25, "metric", "metric")).toBe(25);
      expect(result.current.convertTemperature(75, "imperial", "imperial")).toBe(75);
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

      expect(result.current.formatValue(1.2345, "kg", "weight", 2)).toBe("1.2 kg");
      expect(result.current.formatValue(10, "l", "volume", 0)).toBe("10 l");
    });

    it("should handle string values", () => {
      const wrapper = createWrapper("metric");
      const { result } = renderHook(() => useUnits(), { wrapper });

      expect(result.current.formatValue("1.5", "kg", "weight", 1)).toBe("1.5 kg");
    });

    it("should handle invalid values gracefully", () => {
      const wrapper = createWrapper("metric");
      const { result } = renderHook(() => useUnits(), { wrapper });

      expect(result.current.formatValue("invalid", "kg", "weight")).toBe("0 kg");
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
});