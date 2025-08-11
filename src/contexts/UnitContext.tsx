import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import ApiService from "@services/api/apiService";
import { STORAGE_KEYS } from "@services/config";
import { UnitSystem, MeasurementType, UserSettings } from "@src/types";

// Unit option interface for common units
interface UnitOption {
  value: string;
  label: string;
  description: string;
}

// Unit conversion result
interface UnitConversion {
  value: number;
  unit: string;
}

// Unit context value interface
interface UnitContextValue {
  // State
  unitSystem: UnitSystem;
  loading: boolean;
  error: string | null;

  // Actions
  updateUnitSystem: (newSystem: UnitSystem) => Promise<void>;
  setError: (error: string | null) => void;

  // Unit preferences
  getPreferredUnit: (unitType: MeasurementType) => string;

  // Conversions
  convertUnit: (
    value: number | string,
    fromUnit: string,
    toUnit: string
  ) => UnitConversion;
  convertForDisplay: (
    value: number | string,
    storageUnit: string,
    measurementType: MeasurementType
  ) => UnitConversion;

  // Formatting
  formatValue: (
    value: number | string,
    unit: string,
    measurementType: MeasurementType,
    precision?: number
  ) => string;

  // Temperature specific utilities
  getTemperatureSymbol: () => string;
  formatTemperature: (
    value: number,
    fromSystem: UnitSystem,
    precision?: number
  ) => string;
  formatCurrentTemperature: (value: number, precision?: number) => string;
  convertTemperature: (
    value: number,
    fromSystem: UnitSystem,
    toSystem: UnitSystem
  ) => number;
  getTemperatureAxisConfig: (
    temperatures: number[],
    bufferPercent?: number
  ) => { minValue: number; maxValue: number };

  // Utilities
  getUnitSystemLabel: () => string;
  getCommonUnits: (measurementType: MeasurementType) => UnitOption[];
}

// Provider props interface
interface UnitProviderProps {
  children: ReactNode;
  initialUnitSystem?: UnitSystem; // For testing
}

const UnitContext = createContext<UnitContextValue | undefined>(undefined);

export const useUnits = (): UnitContextValue => {
  const context = useContext(UnitContext);
  if (!context) {
    throw new Error("useUnits must be used within a UnitProvider");
  }
  return context;
};

export const UnitProvider: React.FC<UnitProviderProps> = ({
  children,
  initialUnitSystem,
}) => {
  const [unitSystem, setUnitSystem] = useState<UnitSystem>(
    initialUnitSystem || "imperial"
  );
  const [loading, setLoading] = useState<boolean>(!initialUnitSystem);
  const [error, setError] = useState<string | null>(null);

  // Load user's unit preference on mount
  useEffect(() => {
    let isMounted = true;
    if (initialUnitSystem) {
      setLoading(false);
      return;
    }
    const loadUnitPreference = async (): Promise<void> => {
      try {
        setLoading(true);
        // Try to load from cached user settings first
        const cachedSettings = await AsyncStorage.getItem(
          STORAGE_KEYS.USER_SETTINGS
        );
        if (cachedSettings) {
          const settings: UserSettings = JSON.parse(cachedSettings);
          const preferredUnits: UnitSystem =
            settings.preferred_units || "imperial";
          if (isMounted) setUnitSystem(preferredUnits);
          if (isMounted) setLoading(false);
          // Still fetch fresh data in background
          try {
            const freshSettings = await ApiService.user.getSettings();
            const freshUnits: UnitSystem =
              freshSettings.data.settings.preferred_units || "imperial";
            if (freshUnits !== preferredUnits) {
              setUnitSystem(freshUnits);
              await AsyncStorage.setItem(
                STORAGE_KEYS.USER_SETTINGS,
                JSON.stringify(freshSettings.data.settings)
              );
            }
          } catch (bgError) {
            console.warn("Background settings fetch failed:", bgError);
          }
          return;
        }
        // If no cache, fetch from API
        const settings = await ApiService.user.getSettings();
        const preferredUnits: UnitSystem =
          settings.data.settings.preferred_units || "imperial";
        setUnitSystem(preferredUnits);
        // Cache for offline use
        await AsyncStorage.setItem(
          STORAGE_KEYS.USER_SETTINGS,
          JSON.stringify(settings.data.settings)
        );
      } catch (err) {
        console.warn("Failed to load unit preferences, using default:", err);
        setUnitSystem("imperial"); // Fallback to imperial
      } finally {
        setLoading(false);
      }
    };
    loadUnitPreference();
    return () => {
      isMounted = false;
    };
  }, [initialUnitSystem]);

  // Update unit system and persist to backend
  const updateUnitSystem = async (newSystem: UnitSystem): Promise<void> => {
    if (newSystem === unitSystem) {
      return;
    }
    const previousSystem = unitSystem;
    try {
      setLoading(true);
      setError(null);
      setUnitSystem(newSystem);
      // Persist to backend first
      await ApiService.user.updateSettings({ preferred_units: newSystem });
      // Update cache only after success
      const cachedSettings = await AsyncStorage.getItem(
        STORAGE_KEYS.USER_SETTINGS
      );
      if (cachedSettings) {
        const settings: UserSettings = JSON.parse(cachedSettings);
        const updatedSettings = { ...settings, preferred_units: newSystem };
        await AsyncStorage.setItem(
          STORAGE_KEYS.USER_SETTINGS,
          JSON.stringify(updatedSettings)
        );
      }
    } catch (err) {
      console.error("Failed to update unit system:", err);
      setError("Failed to save unit preference");
      setUnitSystem(previousSystem); // Revert on error
    } finally {
      setLoading(false);
    }
  };

  /**
   * Get preferred unit for different measurement types
   */
  const getPreferredUnit = (unitType: MeasurementType): string => {
    switch (unitType) {
      case "weight":
        return unitSystem === "metric" ? "kg" : "lb";
      case "hop_weight":
        return unitSystem === "metric" ? "g" : "oz";
      case "yeast":
        return "pkg"; // Universal - packages are standard
      case "other":
        return unitSystem === "metric" ? "g" : "oz";
      case "volume":
        return unitSystem === "metric" ? "l" : "gal";
      case "temperature":
        return unitSystem === "metric" ? "c" : "f";
      default:
        return unitSystem === "metric" ? "kg" : "lb";
    }
  };

  /**
   * Convert a value from one unit to another
   */
  const convertUnit = (
    value: number | string,
    fromUnit: string,
    toUnit: string
  ): UnitConversion => {
    const numValue = parseFloat(value.toString());
    if (isNaN(numValue)) return { value: 0, unit: toUnit };

    // If same unit, return as-is
    if (fromUnit === toUnit) {
      return { value: numValue, unit: toUnit };
    }

    let convertedValue = numValue;

    // Weight conversions
    if (fromUnit === "kg" && toUnit === "lb") {
      convertedValue = numValue * 2.20462;
    } else if (fromUnit === "lb" && toUnit === "kg") {
      convertedValue = numValue / 2.20462;
    } else if (fromUnit === "g" && toUnit === "oz") {
      convertedValue = numValue / 28.3495;
    } else if (fromUnit === "oz" && toUnit === "g") {
      convertedValue = numValue * 28.3495;
    } else if (fromUnit === "kg" && toUnit === "g") {
      convertedValue = numValue * 1000;
    } else if (fromUnit === "g" && toUnit === "kg") {
      convertedValue = numValue / 1000;
    } else if (fromUnit === "lb" && toUnit === "oz") {
      convertedValue = numValue * 16;
    } else if (fromUnit === "oz" && toUnit === "lb") {
      convertedValue = numValue / 16;
    }

    // Volume conversions
    else if (fromUnit === "gal" && toUnit === "l") {
      convertedValue = numValue * 3.78541;
    } else if (fromUnit === "l" && toUnit === "gal") {
      convertedValue = numValue / 3.78541;
    } else if (fromUnit === "ml" && toUnit === "l") {
      convertedValue = numValue / 1000;
    } else if (fromUnit === "l" && toUnit === "ml") {
      convertedValue = numValue * 1000;
    }

    // Temperature conversions
    else if (fromUnit === "f" && toUnit === "c") {
      convertedValue = ((numValue - 32) * 5) / 9;
    } else if (fromUnit === "c" && toUnit === "f") {
      convertedValue = (numValue * 9) / 5 + 32;
    }

    // If no conversion found, return original
    else {
      console.warn(`No conversion available from ${fromUnit} to ${toUnit}`);
      return { value: numValue, unit: fromUnit };
    }

    return {
      value: convertedValue,
      unit: toUnit,
    };
  };

  /**
   * Convert a value from storage unit to display unit
   */
  const convertForDisplay = (
    value: number | string,
    storageUnit: string,
    measurementType: MeasurementType
  ): UnitConversion => {
    const preferredUnit = getPreferredUnit(measurementType);
    return convertUnit(value, storageUnit, preferredUnit);
  };

  /**
   * Format a value with its unit for display
   */
  const formatValue = (
    value: number | string,
    unit: string,
    measurementType: MeasurementType,
    precision: number = 2
  ): string => {
    const numValue = parseFloat(value.toString());
    if (isNaN(numValue)) return "0 " + unit;

    // Determine appropriate precision based on value and unit
    let displayPrecision = precision;

    if (measurementType === "volume") {
      displayPrecision = numValue < 1 ? 2 : 1;
    } else if (
      measurementType === "weight" ||
      measurementType === "hop_weight"
    ) {
      if (unit === "g" && numValue < 10) {
        displayPrecision = 1;
      } else if (unit === "oz" && numValue < 1) {
        displayPrecision = 2;
      } else if (unit === "kg" || unit === "lb") {
        displayPrecision = numValue < 1 ? 2 : 1;
      }
    } else if (measurementType === "temperature") {
      displayPrecision = 1; // One decimal for temperature
    }

    const formattedValue = numValue.toFixed(displayPrecision);

    // Remove trailing zeros after decimal point
    const cleanValue = parseFloat(formattedValue).toString();

    return `${cleanValue} ${unit}`;
  };

  /**
   * Get temperature symbol for current unit system
   */
  const getTemperatureSymbol = (): string => {
    return unitSystem === "metric" ? "°C" : "°F";
  };

  /**
   * Format temperature value with current unit system
   * Converts the input value to the current unit system before formatting
   */
  const formatTemperature = (
    value: number,
    fromSystem: UnitSystem,
    precision: number = 1
  ): string => {
    const convertedValue = convertTemperature(value, fromSystem, unitSystem);
    const symbol = getTemperatureSymbol();
    const p = Math.min(100, Math.max(0, precision));
    const rounded = convertedValue.toFixed(p);
    return `${parseFloat(rounded).toString()}${symbol}`;
  };

  /**
   * Format temperature value that is already in the current unit system
   * Use this when you know the value is already converted to the current units
   */
  const formatCurrentTemperature = (
    value: number,
    precision: number = 1
  ): string => {
    const symbol = getTemperatureSymbol();
    const p = Math.min(100, Math.max(0, precision));
    const rounded = value.toFixed(p);
    return `${parseFloat(rounded).toString()}${symbol}`;
  };

  /**
   * Convert temperature between unit systems
   */
  const convertTemperature = (
    value: number,
    fromSystem: UnitSystem,
    toSystem: UnitSystem
  ): number => {
    if (fromSystem === toSystem) return value;

    if (fromSystem === "imperial" && toSystem === "metric") {
      return ((value - 32) * 5) / 9;
    } else if (fromSystem === "metric" && toSystem === "imperial") {
      return (value * 9) / 5 + 32;
    }

    return value;
  };

  /**
   * Get temperature axis configuration for charts
   */
  const getTemperatureAxisConfig = (
    temperatures: number[],
    bufferPercent: number = 5
  ): { minValue: number; maxValue: number } => {
    if (temperatures.length === 0) {
      // Default ranges based on typical brewing temperatures
      return unitSystem === "imperial"
        ? { minValue: 60, maxValue: 80 }
        : { minValue: 15, maxValue: 27 };
    }

    const min = Math.min(...temperatures);
    const max = Math.max(...temperatures);
    const range = max - min;
    const buffer = Math.max(
      range * (bufferPercent / 100),
      unitSystem === "imperial" ? 2 : 1
    );

    // Set reasonable bounds based on unit system
    const absoluteMin = unitSystem === "imperial" ? 32 : 0; // Freezing point
    const absoluteMax = unitSystem === "imperial" ? 100 : 38; // High brewing temp

    return {
      minValue: Math.max(absoluteMin, Math.floor(min - buffer)),
      maxValue: Math.min(absoluteMax, Math.ceil(max + buffer)),
    };
  };

  /**
   * Get display label for unit system
   */
  const getUnitSystemLabel = (): string => {
    return unitSystem === "metric" ? "Metric" : "Imperial";
  };

  /**
   * Get common units for a measurement type
   */
  const getCommonUnits = (measurementType: MeasurementType): UnitOption[] => {
    switch (measurementType) {
      case "weight":
        return unitSystem === "metric"
          ? [
              { value: "kg", label: "kg", description: "Kilograms" },
              { value: "g", label: "g", description: "Grams" },
            ]
          : [
              { value: "lb", label: "lb", description: "Pounds" },
              { value: "oz", label: "oz", description: "Ounces" },
            ];

      case "hop_weight":
        return unitSystem === "metric"
          ? [
              { value: "g", label: "g", description: "Grams" },
              { value: "oz", label: "oz", description: "Ounces" },
            ]
          : [
              { value: "oz", label: "oz", description: "Ounces" },
              { value: "g", label: "g", description: "Grams" },
            ];

      case "volume":
        return unitSystem === "metric"
          ? [
              { value: "l", label: "L", description: "Liters" },
              { value: "ml", label: "mL", description: "Milliliters" },
            ]
          : [
              { value: "gal", label: "gal", description: "Gallons" },
              { value: "qt", label: "qt", description: "Quarts" },
            ];

      case "temperature":
        return unitSystem === "metric"
          ? [{ value: "c", label: "°C", description: "Celsius" }]
          : [{ value: "f", label: "°F", description: "Fahrenheit" }];

      default:
        return [];
    }
  };

  const contextValue: UnitContextValue = useMemo(
    () => ({
      // State
      unitSystem,
      loading,
      error,

      // Actions
      updateUnitSystem,
      setError,

      // Unit preferences
      getPreferredUnit,

      // Conversions
      convertUnit,
      convertForDisplay,

      // Formatting
      formatValue,

      // Temperature specific utilities
      getTemperatureSymbol,
      formatTemperature,
      formatCurrentTemperature,
      convertTemperature,
      getTemperatureAxisConfig,

      // Utilities
      getUnitSystemLabel,
      getCommonUnits,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [unitSystem, loading, error]
  );

  return (
    <UnitContext.Provider value={contextValue}>{children}</UnitContext.Provider>
  );
};

export default UnitContext;
