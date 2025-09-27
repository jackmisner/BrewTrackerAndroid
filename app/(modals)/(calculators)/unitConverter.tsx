/**
 * Unit Converter Calculator Screen
 *
 * Comprehensive unit conversion calculator for brewing measurements.
 * Supports conversion between metric and imperial units across weight,
 * volume, and temperature categories essential for brewing recipes.
 *
 * Features:
 * - Category selection (Weight, Volume, Temperature)
 * - Dynamic unit options based on selected category
 * - From/to unit selection with descriptive labels
 * - Real-time conversion calculations
 * - Input validation with error handling
 * - Themed calculator card layout
 * - Modal header with navigation
 * - Auto-calculation on input or unit changes
 * - State management via CalculatorsContext
 *
 * Supported Conversions:
 * - Weight: grams, kilograms, ounces, pounds
 * - Volume: milliliters, liters, fluid ounces, cups, pints, quarts, gallons
 * - Temperature: Fahrenheit, Celsius, Kelvin
 *
 * @example
 * Navigation usage:
 * ```typescript
 * router.push('/(modals)/(calculators)/unitConverter');
 * ```
 */

import React, { useEffect, useCallback } from "react";
import { View, ScrollView } from "react-native";
import { useCalculators } from "@contexts/CalculatorsContext";
import { UnitConverter } from "@services/calculators/UnitConverter";
import { CalculatorCard } from "@components/calculators/CalculatorCard";
import { ModalHeader } from "@src/components/ui/ModalHeader";
import { NumberInput } from "@components/calculators/NumberInput";
import { UnitToggle, DropdownToggle } from "@components/calculators/UnitToggle";
import { SingleResult } from "@components/calculators/ResultDisplay";
import { useTheme } from "@contexts/ThemeContext";
import { calculatorScreenStyles } from "@styles/modals/calculators/calculatorScreenStyles";

/**
 * Available conversion categories
 */
const CONVERSION_CATEGORIES = [
  { label: "Weight", value: "weight" as const },
  { label: "Volume", value: "volume" as const },
  { label: "Temperature", value: "temperature" as const },
];

/**
 * Weight unit options for conversion
 */
const WEIGHT_UNITS = [
  { label: "g", value: "g", description: "Grams" },
  { label: "kg", value: "kg", description: "Kilograms" },
  { label: "oz", value: "oz", description: "Ounces" },
  { label: "lb", value: "lb", description: "Pounds" },
];

/**
 * Volume unit options for conversion
 */
const VOLUME_UNITS = [
  { label: "ml", value: "ml", description: "Milliliters" },
  { label: "L", value: "l", description: "Liters" },
  { label: "fl oz", value: "floz", description: "Fluid Ounces" },
  { label: "cup", value: "cup", description: "Cups" },
  { label: "pt", value: "pt", description: "Pints" },
  { label: "qt", value: "qt", description: "Quarts" },
  { label: "gal", value: "gal", description: "Gallons" },
];

/**
 * Temperature unit options for conversion
 */
const TEMPERATURE_UNITS = [
  { label: "°F", value: "f", description: "Fahrenheit" },
  { label: "°C", value: "c", description: "Celsius" },
  { label: "K", value: "k", description: "Kelvin" },
];

export default function UnitConverterScreen() {
  const theme = useTheme();
  const { state, dispatch } = useCalculators();
  const { unitConverter } = state;

  const getUnitsForCategory = useCallback(() => {
    switch (unitConverter.category) {
      case "weight":
        return WEIGHT_UNITS;
      case "volume":
        return VOLUME_UNITS;
      case "temperature":
        return TEMPERATURE_UNITS;
      default:
        return WEIGHT_UNITS;
    }
  }, [unitConverter.category]);

  const calculateConversion = useCallback(() => {
    if (!unitConverter.value || unitConverter.value === "") {
      dispatch({
        type: "SET_UNIT_CONVERTER",
        payload: { result: null },
      });
      return;
    }

    const inputValue = parseFloat(unitConverter.value);
    if (isNaN(inputValue)) {
      dispatch({
        type: "SET_UNIT_CONVERTER",
        payload: { result: null },
      });
      return;
    }

    try {
      let result: number;

      switch (unitConverter.category) {
        case "weight":
          result = UnitConverter.convertWeight(
            inputValue,
            unitConverter.fromUnit,
            unitConverter.toUnit
          );
          break;
        case "volume":
          result = UnitConverter.convertVolume(
            inputValue,
            unitConverter.fromUnit,
            unitConverter.toUnit
          );
          break;
        case "temperature":
          result = UnitConverter.convertTemperature(
            inputValue,
            unitConverter.fromUnit,
            unitConverter.toUnit
          );
          break;
        default:
          result = 0;
      }

      dispatch({
        type: "SET_UNIT_CONVERTER",
        payload: { result },
      });

      // Add to history
      dispatch({
        type: "ADD_TO_HISTORY",
        payload: {
          calculatorType: "unitConverter",
          inputs: {
            value: inputValue,
            fromUnit: unitConverter.fromUnit,
            toUnit: unitConverter.toUnit,
            category: unitConverter.category,
          },
          result: {
            convertedValue: result,
            fromUnit: unitConverter.fromUnit,
            toUnit: unitConverter.toUnit,
          },
        },
      });
    } catch (error) {
      console.warn("Conversion error:", error);
      dispatch({
        type: "SET_UNIT_CONVERTER",
        payload: { result: null },
      });
    }
  }, [
    unitConverter.value,
    unitConverter.fromUnit,
    unitConverter.toUnit,
    unitConverter.category,
    dispatch,
  ]);

  // Recalculate when inputs change
  useEffect(() => {
    calculateConversion();
  }, [calculateConversion]);

  // Reset units when category changes
  useEffect(() => {
    const units = getUnitsForCategory();
    if (units.length >= 2) {
      dispatch({
        type: "SET_UNIT_CONVERTER",
        payload: {
          fromUnit: units[0].value,
          toUnit: units[1].value,
          value: "",
          result: null,
        },
      });
    }
  }, [getUnitsForCategory, dispatch]);

  const handleValueChange = (value: string) => {
    dispatch({
      type: "SET_UNIT_CONVERTER",
      payload: { value },
    });
  };

  const handleCategoryChange = (category: string) => {
    dispatch({
      type: "SET_UNIT_CONVERTER",
      payload: { category: category as typeof unitConverter.category },
    });
  };

  const handleFromUnitChange = (fromUnit: string) => {
    dispatch({
      type: "SET_UNIT_CONVERTER",
      payload: { fromUnit },
    });
  };

  const handleToUnitChange = (toUnit: string) => {
    dispatch({
      type: "SET_UNIT_CONVERTER",
      payload: { toUnit },
    });
  };

  const _swapUnits = () => {
    dispatch({
      type: "SET_UNIT_CONVERTER",
      payload: {
        fromUnit: unitConverter.toUnit,
        toUnit: unitConverter.fromUnit,
      },
    });
  };

  const units = getUnitsForCategory();
  const fromUnitLabel =
    units.find(u => u.value === unitConverter.fromUnit)?.label ||
    unitConverter.fromUnit;
  const toUnitLabel =
    units.find(u => u.value === unitConverter.toUnit)?.label ||
    unitConverter.toUnit;

  return (
    <View
      style={[
        calculatorScreenStyles.container,
        { backgroundColor: theme.colors.background },
      ]}
    >
      <ModalHeader title="Unit Converter" testID="unit-converter-header" />

      <ScrollView style={calculatorScreenStyles.scrollContent}>
        <CalculatorCard title="Conversion Type">
          <UnitToggle
            value={unitConverter.category}
            options={CONVERSION_CATEGORIES}
            onChange={handleCategoryChange}
            label="Select Category"
          />
        </CalculatorCard>

        <CalculatorCard title="Convert From">
          <NumberInput
            label={`Value (${fromUnitLabel})`}
            value={unitConverter.value}
            onChangeText={handleValueChange}
            placeholder="Enter value to convert"
            testID="unit-converter-input"
          />

          <DropdownToggle
            label="From Unit"
            value={unitConverter.fromUnit}
            options={units}
            onChange={handleFromUnitChange}
            placeholder="Select unit"
          />
        </CalculatorCard>

        <CalculatorCard title="Convert To">
          <DropdownToggle
            label="To Unit"
            value={unitConverter.toUnit}
            options={units}
            onChange={handleToUnitChange}
            placeholder="Select unit"
          />
        </CalculatorCard>

        {unitConverter.result !== null && (
          <SingleResult
            label={`${unitConverter.value} ${fromUnitLabel} equals`}
            value={unitConverter.result}
            unit={toUnitLabel}
            icon="swap-horiz"
            size="large"
            precision={unitConverter.category === "temperature" ? 1 : 3}
          />
        )}
      </ScrollView>
    </View>
  );
}
