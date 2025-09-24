/**
 * Shared UnitContext mock for tests
 * Matches the real UnitContext API from src/contexts/UnitContext.tsx
 */

import { UnitSystem, MeasurementType } from "@src/types";

interface UnitOption {
  value: string;
  label: string;
  description: string;
}

interface UnitConversion {
  value: number;
  unit: string;
}

// Default mock state
const defaultMockState = {
  unitSystem: "imperial" as UnitSystem,
  loading: false,
  error: null,
  updateUnitSystem: jest.fn(),
  setError: jest.fn(),
  getPreferredUnit: jest.fn((unitType: MeasurementType) => {
    switch (unitType) {
      case "weight":
        return "lb";
      case "hop_weight":
        return "oz";
      case "volume":
        return "gal";
      case "temperature":
        return "f";
      default:
        return "lb";
    }
  }),
  convertUnit: jest.fn(
    (
      value: number | string,
      fromUnit: string,
      toUnit: string
    ): UnitConversion => ({
      value: parseFloat(value.toString()),
      unit: toUnit,
    })
  ),
  convertForDisplay: jest.fn(
    (
      value: number | string,
      storageUnit: string,
      measurementType: MeasurementType
    ): UnitConversion => ({
      value: parseFloat(value.toString()),
      unit:
        measurementType === "weight"
          ? "lb"
          : measurementType === "volume"
            ? "gal"
            : "f",
    })
  ),
  formatValue: jest.fn(
    (
      value: number | string,
      unit: string,
      measurementType: MeasurementType,
      precision?: number
    ) => `${parseFloat(value.toString()).toFixed(precision || 2)} ${unit}`
  ),
  getTemperatureSymbol: jest.fn(() => "°F"),
  formatTemperature: jest.fn(
    (value: number, fromSystem: UnitSystem, precision?: number) =>
      `${value.toFixed(precision || 1)}°F`
  ),
  formatCurrentTemperature: jest.fn(
    (value: number, precision?: number) => `${value.toFixed(precision || 1)}°F`
  ),
  convertTemperature: jest.fn(
    (value: number, fromSystem: UnitSystem, toSystem: UnitSystem) => value
  ),
  getTemperatureAxisConfig: jest.fn(
    (temperatures: number[], bufferPercent?: number) => ({
      minValue: 60,
      maxValue: 80,
    })
  ),
  getUnitSystemLabel: jest.fn(() => "Imperial"),
  getCommonUnits: jest.fn((measurementType: MeasurementType): UnitOption[] => [
    { value: "lb", label: "lb", description: "Pounds" },
  ]),
};

// Mutable state for dynamic testing
let mockUnitState = { ...defaultMockState };

/**
 * Set custom mock state for unit context
 */
export const setMockUnitState = (
  overrides: Partial<typeof defaultMockState>
) => {
  mockUnitState = { ...mockUnitState, ...overrides };
};

/**
 * Reset mock state to defaults
 */
export const resetMockUnitState = () => {
  mockUnitState = { ...defaultMockState };
  // Reset all jest mocks
  Object.values(mockUnitState).forEach(value => {
    if (typeof value === "function" && jest.isMockFunction(value)) {
      value.mockClear();
    }
  });
};

/**
 * Mock implementation for useUnits hook
 */
export const mockUseUnits = () => mockUnitState;

/**
 * Jest mock for UnitContext module
 */
export const unitContextMock = {
  useUnits: mockUseUnits,
  UnitProvider: ({ children }: { children: React.ReactNode }) => children,
};
