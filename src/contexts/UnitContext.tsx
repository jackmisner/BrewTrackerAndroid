/**
 * Provides the context value for unit system management and conversions throughout the application.
 *
 * @property {UnitSystem} unitSystem - The currently selected unit system (e.g., metric or imperial).
 * @property {boolean} loading - Indicates if unit system data is being loaded.
 * @property {string | null} error - Holds any error message related to unit operations.
 *
 * @property {(newSystem: UnitSystem) => Promise<void>} updateUnitSystem - Updates the current unit system asynchronously.
 * @property {(error: string | null) => void} setError - Sets or clears the error state.
 *
 * @property {(unitType: MeasurementType) => string} getPreferredUnit - Returns the preferred unit for a given measurement type.
 *
 * @property {(value: number | string, fromUnit: string, toUnit: string) => UnitConversion} convertUnit - Converts a value from one unit to another.
 * @property {(value: number | string, storageUnit: string, measurementType: MeasurementType) => UnitConversion} convertForDisplay - Converts a value for display purposes based on storage unit and measurement type.
 *
 * @property {(value: number | string, unit: string, measurementType: MeasurementType, precision?: number) => string} formatValue - Formats a value with its unit and measurement type, optionally specifying precision.
 *
 * @property {() => string} getTemperatureSymbol - Returns the symbol for the current temperature unit.
 * @property {(value: number, fromSystem: UnitSystem, precision?: number) => string} formatTemperature - Formats a temperature value from a given unit system, with optional precision.
 * @property {(value: number, precision?: number) => string} formatCurrentTemperature - Formats the current temperature value with optional precision.
 * @property {(value: number, fromSystem: UnitSystem, toSystem: UnitSystem) => number} convertTemperature - Converts a temperature value between unit systems.
 * @property {(temperatures: number[], bufferPercent?: number) => { minValue: number; maxValue: number }} getTemperatureAxisConfig - Calculates axis configuration for temperature charts, with optional buffer.
 *
 * @property {() => string} getUnitSystemLabel - Returns a human-readable label for the current unit system.
 * @property {(measurementType: MeasurementType) => UnitOption[]} getCommonUnits - Returns a list of common units for a given measurement type.
 */
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
import { useAuth } from "@contexts/AuthContext";
import { UnifiedLogger } from "@/src/services/logger/UnifiedLogger";

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
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [unitSystem, setUnitSystem] = useState<UnitSystem>(
    initialUnitSystem || "metric"
  );
  const [loading, setLoading] = useState<boolean>(!initialUnitSystem);
  const [error, setError] = useState<string | null>(null);

  // Load user's unit preference when authenticated
  useEffect(() => {
    let isMounted = true;
    if (authLoading) {
      return;
    }
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
          let settings: UserSettings | null = null;
          try {
            settings = JSON.parse(cachedSettings) as UserSettings;
          } catch (parseErr) {
            UnifiedLogger.warn(
              "units",
              "Corrupted cached user settings, removing:",
              parseErr
            );
            await AsyncStorage.removeItem(STORAGE_KEYS.USER_SETTINGS);
            // Treat as no-cache: fetch if authed, else default.
            try {
              if (isAuthenticated) {
                const fresh = await ApiService.user.getSettings();
                const freshUnits: UnitSystem =
                  fresh.data.settings.preferred_units || "metric";
                if (isMounted) {
                  setUnitSystem(freshUnits);
                }
                await AsyncStorage.setItem(
                  STORAGE_KEYS.USER_SETTINGS,
                  JSON.stringify(fresh.data.settings)
                );
              } else {
                if (isMounted) {
                  setUnitSystem("metric");
                }
              }
            } catch (bgError: any) {
              if (bgError?.response?.status !== 401) {
                UnifiedLogger.warn(
                  "units",
                  "Settings fetch after cache corruption failed:",
                  bgError
                );
              }
              if (isMounted) {
                setUnitSystem("metric");
              }
            }
            if (isMounted) {
              setLoading(false);
            }
            return;
          }
          const preferredUnits: UnitSystem =
            settings.preferred_units || "metric";
          if (isMounted) {
            setUnitSystem(preferredUnits);
          }
          if (isMounted) {
            setLoading(false);
          }

          // Only fetch fresh data in background if authenticated
          if (isAuthenticated) {
            try {
              const freshSettings = await ApiService.user.getSettings();
              const freshUnits: UnitSystem =
                freshSettings.data.settings.preferred_units || "metric";
              if (isMounted && freshUnits !== preferredUnits) {
                setUnitSystem(freshUnits);
              }
              // Always refresh cache so other settings stay current
              await AsyncStorage.setItem(
                STORAGE_KEYS.USER_SETTINGS,
                JSON.stringify(freshSettings.data.settings)
              );
            } catch (bgError: any) {
              // Silently handle background fetch errors for unauthenticated users
              if (bgError.response?.status !== 401) {
                UnifiedLogger.warn(
                  "units",
                  "Background settings fetch failed:",
                  bgError
                );
              }
            }
          }
          return;
        }

        // If no cache and user is authenticated, fetch from API
        if (isAuthenticated) {
          const settings = await ApiService.user.getSettings();
          const preferredUnits: UnitSystem =
            settings.data.settings.preferred_units || "metric";
          if (isMounted) {
            setUnitSystem(preferredUnits);
          }
          // Cache for offline use
          await AsyncStorage.setItem(
            STORAGE_KEYS.USER_SETTINGS,
            JSON.stringify(settings.data.settings)
          );
        } else {
          // Use default for unauthenticated users
          if (isMounted) {
            setUnitSystem("metric");
          }
        }
      } catch (err: any) {
        // Only log non-auth errors
        if (err.response?.status !== 401) {
          UnifiedLogger.warn(
            "units",
            "Failed to load unit preferences, using default:",
            err
          );
        }
        if (isMounted) {
          setUnitSystem("metric");
        } // Fallback to metric
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadUnitPreference();
    return () => {
      isMounted = false;
    };
  }, [initialUnitSystem, isAuthenticated, authLoading]);

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

      // Persist to backend only if authenticated
      if (isAuthenticated) {
        await ApiService.user.updateSettings({ preferred_units: newSystem });
      }
      // Update cache only after success
      const cachedSettings = await AsyncStorage.getItem(
        STORAGE_KEYS.USER_SETTINGS
      );
      if (cachedSettings) {
        let settings: Partial<UserSettings> = {};
        try {
          settings = JSON.parse(cachedSettings);
        } catch {
          UnifiedLogger.warn(
            "units",
            "Corrupted cached user settings during update; re-initializing."
          );
        }
        const updatedSettings = { ...settings, preferred_units: newSystem };
        await AsyncStorage.setItem(
          STORAGE_KEYS.USER_SETTINGS,
          JSON.stringify(updatedSettings)
        );
      } else {
        // Initialize cache for unauthenticated users
        await AsyncStorage.setItem(
          STORAGE_KEYS.USER_SETTINGS,
          JSON.stringify({ preferred_units: newSystem })
        );
      }
    } catch (err) {
      await UnifiedLogger.error("units", "Failed to update unit system:", err);
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
        return unitSystem === "metric" ? "C" : "F";
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
    if (isNaN(numValue)) {
      return { value: 0, unit: toUnit };
    }

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
    } else if (fromUnit === "gal" && toUnit === "qt") {
      convertedValue = numValue * 4;
    } else if (fromUnit === "qt" && toUnit === "gal") {
      convertedValue = numValue / 4;
    } else if (fromUnit === "qt" && toUnit === "l") {
      convertedValue = numValue * 0.946353;
    } else if (fromUnit === "l" && toUnit === "qt") {
      convertedValue = numValue / 0.946353;
    } else if (fromUnit === "qt" && toUnit === "ml") {
      convertedValue = numValue * 946.353;
    } else if (fromUnit === "ml" && toUnit === "qt") {
      convertedValue = numValue / 946.353;
    } else if (fromUnit === "ml" && toUnit === "l") {
      convertedValue = numValue / 1000;
    } else if (fromUnit === "l" && toUnit === "ml") {
      convertedValue = numValue * 1000;
    }

    // Temperature conversions
    else if (fromUnit === "F" && toUnit === "C") {
      convertedValue = ((numValue - 32) * 5) / 9;
    } else if (fromUnit === "C" && toUnit === "F") {
      convertedValue = (numValue * 9) / 5 + 32;
    }

    // If no conversion found, return original
    else {
      UnifiedLogger.warn(
        "units",
        `No conversion available from ${fromUnit} to ${toUnit}`
      );
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
    if (isNaN(numValue)) {
      return "0 " + unit;
    }

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
    if (fromSystem === toSystem) {
      return value;
    }

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
          ? [{ value: "C", label: "°C", description: "Celsius" }]
          : [{ value: "F", label: "°F", description: "Fahrenheit" }];

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
    [
      unitSystem,
      loading,
      error,
      convertForDisplay,
      formatCurrentTemperature,
      formatTemperature,
      getCommonUnits,
      getPreferredUnit,
      getTemperatureSymbol,
      getTemperatureAxisConfig,
      getUnitSystemLabel,
      updateUnitSystem,
    ]
  );

  return (
    <UnitContext.Provider value={contextValue}>{children}</UnitContext.Provider>
  );
};

export default UnitContext;
