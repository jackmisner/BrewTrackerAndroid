/**
 * ABV Calculator Screen
 *
 * Alcohol by volume calculator with support for different gravity units and
 * calculation formulas. Provides both simple and advanced ABV calculation
 * methods with unit conversion between specific gravity, Plato, and Brix.
 *
 * Features:
 * - Original gravity (OG) and final gravity (FG) inputs
 * - Multiple gravity unit support (SG, °Plato, °Brix)
 * - Simple and advanced ABV calculation formulas
 * - Real-time unit conversion and calculation
 * - Soft validation with brewing-appropriate ranges
 * - Input validation with error handling
 * - Themed calculator card layout
 * - Modal header with navigation
 * - Auto-calculation on input changes
 * - State management via CalculatorsContext
 *
 * Calculations:
 * - Simple: (OG - FG) × 131.25
 * - Advanced: More accurate formula for higher gravities using corrections
 * - Unit conversions between SG, Plato, and Brix scales
 * - Typical ranges: OG 1.020-1.120, FG 1.000-1.030
 *
 * @example
 * Navigation usage:
 * ```typescript
 * router.push('/(modals)/(calculators)/abv');
 * ```
 */

import React, { useEffect, useCallback } from "react";
import { View, ScrollView } from "react-native";
import { useCalculators } from "@contexts/CalculatorsContext";
import { ABVCalculator } from "@services/calculators/ABVCalculator";
import { CalculatorCard } from "@components/calculators/CalculatorCard";
import { ModalHeader } from "@src/components/ui/ModalHeader";
import { NumberInput } from "@components/calculators/NumberInput";
import { UnitToggle, DropdownToggle } from "@components/calculators/UnitToggle";
import {
  ResultDisplay,
  SingleResult,
} from "@components/calculators/ResultDisplay";
import { useTheme } from "@contexts/ThemeContext";
import { calculatorScreenStyles } from "@styles/modals/calculators/calculatorScreenStyles";

/**
 * Available ABV calculation formulas
 */
const FORMULA_OPTIONS = [
  {
    label: "Simple",
    value: "simple" as const,
    description: "Standard formula (OG - FG) × 131.25",
  },
  {
    label: "Advanced",
    value: "advanced" as const,
    description: "More accurate formula for higher gravities",
  },
];

/**
 * Supported gravity unit types for input and display
 */
const UNIT_TYPE_OPTIONS = [
  {
    label: "SG",
    value: "sg" as const,
    description: "Specific Gravity (1.050)",
  },
  { label: "°P", value: "plato" as const, description: "Degrees Plato" },
  { label: "°Bx", value: "brix" as const, description: "Degrees Brix" },
];

/**
 * Convert gravity value between SG, Plato, and Brix with appropriate rounding
 */
const convertGravityValue = (
  value: number,
  fromUnit: "sg" | "plato" | "brix",
  toUnit: "sg" | "plato" | "brix"
): number => {
  if (fromUnit === toUnit) {
    return value;
  }

  let sgValue: number;

  // Convert to SG first
  if (fromUnit === "plato") {
    sgValue = ABVCalculator.platoToSG(value);
  } else if (fromUnit === "brix") {
    sgValue = ABVCalculator.brixToSG(value);
  } else {
    sgValue = value;
  }

  // Convert from SG to target unit
  let result: number;
  if (toUnit === "plato") {
    result = ABVCalculator.sgToPlato(sgValue);
  } else if (toUnit === "brix") {
    result = ABVCalculator.sgToBrix(sgValue);
  } else {
    result = sgValue;
  }

  // Apply appropriate rounding
  return roundForGravityUnit(result, toUnit);
};

/**
 * Round gravity values to appropriate precision based on unit type
 */
const roundForGravityUnit = (
  value: number,
  unit: "sg" | "plato" | "brix"
): number => {
  switch (unit) {
    case "sg":
      // Specific gravity: 3 decimal places (e.g., 1.050)
      return Math.round(value * 1000) / 1000;
    case "plato":
    case "brix":
      // Plato/Brix: 1 decimal place (e.g., 12.5)
      return Math.round(value * 10) / 10;
    default:
      return Math.round(value * 1000) / 1000;
  }
};

export default function ABVCalculatorScreen() {
  const theme = useTheme();
  const { state, dispatch } = useCalculators();
  const { abv } = state;

  const calculateABV = useCallback(() => {
    if (
      !abv.originalGravity ||
      !abv.finalGravity ||
      abv.originalGravity === "" ||
      abv.finalGravity === ""
    ) {
      dispatch({
        type: "SET_ABV",
        payload: { result: null },
      });
      return;
    }

    const og = parseFloat(abv.originalGravity);
    const fg = parseFloat(abv.finalGravity);

    if (isNaN(og) || isNaN(fg)) {
      dispatch({
        type: "SET_ABV",
        payload: { result: null },
      });
      return;
    }

    try {
      const result = ABVCalculator.calculate(
        og,
        fg,
        abv.unitType,
        abv.unitType,
        abv.formula
      );

      dispatch({
        type: "SET_ABV",
        payload: { result: result.abv },
      });

      // Add to history
      dispatch({
        type: "ADD_TO_HISTORY",
        payload: {
          calculatorType: "abv",
          inputs: {
            originalGravity: og,
            finalGravity: fg,
            formula: abv.formula,
            unitType: abv.unitType,
          },
          result: {
            abv: result.abv,
            attenuation: result.attenuation,
            calories: result.calories,
          },
        },
      });
    } catch (error) {
      console.warn("ABV calculation error:", error);
      dispatch({
        type: "SET_ABV",
        payload: { result: null },
      });
    }
  }, [
    abv.originalGravity,
    abv.finalGravity,
    abv.formula,
    abv.unitType,
    dispatch,
  ]);

  // Recalculate when inputs change
  useEffect(() => {
    calculateABV();
  }, [calculateABV]);

  const handleOGChange = (value: string) => {
    dispatch({
      type: "SET_ABV",
      payload: { originalGravity: value },
    });
  };

  const handleFGChange = (value: string) => {
    dispatch({
      type: "SET_ABV",
      payload: { finalGravity: value },
    });
  };

  const handleFormulaChange = (formula: string) => {
    dispatch({
      type: "SET_ABV",
      payload: { formula: formula as typeof abv.formula },
    });
  };

  const getPlaceholderText = () => {
    switch (abv.unitType) {
      case "sg":
        return "1.050";
      case "plato":
        return "12.5";
      case "brix":
        return "12.5";
      default:
        return "1.050";
    }
  };

  const getUnitLabel = () => {
    switch (abv.unitType) {
      case "sg":
        return "";
      case "plato":
        return "°P";
      case "brix":
        return "°Bx";
      default:
        return "";
    }
  };

  const handleUnitTypeChange = (newUnitType: string) => {
    const oldUnitType = abv.unitType;
    const newUnit = newUnitType as typeof abv.unitType;

    // Convert existing values if they exist and units are different
    let convertedOG = abv.originalGravity;
    let convertedFG = abv.finalGravity;

    if (oldUnitType !== newUnit) {
      try {
        if (abv.originalGravity && abv.originalGravity !== "") {
          const ogValue = parseFloat(abv.originalGravity);
          if (isFinite(ogValue)) {
            convertedOG = convertGravityValue(
              ogValue,
              oldUnitType,
              newUnit
            ).toString();
          }
        }
        if (abv.finalGravity && abv.finalGravity !== "") {
          const fgValue = parseFloat(abv.finalGravity);
          if (isFinite(fgValue)) {
            convertedFG = convertGravityValue(
              fgValue,
              oldUnitType,
              newUnit
            ).toString();
          }
        }
      } catch (error) {
        console.warn("Unit conversion failed:", error);
        // Bail out to keep unit/value pairs consistent
        return;
      }
    }
    dispatch({
      type: "SET_ABV",
      payload: {
        unitType: newUnit,
        originalGravity: convertedOG,
        finalGravity: convertedFG,
      },
    });
  };

  // Calculate additional metrics if we have a result
  const additionalResults = React.useMemo(() => {
    if (abv.result === null || !abv.originalGravity || !abv.finalGravity) {
      return null;
    }

    const og = parseFloat(abv.originalGravity);
    const fg = parseFloat(abv.finalGravity);

    if (isNaN(og) || isNaN(fg)) {
      return null;
    }

    try {
      const fullResult = ABVCalculator.calculate(
        og,
        fg,
        abv.unitType,
        abv.unitType,
        abv.formula
      );

      return [
        {
          label: "Attenuation",
          value: fullResult.attenuation,
          unit: "%",
          icon: "trending-down" as const,
          precision: 1,
        },
        {
          label: "Calories (12oz)",
          value: fullResult.calories,
          unit: "cal",
          icon: "local-fire-department" as const,
          precision: 0,
        },
      ];
    } catch {
      return null;
    }
  }, [
    abv.result,
    abv.originalGravity,
    abv.finalGravity,
    abv.unitType,
    abv.formula,
  ]);

  return (
    <View
      style={[
        calculatorScreenStyles.container,
        { backgroundColor: theme.colors.background },
      ]}
    >
      <ModalHeader title="ABV Calculator" testID="abv-calculator-header" />

      <ScrollView style={calculatorScreenStyles.scrollContent}>
        <CalculatorCard title="Settings">
          <DropdownToggle
            label="Formula"
            value={abv.formula}
            options={FORMULA_OPTIONS}
            onChange={handleFormulaChange}
          />

          <UnitToggle
            label="Unit Type"
            value={abv.unitType}
            options={UNIT_TYPE_OPTIONS}
            onChange={handleUnitTypeChange}
          />
        </CalculatorCard>

        <CalculatorCard title="Gravity Readings">
          <NumberInput
            label="Original Gravity"
            value={abv.originalGravity}
            onChangeText={handleOGChange}
            placeholder={`e.g., ${getPlaceholderText()}`}
            unit={getUnitLabel()}
            validationMode="soft"
            min={abv.unitType === "sg" ? 1.0 : 0}
            max={abv.unitType === "sg" ? 1.15 : 35}
            normalMin={abv.unitType === "sg" ? 1.02 : 5}
            normalMax={abv.unitType === "sg" ? 1.12 : 30}
            warningText={
              abv.unitType === "sg"
                ? "OG outside typical brewing range (1.020-1.120). Valid for low/no-alcohol brewing."
                : abv.unitType === "plato"
                  ? "OG outside typical brewing range (5-30°P). Valid for specialty styles."
                  : "OG outside typical brewing range (5-30°Bx). Valid for specialty styles."
            }
            step={abv.unitType === "sg" ? 0.001 : 0.1}
            precision={abv.unitType === "sg" ? 3 : 1}
            testID="abv-og-input"
          />

          <NumberInput
            label="Final Gravity"
            value={abv.finalGravity}
            onChangeText={handleFGChange}
            placeholder={`e.g., ${abv.unitType === "sg" ? "1.010" : "2.5"}`}
            unit={getUnitLabel()}
            validationMode="soft"
            helperText={
              abv.unitType === "brix"
                ? "FG in Brix requires alcohol correction. Convert to SG or use a corrected value."
                : undefined
            }
            min={abv.unitType === "sg" ? 0.99 : 0}
            max={abv.unitType === "sg" ? 1.05 : 15}
            normalMin={abv.unitType === "sg" ? 1.005 : 1}
            normalMax={abv.unitType === "sg" ? 1.025 : 8}
            warningText={
              abv.unitType === "sg"
                ? "FG outside typical range (1.005-1.025). Check fermentation completion."
                : abv.unitType === "plato"
                  ? "FG outside typical range (1-8°P). Check fermentation completion."
                  : "FG outside typical range (1-8°Bx). Check fermentation completion."
            }
            step={abv.unitType === "sg" ? 0.001 : 0.1}
            precision={abv.unitType === "sg" ? 3 : 1}
            testID="abv-fg-input"
          />
        </CalculatorCard>

        {abv.result !== null && (
          <>
            <SingleResult
              label="Alcohol By Volume"
              value={abv.result}
              unit="% ABV"
              icon="local-bar"
              size="large"
              precision={1}
            />

            {additionalResults && (
              <ResultDisplay
                title="Additional Metrics"
                results={additionalResults}
              />
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}
